import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const right = await prisma.usageRight.findUnique({ where: { id: id } });
        if (!right) {
            return NextResponse.json({ error: 'Usage right not found' }, { status: 404 });
        }

        return NextResponse.json(right);
    } catch (error) {
        console.error('Error fetching usage right:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { licenseName, licenseType, grantedTo, expiresAt, notes } = body;

        const updated = await prisma.usageRight.update({
            where: { id: id },
            data: {
                licenseName: licenseName || undefined,
                licenseType: licenseType || undefined,
                grantedTo: grantedTo !== undefined ? grantedTo : undefined,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                notes: notes !== undefined ? notes : undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating usage right:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const right = await prisma.usageRight.delete({
            where: { id: id },
            select: {
                asset: {
                    select: { id: true },
                },
            },
        });

        if (right.asset?.id) {
            await prisma.asset.update({
                where: { id: right.asset.id },
                data: { licenseInfoId: null },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting usage right:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
