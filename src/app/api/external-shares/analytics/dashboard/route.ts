import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/admin';

// GET /api/external-shares/analytics/dashboard — Share analytics for user's shares
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '30');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get user's shares
        const userShares = await prisma.externalShare.findMany({
            where: { createdById: auth.userId },
            select: { id: true, shareToken: true, entityId: true, entityType: true, expiresAt: true },
        });

        if (userShares.length === 0) {
            return NextResponse.json({
                summary: {
                    totalShares: 0,
                    activeShares: 0,
                    expiredShares: 0,
                    totalAccess: 0,
                    uniqueAccessors: 0,
                },
                shares: [],
                trending: [],
                accessTimeline: [],
                period: `Last ${days} days`,
            });
        }

        // Get analytics for shares (marked with shareToken in metadata)
        const shareAnalytics = await prisma.analyticsEvent.findMany({
            where: {
                createdAt: { gte: startDate },
                eventType: 'SHARE',
                metadata: {
                    contains: userShares[0].shareToken, // Quick filter
                },
            },
        });

        // Parse and group analytics by share
        const accessByShare: Record<string, { timestamp: Date; userId: string }[]> = {};
        const uniqueAccessors = new Set<string>();

        for (const event of shareAnalytics) {
            if (event.metadata) {
                try {
                    const data = JSON.parse(event.metadata);
                    if (data.shareToken) {
                        if (!accessByShare[data.shareToken]) {
                            accessByShare[data.shareToken] = [];
                        }
                        accessByShare[data.shareToken].push({
                            timestamp: event.createdAt,
                            userId: event.userId || 'anonymous',
                        });
                        uniqueAccessors.add(event.userId || 'anonymous');
                    }
                } catch (_e) {
                    /* ignore malformed analytics metadata */
                }
            }
        }

        // Get share details
        const shareDetails = await Promise.all(
            userShares.map(async (share) => {
                const accesses = accessByShare[share.shareToken] || [];
                let entity = null;

                if (share.entityType === 'ASSET') {
                    entity = await prisma.asset.findUnique({
                        where: { id: share.entityId },
                        select: { id: true, title: true, type: true },
                    });
                }

                return {
                    shareToken: share.shareToken,
                    entity,
                    entityType: share.entityType,
                    accesses: accesses.length,
                    isExpired: share.expiresAt ? new Date(share.expiresAt) < new Date() : false,
                    expiresAt: share.expiresAt,
                    lastAccessed: accesses.length > 0 ? new Date(Math.max(...accesses.map(a => new Date(a.timestamp).getTime()))) : null,
                    firstAccessed: accesses.length > 0 ? new Date(Math.min(...accesses.map(a => new Date(a.timestamp).getTime()))) : null,
                };
            })
        );

        // Sort by accesses
        shareDetails.sort((a, b) => b.accesses - a.accesses);

        // Daily access trend
        const dailyAccess: Record<string, number> = {};
        for (const event of shareAnalytics) {
            const date = new Date(event.createdAt).toISOString().split('T')[0];
            dailyAccess[date] = (dailyAccess[date] || 0) + 1;
        }

        const accessTimeline = Object.entries(dailyAccess)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));

        return NextResponse.json({
            summary: {
                totalShares: userShares.length,
                activeShares: shareDetails.filter(s => !s.isExpired).length,
                expiredShares: shareDetails.filter(s => s.isExpired).length,
                totalAccess: Object.values(accessByShare).reduce((sum, accesses) => sum + accesses.length, 0),
                uniqueAccessors: uniqueAccessors.size,
                avgAccessPerShare: Math.round(
                    (Object.values(accessByShare).reduce((sum, accesses) => sum + accesses.length, 0) /
                        userShares.length) *
                        100
                ) / 100,
            },
            shares: shareDetails,
            trending: shareDetails.slice(0, 5),
            accessTimeline,
            period: `Last ${days} days`,
        });
    } catch (error) {
        console.error('Error fetching share analytics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
