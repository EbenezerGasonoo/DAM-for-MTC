import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { runCleanupAutomation } from '@/lib/automation';

// POST /api/automation-rules/cleanup — Run cleanup automation manually
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { daysOld = 30 } = body;

        if (daysOld < 1 || daysOld > 365) {
            return NextResponse.json({ error: 'daysOld must be between 1 and 365' }, { status: 400 });
        }

        const result = await runCleanupAutomation(daysOld);

        return NextResponse.json({
            success: true,
            ...result,
            daysOld,
            message: `Deleted ${result.deletedCount} draft assets older than ${daysOld} days`,
        });
    } catch (error) {
        console.error('Error running cleanup automation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
