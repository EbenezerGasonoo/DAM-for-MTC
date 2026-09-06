import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { getTemplateStats, getPopularTemplates } from '@/lib/permission-templates';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const stats = await getTemplateStats();
        const popular = await getPopularTemplates(5);

        return NextResponse.json({
            statistics: stats,
            popularTemplates: popular.map(t => ({
                id: t.id,
                name: t.name,
                appliedCount: t.appliedCount,
                ruleCount: t.rules.length,
            })),
        });
    } catch (error) {
        console.error('Failed to get template statistics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
