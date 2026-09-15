import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

// Reports API Route

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const priority = searchParams.get('priority');
        const myReports = searchParams.get('myReports') === 'true';
        const search = searchParams.get('search')?.trim();
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10), 0);

        const filter: Prisma.ReportWhereInput = {};

        // Restrict viewers to their own reports, or if explicitly requested
        if (auth.role === 'VIEWER' || myReports) {
            filter.submittedById = auth.userId;
        }

        if (status && status !== 'ALL') {
            filter.status = status;
        }

        if (type && type !== 'ALL') {
            filter.type = type;
        }

        if (priority && priority !== 'ALL') {
            filter.priority = priority;
        }

        if (search) {
            filter.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { resolution: { contains: search } },
            ];
        }

        const [total, reports] = await Promise.all([
            prisma.report.count({ where: filter }),
            prisma.report.findMany({
                where: filter,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    submittedBy: {
                        select: { id: true, name: true, email: true, role: true },
                    },
                    asset: {
                        select: { id: true, title: true, type: true },
                    },
                    project: {
                        select: { id: true, name: true },
                    },
                },
            }),
        ]);

        return NextResponse.json({
            reports,
            pagination: {
                total,
                limit,
                skip,
                hasMore: skip + limit < total,
            },
        });
    } catch (error) {
        console.error('Failed to fetch reports:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, type, priority = 'MEDIUM', assetId, projectId, systemInfo } = body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return NextResponse.json({ error: 'Report title is required' }, { status: 400 });
        }

        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            return NextResponse.json({ error: 'Report description is required' }, { status: 400 });
        }

        const validTypes = ['BUG', 'ASSET_ISSUE', 'PROJECT_STATUS', 'ACCESS_REQUEST', 'FEEDBACK', 'OTHER'];
        const reportType = validTypes.includes(type) ? type : 'FEEDBACK';

        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const reportPriority = validPriorities.includes(priority) ? priority : 'MEDIUM';

        // Verify entity existence if provided
        let resolvedAssetId: string | null = null;
        if (assetId) {
            const assetExists = await prisma.asset.findUnique({ where: { id: assetId } });
            if (assetExists) resolvedAssetId = assetId;
        }

        let resolvedProjectId: string | null = null;
        if (projectId) {
            const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
            if (projectExists) resolvedProjectId = projectId;
        }

        const report = await prisma.report.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                type: reportType,
                priority: reportPriority,
                status: 'OPEN',
                submittedById: auth.userId,
                assetId: resolvedAssetId,
                projectId: resolvedProjectId,
                systemInfo: typeof systemInfo === 'string' ? systemInfo : systemInfo ? JSON.stringify(systemInfo) : null,
            },
            include: {
                submittedBy: {
                    select: { id: true, name: true, email: true, role: true },
                },
                asset: {
                    select: { id: true, title: true, type: true },
                },
                project: {
                    select: { id: true, name: true },
                },
            },
        });

        // Log to ActivityLog
        try {
            await prisma.activityLog.create({
                data: {
                    userId: auth.userId,
                    action: 'CREATE',
                    entityType: 'REPORT',
                    entityId: report.id,
                    details: JSON.stringify({
                        title: report.title,
                        type: report.type,
                        priority: report.priority,
                    }),
                },
            });
        } catch (logErr) {
            console.warn('Failed to log report creation activity:', logErr);
        }

        // Notify Admins
        try {
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN', id: { not: auth.userId } },
                select: { id: true },
            });

            if (admins.length > 0) {
                await prisma.notification.createMany({
                    data: admins.map((admin) => ({
                        type: 'APPROVAL_NEEDED',
                        recipientId: admin.id,
                        subject: `New ${report.priority} Report: ${report.title}`,
                        message: `${auth.name} submitted a ${report.type.toLowerCase().replace('_', ' ')} report: "${report.title}".`,
                        data: JSON.stringify({
                            reportId: report.id,
                            type: report.type,
                            priority: report.priority,
                            submittedBy: auth.name,
                        }),
                    })),
                });
            }
        } catch (notifyErr) {
            console.warn('Failed to dispatch notifications to admins:', notifyErr);
        }

        return NextResponse.json({ report }, { status: 201 });
    } catch (error) {
        console.error('Failed to create report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
