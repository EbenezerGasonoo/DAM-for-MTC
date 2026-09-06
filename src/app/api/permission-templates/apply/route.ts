import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

interface ApplyTemplateRequest {
    templateId: string;
    entities: {
        type: 'ASSET' | 'PROJECT' | 'COLLECTION';
        id: string;
    }[];
    overwrite?: boolean; // If true, remove existing permissions first
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json() as ApplyTemplateRequest;
        const { templateId, entities, overwrite = false } = body;

        if (!templateId || !Array.isArray(entities) || entities.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields: templateId, entities (array with at least one item)' },
                { status: 400 }
            );
        }

        // Fetch template
        const template = await prisma.permissionTemplate.findUnique({
            where: { id: templateId },
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const rules = JSON.parse(template.rules || '[]');

        if (!Array.isArray(rules) || rules.length === 0) {
            return NextResponse.json(
                { error: 'Template has no rules to apply' },
                { status: 400 }
            );
        }

        const results = {
            applied: 0,
            failed: 0,
            errors: [] as { entity: string; error: string }[],
        };

        // Apply template to each entity
        for (const entity of entities) {
            try {
                // Validate entity exists
                let exists = false;
                if (entity.type === 'ASSET') {
                    exists = !!(await prisma.asset.findUnique({
                        where: { id: entity.id },
                        select: { id: true },
                    }));
                } else if (entity.type === 'PROJECT') {
                    exists = !!(await prisma.project.findUnique({
                        where: { id: entity.id },
                        select: { id: true },
                    }));
                } else if (entity.type === 'COLLECTION') {
                    exists = !!(await prisma.collection.findUnique({
                        where: { id: entity.id },
                        select: { id: true },
                    }));
                }

                if (!exists) {
                    results.failed++;
                    results.errors.push({
                        entity: `${entity.type}:${entity.id}`,
                        error: 'Entity not found',
                    });
                    continue;
                }

                // Remove existing permissions if overwrite is true
                if (overwrite) {
                    await prisma.accessPermission.deleteMany({
                        where: {
                            entityType: entity.type,
                            entityId: entity.id,
                        },
                    });
                }

                // Apply each rule from template
                for (const rule of rules) {
                    const expiresAt = rule.expiryDays
                        ? new Date(Date.now() + rule.expiryDays * 24 * 60 * 60 * 1000)
                        : null;

                    await prisma.accessPermission.create({
                        data: {
                            entityType: entity.type,
                            entityId: entity.id,
                            subjectType: rule.subjectType,
                            subjectId: rule.subjectId || null,
                            subjectRole: rule.subjectType === 'ROLE' ? rule.subjectId : null,
                            accessLevel: rule.accessLevel,
                            expiresAt,
                        },
                    });
                }

                results.applied++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    entity: `${entity.type}:${entity.id}`,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Increment applied count on template
        await prisma.permissionTemplate.update({
            where: { id: templateId },
            data: {
                appliedCount: {
                    increment: results.applied,
                },
            },
        });

        return NextResponse.json({
            message: `Permissions applied to ${results.applied} entities`,
            ...results,
        });
    } catch (error) {
        console.error('Failed to apply permission template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(_req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get template usage statistics
        const templates = await prisma.permissionTemplate.findMany({
            select: {
                id: true,
                name: true,
                appliedCount: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { appliedCount: 'desc' },
        });

        return NextResponse.json({ templates });
    } catch (error) {
        console.error('Failed to get template statistics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
