import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const rule = await prisma.automationRule.findUnique({ where: { id: id } });
        if (!rule) {
            return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 });
        }

        return NextResponse.json(rule);
    } catch (error) {
        console.error('Error fetching automation rule:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { name, trigger, conditions, actions, schedule, isActive } = body;

        const updated = await prisma.automationRule.update({
            where: { id: id },
            data: {
                name: name || undefined,
                trigger: trigger || undefined,
                conditions: conditions ? JSON.stringify(conditions) : undefined,
                actions: actions ? JSON.stringify(actions) : undefined,
                schedule: schedule !== undefined ? schedule : undefined,
                isActive: isActive !== undefined ? Boolean(isActive) : undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating automation rule:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        await prisma.automationRule.delete({ where: { id: id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting automation rule:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
