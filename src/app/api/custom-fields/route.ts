import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const definitions = await prisma.customFieldDefinition.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(definitions);
    } catch (error) {
        console.error('Error fetching custom fields:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { name, label, fieldType, assetTypes, options, isRequired } = body;

        if (!name || !label || !fieldType) {
            return NextResponse.json({ error: 'Name, label, and field type are required' }, { status: 400 });
        }

        const definition = await prisma.customFieldDefinition.create({
            data: {
                name,
                label,
                fieldType,
                assetTypes: assetTypes ? JSON.stringify(assetTypes) : null,
                options: options ? JSON.stringify(options) : null,
                isRequired: Boolean(isRequired),
            },
        });

        return NextResponse.json(definition, { status: 201 });
    } catch (error) {
        console.error('Error creating custom field:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
