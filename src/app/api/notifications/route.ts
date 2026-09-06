import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { sendEmailNotification } from '@/lib/notifications';
import type { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const read = searchParams.get('read'); // 'true', 'false', or null for all
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const skip = parseInt(searchParams.get('skip') || '0');

        // Build filter
        const filter: Prisma.NotificationWhereInput = {
            recipientId: auth.userId,
        };

        if (read === 'true') {
            filter.isRead = true;
        } else if (read === 'false') {
            filter.isRead = false;
        }

        // Get total count
        const total = await prisma.notification.count({ where: filter });

        // Fetch notifications
        const notifications = await prisma.notification.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip,
        });

        return NextResponse.json({
            notifications,
            pagniaton: {
                total,
                limit,
                skip,
                hasMore: skip + limit < total,
            },
        });
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
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
        const { type, recipientId, subject, message, data, sendEmail } = body;

        if (!type || !recipientId || !subject) {
            return NextResponse.json(
                { error: 'Missing required fields: type, recipientId, subject' },
                { status: 400 }
            );
        }

        // Get recipient
        const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
        });

        if (!recipient) {
            return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
        }

        // Create notification record
        const notification = await prisma.notification.create({
            data: {
                type,
                recipientId,
                subject,
                message: message || '',
                data:
                    data !== undefined && data !== null
                        ? JSON.stringify(data)
                        : null,
                isRead: false,
            },
        });

        // Send email if requested
        if (sendEmail && recipient.email) {
            await sendEmailNotification({
                type,
                recipientEmail: recipient.email,
                recipientName: recipient.name || recipient.email,
                subject,
                data: {
                    message,
                    ...data,
                },
            });
        }

        // Trigger any automations
        // Could trigger automation rules with NOTIFICATION_SENT event

        return NextResponse.json(notification, { status: 201 });
    } catch (error) {
        console.error('Failed to create notification:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { notificationIds, isRead } = body;

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json(
                { error: 'notificationIds must be an array' },
                { status: 400 }
            );
        }

        // Mark as read/unread for current user
        const updated = await prisma.notification.updateMany({
            where: {
                id: { in: notificationIds },
                recipientId: auth.userId,
            },
            data: {
                isRead: isRead ?? true,
            },
        });

        return NextResponse.json({
            updated: updated.count,
            message: `${updated.count} notifications updated`,
        });
    } catch (error) {
        console.error('Failed to update notifications:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const notificationIds = searchParams.getAll('id');

        if (!notificationIds.length) {
            return NextResponse.json(
                { error: 'No notification IDs provided' },
                { status: 400 }
            );
        }

        // Delete for current user
        const deleted = await prisma.notification.deleteMany({
            where: {
                id: { in: notificationIds },
                recipientId: auth.userId,
            },
        });

        return NextResponse.json({
            deleted: deleted.count,
            message: `${deleted.count} notifications deleted`,
        });
    } catch (error) {
        console.error('Failed to delete notifications:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
