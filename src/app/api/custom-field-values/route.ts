import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/admin';

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const searchParams = new URL(req.url).searchParams;
        const assetId = searchParams.get('assetId');

        if (!assetId) {
            return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
        }

        const values = await prisma.customFieldValue.findMany({
            where: { assetId },
            include: { definition: true },
        });

        return NextResponse.json(values);
    } catch (error) {
        console.error('Error fetching custom field values:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { assetId, definitionId, value } = body;

        if (!assetId || !definitionId) {
            return NextResponse.json({ error: 'Asset ID and definition ID are required' }, { status: 400 });
        }

        const normalizedValue = typeof value === 'string' ? value : JSON.stringify(value);

        const fieldValue = await prisma.customFieldValue.upsert({
            where: { assetId_definitionId: { assetId, definitionId } },
            create: {
                assetId,
                definitionId,
                value: normalizedValue,
            },
            update: {
                value: normalizedValue,
            },
        });

        return NextResponse.json(fieldValue, { status: 201 });
    } catch (error) {
        console.error('Error saving custom field value:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
