import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { checkEntityAccess } from '@/lib/permissions';
import { readAssetFile } from '@/lib/nextcloud';
import archiver from 'archiver';

interface BulkExportRequest {
    assetIds: string[];
    includeMetadata?: boolean;
    includeVersions?: boolean;
    includeCustomFields?: boolean;
    versionType?: 'latest' | 'all'; // Only for includeVersions
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json() as BulkExportRequest;
        const {
            assetIds,
            includeMetadata = true,
            includeVersions = false,
            includeCustomFields = true,
            versionType = 'latest',
        } = body;

        if (!Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json(
                { error: 'assetIds must be a non-empty array' },
                { status: 400 }
            );
        }

        if (assetIds.length > 100) {
            return NextResponse.json(
                { error: 'Maximum 100 assets can be exported at once' },
                { status: 400 }
            );
        }

        // Check access to all assets
        const accessChecks = await Promise.all(
            assetIds.map(id => checkEntityAccess(auth.userId, 'ASSET', id, 'VIEW'))
        );

        const deniedCount = accessChecks.filter(a => !a).length;
        if (deniedCount > 0) {
            return NextResponse.json(
                { error: `Access denied to ${deniedCount} asset(s)` },
                { status: 403 }
            );
        }

        // Fetch assets with related data
        const assets = await prisma.asset.findMany({
            where: { id: { in: assetIds } },
            include: {
                tags: true,
                fieldValues: {
                    include: { definition: true },
                },
                versions: { orderBy: { versionNum: 'desc' } },
                creator: { select: { id: true, name: true, email: true } },
            },
        });

        // Create ZIP archive
        const archive = archiver('zip', { zlib: { level: 6 } });

        // Set response headers for ZIP download
        const filename = `bulk-export-${Date.now()}.zip`;
        const response = new NextResponse(
            new ReadableStream({
                async start(controller) {
                    try {
                        // Archive events
                        archive.on('data', (data: Buffer) => {
                            controller.enqueue(data);
                        });

                        archive.on('end', () => {
                            controller.close();
                        });

                        archive.on('error', (err: Error) => {
                            console.error('Archive error:', err);
                            controller.error(err);
                        });

                        // Create metadata directory
                        if (includeMetadata) {
                            const metadata: {
                                exportedAt: string;
                                exportedBy: string;
                                assetCount: number;
                                assets: Record<string, unknown>[];
                            } = {
                                exportedAt: new Date().toISOString(),
                                exportedBy: auth.userId,
                                assetCount: assets.length,
                                assets: [],
                            };

                            // Build asset list for metadata
                            for (const asset of assets) {
                                const assetMeta: Record<string, unknown> = {
                                    id: asset.id,
                                    title: asset.title,
                                    description: asset.description,
                                    type: asset.type,
                                    mimeType: asset.mimeType,
                                    size: asset.size,
                                    status: asset.status,
                                    createdAt: asset.createdAt,
                                    createdBy: asset.creator,
                                    tags: asset.tags.map(t => t.name),
                                };

                                if (includeCustomFields && asset.fieldValues.length > 0) {
                                    assetMeta.customFields = asset.fieldValues.reduce(
                                        (acc: Record<string, string>, fv: typeof asset.fieldValues[0]) => {
                                            acc[fv.definition.name] = fv.value ?? '';
                                            return acc;
                                        },
                                        {}
                                    );
                                }

                                if (includeVersions && asset.versions.length > 0) {
                                    assetMeta.versions = asset.versions.map(v => ({
                                        versionNum: v.versionNum,
                                        createdAt: v.createdAt,
                                        nextcloudUri: v.nextcloudUri,
                                    }));
                                }

                                metadata.assets.push(assetMeta);
                            }

                            archive.append(
                                JSON.stringify(metadata, null, 2),
                                { name: 'METADATA.json' }
                            );
                        }

                        // Add asset files to archive
                        for (const asset of assets) {
                            try {
                                const folderName = asset.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

                                // Add latest version
                                if (asset.versions && asset.versions.length > 0) {
                                    const latestVersion = asset.versions[0];

                                    try {
                                        const fileBuffer = await readAssetFile(latestVersion.nextcloudUri);
                                        if (fileBuffer) {
                                            const ext = getFileExtension(asset.mimeType);
                                            const filename = `${folderName}${ext}`;
                                            archive.append(fileBuffer, { name: `${asset.id}/${filename}` });
                                        }
                                    } catch (e) {
                                        console.error(`Failed to read file for asset ${asset.id}:`, e);
                                    }

                                    // Add other versions if requested
                                    if (includeVersions && versionType === 'all') {
                                        for (let i = 1; i < asset.versions.length; i++) {
                                            const version = asset.versions[i];

                                            try {
                                                const versionBuffer = await readAssetFile(version.nextcloudUri);
                                                if (versionBuffer) {
                                                    const ext = getFileExtension(asset.mimeType);
                                                    const versionFilename = `${folderName}_v${version.versionNum}${ext}`;
                                                    archive.append(versionBuffer, {
                                                        name: `${asset.id}/versions/${versionFilename}`,
                                                    });
                                                }
                                            } catch (e) {
                                                console.error(
                                                    `Failed to read version ${version.versionNum} for asset ${asset.id}:`,
                                                    e
                                                );
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error(`Failed to process asset ${asset.id}:`, e);
                            }
                        }

                        // Finalize archive
                        await archive.finalize();
                    } catch (error) {
                        console.error('Export error:', error);
                        controller.error(error);
                    }
                },
            })
        );

        response.headers.set('Content-Type', 'application/zip');
        response.headers.set(
            'Content-Disposition',
            `attachment; filename="${filename}"`
        );
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

        // Log activity
        try {
            await prisma.activityLog.create({
                data: {
                    userId: auth.userId,
                    action: 'BULK_EXPORT',
                    entityType: 'ASSET',
                    entityId: 'BULK',
                    details: JSON.stringify({
                        assetCount: assets.length,
                        assetIds,
                        includeMetadata,
                        includeVersions,
                        includeCustomFields,
                    }),
                },
            });
        } catch (_e) {
            console.error('Failed to log activity:', _e);
        }

        return response;
    } catch (error) {
        console.error('Failed to export assets:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'video/x-msvideo': '.avi',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'audio/aac': '.aac',
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    };

    return mimeMap[mimeType] || '.bin';
}
