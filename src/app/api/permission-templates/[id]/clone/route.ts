import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

/**
 * Clone (duplicate) a permission template
 * POST /api/permission-templates/[id]/clone
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const source = await prisma.permissionTemplate.findUnique({
            where: { id },
        });

        if (!source) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const body = await req.json();
        const { namePrefix = 'Copy of ' } = body;

        const cloned = await prisma.permissionTemplate.create({
            data: {
                name: `${namePrefix}${source.name}`,
                description: source.description,
                rules: source.rules,
                createdBy: auth.userId,
            },
        });

        return NextResponse.json({
            ...cloned,
            rules: JSON.parse(cloned.rules || '[]'),
        }, { status: 201 });
    } catch (error) {
        console.error('Failed to clone permission template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
