import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

export interface SavedSearchFilters {
    searchText?: string;
    type?: string;
    creator?: string;
    tags?: string[];
    status?: string;
    project?: string;
    dateFrom?: string;
    dateTo?: string;
}

export async function GET(_req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const savedSearches = await prisma.savedSearch.findMany({
            where: { ownerId: auth.userId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(savedSearches.map(s => ({
            ...s,
            filters: s.filters ? JSON.parse(s.filters) : {},
        })));
    } catch (error) {
        console.error('Error fetching saved searches:', error);
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
        const { name, description, filters } = body;

        if (!name) {
            return NextResponse.json({ error: 'Search name is required' }, { status: 400 });
        }

        const savedSearch = await prisma.savedSearch.create({
            data: {
                name,
                description: description || null,
                ownerId: auth.userId,
                filters: typeof filters === 'string' ? filters : JSON.stringify(filters || {}),
            },
        });

        return NextResponse.json({
            ...savedSearch,
            filters: JSON.parse(savedSearch.filters),
        }, { status: 201 });
    } catch (error: unknown) {
        if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'P2002'
        ) {
            return NextResponse.json({ error: 'A saved search with that name already exists' }, { status: 400 });
        }
        console.error('Error creating saved search:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
