import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const profile = await prisma.watermarkProfile.findUnique({ where: { id: id } });
        if (!profile) {
            return NextResponse.json({ error: 'Watermark profile not found' }, { status: 404 });
        }

        return NextResponse.json(profile);
    } catch (error) {
        console.error('Error fetching watermark profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { name, logoUri, textTemplate, roleLevels, isActive } = body;

        const updated = await prisma.watermarkProfile.update({
            where: { id: id },
            data: {
                name: name || undefined,
                logoUri: logoUri !== undefined ? logoUri : undefined,
                textTemplate: textTemplate !== undefined ? textTemplate : undefined,
                roleLevels: roleLevels ? JSON.stringify(roleLevels) : undefined,
                isActive: isActive !== undefined ? Boolean(isActive) : undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating watermark profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        await prisma.watermarkProfile.delete({ where: { id: id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting watermark profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
