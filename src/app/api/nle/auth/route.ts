import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies, signToken, verifyToken } from '@/lib/auth';

// POST /api/nle/auth — Generate or verify an NLE editor token
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { action, email, password, token } = body;

        // 1. Verify existing token
        if (action === 'verify' && token) {
            const payload = verifyToken(token);
            if (!payload) {
                return NextResponse.json({ valid: false, error: 'Invalid or expired token' }, { status: 401 });
            }
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, name: true, email: true, role: true }
            });
            if (!user) {
                return NextResponse.json({ valid: false, error: 'User no longer exists' }, { status: 401 });
            }
            return NextResponse.json({ valid: true, user });
        }

        // 2. Generate token from existing web session
        const auth = await getAuthFromCookies();
        if (auth?.userId) {
            const user = await prisma.user.findUnique({
                where: { id: auth.userId },
                select: { id: true, name: true, email: true, role: true }
            });

            if (user) {
                const nleToken = signToken({
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                });

                return NextResponse.json({
                    success: true,
                    token: nleToken,
                    user,
                    message: 'NLE Access Token successfully generated.'
                });
            }
        }

        // 3. Fallback: Authenticate via credentials
        if (email && password) {
            const bcrypt = (await import('bcryptjs')).default;
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            const nleToken = signToken({
                userId: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            });

            return NextResponse.json({
                success: true,
                token: nleToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                message: 'Authenticated successfully for NLE panel.'
            });
        }

        return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    } catch (err: any) {
        console.error('NLE Auth error:', err);
        return NextResponse.json({ error: err?.message || 'Authentication error' }, { status: 500 });
    }
}
