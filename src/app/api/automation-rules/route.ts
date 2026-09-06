import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const rules = await prisma.automationRule.findMany({ orderBy: { createdAt: 'desc' } });
        return NextResponse.json(rules);
    } catch (error) {
        console.error('Error fetching automation rules:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { name, trigger, conditions, actions, schedule, isActive } = body;

        if (!name || !trigger || !actions) {
            return NextResponse.json({ error: 'Name, trigger, and actions are required' }, { status: 400 });
        }

        const rule = await prisma.automationRule.create({
            data: {
                name,
                trigger,
                conditions: conditions ? JSON.stringify(conditions) : null,
                actions: JSON.stringify(actions),
                schedule: schedule || null,
                isActive: isActive !== false,
            },
        });

        return NextResponse.json(rule, { status: 201 });
    } catch (error) {
        console.error('Error creating automation rule:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
