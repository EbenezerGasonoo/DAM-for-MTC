import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// POST /api/assets/bulk/move — Move multiple assets to collection
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { assetIds, collectionId } = body;

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json({ error: 'Asset IDs array is required' }, { status: 400 });
        }

        if (!collectionId) {
            return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
        }

        // Verify collection exists and belongs to user
        const collection = await prisma.collection.findUnique({
            where: { id: collectionId },
        });

        if (!collection) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        if (collection.ownerId !== auth.userId) {
            return NextResponse.json({ error: 'Forbidden - collection does not belong to you' }, { status: 403 });
        }

        const results = [];
        let successCount = 0;

        for (const assetId of assetIds) {
            try {
                // Delete from other collections first (move not add)
                await prisma.collectionAsset.deleteMany({
                    where: { assetId },
                });

                // Add to target collection
                await prisma.collectionAsset.create({
                    data: {
                        assetId,
                        collectionId,
                    },
                });

                results.push({ assetId, success: true });
                successCount++;
            } catch (error) {
                results.push({ assetId, success: false, error: String(error) });
            }
        }

        // Log activity
        await logActivity(
            auth.userId,
            'UPDATE',
            'ASSET',
            assetIds[0],
            {
                operation: 'bulk_move',
                assetCount: assetIds.length,
                collectionId,
                collectionName: collection.name,
                successCount,
            },
            req
        );

        return NextResponse.json({
            success: successCount === assetIds.length,
            totalAssets: assetIds.length,
            successCount,
            collectionId: collection.id,
            collectionName: collection.name,
            results,
        });
    } catch (error) {
        console.error('Error bulk moving assets:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
