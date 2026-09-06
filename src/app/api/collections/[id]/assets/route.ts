import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { assetId } = body;

        if (!assetId) {
            return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
        }

        const collection = await prisma.collection.findUnique({
            where: { id },
        });

        if (!collection) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        if (collection.ownerId !== auth.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const collectionAsset = await prisma.collectionAsset.create({
            data: {
                collectionId: id,
                assetId,
            },
            include: { asset: true },
        });

        return NextResponse.json(collectionAsset, { status: 201 });
    } catch (error) {
        console.error('Error adding asset to collection:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const assetId = searchParams.get('assetId');

        if (!assetId) {
            return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
        }

        const collection = await prisma.collection.findUnique({
            where: { id },
        });

        if (!collection) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        if (collection.ownerId !== auth.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.collectionAsset.delete({
            where: {
                collectionId_assetId: {
                    collectionId: id,
                    assetId,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing asset from collection:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
