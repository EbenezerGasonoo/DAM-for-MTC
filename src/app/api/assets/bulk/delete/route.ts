import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// POST /api/assets/bulk/delete — Delete multiple assets
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { assetIds, confirm } = body;

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json({ error: 'Asset IDs array is required' }, { status: 400 });
        }

        if (!confirm) {
            return NextResponse.json({
                error: 'Deletion requires explicit confirmation',
                message: `You are about to permanently delete ${assetIds.length} asset(s). This cannot be undone. Set confirm: true to proceed.`,
            }, { status: 400 });
        }

        const results = [];
        let successCount = 0;

        for (const assetId of assetIds) {
            try {
                // Delete related data
                await prisma.comment.deleteMany({ where: { assetId } });
                await prisma.assetVersion.deleteMany({ where: { assetId } });
                await prisma.collectionAsset.deleteMany({ where: { assetId } });
                await prisma.customFieldValue.deleteMany({ where: { assetId } });

                // Delete asset
                await prisma.asset.delete({ where: { id: assetId } });

                results.push({ assetId, success: true });
                successCount++;
            } catch (error) {
                results.push({ assetId, success: false, error: String(error) });
            }
        }

        // Log activity
        await logActivity(
            auth.userId,
            'DELETE',
            'ASSET',
            assetIds[0],
            {
                operation: 'bulk_delete',
                assetCount: assetIds.length,
                successCount,
            },
            req
        );

        return NextResponse.json({
            success: successCount === assetIds.length,
            totalAssets: assetIds.length,
            deletedCount: successCount,
            results,
            warning: 'Deleted assets cannot be recovered',
        });
    } catch (error) {
        console.error('Error bulk deleting assets:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
