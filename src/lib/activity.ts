import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export type ActivityAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'UPLOAD'
    | 'DOWNLOAD'
    | 'VIEW'
    | 'APPROVE'
    | 'REJECT'
    | 'COMMENT'
    | 'LOGIN'
    | 'LOGOUT';

export type EntityType =
    | 'ASSET'
    | 'PROJECT'
    | 'COLLECTION'
    | 'COMMENT'
    | 'USER'
    | 'SAVED_SEARCH'
    | 'FAVORITE';

export interface ActivityDetails {
    [key: string]: string | number | boolean | null | undefined | string[];
}

/**
 * Log user activity for audit trail
 */
export async function logActivity(
    userId: string,
    action: ActivityAction,
    entityType: EntityType,
    entityId: string,
    details?: ActivityDetails,
    req?: NextRequest
) {
    try {
        const ipAddress = req?.headers.get('x-forwarded-for') ||
                         req?.headers.get('x-real-ip') ||
                         'unknown';

        const userAgent = req?.headers.get('user-agent') || 'unknown';

        await prisma.activityLog.create({
            data: {
                userId,
                action,
                entityType,
                entityId,
                details: details ? JSON.stringify(details) : null,
                ipAddress,
                userAgent,
            },
        });
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw - activity logging shouldn't break the main operation
    }
}

/**
 * Get activity summary for dashboard
 */
export async function getActivitySummary(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await prisma.activityLog.findMany({
        where: {
            userId,
            createdAt: {
                gte: startDate,
            },
        },
        select: {
            action: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    // Group by action type
    const summary = activities.reduce((acc, activity) => {
        const date = activity.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = {};
        }
        acc[date][activity.action] = (acc[date][activity.action] || 0) + 1;
        return acc;
    }, {} as Record<string, Record<string, number>>);

    return summary;
}