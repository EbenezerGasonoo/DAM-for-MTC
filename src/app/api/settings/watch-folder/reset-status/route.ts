import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

// POST /api/settings/watch-folder/reset-status
// Resets legacy auto-ingested NAS assets currently marked APPROVED back to DRAFT
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json().catch(() => ({}));
        const targetStatus = typeof body?.targetStatus === 'string' ? body.targetStatus : 'DRAFT';

        // Update all assets that were auto-ingested from Nextcloud/Watch Folder
        const result = await prisma.asset.updateMany({
            where: {
                status: 'APPROVED',
                OR: [
                    { description: { contains: 'Auto-ingested from Watch Folder' } },
                    { description: { contains: 'Discovered and ingested from Nextcloud' } },
                    { tags: { some: { name: 'Auto-Ingest' } } },
                ]
            },
            data: {
                status: targetStatus,
            }
        });

        // Audit log
        await logActivity(
            auth.userId,
            'UPDATE',
            'SYSTEM_SETTING',
            'watch_folder_reset_status',
            { count: result.count, newStatus: targetStatus },
            req
        );

        return NextResponse.json({
            success: true,
            updatedCount: result.count,
            message: `Successfully set ${result.count} auto-ingested assets to ${targetStatus}.`,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error resetting asset statuses';
        console.error('Failed to reset auto-ingested statuses:', err);
        return NextResponse.json({
            success: false,
            error: message,
        }, { status: 500 });
    }
}
