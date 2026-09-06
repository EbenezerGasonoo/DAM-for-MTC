import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, createAuthHeaders } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json();

        // Validation
        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }

        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
        }

        // First user gets ADMIN, rest get VIEWER
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? 'ADMIN' : 'VIEWER';

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: role as 'ADMIN' | 'VIEWER',
            },
        });

        const token = signToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });

        return NextResponse.json(
            {
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
            },
            { status: 201, headers: createAuthHeaders(token) }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
