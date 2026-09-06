import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const subscriptions = await prisma.webhookSubscription.findMany({ orderBy: { createdAt: 'desc' } });
        return NextResponse.json(subscriptions);
    } catch (error) {
        console.error('Error fetching webhook subscriptions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { name, url, secret, events, isActive } = body;

        if (!name || !url || !events) {
            return NextResponse.json({ error: 'Name, URL, and events are required' }, { status: 400 });
        }

        const subscription = await prisma.webhookSubscription.create({
            data: {
                name,
                url,
                secret: secret || null,
                events: JSON.stringify(events),
                isActive: isActive !== false,
            },
        });

        return NextResponse.json(subscription, { status: 201 });
    } catch (error) {
        console.error('Error creating webhook subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
