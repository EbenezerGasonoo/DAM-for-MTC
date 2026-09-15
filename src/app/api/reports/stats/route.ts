import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

// Report Statistics API Route

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const myReportsOnly = searchParams.get('myReports') === 'true' || auth.role === 'VIEWER';

        const baseWhere = myReportsOnly ? { submittedById: auth.userId } : {};

        const [total, open, inReview, resolved, closed, critical, high] = await Promise.all([
            prisma.report.count({ where: baseWhere }),
            prisma.report.count({ where: { ...baseWhere, status: 'OPEN' } }),
            prisma.report.count({ where: { ...baseWhere, status: 'IN_REVIEW' } }),
            prisma.report.count({ where: { ...baseWhere, status: 'RESOLVED' } }),
            prisma.report.count({ where: { ...baseWhere, status: 'CLOSED' } }),
            prisma.report.count({ where: { ...baseWhere, priority: 'CRITICAL', status: { in: ['OPEN', 'IN_REVIEW'] } } }),
            prisma.report.count({ where: { ...baseWhere, priority: 'HIGH', status: { in: ['OPEN', 'IN_REVIEW'] } } }),
        ]);

        // Group by type for distribution breakdown
        const typeGroup = await prisma.report.groupBy({
            by: ['type'],
            where: baseWhere,
            _count: { _all: true },
        });

        const byType: Record<string, number> = {};
        for (const item of typeGroup) {
            byType[item.type] = item._count._all;
        }

        return NextResponse.json({
            stats: {
                total,
                open,
                inReview,
                resolved,
                closed,
                urgentPending: critical + high,
                byType,
            },
        });
    } catch (error) {
        console.error('Failed to get report stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
