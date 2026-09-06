import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const savedSearch = await prisma.savedSearch.findUnique({
            where: { id },
        });

        if (!savedSearch || savedSearch.ownerId !== auth.userId) {
            return NextResponse.json({ error: 'Saved search not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...savedSearch,
            filters: JSON.parse(savedSearch.filters),
        });
    } catch (error) {
        console.error('Error fetching saved search:', error);
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

        const savedSearch = await prisma.savedSearch.findUnique({
            where: { id },
        });

        if (!savedSearch) {
            return NextResponse.json({ error: 'Saved search not found' }, { status: 404 });
        }

        if (savedSearch.ownerId !== auth.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.savedSearch.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting saved search:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
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
        const { name, description, filters } = body;

        const savedSearch = await prisma.savedSearch.findUnique({
            where: { id },
        });

        if (!savedSearch) {
            return NextResponse.json({ error: 'Saved search not found' }, { status: 404 });
        }

        if (savedSearch.ownerId !== auth.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updated = await prisma.savedSearch.update({
            where: { id },
            data: {
                name: name !== undefined ? name : savedSearch.name,
                description: description !== undefined ? description : savedSearch.description,
                filters: filters !== undefined ? JSON.stringify(filters) : savedSearch.filters,
            },
        });

        return NextResponse.json({
            ...updated,
            filters: JSON.parse(updated.filters),
        });
    } catch (error: unknown) {
        if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'P2002'
        ) {
            return NextResponse.json({ error: 'A saved search with that name already exists' }, { status: 400 });
        }
        console.error('Error updating saved search:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
