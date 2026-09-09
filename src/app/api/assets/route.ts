import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// GET /api/assets — List assets with advanced filtering
export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        
        // Search and filtering parameters
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const status = searchParams.get('status') || '';
        const projectId = searchParams.get('projectId') || '';
        const creatorId = searchParams.get('creatorId') || '';
        const tags = searchParams.getAll('tags') || [];
        const dateFrom = searchParams.get('dateFrom') || '';
        const dateTo = searchParams.get('dateTo') || '';
        
        // Pagination
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};

        // Full-text search across title, description, tags, and AI speech transcript
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { tags: { some: { name: { contains: search } } } },
                { transcript: { contains: search } },
            ];
        }

        // Filter by type
        if (type) where.type = type;

        // Filter by status
        if (status) where.status = status;

        // Filter by project
        if (projectId) where.projectId = projectId;

        // Filter by creator
        if (creatorId) where.creatorId = creatorId;

        // Filter by tags
        if (tags.length > 0) {
            where.tags = {
                some: {
                    name: {
                        in: tags,
                    },
                },
            };
        }

        // Filter by date range
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
            }
            if (dateTo) {
                const endOfDay = new Date(dateTo);
                endOfDay.setHours(23, 59, 59, 999);
                (where.createdAt as Record<string, unknown>).lte = endOfDay;
            }
        }

        const [assets, total] = await Promise.all([
            prisma.asset.findMany({
                where,
                include: {
                    creator: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                    versions: { orderBy: { versionNum: 'desc' }, take: 1 },
                    tags: true,
                    _count: { select: { comments: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.asset.count({ where }),
        ]);

        // Get favorite status for all returned assets
        const assetIds = assets.map(asset => asset.id);
        const favorites = await prisma.assetFavorite.findMany({
            where: {
                userId: auth.userId,
                assetId: { in: assetIds },
            },
            select: { assetId: true },
        });

        const favoriteSet = new Set(favorites.map(f => f.assetId));

        // Add favorite status to each asset
        const assetsWithFavorites = assets.map(asset => ({
            ...asset,
            isFavorited: favoriteSet.has(asset.id),
        }));

        // Log search activity
        await logActivity(
            auth.userId,
            'VIEW',
            'ASSET',
            'search', // Special entityId for search operations
            {
                search,
                type,
                status,
                projectId,
                creatorId,
                tags,
                dateFrom,
                dateTo,
                totalResults: total,
            },
            req
        );

        return NextResponse.json({ assets: assetsWithFavorites, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
