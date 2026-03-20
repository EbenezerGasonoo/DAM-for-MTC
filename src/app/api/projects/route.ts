import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects — List all projects
export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            include: {
                owner: { select: { id: true, name: true } },
                _count: { select: { assets: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        return NextResponse.json(projects);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// POST /api/projects — Create a new project
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description, ownerId } = body;

        if (!name || !ownerId) {
            return NextResponse.json({ error: 'Name and owner are required' }, { status: 400 });
        }

        const project = await prisma.project.create({
            data: { name, description, ownerId, status: 'DRAFT' },
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
