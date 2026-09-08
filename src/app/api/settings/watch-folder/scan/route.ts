import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin';
import { scanAndIngestWatchFolder } from '@/lib/watch-folder';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow long run for batch transcode

// POST /api/settings/watch-folder/scan — Trigger immediate scan & ingest
export async function POST() {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const result = await scanAndIngestWatchFolder(auth.userId);

        return NextResponse.json(result, {
            status: result.success ? 200 : 500,
        });
    } catch (err: any) {
        console.error('Watch folder scan execution failed:', err);
        return NextResponse.json({
            success: false,
            error: err?.message || 'Failed to execute watch folder scan',
        }, { status: 500 });
    }
}
