import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/assets/[id] — Get single asset with full details
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
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
        const body = await req.json();
        const { title, description, status, metadata, tags } = body;

        const data: Record<string, unknown> = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (status !== undefined) data.status = status;
        if (metadata !== undefined) data.metadata = metadata;

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
        await prisma.comment.deleteMany({ where: { assetId: id } });
        await prisma.assetVersion.deleteMany({ where: { assetId: id } });
        await prisma.asset.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
