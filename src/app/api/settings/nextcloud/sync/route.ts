import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { scanNextcloudFiles } from '@/lib/nextcloud';
import { logActivity } from '@/lib/activity';
import { getDeletedUris } from '@/lib/deletedAssets';

// POST /api/settings/nextcloud/sync — Scan and index files from Nextcloud into DAM
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json().catch(() => ({}));
        const targetFolder = typeof body?.folder === 'string' && body.folder.trim() ? body.folder.trim() : '/';
        const recursive = body?.recursive !== false;

        const startTime = Date.now();

        // 1. Scan Nextcloud (or local storage fallback)
        const discoveredFiles = await scanNextcloudFiles(targetFolder, recursive);

        // 2. Fetch all existing asset Nextcloud URIs & deleted URIs to prevent resurrection
        const existingVersions = await prisma.assetVersion.findMany({
            select: { nextcloudUri: true },
        });
        const existingUris = new Set(existingVersions.map(v => v.nextcloudUri));
        const deletedUris = await getDeletedUris();

        let newImported = 0;
        let existingSkipped = 0;
        const importedTitles: string[] = [];

        // 3. Batch import new media assets
        for (const file of discoveredFiles) {
            const fileNorm = (file.filename || '').trim().toLowerCase();
            if (existingUris.has(file.filename) || deletedUris.has(fileNorm)) {
                existingSkipped++;
                continue;
            }


            try {
                await prisma.asset.create({
                    data: {
                        title: file.cleanTitle || file.basename,
                        description: `Discovered and ingested from Nextcloud: ${file.filename}`,
                        type: file.type,
                        mimeType: file.mimeType,
                        size: file.size,
                        creatorId: auth.userId,
                        status: 'APPROVED',
                        versions: {
                            create: [
                                {
                                    versionNum: 1,
                                    nextcloudUri: file.filename,
                                    proxyUri: file.filename,
                                }
                            ]
                        }
                    }
                });

                existingUris.add(file.filename);
                newImported++;
                importedTitles.push(file.cleanTitle || file.basename);
            } catch (createErr) {
                console.error(`Error importing asset ${file.filename}:`, createErr);
            }
        }

        const durationMs = Date.now() - startTime;

        // 4. Log audit trail
        try {
            await logActivity(auth.userId, 'CREATE', 'ASSET', 'NEXTCLOUD_SYNC', {
                targetFolder,
                totalFound: discoveredFiles.length,
                newImported,
                existingSkipped,
                durationMs,
            });
        } catch {
            // Non-blocking audit failure
        }

        return NextResponse.json({
            success: true,
            totalFound: discoveredFiles.length,
            newImported,
            existingSkipped,
            durationMs,
            importedTitles: importedTitles.slice(0, 10),
            message: newImported > 0
                ? `Successfully scanned ${discoveredFiles.length} files and imported ${newImported} new asset(s) into your library!`
                : discoveredFiles.length > 0
                    ? `Scanned ${discoveredFiles.length} file(s). All files are already up-to-date in your library.`
                    : `No media files found in folder '${targetFolder}'. Ensure your files have supported extensions (.mp4, .mov, .jpg, .png, .mp3, .wav, .pdf, etc.).`
        });
    } catch (err: any) {
        console.error('Error during Nextcloud sync:', err);
        return NextResponse.json({
            success: false,
            error: err?.message || 'Error scanning and synchronizing Nextcloud files'
        }, { status: 500 });
    }
}
