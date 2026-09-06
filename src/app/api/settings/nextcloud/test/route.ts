import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { verifyConnection, getActiveNextcloudConfig } from '@/lib/nextcloud';

// POST /api/settings/nextcloud/test — Test Nextcloud connection on-the-fly
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        let { url, username, password } = body;

        // If password is blank or masked bullets, attempt to use the existing saved password
        if (!password || password.includes('••••')) {
            const current = await getActiveNextcloudConfig();
            password = current.password || '';
        }

        if (!url || !username || !password) {
            return NextResponse.json({
                success: false,
                error: 'Please provide the server URL, username, and password/app token to test.'
            }, { status: 400 });
        }

        const result = await verifyConnection({
            url: url.trim(),
            username: username.trim(),
            password: password.trim()
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Successfully connected to Nextcloud WebDAV!',
                quota: result.quota || null,
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error || 'Connection failed'
            }, { status: 400 });
        }
    } catch (err: any) {
        return NextResponse.json({
            success: false,
            error: err?.message || 'Error executing connection test'
        }, { status: 500 });
    }
}
