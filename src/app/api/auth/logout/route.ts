import { NextRequest, NextResponse } from 'next/server';
import { createLogoutHeaders, getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (auth?.userId) {
            await logActivity(
                auth.userId,
                'LOGOUT',
                'USER',
                auth.userId,
                { email: auth.email, role: auth.role },
                req
            );
        }
    } catch (e) {
        console.error('Logout activity log error:', e);
    }

    return NextResponse.json(
        { success: true },
        { headers: createLogoutHeaders() }
    );
}
