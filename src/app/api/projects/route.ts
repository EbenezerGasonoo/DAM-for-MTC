import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// GET /api/projects — List all projects
export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            include: {
                owner: { select: { id: true, name: true, email: true } },
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
        const auth = await getAuthFromCookies();
        const body = await req.json();
        const { name, description } = body;

        let ownerId = body.ownerId || auth?.userId;
        if (!ownerId) {
            const firstUser = await prisma.user.findFirst();
            ownerId = firstUser?.id;
        }

        if (!name) {
            return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description,
                ownerId: ownerId!,
                status: body.status || 'DRAFT',
            },
            include: {
                owner: { select: { id: true, name: true } },
                _count: { select: { assets: true } },
            },
        });

        // Audit log
        if (ownerId) {
            await logActivity(
                ownerId,
                'CREATE',
                'PROJECT',
                project.id,
                { name: project.name, status: project.status },
                req
            );
        }

        return NextResponse.json(project, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
