import { prisma } from '@/lib/prisma';
import type { PermissionTemplate as PrismaPermissionTemplate } from '@prisma/client';

export interface PermissionTemplateRule {
    subjectType: 'USER' | 'GROUP' | 'ROLE';
    subjectId?: string; // userId/groupId for USER/GROUP, roleName for ROLE
    accessLevel: 'VIEW' | 'COMMENT' | 'EDIT' | 'DELETE';
    expiryDays?: number; // Days until permission expires
}

export interface PermissionTemplate {
    id: string;
    name: string;
    description?: string | null;
    rules: PermissionTemplateRule[];
    appliedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create a predefined template for common scenarios
 */
export async function createPredefinedTemplate(
    name: string,
    description: string,
    rules: PermissionTemplateRule[]
): Promise<PermissionTemplate> {
    const template = await prisma.permissionTemplate.create({
        data: {
            name,
            description,
            rules: JSON.stringify(rules),
        },
    });

    return {
        ...template,
        rules: JSON.parse(template.rules || '[]'),
    };
}

/**
 * Get predefined templates for common permission scenarios
 */
export async function initializePredefinedTemplates(): Promise<void> {
    // Check if templates already exist
    const count = await prisma.permissionTemplate.count();
    if (count > 0) {
        return;
    }

    const templates: { name: string; description: string; rules: PermissionTemplateRule[] }[] = [
        {
            name: 'Viewer Only',
            description: 'Read-only access for all viewers',
            rules: [
                {
                    subjectType: 'ROLE',
                    subjectId: 'VIEWER',
                    accessLevel: 'VIEW',
                },
            ],
        },
        {
            name: 'Editor Access',
            description: 'Full edit access for editors',
            rules: [
                {
                    subjectType: 'ROLE',
                    subjectId: 'EDITOR',
                    accessLevel: 'EDIT',
                },
            ],
        },
        {
            name: 'Admin Full Access',
            description: 'Complete access including deletion',
            rules: [
                {
                    subjectType: 'ROLE',
                    subjectId: 'ADMIN',
                    accessLevel: 'DELETE',
                },
            ],
        },
        {
            name: 'Temporary Viewer (7 days)',
            description: 'Temporary read-only access that expires in 7 days',
            rules: [
                {
                    subjectType: 'ROLE',
                    subjectId: 'GUEST',
                    accessLevel: 'VIEW',
                    expiryDays: 7,
                },
            ],
        },
        {
            name: 'Collaboration Team',
            description: 'Full edit and comment access with 30-day expiry',
            rules: [
                {
                    subjectType: 'ROLE',
                    subjectId: 'EDITOR',
                    accessLevel: 'EDIT',
                    expiryDays: 30,
                },
            ],
        },
        {
            name: 'Public Sharing',
            description: 'View and download only, no editing',
            rules: [
                {
                    subjectType: 'ROLE',
                    subjectId: 'GUEST',
                    accessLevel: 'VIEW',
                },
            ],
        },
    ];

    for (const template of templates) {
        await createPredefinedTemplate(template.name, template.description, template.rules);
    }
}

/**
 * Get template with rules parsed
 */
export async function getTemplate(id: string): Promise<PermissionTemplate | null> {
    const template = await prisma.permissionTemplate.findUnique({
        where: { id },
    });

    if (!template) return null;

    return {
        ...template,
        rules: JSON.parse(template.rules || '[]'),
    };
}

/**
 * List all templates
 */
export async function listTemplates(): Promise<PermissionTemplate[]> {
    const templates = await prisma.permissionTemplate.findMany({
        orderBy: { appliedCount: 'desc' },
    });

    return templates.map((t: PrismaPermissionTemplate) => ({
        ...t,
        rules: JSON.parse(t.rules || '[]'),
    }));
}

/**
 * Search templates by name or description
 */
export async function searchTemplates(query: string): Promise<PermissionTemplate[]> {
    const templates = await prisma.permissionTemplate.findMany({
        where: {
            OR: [
                { name: { contains: query } },
                { description: { contains: query } },
            ],
        },
        orderBy: { appliedCount: 'desc' },
    });

    return templates.map((t: PrismaPermissionTemplate) => ({
        ...t,
        rules: JSON.parse(t.rules || '[]'),
    }));
}

/**
 * Get most popular templates
 */
export async function getPopularTemplates(limit: number = 5): Promise<PermissionTemplate[]> {
    const templates = await prisma.permissionTemplate.findMany({
        orderBy: { appliedCount: 'desc' },
        take: limit,
    });

    return templates.map((t: PrismaPermissionTemplate) => ({
        ...t,
        rules: JSON.parse(t.rules || '[]'),
    }));
}

/**
 * Get template statistics
 */
export async function getTemplateStats() {
    const total = await prisma.permissionTemplate.count();
    const totalApplied = await prisma.permissionTemplate.aggregate({
        _sum: { appliedCount: true },
    });

    return {
        totalTemplates: total,
        totalApplications: totalApplied._sum.appliedCount || 0,
        averageApplications: total > 0 ? Math.round((totalApplied._sum.appliedCount || 0) / total) : 0,
    };
}
