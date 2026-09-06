import { NextResponse } from 'next/server';
import { AuthPayload, getAuthFromCookies } from '@/lib/auth';

export async function requireAuth(): Promise<AuthPayload | NextResponse> {
    const auth = await getAuthFromCookies();
    if (!auth?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return auth;
}

export async function requireAdmin(): Promise<AuthPayload | NextResponse> {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) {
        return auth;
    }
    if (auth.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return auth;
}

export function isAdmin(auth: AuthPayload) {
    return auth.role === 'ADMIN';
}
