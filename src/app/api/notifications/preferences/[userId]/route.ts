import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only allow viewing own preferences or ADMIN
        if (auth.userId !== userId && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const preferences = await prisma.notificationPreference.findUnique({
            where: { userId },
        });

        if (!preferences) {
            // Return default preferences
            return NextResponse.json({
                userId,
                shareAccessNotifications: true,
                shareExpiryNotifications: true,
                approvalNotifications: true,
                uploadNotifications: true,
                emailNotifications: true,
                digestFrequency: 'DAILY',
            });
        }

        return NextResponse.json(preferences);
    } catch (error) {
        console.error('Failed to fetch notification preferences:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only allow modifying own preferences or ADMIN
        if (auth.userId !== userId && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const {
            shareAccessNotifications,
            shareExpiryNotifications,
            approvalNotifications,
            uploadNotifications,
            emailNotifications,
            digestFrequency,
        } = body;

        // Validate digest frequency
        const validFrequencies = ['IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY', 'NEVER'];
        if (digestFrequency && !validFrequencies.includes(digestFrequency)) {
            return NextResponse.json(
                { error: `Invalid digest frequency. Must be one of: ${validFrequencies.join(', ')}` },
                { status: 400 }
            );
        }

        // Upsert preferences
        const preferences = await prisma.notificationPreference.upsert({
            where: { userId },
            create: {
                userId,
                shareAccessNotifications: shareAccessNotifications ?? true,
                shareExpiryNotifications: shareExpiryNotifications ?? true,
                approvalNotifications: approvalNotifications ?? true,
                uploadNotifications: uploadNotifications ?? true,
                emailNotifications: emailNotifications ?? true,
                digestFrequency: digestFrequency ?? 'DAILY',
            },
            update: {
                shareAccessNotifications: shareAccessNotifications !== undefined ? shareAccessNotifications : undefined,
                shareExpiryNotifications: shareExpiryNotifications !== undefined ? shareExpiryNotifications : undefined,
                approvalNotifications: approvalNotifications !== undefined ? approvalNotifications : undefined,
                uploadNotifications: uploadNotifications !== undefined ? uploadNotifications : undefined,
                emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined,
                digestFrequency: digestFrequency !== undefined ? digestFrequency : undefined,
            },
        });

        return NextResponse.json(preferences);
    } catch (error) {
        console.error('Failed to update notification preferences:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
