import path from 'path';
import fs from 'fs';
import os from 'os';
import { prisma } from './prisma';
import { 
    scanNextcloudFiles, 
    readAssetFile, 
    uploadAsset, 
    uploadAssetFromPath, 
    moveAssetFile, 
    ScannedMediaFile 
} from './nextcloud';
import { 
    extractVideoMetadataFromPath, 
    generateVideoThumbnailFromPath, 
    generateVideoProxyFromPath, 
    extractImageMetadata, 
    generateImageThumbnail, 
    extractAudioMetadata, 
    generateAudioWaveform 
} from './media-processor';
import { logActivity } from './activity';
import { getDeletedUris } from './deletedAssets';


export interface WatchFolderConfig {
    enabled: boolean;
    storageType: 'nextcloud' | 'local';
    folderPath: string;
    recursive: boolean;
    autoTags: string[];
    defaultProjectId: string | null;
    actionAfterIngest: 'keep' | 'move_archive';
    archiveFolder: string;
    autoTranscode: boolean;
    status: 'IDLE' | 'SCANNING' | 'ERROR';
    lastScanTime: string | null;
    lastScanSummary: string | null;
    totalIngestedCount: number;
}

export const DEFAULT_WATCH_CONFIG: WatchFolderConfig = {
    enabled: true,
    storageType: 'nextcloud',
    folderPath: '/Footage_Ingest',
    recursive: true,
    autoTags: ['Auto-Ingest', 'Camera Card'],
    defaultProjectId: null,
    actionAfterIngest: 'keep',
    archiveFolder: '/Footage_Ingest/Archive',
    autoTranscode: true,
    status: 'IDLE',
    lastScanTime: null,
    lastScanSummary: null,
    totalIngestedCount: 0,
};

export async function getWatchFolderConfig(): Promise<WatchFolderConfig> {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: {
                    in: [
                        'WATCH_FOLDER_ENABLED',
                        'WATCH_FOLDER_STORAGE_TYPE',
                        'WATCH_FOLDER_PATH',
                        'WATCH_FOLDER_RECURSIVE',
                        'WATCH_FOLDER_TAGS',
                        'WATCH_FOLDER_PROJECT_ID',
                        'WATCH_FOLDER_ACTION',
                        'WATCH_FOLDER_ARCHIVE_PATH',
                        'WATCH_FOLDER_AUTO_TRANSCODE',
                        'WATCH_FOLDER_STATUS',
                        'WATCH_FOLDER_LAST_SCAN',
                        'WATCH_FOLDER_LAST_SUMMARY',
                        'WATCH_FOLDER_TOTAL_INGESTED',
                    ]
                }
            }
        });

        const map = new Map(settings.map(s => [s.key, s.value]));

        const rawTags = map.get('WATCH_FOLDER_TAGS');
        const autoTags = rawTags 
            ? rawTags.split(',').map(t => t.trim()).filter(Boolean)
            : DEFAULT_WATCH_CONFIG.autoTags;

        return {
            enabled: map.has('WATCH_FOLDER_ENABLED') ? map.get('WATCH_FOLDER_ENABLED') === 'true' : DEFAULT_WATCH_CONFIG.enabled,
            storageType: (map.get('WATCH_FOLDER_STORAGE_TYPE') as 'nextcloud' | 'local') || DEFAULT_WATCH_CONFIG.storageType,
            folderPath: map.get('WATCH_FOLDER_PATH') || DEFAULT_WATCH_CONFIG.folderPath,
            recursive: map.has('WATCH_FOLDER_RECURSIVE') ? map.get('WATCH_FOLDER_RECURSIVE') === 'true' : DEFAULT_WATCH_CONFIG.recursive,
            autoTags,
            defaultProjectId: map.get('WATCH_FOLDER_PROJECT_ID') || null,
            actionAfterIngest: (map.get('WATCH_FOLDER_ACTION') as 'keep' | 'move_archive') || DEFAULT_WATCH_CONFIG.actionAfterIngest,
            archiveFolder: map.get('WATCH_FOLDER_ARCHIVE_PATH') || DEFAULT_WATCH_CONFIG.archiveFolder,
            autoTranscode: map.has('WATCH_FOLDER_AUTO_TRANSCODE') ? map.get('WATCH_FOLDER_AUTO_TRANSCODE') === 'true' : DEFAULT_WATCH_CONFIG.autoTranscode,
            status: (map.get('WATCH_FOLDER_STATUS') as 'IDLE' | 'SCANNING' | 'ERROR') || DEFAULT_WATCH_CONFIG.status,
            lastScanTime: map.get('WATCH_FOLDER_LAST_SCAN') || null,
            lastScanSummary: map.get('WATCH_FOLDER_LAST_SUMMARY') || null,
            totalIngestedCount: Number(map.get('WATCH_FOLDER_TOTAL_INGESTED') || 0),
        };
    } catch {
        return DEFAULT_WATCH_CONFIG;
    }
}

