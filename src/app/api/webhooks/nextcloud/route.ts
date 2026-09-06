import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EXTENSION_MAP } from '@/lib/nextcloud';
import path from 'path';

// POST /api/webhooks/nextcloud — Bi-directional Nextcloud event sync listener
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        console.log('[Nextcloud Webhook] Received event:', JSON.stringify(body));

        // Support various Nextcloud webhook / flow payload formats
        const eventType = body?.event || body?.action || body?.type || 'file_created';
        const rawPath = body?.path || body?.file || body?.filename || body?.target;

        if (!rawPath || typeof rawPath !== 'string') {
            return NextResponse.json({
                success: true,
                message: 'Webhook acknowledged, but no file path was provided in payload.'
            });
        }

        const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
        const basename = path.posix.basename(normalizedPath);
        const ext = (basename.split('.').pop() || '').toLowerCase();
        const mediaConfig = EXTENSION_MAP[ext];

        if (!mediaConfig) {
            return NextResponse.json({
                success: true,
                message: `File '${basename}' ignored (extension '.${ext}' is not a recognized media format).`
            });
        }

        // 1. If file deleted
        if (eventType.includes('delete') || eventType.includes('remove')) {
            const version = await prisma.assetVersion.findFirst({
                where: { nextcloudUri: normalizedPath }
            });
            if (version) {
                console.log(`[Nextcloud Webhook] Archiving asset ${version.assetId} due to remote file deletion.`);
                await prisma.asset.update({
                    where: { id: version.assetId },
                    data: { status: 'ARCHIVED' }
                });
            }
            return NextResponse.json({ success: true, action: 'archived', path: normalizedPath });
        }

        // 2. Check if asset already indexed
        const existing = await prisma.assetVersion.findFirst({
            where: { nextcloudUri: normalizedPath }
        });

        if (existing) {
            return NextResponse.json({
                success: true,
                message: `Asset '${basename}' is already registered in DAM.`,
                assetId: existing.assetId
            });
        }

        // 3. Auto-index the new media file
        let defaultUser = await prisma.user.findFirst();
        if (!defaultUser) {
            defaultUser = await prisma.user.create({
                data: {
                    name: 'Nextcloud Auto-Sync',
                    email: 'sync@mtc-network.space',
                    password: '$2a$10$wT8KzQ4h6qQy.WJ0LhE91OK6d7Hn/rL2oH6.m9e0mI4l8wT8KzQ4h',
                    role: 'ADMIN'
                }
            });
        }

        const cleanTitle = basename.replace(/\.[^/.]+$/, '').replace(/[_\\-]+/g, ' ').trim();
        const fileSize = Number(body?.size || 0);

        const newAsset = await prisma.asset.create({
            data: {
                title: cleanTitle || basename,
                description: `Auto-ingested from Nextcloud event [${eventType}]: ${normalizedPath}`,
                type: mediaConfig.type,
                mimeType: mediaConfig.mime,
                size: fileSize,
                creatorId: defaultUser.id,
                status: 'APPROVED',
                versions: {
                    create: [{
                        versionNum: 1,
                        nextcloudUri: normalizedPath,
                        proxyUri: normalizedPath,
                    }]
                }
            }
        });

        console.log(`[Nextcloud Webhook] Successfully indexed new asset: ${newAsset.title} (${newAsset.id})`);

        return NextResponse.json({
            success: true,
            action: 'created',
            asset: {
                id: newAsset.id,
                title: newAsset.title,
                type: newAsset.type,
                path: normalizedPath
            }
        });
    } catch (err: any) {
        console.error('[Nextcloud Webhook] Error processing event:', err);
        return NextResponse.json({ error: err?.message || 'Error processing webhook' }, { status: 500 });
    }
}
