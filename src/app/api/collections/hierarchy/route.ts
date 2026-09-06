import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { getUserCollectionsTree, getCollectionPath } from '@/lib/collections';

// GET /api/collections — Get user's collections with hierarchy
export async function GET(_req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tree = await getUserCollectionsTree(auth.userId);

        return NextResponse.json({
            collections: tree,
            count: tree.length,
        });
    } catch (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/collections — Create new collection
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, parentCollectionId } = body;

        if (!name) {
            return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
        }

        // Verify parent collection exists and belongs to user
        if (parentCollectionId) {
            const parent = await prisma.collection.findUnique({
                where: { id: parentCollectionId },
            });

            if (!parent || parent.ownerId !== auth.userId) {
                return NextResponse.json({ error: 'Parent collection not found' }, { status: 404 });
            }
        }

        const collection = await prisma.collection.create({
            data: {
                name,
                description: description || null,
                ownerId: auth.userId,
                parentCollectionId: parentCollectionId || null,
            },
            include: {
                _count: {
                    select: {
                        assets: true,
                        childCollections: true,
                    },
                },
            },
        });

        return NextResponse.json(
            {
                ...collection,
                assetCount: collection._count.assets,
                childrenCount: collection._count.childCollections,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/collections/[id] — Get collection details with hierarchy info
export async function GET2(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const collection = await prisma.collection.findUnique({
            where: { id },
            include: {
                assets: {
                    include: {
                        asset: {
                            select: { id: true, title: true, type: true },
                        },
                    },
                },
                childCollections: {
                    include: {
                        _count: {
                            select: {
                                assets: true,
                                childCollections: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        assets: true,
                        childCollections: true,
                    },
                },
            },
        });

        if (!collection || collection.ownerId !== auth.userId) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        const path = await getCollectionPath(id);

        return NextResponse.json({
            ...collection,
            assetCount: collection._count.assets,
            childrenCount: collection._count.childCollections,
            path,
        });
    } catch (error) {
        console.error('Error fetching collection:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
