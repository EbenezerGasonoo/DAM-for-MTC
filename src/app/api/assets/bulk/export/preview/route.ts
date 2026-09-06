import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { checkEntityAccess } from '@/lib/permissions';
import { estimateArchiveSize, formatBytes } from '@/lib/export-utils';

interface PreviewRequest {
    assetIds: string[];
    includeVersions?: boolean;
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!auth.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json() as PreviewRequest;
        const { assetIds, includeVersions = false } = body;

        if (!Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json(
                { error: 'assetIds must be a non-empty array' },
                { status: 400 }
            );
        }

        if (assetIds.length > 100) {
            return NextResponse.json(
                { error: 'Maximum 100 assets can be previewed at once' },
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

        // Fetch assets
        const assets = await prisma.asset.findMany({
            where: { id: { in: assetIds } },
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                mimeType: true,
                size: true,
                status: true,
                createdAt: true,
                versions: includeVersions
                    ? { select: { versionNum: true, createdAt: true } }
                    : false,
                tags: { select: { name: true } },
                _count: { select: { versions: true } },
            },
        });

        // Calculate totals
        const totalSize = assets.reduce((sum: number, a: typeof assets[0]) => sum + a.size, 0);
        const estimatedZipSize = estimateArchiveSize(
            assets.map(a => ({
                size: a.size,
                versionCount: a._count.versions,
            })),
            includeVersions,
            true
        );

        const preview = {
            assetCount: assets.length,
            accessDeniedCount: deniedCount,
            totalFileSize: totalSize,
            totalFileSizeFormatted: formatBytes(totalSize),
            estimatedZipSize,
            estimatedZipSizeFormatted: formatBytes(estimatedZipSize),
            assets: assets.map((a: typeof assets[0]) => ({
                id: a.id,
                title: a.title,
                size: a.size,
                sizeFormatted: formatBytes(a.size),
                type: a.type,
                status: a.status,
                versionCount: a.versions?.length || 1,
                tagCount: a.tags.length,
            })),
            warnings: [] as string[],
        };

        // Add warnings
        if (estimatedZipSize > 1024 * 1024 * 1024) {
            // 1GB
            preview.warnings.push(
                'Export size exceeds 1GB. This may take a while to generate.'
            );
        }

        if (assets.length > 50) {
            preview.warnings.push(
                'Exporting more than 50 assets may be slow. Consider exporting in batches.'
            );
        }

        if (includeVersions) {
            const totalVersions = assets.reduce((sum, a) => {
                const v = a.versions;
                const len = Array.isArray(v) ? v.length : 0;
                return sum + (len || 1);
            }, 0);
            if (totalVersions > 200) {
                preview.warnings.push(
                    `Including ${totalVersions} versions will significantly increase export size.`
                );
            }
        }

        return NextResponse.json(preview);
    } catch (error) {
        console.error('Failed to preview export:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
