import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const rights = await prisma.usageRight.findMany({ orderBy: { createdAt: 'desc' } });
        return NextResponse.json(rights);
    } catch (error) {
        console.error('Error fetching usage rights:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { assetId, licenseName, licenseType, grantedTo, expiresAt, notes } = body;

        if (!assetId || !licenseName || !licenseType) {
            return NextResponse.json({ error: 'Asset ID, license name, and license type are required' }, { status: 400 });
        }

        const right = await prisma.usageRight.create({
            data: {
                asset: {
                    connect: { id: assetId },
                },
                licenseName,
                licenseType,
                grantedTo: grantedTo || null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                notes: notes || null,
            },
        });

        await prisma.asset.update({
            where: { id: assetId },
            data: { licenseInfoId: right.id },
        });

        return NextResponse.json(right, { status: 201 });
    } catch (error) {
        console.error('Error creating usage right:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
