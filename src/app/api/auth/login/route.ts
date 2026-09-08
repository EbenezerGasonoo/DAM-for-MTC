import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, createAuthHeaders } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const token = signToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });

        // Audit Trail: Record user login activity
        await logActivity(
            user.id,
            'LOGIN',
            'USER',
            user.id,
            { email: user.email, role: user.role, method: 'Password Authentication' },
            req
        );

        return NextResponse.json(
            {
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
            },
            { headers: createAuthHeaders(token) }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
