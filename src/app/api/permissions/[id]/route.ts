import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// GET /api/permissions/[id] — Get specific permission
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const { id } = await params;

        const permission = await prisma.accessPermission.findUnique({
            where: { id },
        });

        if (!permission) {
            return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...permission,
            isExpired: permission.expiresAt ? new Date(permission.expiresAt) < new Date() : false,
        });
    } catch (error) {
        console.error('Error fetching permission:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/permissions/[id] — Update permission
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const { id } = await params;
        const body = await req.json();
        const { accessLevel, expiresIn } = body;

        const permission = await prisma.accessPermission.findUnique({ where: { id } });
        if (!permission) {
            return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
        }

        let expiresAt = permission.expiresAt;
        if (expiresIn !== undefined) {
            const hours = parseInt(expiresIn);
            if (hours > 0) {
                expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
            } else {
                expiresAt = null;
            }
        }

        const updated = await prisma.accessPermission.update({
            where: { id },
            data: {
                accessLevel: accessLevel || permission.accessLevel,
                expiresAt,
            },
        });

        return NextResponse.json({
            ...updated,
            isExpired: updated.expiresAt ? new Date(updated.expiresAt) < new Date() : false,
        });
    } catch (error) {
        console.error('Error updating permission:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/permissions/[id] — Revoke permission
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const { id } = await params;

        const permission = await prisma.accessPermission.findUnique({ where: { id } });
        if (!permission) {
            return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
        }

        await prisma.accessPermission.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Permission revoked' });
    } catch (error) {
        console.error('Error deleting permission:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
