import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { triggerAutomationRules, runCleanupAutomation } from '@/lib/automation';

// POST /api/automation-rules/execute/[id] — Execute specific rule manually
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const { id } = await params;
        const body = await req.json();
        const { assetId } = body;

        if (!assetId) {
            return NextResponse.json({ error: 'assetId required' }, { status: 400 });
        }

        const rule = await prisma.automationRule.findUnique({ where: { id } });
        if (!rule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        const result = await triggerAutomationRules(rule.trigger, assetId, auth.userId);

        return NextResponse.json({ ...result, ruleId: id, assetId });
    } catch (error) {
        console.error('Error executing automation rule:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
