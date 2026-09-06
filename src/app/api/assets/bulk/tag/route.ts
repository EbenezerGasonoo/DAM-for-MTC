import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// POST /api/assets/bulk/tag — Bulk tag multiple assets
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { assetIds, tags, operation } = body; // operation: 'add', 'remove', 'set'

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json({ error: 'Asset IDs array is required' }, { status: 400 });
        }

        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return NextResponse.json({ error: 'Tags array is required' }, { status: 400 });
        }

        const bulkOp = operation || 'add';
        if (!['add', 'remove', 'set'].includes(bulkOp)) {
            return NextResponse.json({ error: 'Operation must be add, remove, or set' }, { status: 400 });
        }

        const results = [];
        let successCount = 0;

        for (const assetId of assetIds) {
            try {
                if (bulkOp === 'set') {
                    // Replace all tags
                    await prisma.asset.update({
                        where: { id: assetId },
                        data: {
                            tags: {
                                set: [],
                                connectOrCreate: tags.map(t => ({
                                    where: { name: t },
                                    create: { name: t },
                                })),
                            },
                        },
                    });
                    results.push({ assetId, success: true });
                    successCount++;
                } else if (bulkOp === 'add') {
                    // Add tags
                    await prisma.asset.update({
                        where: { id: assetId },
                        data: {
                            tags: {
                                connectOrCreate: tags.map(t => ({
                                    where: { name: t },
                                    create: { name: t },
                                })),
                            },
                        },
                    });
                    results.push({ assetId, success: true });
                    successCount++;
                } else if (bulkOp === 'remove') {
                    // Remove tags
                    await prisma.asset.update({
                        where: { id: assetId },
                        data: {
                            tags: {
                                disconnect: tags.map(t => ({ name: t })),
                            },
                        },
                    });
                    results.push({ assetId, success: true });
                    successCount++;
                }
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
                operation: 'bulk_tag',
                assetCount: assetIds.length,
                tags,
                successCount,
            },
            req
        );

        return NextResponse.json({
            success: successCount === assetIds.length,
            operation: bulkOp,
            totalAssets: assetIds.length,
            successCount,
            results,
        });
    } catch (error) {
        console.error('Error bulk tagging assets:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
