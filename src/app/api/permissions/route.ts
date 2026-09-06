import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import type { Prisma } from '@prisma/client';

// GET /api/permissions — List all permissions or filter by entity
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const { searchParams } = new URL(req.url);
        const entityType = searchParams.get('entityType');
        const entityId = searchParams.get('entityId');

        const where: Prisma.AccessPermissionWhereInput = {};
        if (entityType) where.entityType = entityType;
        if (entityId) where.entityId = entityId;

        const permissions = await prisma.accessPermission.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            permissions: permissions.map(p => ({
                ...p,
                isExpired: p.expiresAt ? new Date(p.expiresAt) < new Date() : false,
            })),
            count: permissions.length,
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/permissions — Create new permission
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { entityType, entityId, subjectType, subjectId, subjectRole, accessLevel, expiresIn } = body;

        if (!entityType || !entityId || !subjectType || !accessLevel) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['ASSET', 'PROJECT', 'COLLECTION'].includes(entityType)) {
            return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
        }

        if (!['USER', 'GROUP', 'ROLE'].includes(subjectType)) {
            return NextResponse.json({ error: 'Invalid subject type' }, { status: 400 });
        }

        if (!['VIEW', 'COMMENT', 'EDIT', 'DELETE'].includes(accessLevel)) {
            return NextResponse.json({ error: 'Invalid access level' }, { status: 400 });
        }

        // Calculate expiry
        let expiresAt = null;
        if (expiresIn) {
            const hours = parseInt(expiresIn) || 0;
            if (hours > 0) {
                expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
            }
        }

        const permission = await prisma.accessPermission.create({
            data: {
                entityType,
                entityId,
                subjectType,
                subjectId: subjectId || null,
                subjectRole: subjectRole || null,
                accessLevel,
                expiresAt,
            },
        });

        return NextResponse.json({
            ...permission,
            isExpired: false,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating permission:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
