import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET(_req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const collections = await prisma.collection.findMany({
            where: { ownerId: auth.userId },
            include: {
                assets: {
                    include: { asset: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(collections);
    } catch (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
        }

        const collection = await prisma.collection.create({
            data: {
                name,
                description: description || null,
                ownerId: auth.userId,
            },
            include: {
                assets: {
                    include: { asset: true },
                },
            },
        });

        return NextResponse.json(collection, { status: 201 });
    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
