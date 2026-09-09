import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { verifyConnection, getActiveNextcloudConfig } from '@/lib/nextcloud';


export async function GET() {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [
            totalAssets,
            activeProjects,
            inReviewAssets,
            publishedAssets,
            recentAssets,
            assetSizeAggregate,
            typeGroups,
            recentActivities,
            ncConnection
        ] = await Promise.all([
            prisma.asset.count(),
            prisma.project.count({ where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } } }),
            prisma.asset.count({ where: { status: 'REVIEW' } }),
            prisma.asset.count({ where: { status: { in: ['APPROVED', 'PUBLISHED'] } } }),
            prisma.asset.findMany({
                take: 6,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: { select: { id: true, name: true } },
                    versions: { take: 1, orderBy: { versionNum: 'desc' } }
                }
            }),
            prisma.asset.aggregate({
                _sum: { size: true }
            }),
            prisma.asset.groupBy({
                by: ['type'],
                _sum: { size: true },
                _count: true,
            }),
            prisma.activityLog.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, name: true, email: true } }
                }
            }),
            verifyConnection()
        ]);

        const totalBytes = assetSizeAggregate._sum.size || 0;

        const typeSizes: Record<string, number> = {
            video: 0,
            image: 0,
            audio: 0,
            document: 0,
        };

        for (const tg of typeGroups) {
            if (tg.type in typeSizes) {
                typeSizes[tg.type] = tg._sum.size || 0;
            }
        }

        const ncConfig = await getActiveNextcloudConfig();

        return NextResponse.json({
            stats: {
                totalAssets,
                activeProjects,
                inReviewAssets,
                publishedAssets,
            },
            recentAssets,
            storage: {
                totalBytes,
                typeSizes,
                nextcloud: ncConnection.success ? {
                    connected: true,
                    serverUrl: ncConfig.url,
                    used: ncConnection.quota?.used ?? totalBytes,
                    available: ncConnection.quota?.available ?? 0,
                } : {
                    connected: false,
                    serverUrl: ncConfig.url,
                    error: ncConnection.error || 'Nextcloud not connected'
                }
            },
            recentActivities,
        });
    } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        return NextResponse.json({ error: err?.message || 'Failed to fetch dashboard metrics' }, { status: 500 });
    }
}
