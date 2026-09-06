import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

// POST /api/analytics/events — Log analytics event
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { assetId, eventType, metadata } = body;

        if (!eventType || !['VIEW', 'DOWNLOAD', 'COMMENT', 'SEARCH', 'SHARE'].includes(eventType)) {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        const event = await prisma.analyticsEvent.create({
            data: {
                userId: auth.userId,
                assetId: assetId || null,
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
