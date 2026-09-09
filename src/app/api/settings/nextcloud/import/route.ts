import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import {
    scanNextcloudFiles,
    readAssetFile,
    uploadAsset,
    EXTENSION_MAP,
    getNextcloudClient,
} from '@/lib/nextcloud';
import { logActivity } from '@/lib/activity';
import { removeDeletedUris } from '@/lib/deletedAssets';
import {
    extractVideoMetadataFromPath,
    generateVideoThumbnailFromPath,
} from '@/lib/media-processor';
import path from 'path';
import fs from 'fs';
import os from 'os';

const VIDEO_EXTENSIONS = new Set([
    'mp4', 'mov', 'mxf', 'mkv', 'avi', 'webm', 'wmv', 'r3d', 'braw', 'mts', 'm2ts', 'dv', 'flv', 'ts', 'm4v'
]);

// POST /api/settings/nextcloud/import — Selectively import videos or media from Nextcloud
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json().catch(() => ({}));
        const filePaths: string[] = Array.isArray(body.filePaths) ? body.filePaths : [];
        const folderPath: string = typeof body.folderPath === 'string' ? body.folderPath.trim() : '';
        const recursive: boolean = Boolean(body.recursive);
        const videoOnly: boolean = body.videoOnly !== false; // Default true
        const projectId: string | null = typeof body.projectId === 'string' && body.projectId ? body.projectId : null;

        if (filePaths.length === 0 && !folderPath) {
            return NextResponse.json({
                error: 'Please specify either an array of "filePaths" or a "folderPath" to import.'
            }, { status: 400 });
        }

        // 1. Gather all candidate files
        interface FileCandidate {
            filePath: string;
            basename: string;
            cleanTitle: string;
            size: number;
            type: 'video' | 'image' | 'audio' | 'document';
            mimeType: string;
        }

        const candidates: FileCandidate[] = [];

        if (filePaths.length > 0) {
            // Explicit file list
            for (const rawPath of filePaths) {
                const normPath = ('/' + String(rawPath).replace(/^\/+/g, '')).replace(/\/+/g, '/');
                const basename = path.posix.basename(normPath);
                const ext = (basename.split('.').pop() || '').toLowerCase();

                if (videoOnly && !VIDEO_EXTENSIONS.has(ext)) {
                    continue; // Skip non-video if videoOnly requested
                }

                const match = EXTENSION_MAP[ext] || { type: 'video', mime: 'video/mp4' };
                const cleanTitle = basename.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ').trim();

                candidates.push({
                    filePath: normPath,
                    basename,
                    cleanTitle: cleanTitle || basename,
                    size: 0, // Will resolve or leave default
                    type: match.type,
                    mimeType: match.mime,
                });
            }
        } else if (folderPath) {
            // Folder scan
            const discovered = await scanNextcloudFiles(folderPath, recursive);
            for (const file of discovered) {
                const ext = (file.basename.split('.').pop() || '').toLowerCase();
                if (videoOnly && (!VIDEO_EXTENSIONS.has(ext) && file.type !== 'video')) {
                    continue;
                }

                candidates.push({
                    filePath: file.filename,
                    basename: file.basename,
                    cleanTitle: file.cleanTitle || file.basename,
                    size: file.size,
                    type: file.type,
                    mimeType: file.mimeType,
                });
            }
        }

        if (candidates.length === 0) {
            return NextResponse.json({
                success: true,
                totalRequested: filePaths.length || 0,
                importedCount: 0,
                skippedCount: 0,
                message: videoOnly
                    ? 'No video files found in the specified path.'
                    : 'No supported media files found to import.'
            });
        }

        // 2. Filter out items already in the database
        const existingVersions = await prisma.assetVersion.findMany({
            where: {
                nextcloudUri: { in: candidates.map(c => c.filePath) }
            },
            select: { nextcloudUri: true }
        });
        const existingSet = new Set(existingVersions.map(v => v.nextcloudUri.toLowerCase()));

        const toImport = candidates.filter(c => !existingSet.has(c.filePath.toLowerCase()));
        const skippedCount = candidates.length - toImport.length;

        if (toImport.length === 0) {
            return NextResponse.json({
                success: true,
                totalRequested: candidates.length,
                importedCount: 0,
                skippedCount,
                message: `All ${candidates.length} video(s) are already imported and present in your library.`
            });
        }

        // 3. Clear any previously deleted URIs from blocklist because user is explicitly importing them
        await removeDeletedUris(toImport.map(c => c.filePath));

        // 4. Ingest each asset
        const importedList: Array<{ id: string; title: string; path: string; size: number }> = [];

        for (const item of toImport) {
            try {
                let proxyUri = item.filePath;
                let finalSize = item.size;
                let videoMeta: Record<string, unknown> | null = null;

                // If video, attempt fast thumbnail generation
                if (item.type === 'video') {
                    try {
                        const fileBuf = await readAssetFile(item.filePath);
                        if (fileBuf && fileBuf.length > 0) {
                            finalSize = fileBuf.length;
                            const ext = path.extname(item.basename) || '.mp4';
                            const tempPath = path.join(os.tmpdir(), `nc_imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`);
                            await fs.promises.writeFile(tempPath, fileBuf);

                            try {
                                videoMeta = await extractVideoMetadataFromPath(tempPath);
                                const thumbBuf = await generateVideoThumbnailFromPath(tempPath);
                                if (thumbBuf) {
                                    const thumbRemotePath = `/mtc-dam-proxies/${Date.now()}_thumb_${item.basename}.jpg`;
                                    await uploadAsset(thumbRemotePath, thumbBuf);
                                    proxyUri = thumbRemotePath;
                                }
                            } finally {
                                fs.promises.unlink(tempPath).catch(() => {});
                            }
                        }
                    } catch (thumbErr) {
                        console.warn(`[Nextcloud Importer] Thumbnail generation skipped for ${item.filePath}:`, thumbErr);
                    }
                }

                const newAsset = await prisma.asset.create({
                    data: {
                        title: item.cleanTitle,
                        description: `Imported via Nextcloud Folder Importer: ${item.filePath}`,
                        type: item.type,
                        mimeType: item.mimeType,
                        size: finalSize,
                        creatorId: auth.userId,
                        projectId: projectId || undefined,
                        status: 'APPROVED',
                        metadata: videoMeta ? JSON.stringify(videoMeta) : undefined,
                        versions: {
                            create: [
                                {
                                    versionNum: 1,
                                    nextcloudUri: item.filePath,
                                    proxyUri,
                                }
                            ]
                        }
                    }
                });

                importedList.push({
                    id: newAsset.id,
                    title: newAsset.title,
                    path: item.filePath,
                    size: finalSize,
                });
            } catch (createErr) {
                console.error(`Error importing Nextcloud file ${item.filePath}:`, createErr);
            }
        }

        // 5. Log activity
        if (importedList.length > 0) {
            try {
                await logActivity(
                    auth.userId,
                    'CREATE',
                    'ASSET',
                    importedList[0].id,
                    {
                        source: 'nextcloud_folder_importer',
                        totalImported: importedList.length,
                        skippedCount,
                        firstImportedTitle: importedList[0].title,
                    },
                    req
                );
            } catch {}
        }

        return NextResponse.json({
            success: true,
            totalRequested: candidates.length,
            importedCount: importedList.length,
            skippedCount,
            imported: importedList,
            message: `Successfully imported ${importedList.length} video(s) from Nextcloud!${skippedCount > 0 ? ` (${skippedCount} already in library)` : ''}`
        });
    } catch (err: any) {
        console.error('Nextcloud manual video import error:', err);
        return NextResponse.json({
            success: false,
            error: err?.message || 'Failed to import videos from Nextcloud.'
        }, { status: 500 });
    }
}
