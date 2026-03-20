import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/assets — List assets with optional filtering
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const status = searchParams.get('status') || '';
        const projectId = searchParams.get('projectId') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { some: { name: { contains: search, mode: 'insensitive' } } } },
            ];
        }
        if (type) where.type = type;
        if (status) where.status = status;
        if (projectId) where.projectId = projectId;

        const [assets, total] = await Promise.all([
            prisma.asset.findMany({
                where,
                include: {
                    creator: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                    versions: { orderBy: { versionNum: 'desc' }, take: 1 },
                    tags: true,
                    _count: { select: { comments: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.asset.count({ where }),
        ]);

        return NextResponse.json({ assets, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
