import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies, hashPassword } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

const VALID_ROLES = ['ADMIN', 'EDITOR', 'PRODUCER', 'VIEWER'] as const;

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
        }

        const { id: targetUserId } = await context.params;
        const body = await req.json();
        const { name, role, password } = body;

        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const updateData: any = {};
        const changeDetails: any = { targetEmail: targetUser.email };

        if (name && typeof name === 'string' && name.trim()) {
            updateData.name = name.trim();
            changeDetails.oldName = targetUser.name;
            changeDetails.newName = name.trim();
        }

        if (role && VALID_ROLES.includes(role)) {
            // Prevent removing the last admin
            if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
                const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
                if (adminCount <= 1) {
                    return NextResponse.json(
                        { error: 'Cannot downgrade the only administrator in the system' },
                        { status: 400 }
                    );
                }
            }
            updateData.role = role;
            changeDetails.oldRole = targetUser.role;
            changeDetails.newRole = role;
        }

        if (password && typeof password === 'string' && password.length >= 8) {
            updateData.password = await hashPassword(password);
            changeDetails.passwordReset = true;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                updatedAt: true,
            },
        });

        // Audit Trail: Log user update
        await logActivity(
            auth.userId,
            'UPDATE',
            'USER',
            targetUserId,
            changeDetails,
            req
        );

        return NextResponse.json({
            user: updatedUser,
            message: 'User account updated successfully',
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
        }

        const { id: targetUserId } = await context.params;

        // Prevent self-deletion
        if (auth.userId === targetUserId) {
            return NextResponse.json({ error: 'Cannot delete your own administrator account' }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prevent deleting the last admin
        if (targetUser.role === 'ADMIN') {
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
                return NextResponse.json(
                    { error: 'Cannot delete the only administrator in the system' },
                    { status: 400 }
                );
            }
        }

        await prisma.user.delete({
            where: { id: targetUserId },
        });

        // Audit Trail: Log user deletion
        await logActivity(
            auth.userId,
            'DELETE',
            'USER',
            targetUserId,
            {
                deletedEmail: targetUser.email,
                deletedRole: targetUser.role,
                deletedName: targetUser.name,
            },
            req
        );

        return NextResponse.json({
            message: `User ${targetUser.email} deleted successfully`,
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
