import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const definition = await prisma.customFieldDefinition.findUnique({
            where: { id: id },
        });

        if (!definition) {
            return NextResponse.json({ error: 'Custom field definition not found' }, { status: 404 });
        }

        return NextResponse.json(definition);
    } catch (error) {
        console.error('Error fetching custom field definition:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { name, label, fieldType, assetTypes, options, isRequired } = body;

        const definition = await prisma.customFieldDefinition.update({
            where: { id: id },
            data: {
                name,
                label,
                fieldType,
                assetTypes: assetTypes ? JSON.stringify(assetTypes) : null,
                options: options ? JSON.stringify(options) : null,
                isRequired: isRequired !== undefined ? Boolean(isRequired) : undefined,
            },
        });

        return NextResponse.json(definition);
    } catch (error) {
        console.error('Error updating custom field definition:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        await prisma.customFieldDefinition.delete({
            where: { id: id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting custom field definition:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
