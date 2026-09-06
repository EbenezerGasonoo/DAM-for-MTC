import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/admin';

export async function GET(_req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const groups = await prisma.permissionGroup.findMany({
            where: { ownerId: auth.userId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(groups);
    } catch (error) {
        console.error('Error fetching permission groups:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
        }

        const group = await prisma.permissionGroup.create({
            data: {
                name,
                description: description || null,
                ownerId: auth.userId,
            },
        });

        return NextResponse.json(group, { status: 201 });
    } catch (error) {
        console.error('Error creating permission group:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
