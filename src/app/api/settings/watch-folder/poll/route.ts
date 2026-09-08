import { NextRequest, NextResponse } from 'next/server';
import { getWatchFolderConfig, scanAndIngestWatchFolder } from '@/lib/watch-folder';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Helper to check optional webhook secret if configured
function verifyPollAuth(req: NextRequest): boolean {
    const authHeader = req.headers.get('authorization') || '';
    const secret = process.env.WATCH_FOLDER_SECRET || process.env.CRON_SECRET;
    if (!secret) return true; // If no secret configured, allow trigger (e.g. internal docker network)
    return authHeader === `Bearer ${secret}`;
}

// GET / POST /api/settings/watch-folder/poll — Scheduled background trigger
export async function GET(req: NextRequest) {
    return handlePoll(req);
}

export async function POST(req: NextRequest) {
    return handlePoll(req);
}

async function handlePoll(req: NextRequest) {
    try {
        if (!verifyPollAuth(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const config = await getWatchFolderConfig();
        if (!config.enabled) {
            return NextResponse.json({
                success: true,
                skipped: true,
                message: 'Watch folder auto-ingest is currently disabled in Settings.',
            });
        }

        if (config.status === 'SCANNING') {
            return NextResponse.json({
                success: true,
                skipped: true,
                message: 'A watch folder scan is already in progress.',
            });
        }

        const result = await scanAndIngestWatchFolder();

        return NextResponse.json(result, {
            status: result.success ? 200 : 500,
        });
    } catch (err: any) {
        console.error('Watch folder poll trigger error:', err);
        return NextResponse.json({
            success: false,
            error: err?.message || 'Error during watch folder poll execution',
        }, { status: 500 });
    }
}
