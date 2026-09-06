import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const permission = await prisma.accessPermission.findUnique({ where: { id: id } });
        if (!permission) {
            return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
        }

        return NextResponse.json(permission);
    } catch (error) {
        console.error('Error fetching access permission:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { accessLevel, expiresAt, subjectId, subjectRole } = body;

        const updated = await prisma.accessPermission.update({
            where: { id: id },
            data: {
                accessLevel: accessLevel || undefined,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                subjectId: subjectId !== undefined ? subjectId : undefined,
                subjectRole: subjectRole !== undefined ? subjectRole : undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating access permission:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        await prisma.accessPermission.delete({ where: { id: id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting access permission:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
