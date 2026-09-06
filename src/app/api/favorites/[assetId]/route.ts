import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// DELETE /api/favorites/[assetId] — Remove asset from favorites
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ assetId: string }> }
) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { assetId } = await params;

        // Find and delete the favorite
        const favorite = await prisma.assetFavorite.findUnique({
            where: {
                userId_assetId: {
                    userId: auth.userId,
                    assetId,
                },
            },
            include: {
                asset: { select: { title: true } },
            },
        });

        if (!favorite) {
            return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
        }

        await prisma.assetFavorite.delete({
            where: {
                userId_assetId: {
                    userId: auth.userId,
                    assetId,
                },
            },
        });

        // Log activity
        await logActivity(auth.userId, 'DELETE', 'FAVORITE', favorite.id, {
            assetId,
            assetTitle: favorite.asset.title,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing favorite:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/favorites/[assetId] — Check if asset is favorited
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ assetId: string }> }
) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { assetId } = await params;

        const favorite = await prisma.assetFavorite.findUnique({
            where: {
                userId_assetId: {
                    userId: auth.userId,
                    assetId,
                },
            },
        });

        return NextResponse.json({ isFavorited: !!favorite });
    } catch (error) {
        console.error('Error checking favorite status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}