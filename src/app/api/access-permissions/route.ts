import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        if (auth.role === 'ADMIN') {
            const permissions = await prisma.accessPermission.findMany({ orderBy: { createdAt: 'desc' } });
            return NextResponse.json(permissions);
        }

        const permissions = await prisma.accessPermission.findMany({
            where: {
                subjectType: 'USER',
                subjectId: auth.userId,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(permissions);
    } catch (error) {
        console.error('Error fetching access permissions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { entityType, entityId, subjectType, subjectId, subjectRole, accessLevel, expiresAt } = body;

        if (!entityType || !entityId || !subjectType || !accessLevel) {
            return NextResponse.json({ error: 'Missing required permission fields' }, { status: 400 });
        }

        const permission = await prisma.accessPermission.create({
            data: {
                entityType,
                entityId,
                subjectType,
                subjectId: subjectId || null,
                subjectRole: subjectRole || null,
                accessLevel,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });

        return NextResponse.json(permission, { status: 201 });
    } catch (error) {
        console.error('Error creating access permission:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
