import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { getWatchFolderConfig, saveWatchFolderConfig, WatchFolderConfig } from '@/lib/watch-folder';

// GET /api/settings/watch-folder — Fetch configuration, projects, and recent activity
export async function GET() {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const config = await getWatchFolderConfig();

        // Fetch available projects for dropdown selection
        const projects = await prisma.project.findMany({
            select: { id: true, name: true, status: true },
            orderBy: { updatedAt: 'desc' },
        });

        // Fetch recent auto-ingested assets
        const recentIngested = await prisma.asset.findMany({
            where: {
                tags: {
                    some: { name: 'Auto-Ingest' }
                }
            },
            take: 12,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                type: true,
                mimeType: true,
                size: true,
                createdAt: true,
                metadata: true,
                project: {
                    select: { name: true }
                },
                versions: {
                    take: 1,
                    orderBy: { versionNum: 'desc' },
                    select: { proxyUri: true, nextcloudUri: true }
                }
            }
        });

        return NextResponse.json({
            success: true,
            config,
            projects,
            recentIngested,
        });
    } catch (err: any) {
        console.error('Failed to get watch folder settings:', err);
        return NextResponse.json({
            success: false,
            error: err?.message || 'Failed to retrieve watch folder settings',
        }, { status: 500 });
    }
}

// POST /api/settings/watch-folder — Save configuration
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const updates: Partial<WatchFolderConfig> = {};

        if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
        if (body.storageType === 'nextcloud' || body.storageType === 'local') updates.storageType = body.storageType;
        if (typeof body.folderPath === 'string') updates.folderPath = body.folderPath;
        if (typeof body.recursive === 'boolean') updates.recursive = body.recursive;
        if (Array.isArray(body.autoTags)) updates.autoTags = body.autoTags;
        if (body.defaultProjectId !== undefined) updates.defaultProjectId = body.defaultProjectId || null;
        if (body.actionAfterIngest === 'keep' || body.actionAfterIngest === 'move_archive') updates.actionAfterIngest = body.actionAfterIngest;
        if (typeof body.archiveFolder === 'string') updates.archiveFolder = body.archiveFolder;
        if (typeof body.approvedFolder === 'string') updates.approvedFolder = body.approvedFolder;
        if (typeof body.autoTranscode === 'boolean') updates.autoTranscode = body.autoTranscode;

        const updated = await saveWatchFolderConfig(updates);

        return NextResponse.json({
            success: true,
            config: updated,
            message: 'Watch folder settings saved successfully.',
        });
    } catch (err: any) {
        console.error('Failed to save watch folder settings:', err);
        return NextResponse.json({
            success: false,
            error: err?.message || 'Failed to save watch folder settings',
        }, { status: 500 });
    }
}
