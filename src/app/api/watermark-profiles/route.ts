import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const profiles = await prisma.watermarkProfile.findMany({ orderBy: { createdAt: 'desc' } });
        return NextResponse.json(profiles);
    } catch (error) {
        console.error('Error fetching watermark profiles:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { name, logoUri, textTemplate, roleLevels, isActive } = body;

        if (!name) {
            return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
        }

        const profile = await prisma.watermarkProfile.create({
            data: {
                name,
                logoUri: logoUri || null,
                textTemplate: textTemplate || null,
                roleLevels: roleLevels ? JSON.stringify(roleLevels) : null,
                isActive: isActive !== false,
            },
        });

        return NextResponse.json(profile, { status: 201 });
    } catch (error) {
        console.error('Error creating watermark profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
