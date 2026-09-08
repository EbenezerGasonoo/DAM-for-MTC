import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies, hashPassword } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

const VALID_ROLES = ['ADMIN', 'EDITOR', 'PRODUCER', 'VIEWER'] as const;
type UserRole = (typeof VALID_ROLES)[number];

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only ADMINs can view full user management list
        if (auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const roleFilter = searchParams.get('role');

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
            ];
        }
        if (roleFilter && roleFilter !== 'ALL') {
            where.role = roleFilter;
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        assets: true,
                        activities: true,
                        projects: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, password, role } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
        }

        if (!password || password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const normalizedRole: UserRole = VALID_ROLES.includes(role) ? role : 'VIEWER';

        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existing) {
            return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                role: normalizedRole,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        // Audit Trail: Log user creation by Admin
        await logActivity(
            auth.userId,
            'CREATE',
            'USER',
            newUser.id,
            {
                createdEmail: newUser.email,
                assignedRole: newUser.role,
                createdName: newUser.name,
            },
            req
        );

        return NextResponse.json({ user: newUser, message: 'User account created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
