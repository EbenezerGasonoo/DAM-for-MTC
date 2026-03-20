import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET() {
    try {
        const auth = await getAuthFromCookies();
        if (!auth) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                id: auth.userId,
                name: auth.name,
                email: auth.email,
                role: auth.role,
            },
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json({ user: null }, { status: 401 });
    }
}
