import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const share = await prisma.externalShare.findUnique({ where: { id: id } });
        if (!share) {
            return NextResponse.json({ error: 'External share not found' }, { status: 404 });
        }

        if (share.createdById !== auth.userId && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(share);
    } catch (error) {
        console.error('Error fetching external share:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const share = await prisma.externalShare.findUnique({ where: { id: id } });
        if (!share) {
            return NextResponse.json({ error: 'External share not found' }, { status: 404 });
        }

        if (share.createdById !== auth.userId && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.externalShare.delete({ where: { id: id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting external share:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
