import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/admin';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const membership = await prisma.groupMembership.findUnique({ where: { id: id } });
        if (!membership) {
            return NextResponse.json({ error: 'Group membership not found' }, { status: 404 });
        }

        const group = await prisma.permissionGroup.findUnique({ where: { id: membership.groupId } });
        if (!group) {
            return NextResponse.json({ error: 'Permission group not found' }, { status: 404 });
        }

        if (group.ownerId !== auth.userId && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.groupMembership.delete({ where: { id: id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting group membership:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
