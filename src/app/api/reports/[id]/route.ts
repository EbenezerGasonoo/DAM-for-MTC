import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';

// Individual Report API Route

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        const report = await prisma.report.findUnique({
            where: { id },
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

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Viewers can only view their own reports
        if (auth.role === 'VIEWER' && report.submittedById !== auth.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ report });
    } catch (error) {
        console.error('Failed to get report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await req.json();
        const { status, resolution, priority, title, description } = body;

        const existingReport = await prisma.report.findUnique({
            where: { id },
        });

        if (!existingReport) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const isPrivileged = ['ADMIN', 'PRODUCER', 'EDITOR'].includes(auth.role);
        const isAuthor = existingReport.submittedById === auth.userId;

        if (!isPrivileged && !isAuthor) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updateData: Record<string, unknown> = {};

        // Only privileged users can change status and resolution notes
        if (status) {
            if (!isPrivileged) {
                return NextResponse.json({ error: 'Only admins or editors can update report status' }, { status: 403 });
            }
            const validStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'];
            if (validStatuses.includes(status)) {
                updateData.status = status;
                if (status === 'RESOLVED' || status === 'CLOSED') {
                    updateData.resolvedAt = new Date();
                } else {
                    updateData.resolvedAt = null;
                }
            }
        }

        if (resolution !== undefined) {
            if (!isPrivileged) {
                return NextResponse.json({ error: 'Only admins or editors can update resolution notes' }, { status: 403 });
            }
            updateData.resolution = typeof resolution === 'string' ? resolution.trim() : null;
        }

        if (priority) {
            const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
            if (validPriorities.includes(priority)) {
                updateData.priority = priority;
            }
        }

        // Submitter can edit title and description if report is still OPEN
        if (title && isAuthor && existingReport.status === 'OPEN') {
            updateData.title = String(title).trim();
        }
        if (description && isAuthor && existingReport.status === 'OPEN') {
            updateData.description = String(description).trim();
        }

        const updatedReport = await prisma.report.update({
            where: { id },
            data: updateData,
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

        // Log activity
        try {
            await prisma.activityLog.create({
                data: {
                    userId: auth.userId,
                    action: 'UPDATE',
                    entityType: 'REPORT',
                    entityId: id,
                    details: JSON.stringify({
                        oldStatus: existingReport.status,
                        newStatus: updatedReport.status,
                        resolution: updatedReport.resolution,
                    }),
                },
            });
        } catch (logErr) {
            console.warn('Failed to log report update activity:', logErr);
        }

        // Notify submitter if status or resolution changed by an admin
        if (status && status !== existingReport.status && existingReport.submittedById !== auth.userId) {
            try {
                await prisma.notification.create({
                    data: {
                        type: status === 'RESOLVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_NEEDED',
                        recipientId: existingReport.submittedById,
                        subject: `Report Updated: ${existingReport.title} is now ${status}`,
                        message: `Your report "${existingReport.title}" was updated to ${status} by ${auth.name}.${resolution ? ` Notes: ${resolution}` : ''}`,
                        data: JSON.stringify({
                            reportId: id,
                            newStatus: status,
                            resolution: updateData.resolution || null,
                        }),
                    },
                });
            } catch (notifyErr) {
                console.warn('Failed to notify report author:', notifyErr);
            }
        }

        return NextResponse.json({ report: updatedReport });
    } catch (error) {
        console.error('Failed to update report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        const report = await prisma.report.findUnique({
            where: { id },
        });

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const isAdmin = auth.role === 'ADMIN';
        const isAuthorOpen = report.submittedById === auth.userId && report.status === 'OPEN';

        if (!isAdmin && !isAuthorOpen) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.report.delete({
            where: { id },
        });

        try {
            await prisma.activityLog.create({
                data: {
                    userId: auth.userId,
                    action: 'DELETE',
                    entityType: 'REPORT',
                    entityId: id,
                    details: JSON.stringify({ title: report.title }),
                },
            });
        } catch (logErr) {
            console.warn('Failed to log report deletion activity:', logErr);
        }

        return NextResponse.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Failed to delete report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
