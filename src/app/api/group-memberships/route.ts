import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/admin';

export async function GET(_req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const memberships = await prisma.groupMembership.findMany({
            where: { userId: auth.userId },
            include: { group: true },
        });

        return NextResponse.json(memberships);
    } catch (error) {
        console.error('Error fetching group memberships:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { groupId, userId, role } = body;

        if (!groupId || !userId) {
            return NextResponse.json({ error: 'Group ID and user ID are required' }, { status: 400 });
        }

        const group = await prisma.permissionGroup.findUnique({ where: { id: groupId } });
        if (!group) {
            return NextResponse.json({ error: 'Permission group not found' }, { status: 404 });
        }

        if (group.ownerId !== auth.userId && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const membership = await prisma.groupMembership.create({
            data: {
                groupId,
                userId,
                role: role || 'MEMBER',
            },
        });

        return NextResponse.json(membership, { status: 201 });
    } catch (error) {
        console.error('Error creating group membership:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
