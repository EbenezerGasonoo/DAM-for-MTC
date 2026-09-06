import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// POST /api/assets/bulk/status — Update status of multiple assets
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { assetIds, status } = body;

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json({ error: 'Asset IDs array is required' }, { status: 400 });
        }

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        if (!['DRAFT', 'REVIEW', 'APPROVED'].includes(status)) {
            return NextResponse.json({ error: 'Status must be DRAFT, REVIEW, or APPROVED' }, { status: 400 });
        }

        const results = await prisma.asset.updateMany({
            where: { id: { in: assetIds } },
            data: { status },
        });

        // Log activity
        await logActivity(
            auth.userId,
            'UPDATE',
            'ASSET',
            assetIds[0],
            {
                operation: 'bulk_status',
                assetCount: assetIds.length,
                status,
                updatedCount: results.count,
            },
            req
        );

        return NextResponse.json({
            success: results.count === assetIds.length,
            totalAssets: assetIds.length,
            updatedCount: results.count,
            newStatus: status,
        });
    } catch (error) {
        console.error('Error bulk updating asset status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
