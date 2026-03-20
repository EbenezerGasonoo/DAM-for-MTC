import { NextResponse } from 'next/server';
import { createLogoutHeaders } from '@/lib/auth';

export async function POST() {
    return NextResponse.json(
        { success: true },
        { headers: createLogoutHeaders() }
    );
}
