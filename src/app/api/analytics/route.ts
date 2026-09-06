import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/admin';

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const searchParams = new URL(req.url).searchParams;
        const assetId = searchParams.get('assetId');
        const eventType = searchParams.get('eventType');
        const sinceDays = parseInt(searchParams.get('sinceDays') || '30', 10);

        const where: Record<string, unknown> = {
            userId: auth.role === 'ADMIN' ? undefined : auth.userId,
        };

        if (assetId) {
            Object.assign(where, { assetId });
        }
        if (eventType) {
            Object.assign(where, { eventType });
        }

        const events = await prisma.analyticsEvent.findMany({
            where: {
                ...where,
                createdAt: {
                    gte: new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000),
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        return NextResponse.json(events);
    } catch (error) {
        console.error('Error fetching analytics events:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { assetId, eventType, metadata } = body;

        if (!eventType) {
            return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
        }

        const event = await prisma.analyticsEvent.create({
            data: {
                assetId: assetId || null,
                userId: auth.userId,
                eventType,
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        });

        return NextResponse.json(event, { status: 201 });
    } catch (error) {
        console.error('Error logging analytics event:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
