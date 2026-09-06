import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// GET /api/favorites — Get user's favorite assets
export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const [favorites, total] = await Promise.all([
            prisma.assetFavorite.findMany({
                where: { userId: auth.userId },
                include: {
                    asset: {
                        include: {
                            creator: { select: { id: true, name: true } },
                            project: { select: { id: true, name: true } },
                            versions: { orderBy: { versionNum: 'desc' }, take: 1 },
                            tags: true,
                            _count: { select: { comments: true } },
                        },
                    },
                },
                orderBy: { addedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.assetFavorite.count({ where: { userId: auth.userId } }),
        ]);

        return NextResponse.json({
            favorites: favorites.map(f => f.asset),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/favorites — Add asset to favorites
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { assetId } = await req.json();

        if (!assetId) {
            return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
        }

        // Check if asset exists
        const asset = await prisma.asset.findUnique({
            where: { id: assetId },
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // Check if already favorited
        const existing = await prisma.assetFavorite.findUnique({
            where: {
                userId_assetId: {
                    userId: auth.userId,
                    assetId,
                },
            },
        });

        if (existing) {
            return NextResponse.json({ error: 'Asset already in favorites' }, { status: 409 });
        }

        // Add to favorites
        const favorite = await prisma.assetFavorite.create({
            data: {
                userId: auth.userId,
                assetId,
            },
        });

        // Log activity
        await logActivity(auth.userId, 'CREATE', 'FAVORITE', favorite.id, {
            assetId,
            assetTitle: asset.title,
        });

        return NextResponse.json({ success: true, favorite });
    } catch (error) {
        console.error('Error adding favorite:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}