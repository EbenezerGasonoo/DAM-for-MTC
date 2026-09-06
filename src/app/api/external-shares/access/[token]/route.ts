import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/external-shares/access/[token] — Access shared asset/collection
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        
        if (!token) {
            return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
        }

        const share = await prisma.externalShare.findUnique({
            where: { shareToken: token },
            include: {
                createdBy: { select: { id: true, name: true } },
            },
        });

        if (!share) {
            return NextResponse.json({ error: 'Invalid share link' }, { status: 404 });
        }

        // Check expiry
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'Share link has expired' }, { status: 403 });
        }

        // Fetch the shared entity
        let entity = null;

        if (share.entityType === 'ASSET') {
            entity = await prisma.asset.findUnique({
                where: { id: share.entityId },
                include: {
                    creator: { select: { id: true, name: true } },
                    versions: { orderBy: { versionNum: 'desc' }, take: 1 },
                    tags: true,
                    _count: { select: { comments: true } },
                },
            });
        } else if (share.entityType === 'COLLECTION') {
            entity = await prisma.collection.findUnique({
                where: { id: share.entityId },
                include: {
                    owner: { select: { id: true, name: true } },
                    assets: {
                        include: {
                            asset: {
                                select: { id: true, title: true, type: true },
                            },
                        },
                    },
                },
            });
        } else if (share.entityType === 'PROJECT') {
            entity = await prisma.project.findUnique({
                where: { id: share.entityId },
                include: {
                    assets: {
                        select: { id: true, title: true, type: true },
                    },
                    owner: { select: { id: true, name: true } },
                },
            });
        }

        if (!entity) {
            return NextResponse.json({ error: 'Shared entity not found or has been deleted' }, { status: 404 });
        }

        // Log access event
        try {
            await prisma.analyticsEvent.create({
                data: {
                    eventType: 'SHARE',
                    assetId: share.entityType === 'ASSET' ? share.entityId : null,
                    metadata: JSON.stringify({
                        shareToken: token,
                        entityType: share.entityType,
                        entityId: share.entityId,
                    }),
                },
            });
        } catch (e) {
            console.error('Failed to log share access:', e);
        }

        // Trigger notification for share access
        try {
            fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'SHARE_ACCESSED',
                    userId: share.createdById,
                    shareId: share.id,
                }),
            }).catch(e => console.error('Failed to send notification:', e));
        } catch (e) {
            console.error('Failed to trigger notification:', e);
        }

        return NextResponse.json({
            share: {
                token: share.shareToken,
                entityType: share.entityType,
                entityId: share.entityId,
                accessLevel: share.accessLevel,
                expiresAt: share.expiresAt,
                createdBy: share.createdBy,
                notes: share.notes,
                isExpired: false,
            },
            entity,
        });
    } catch (error) {
        console.error('Error accessing shared content:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/external-shares/validate/[token] — Quick validation (no entity fetch)
export async function HEAD(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        
        const share = await prisma.externalShare.findUnique({
            where: { shareToken: token },
            select: { expiresAt: true, entityId: true, entityType: true },
        });

        if (!share) {
            return new NextResponse(null, { status: 404 });
        }

        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
            return new NextResponse(null, { status: 403 });
        }

        return new NextResponse(null, { status: 200 });
    } catch (error) {
        console.error('Error validating share:', error);
        return new NextResponse(null, { status: 500 });
    }
}
