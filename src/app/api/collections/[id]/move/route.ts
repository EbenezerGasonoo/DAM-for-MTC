import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { moveCollection, getCollectionPath } from '@/lib/collections';

// PATCH /api/collections/[id]/move — Move collection to new parent
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { parentCollectionId } = body;

        // Verify collection exists and belongs to user
        const collection = await prisma.collection.findUnique({ where: { id } });
        if (!collection || collection.ownerId !== auth.userId) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        const result = await moveCollection(id, parentCollectionId || null);
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        const updated = await prisma.collection.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        assets: true,
                        childCollections: true,
                    },
                },
            },
        });

        return NextResponse.json({
            ...updated,
            assetCount: updated?._count.assets,
            childrenCount: updated?._count.childCollections,
            message: 'Collection moved successfully',
        });
    } catch (error) {
        console.error('Error moving collection:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/collections/[id]/path — Get breadcrumb path
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const collection = await prisma.collection.findUnique({
            where: { id },
            select: { ownerId: true },
        });

        if (!collection || collection.ownerId !== auth.userId) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        const path = await getCollectionPath(id);

        return NextResponse.json({ path });
    } catch (error) {
        console.error('Error fetching collection path:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