export async function saveWatchFolderConfig(updates: Partial<WatchFolderConfig>): Promise<WatchFolderConfig> {
    const pairs: Array<{ key: string; value: string }> = [];

    if (updates.enabled !== undefined) pairs.push({ key: 'WATCH_FOLDER_ENABLED', value: String(updates.enabled) });
    if (updates.storageType !== undefined) pairs.push({ key: 'WATCH_FOLDER_STORAGE_TYPE', value: updates.storageType });
    if (updates.folderPath !== undefined) pairs.push({ key: 'WATCH_FOLDER_PATH', value: updates.folderPath.trim() });
    if (updates.recursive !== undefined) pairs.push({ key: 'WATCH_FOLDER_RECURSIVE', value: String(updates.recursive) });
    if (updates.autoTags !== undefined) pairs.push({ key: 'WATCH_FOLDER_TAGS', value: updates.autoTags.join(', ') });
    if (updates.defaultProjectId !== undefined) pairs.push({ key: 'WATCH_FOLDER_PROJECT_ID', value: updates.defaultProjectId || '' });
    if (updates.actionAfterIngest !== undefined) pairs.push({ key: 'WATCH_FOLDER_ACTION', value: updates.actionAfterIngest });
    if (updates.archiveFolder !== undefined) pairs.push({ key: 'WATCH_FOLDER_ARCHIVE_PATH', value: updates.archiveFolder.trim() });
    if (updates.autoTranscode !== undefined) pairs.push({ key: 'WATCH_FOLDER_AUTO_TRANSCODE', value: String(updates.autoTranscode) });
    if (updates.status !== undefined) pairs.push({ key: 'WATCH_FOLDER_STATUS', value: updates.status });
    if (updates.lastScanTime !== undefined) pairs.push({ key: 'WATCH_FOLDER_LAST_SCAN', value: updates.lastScanTime || '' });
    if (updates.lastScanSummary !== undefined) pairs.push({ key: 'WATCH_FOLDER_LAST_SUMMARY', value: updates.lastScanSummary || '' });
    if (updates.totalIngestedCount !== undefined) pairs.push({ key: 'WATCH_FOLDER_TOTAL_INGESTED', value: String(updates.totalIngestedCount) });

    for (const pair of pairs) {
        await prisma.systemSetting.upsert({
            where: { key: pair.key },
            create: pair,
            update: { value: pair.value },
        });
    }

    return getWatchFolderConfig();
}

export interface IngestResult {
    success: boolean;
    totalFound: number;
    newImported: number;
    existingSkipped: number;
    durationMs: number;
    importedAssets: Array<{
        id: string;
        title: string;
        type: string;
        resolution?: string;
        framerate?: string;
        size: number;
    }>;
    message: string;
    error?: string;
}

