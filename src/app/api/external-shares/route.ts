import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/admin';

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q'); // search query
        const where: any = {};

        if (auth.role !== 'ADMIN') {
            where.createdById = auth.userId;
        }

        if (q) {
            where.OR = [
                { notes: { contains: q } },
                { allowedEmail: { contains: q } },
            ];
        }

        const shares = await prisma.externalShare.findMany({
            where,
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            shares: shares.map(s => ({
                ...s,
                isExpired: s.expiresAt && new Date(s.expiresAt) < new Date(),
            })),
            count: shares.length,
        });
    } catch (error) {
        console.error('Error fetching external shares:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function generateShareToken() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { entityType, entityId, allowedEmail, accessLevel, expiresIn, notes } = body;

        if (!entityType || !entityId || !accessLevel) {
            return NextResponse.json({ error: 'Entity type, entity ID, and access level are required' }, { status: 400 });
        }

        if (!['ASSET', 'PROJECT', 'COLLECTION'].includes(entityType)) {
            return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
        }

        if (!['VIEW', 'DOWNLOAD'].includes(accessLevel)) {
            return NextResponse.json({ error: 'Access level must be VIEW or DOWNLOAD' }, { status: 400 });
        }

        // Calculate expiry date (expiresIn in hours, default 24)
        let expiresAt = null;
        if (expiresIn !== undefined) {
            const hours = parseInt(expiresIn) || 24;
            expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        }

        const share = await prisma.externalShare.create({
            data: {
                entityType,
                entityId,
                shareToken: generateShareToken(),
                allowedEmail: allowedEmail || null,
                accessLevel,
                expiresAt,
                notes: notes || null,
                createdById: auth.userId,
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });

        return NextResponse.json({
            ...share,
            isExpired: share.expiresAt && new Date(share.expiresAt) < new Date(),
            shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/${share.shareToken}`,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating external share:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
