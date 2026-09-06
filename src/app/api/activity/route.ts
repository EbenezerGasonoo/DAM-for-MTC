import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { ActivityAction, EntityType, ActivityDetails } from '@/lib/activity';

interface ActivityWhereClause {
    entityType?: string;
    entityId?: string;
    action?: ActivityAction;
    userId?: string;
}

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const entityType = searchParams.get('entityType');
        const entityId = searchParams.get('entityId');
        const action = searchParams.get('action');
        const userId = searchParams.get('userId');

        const where: ActivityWhereClause = {};

        // Filter by entity type
        if (entityType) {
            where.entityType = entityType;
        }

        // Filter by entity ID
        if (entityId) {
            where.entityId = entityId;
        }

        // Filter by action
        if (action) {
            where.action = action as ActivityAction;
        }

        // Filter by user (admin can view all; non-admin restricted to self)
        if (userId) {
            where.userId = userId;
        } else if (auth.role !== 'ADMIN') {
            where.userId = auth.userId;
        }

        const activities = await prisma.activityLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        const total = await prisma.activityLog.count({ where });

        return NextResponse.json({
            activities,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Helper function to log activities
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