export async function scanAndIngestWatchFolder(userId?: string): Promise<IngestResult> {
    const startTime = Date.now();
    const config = await getWatchFolderConfig();

    // Mark status as SCANNING
    await saveWatchFolderConfig({ status: 'SCANNING' });

    let actingUserId = userId;
    if (!actingUserId) {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        actingUserId = admin ? admin.id : (await prisma.user.findFirst())?.id;
    }

    if (!actingUserId) {
        const fallback = await prisma.user.create({
            data: {
                name: 'Ingest Daemon',
                email: 'ingest@mtc-network.space',
                password: '$2a$10$wT8KzQ4h6qQy.WJ0LhE91OK6d7Hn/rL2oH6.m9e0mI4l8wT8KzQ4h',
                role: 'ADMIN',
            }
        });
        actingUserId = fallback.id;
    }

    try {
        console.log(`[Watch Folder] Starting scan on '${config.folderPath}' (Storage: ${config.storageType})...`);

        // 1. Discover all media files in the designated watch folder
        const discovered = await scanNextcloudFiles(config.folderPath, config.recursive);

        // Filter out files that reside inside the designated archive folder
        const archiveNorm = config.archiveFolder.toLowerCase().replace(/\/+$/, '');
        const filesToProcess = discovered.filter(f => {
            const fNorm = f.filename.toLowerCase();
            return !fNorm.startsWith(archiveNorm);
        });

        // 2. Fetch existing asset URIs to prevent duplicates
        const existingVersions = await prisma.assetVersion.findMany({
            select: { nextcloudUri: true, proxyUri: true },
        });
        const existingUris = new Set<string>();
        for (const v of existingVersions) {
            if (v.nextcloudUri) existingUris.add(v.nextcloudUri);
            if (v.proxyUri) existingUris.add(v.proxyUri);
        }
        const deletedUris = await getDeletedUris();

        let newImported = 0;
        let existingSkipped = 0;
        const importedAssets: IngestResult['importedAssets'] = [];

        // 3. Process each newly discovered file
        for (const file of filesToProcess) {
            const fileNorm = (file.filename || '').trim().toLowerCase();
            if (existingUris.has(file.filename) || deletedUris.has(fileNorm)) {
                existingSkipped++;
                continue;
            }

            console.log(`[Watch Folder Ingest] Processing new file: ${file.filename} (${file.type}, ${file.size} bytes)`);

            let tempFilePath: string | null = null;
            let fileBuffer: Buffer | null = null;
            let metadata: Record<string, unknown> = {};
            let proxyUri: string | null = null;
            let finalStorageUri = file.filename;

            try {
                // Download file to temp location for local FFmpeg & GPU processing
                const ext = path.extname(file.basename) || '.bin';
                tempFilePath = path.join(os.tmpdir(), `wf_ingest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`);

                fileBuffer = await readAssetFile(file.filename);
                if (fileBuffer && fileBuffer.length > 0) {
                    await fs.promises.writeFile(tempFilePath, fileBuffer);
                } else {
                    console.warn(`[Watch Folder] Could not read file contents for ${file.filename}, skipping.`);
                    continue;
                }

                // Process by media type
                if (file.type === 'video') {
                    // Deep metadata extraction via FFprobe
                    const meta = await extractVideoMetadataFromPath(tempFilePath);
                    if (meta) {
                        metadata = meta;
                    }

                    // GPU-accelerated proxy & poster thumbnail generation
                    if (config.autoTranscode) {
                        try {
                            const thumbBuffer = await generateVideoThumbnailFromPath(tempFilePath);
                            if (thumbBuffer) {
                                const thumbPath = `/mtc-dam-proxies/${Date.now()}_thumb_${file.basename}.jpg`;
                                await uploadAsset(thumbPath, thumbBuffer);
                                proxyUri = thumbPath;
                            }
                        } catch (thumbErr) {
                            console.warn('[Watch Folder] Video thumbnail failed:', thumbErr);
                        }

                        try {
                            const proxyBuffer = await generateVideoProxyFromPath(tempFilePath);
                            if (proxyBuffer) {
                                const vidProxyPath = `/mtc-dam-proxies/${Date.now()}_proxy_${file.basename}.mp4`;
                                await uploadAsset(vidProxyPath, proxyBuffer);
                                proxyUri = vidProxyPath;
                            }
                        } catch (proxyErr) {
                            console.warn('[Watch Folder] Video proxy generation failed:', proxyErr);
                        }
                    }

                    // Default to source video if no proxy generated
                    if (!proxyUri) {
                        proxyUri = finalStorageUri;
                    }
                } else if (file.type === 'image') {
                    if (fileBuffer) {
                        metadata = (await extractImageMetadata(fileBuffer)) || {};
                        const thumbBuffer = await generateImageThumbnail(fileBuffer, file.mimeType);
                        if (thumbBuffer) {
                            const thumbPath = `/mtc-dam-proxies/${Date.now()}_thumb_${file.basename}.webp`;
                            await uploadAsset(thumbPath, thumbBuffer);
                            proxyUri = thumbPath;
                        }
                    }
                } else if (file.type === 'audio') {
                    if (fileBuffer) {
                        metadata = (await extractAudioMetadata(fileBuffer)) || {};
                        const waveBuffer = await generateAudioWaveform(fileBuffer);
                        if (waveBuffer) {
                            const wavePath = `/mtc-dam-proxies/${Date.now()}_waveform_${file.basename}.mp3`;
                            await uploadAsset(wavePath, waveBuffer);
                            proxyUri = wavePath;
                        }
                    }
                }

                // Handle post-ingest move to archive if configured
                if (config.actionAfterIngest === 'move_archive') {
                    const archiveDest = `${config.archiveFolder.replace(/\/+$/, '')}/${file.basename}`;
                    const moved = await moveAssetFile(file.filename, archiveDest);
                    if (moved) {
                        finalStorageUri = archiveDest;
                        console.log(`[Watch Folder] Archived ${file.filename} -> ${archiveDest}`);
                    }
                }

                // Prepare tags
                const tagNames = Array.from(new Set([...config.autoTags, 'Auto-Ingest']));

                // Create Asset in Prisma Database
                const newAsset = await prisma.asset.create({
                    data: {
                        title: file.cleanTitle || file.basename,
                        description: `Auto-ingested from Watch Folder (${config.storageType}): ${file.filename}`,
                        type: file.type,
                        mimeType: file.mimeType,
                        size: file.size,
                        creatorId: actingUserId,
                        projectId: config.defaultProjectId || undefined,
                        status: 'APPROVED',
                        metadata: JSON.stringify(metadata),
                        tags: {
                            connectOrCreate: tagNames.map(name => ({
                                where: { name },
                                create: { name },
                            })),
                        },
                        versions: {
                            create: [
                                {
                                    versionNum: 1,
                                    nextcloudUri: finalStorageUri,
                                    proxyUri: proxyUri || finalStorageUri,
                                }
                            ]
                        }
                    }
                });

                existingUris.add(file.filename);
                if (finalStorageUri !== file.filename) {
                    existingUris.add(finalStorageUri);
                }

                newImported++;
                importedAssets.push({
                    id: newAsset.id,
                    title: newAsset.title,
                    type: file.type,
                    resolution: (metadata.resolution as string) || undefined,
                    framerate: (metadata.framerate as string) || undefined,
                    size: file.size,
                });
            } catch (itemErr) {
                console.error(`[Watch Folder] Error ingesting ${file.filename}:`, itemErr);
            } finally {
                // Clean up temp file
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    try { await fs.promises.unlink(tempFilePath); } catch {}
                }
            }
        }

        const durationMs = Date.now() - startTime;
        const totalIngested = config.totalIngestedCount + newImported;
        const summary = newImported > 0
            ? `Successfully scanned ${filesToProcess.length} file(s) and ingested ${newImported} new asset(s) in ${(durationMs / 1000).toFixed(1)}s.`
            : `Scanned ${filesToProcess.length} file(s). All files are already up-to-date.`;

        // Update Watch Folder statistics
        await saveWatchFolderConfig({
            status: 'IDLE',
            lastScanTime: new Date().toISOString(),
            lastScanSummary: summary,
            totalIngestedCount: totalIngested,
        });

        // Audit log
        try {
            await logActivity(actingUserId, 'CREATE', 'ASSET', 'WATCH_FOLDER_INGEST', {
                folderPath: config.folderPath,
                storageType: config.storageType,
                totalFound: filesToProcess.length,
                newImported,
                existingSkipped,
                durationMs,
            });
        } catch {
            // Non-blocking
        }

        return {
            success: true,
            totalFound: filesToProcess.length,
            newImported,
            existingSkipped,
            durationMs,
            importedAssets,
            message: summary,
        };
    } catch (err: any) {
        console.error('[Watch Folder] Fatal scan error:', err);
        const errorMsg = err?.message || 'Watch folder scan encountered an unknown error.';
        await saveWatchFolderConfig({
            status: 'ERROR',
            lastScanTime: new Date().toISOString(),
            lastScanSummary: `Scan failed: ${errorMsg}`,
        });

        return {
            success: false,
            totalFound: 0,
            newImported: 0,
            existingSkipped: 0,
            durationMs: Date.now() - startTime,
            importedAssets: [],
            message: errorMsg,
            error: errorMsg,
        };
    }
}
