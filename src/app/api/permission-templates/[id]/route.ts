import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const template = await prisma.permissionTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...template,
            rules: JSON.parse(template.rules || '[]'),
        });
    } catch (error) {
        console.error('Failed to fetch permission template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, rules } = body;

        // Validate rules if provided
        if (rules && Array.isArray(rules)) {
            for (const rule of rules) {
                if (!rule.subjectType || !rule.accessLevel) {
                    return NextResponse.json(
                        { error: 'Each rule must have subjectType and accessLevel' },
                        { status: 400 }
                    );
                }

                const validSubjectTypes = ['USER', 'GROUP', 'ROLE'];
                const validAccessLevels = ['VIEW', 'COMMENT', 'EDIT', 'DELETE'];

                if (!validSubjectTypes.includes(rule.subjectType)) {
                    return NextResponse.json(
                        { error: `Invalid subjectType. Must be one of: ${validSubjectTypes.join(', ')}` },
                        { status: 400 }
                    );
                }

                if (!validAccessLevels.includes(rule.accessLevel)) {
                    return NextResponse.json(
                        { error: `Invalid accessLevel. Must be one of: ${validAccessLevels.join(', ')}` },
                        { status: 400 }
                    );
                }
            }
        }

        const template = await prisma.permissionTemplate.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                description: description !== undefined ? description : undefined,
                rules: rules !== undefined ? JSON.stringify(rules) : undefined,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({
            ...template,
            rules: JSON.parse(template.rules || '[]'),
        });
    } catch (error) {
        console.error('Failed to update permission template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.permissionTemplate.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Template deleted' });
    } catch (error) {
        console.error('Failed to delete permission template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
