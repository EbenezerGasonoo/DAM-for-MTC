import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const subscription = await prisma.webhookSubscription.findUnique({ where: { id: id } });
        if (!subscription) {
            return NextResponse.json({ error: 'Webhook subscription not found' }, { status: 404 });
        }

        return NextResponse.json(subscription);
    } catch (error) {
        console.error('Error fetching webhook subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { name, url, secret, events, isActive } = body;

        const updated = await prisma.webhookSubscription.update({
            where: { id: id },
            data: {
                name: name || undefined,
                url: url || undefined,
                secret: secret !== undefined ? secret : undefined,
                events: events ? JSON.stringify(events) : undefined,
                isActive: isActive !== undefined ? Boolean(isActive) : undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating webhook subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        await prisma.webhookSubscription.delete({ where: { id: id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting webhook subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
