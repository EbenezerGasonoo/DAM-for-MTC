import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// GET /api/analytics/dashboard — Admin analytics dashboard
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '30');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Total events by type
        const eventsByType = await prisma.analyticsEvent.groupBy({
            by: ['eventType'],
            where: {
                createdAt: { gte: startDate },
            },
            _count: true,
        });

        // Most viewed/downloaded assets
        const topAssets = await prisma.analyticsEvent.groupBy({
            by: ['assetId'],
            where: {
                createdAt: { gte: startDate },
                assetId: { not: null },
                eventType: { in: ['VIEW', 'DOWNLOAD'] },
            },
            _count: true,
            orderBy: { _count: { assetId: 'desc' } },
            take: 10,
        });

        // Get asset details for top assets
        const topAssetIds = topAssets
            .filter(item => item.assetId)
            .map(item => item.assetId as string);

        const assetDetails = await prisma.asset.findMany({
            where: { id: { in: topAssetIds } },
            select: {
                id: true,
                title: true,
                type: true,
                creator: { select: { name: true } },
            },
        });

        const topAssetsWithDetails = topAssets.map(item => ({
            assetId: item.assetId,
            count: item._count,
            asset: assetDetails.find(a => a.id === item.assetId) || null,
        }));

        // Events over time (daily trend)
        const dailyEvents = await prisma.$queryRaw<
            Array<{ date: Date; count: number }>
        >`
            SELECT DATE(createdAt) as date, COUNT(*) as count
            FROM AnalyticsEvent
            WHERE createdAt >= ${startDate}
            GROUP BY DATE(createdAt)
            ORDER BY date DESC
            LIMIT 30
        `;

        // Most active users
        const topUsers = await prisma.analyticsEvent.groupBy({
            by: ['userId'],
            where: {
                createdAt: { gte: startDate },
            },
            _count: true,
            orderBy: { _count: { userId: 'desc' } },
            take: 10,
        });

        // Get user details for top users
        const topUserIds = topUsers.map(item => item.userId).filter((id): id is string => id !== null);
        const userDetails = await prisma.user.findMany({
            where: { id: { in: topUserIds } },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        const topUsersWithDetails = topUsers.map(item => ({
            userId: item.userId,
            count: item._count,
            user: userDetails.find(u => u.id === item.userId) || null,
        }));

        // Download vs View ratio
        const viewCount = await prisma.analyticsEvent.count({
            where: {
                createdAt: { gte: startDate },
                eventType: 'VIEW',
            },
        });

        const downloadCount = await prisma.analyticsEvent.count({
            where: {
                createdAt: { gte: startDate },
                eventType: 'DOWNLOAD',
            },
        });

        // Search behavior
        const searches = await prisma.analyticsEvent.findMany({
            where: {
                createdAt: { gte: startDate },
                eventType: 'SEARCH',
            },
            select: { metadata: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Extract search terms
        const searchTerms: Record<string, number> = {};
        searches.forEach(s => {
            if (s.metadata) {
                try {
                    const data = JSON.parse(s.metadata);
                    if (data.searchTerm) {
                        searchTerms[data.searchTerm] = (searchTerms[data.searchTerm] || 0) + 1;
                    }
                } catch (_e) {}
            }
        });

        const topSearches = Object.entries(searchTerms)
            .map(([term, count]) => ({ term, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Total unique users
        const uniqueUsers = await prisma.analyticsEvent.findMany({
            where: {
                createdAt: { gte: startDate },
            },
            distinct: ['userId'],
            select: { userId: true },
        });

        // Engagement metrics
        const totalEvents = await prisma.analyticsEvent.count({
            where: {
                createdAt: { gte: startDate },
            },
        });

        const avgEventsPerUser = uniqueUsers.length > 0 
            ? Math.round((totalEvents / uniqueUsers.length) * 100) / 100 
            : 0;

        return NextResponse.json({
            period: `Last ${days} days`,
            startDate,
            endDate: new Date(),
            summary: {
                totalEvents,
                uniqueUsers: uniqueUsers.length,
                avgEventsPerUser,
                views: viewCount,
                downloads: downloadCount,
                downloadToViewRatio: viewCount > 0 
                    ? Math.round((downloadCount / viewCount) * 10000) / 100 + '%'
                    : 'N/A',
            },
            eventsByType: eventsByType.map(e => ({
                type: e.eventType,
                count: e._count,
            })),
            topAssets: topAssetsWithDetails,
            topUsers: topUsersWithDetails,
            topSearches,
            dailyTrend: dailyEvents.map(e => ({
                date: new Date(e.date),
                count: e.count,
            })),
        });
    } catch (error) {
        console.error('Error fetching analytics dashboard:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
