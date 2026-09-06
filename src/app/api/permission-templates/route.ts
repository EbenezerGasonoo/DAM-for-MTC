import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import type { Prisma, PermissionTemplate } from '@prisma/client';
import { initializePredefinedTemplates } from '@/lib/permission-templates';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await initializePredefinedTemplates();

        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const skip = parseInt(searchParams.get('skip') || '0');
        const search = searchParams.get('search');

        // Build filter
        const filter: Prisma.PermissionTemplateWhereInput = {};
        if (search) {
            filter.OR = [
                { name: { contains: search } },
                { description: { contains: search } },
            ];
        }

        const total = await prisma.permissionTemplate.count({ where: filter });

        const templates = await prisma.permissionTemplate.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip,
        });

        // Parse rules JSON
        const parsed = templates.map((t: PermissionTemplate) => ({
            ...t,
            rules: JSON.parse(t.rules || '[]'),
        }));

        return NextResponse.json({
            templates: parsed,
            pagination: {
                total,
                limit,
                skip,
                hasMore: skip + limit < total,
            },
        });
    } catch (error) {
        console.error('Failed to fetch permission templates:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, rules } = body;

        if (!name || !Array.isArray(rules)) {
            return NextResponse.json(
                { error: 'Missing required fields: name (string), rules (array)' },
                { status: 400 }
            );
        }

        // Validate rules structure
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

        const template = await prisma.permissionTemplate.create({
            data: {
                name,
                description: description || null,
                rules: JSON.stringify(rules),
                createdBy: auth.userId,
            },
        });

        return NextResponse.json({
            ...template,
            rules: JSON.parse(template.rules || '[]'),
        }, { status: 201 });
    } catch (error) {
        console.error('Failed to create permission template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
