import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const group = await prisma.permissionGroup.findUnique({
            where: { id: id },
            include: { memberships: true },
        });

        if (!group) {
            return NextResponse.json({ error: 'Permission group not found' }, { status: 404 });
        }

        if (group.ownerId !== auth.userId && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(group);
    } catch (error) {
        console.error('Error fetching permission group:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const group = await prisma.permissionGroup.findUnique({ where: { id: id } });
        if (!group) {
            return NextResponse.json({ error: 'Permission group not found' }, { status: 404 });
        }

        if (group.ownerId !== auth.userId && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, description } = body;

        const updated = await prisma.permissionGroup.update({
            where: { id: id },
            data: {
                name: name || group.name,
                description: description !== undefined ? description : group.description,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating permission group:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const group = await prisma.permissionGroup.findUnique({ where: { id: id } });
        if (!group) {
            return NextResponse.json({ error: 'Permission group not found' }, { status: 404 });
        }

        if (group.ownerId !== auth.userId && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.permissionGroup.delete({ where: { id: id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting permission group:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
