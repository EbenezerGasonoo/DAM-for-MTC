import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { checkEntityAccess } from '@/lib/permissions';
import { deleteAssetFile } from '@/lib/nextcloud';
import { addDeletedUris } from '@/lib/deletedAssets';

// GET /api/assets/[id] — Get single asset with full details
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();

        const asset = await prisma.asset.findUnique({
            where: { id },
            include: {
                creator: { select: { id: true, name: true, email: true } },
                project: true,
                versions: { orderBy: { versionNum: 'desc' } },
                tags: true,
                comments: {
                    include: { author: { select: { id: true, name: true } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

        // Check permissions if user is authenticated
        if (auth?.userId) {
            const hasAccess = await checkEntityAccess(auth.userId, 'ASSET', id, 'VIEW');
            if (!hasAccess) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            // Log view analytics
            try {
                await prisma.analyticsEvent.create({
                    data: {
                        userId: auth.userId,
                        assetId: id,
                        eventType: 'VIEW',
                        metadata: JSON.stringify({ type: asset.type }),
                    },
                });
            } catch (analyticsError) {
                console.error('Analytics logging failed (non-blocking):', analyticsError);
            }
        } else {
            // Unauthenticated users cannot view
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json(asset);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// PATCH /api/assets/[id] — Update asset metadata or status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check EDIT permission
        const hasAccess = await checkEntityAccess(auth.userId, 'ASSET', id, 'EDIT');
        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const body = await req.json();
        const { title, description, status, metadata, tags, projectId } = body;

        const data: Record<string, unknown> = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (status !== undefined) data.status = status;
        if (metadata !== undefined) data.metadata = metadata;
        if (projectId !== undefined) data.projectId = projectId;

        if (tags && Array.isArray(tags)) {
            data.tags = {
                set: [],
                connectOrCreate: tags.map((t: string) => ({
                    where: { name: t },
                    create: { name: t },
                })),
            };
        }

        const asset = await prisma.asset.update({
            where: { id },
            data,
            include: { tags: true, versions: true },
        });

        return NextResponse.json(asset);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// DELETE /api/assets/[id] — Delete an asset
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check DELETE permission
        const hasAccess = await checkEntityAccess(auth.userId, 'ASSET', id, 'DELETE');
        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // 1. Fetch versions to know which remote and proxy files to delete & blocklist
        const versions = await prisma.assetVersion.findMany({
            where: { assetId: id },
            select: { nextcloudUri: true, proxyUri: true },
        });

        const urisToBlocklist: string[] = [];
        for (const v of versions) {
            if (v.nextcloudUri) {
                urisToBlocklist.push(v.nextcloudUri);
                await deleteAssetFile(v.nextcloudUri);
            }
            if (v.proxyUri && v.proxyUri !== v.nextcloudUri) {
                await deleteAssetFile(v.proxyUri);
            }
        }

        if (urisToBlocklist.length > 0) {
            await addDeletedUris(urisToBlocklist);
        }

        // 2. Cascade delete related database entities
        await prisma.comment.deleteMany({ where: { assetId: id } });
        await prisma.assetFavorite.deleteMany({ where: { assetId: id } });
        await prisma.collectionAsset.deleteMany({ where: { assetId: id } });
        await prisma.customFieldValue.deleteMany({ where: { assetId: id } });
        await prisma.assetVersion.deleteMany({ where: { assetId: id } });

        // 3. Delete the asset record
        await prisma.asset.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

