import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { getActiveNextcloudConfig, verifyConnection, formatNextcloudWebdavUrl } from '@/lib/nextcloud';
import { logActivity } from '@/lib/activity';

// GET /api/settings/nextcloud — Get current configuration and live connection status
export async function GET() {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const config = await getActiveNextcloudConfig();
        const connection = await verifyConnection();

        return NextResponse.json({
            url: config.url,
            webdavUrl: formatNextcloudWebdavUrl(config.url, config.username),
            username: config.username,
            hasPassword: config.hasPassword,
            rootFolder: config.rootFolder || '/',
            connectionStatus: connection.success ? 'CONNECTED' : 'DISCONNECTED',
            quota: connection.quota || null,
            error: connection.error || null,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Failed to get Nextcloud settings' }, { status: 500 });
    }
}

// POST /api/settings/nextcloud — Save and update Nextcloud configuration
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { url, username, password, rootFolder } = body;

        if (!url || !username) {
            return NextResponse.json({ error: 'Server URL and username are required' }, { status: 400 });
        }

        const normalizedUrl = url.trim();
        const normalizedUser = username.trim();
        const normalizedFolder = (rootFolder || '/').trim();

        // 1. Update URL and Username
        await prisma.systemSetting.upsert({
            where: { key: 'NEXTCLOUD_URL' },
            update: { value: normalizedUrl },
            create: { key: 'NEXTCLOUD_URL', value: normalizedUrl }
        });

        await prisma.systemSetting.upsert({
            where: { key: 'NEXTCLOUD_USERNAME' },
            update: { value: normalizedUser },
            create: { key: 'NEXTCLOUD_USERNAME', value: normalizedUser }
        });

        await prisma.systemSetting.upsert({
            where: { key: 'NEXTCLOUD_ROOT_FOLDER' },
            update: { value: normalizedFolder },
            create: { key: 'NEXTCLOUD_ROOT_FOLDER', value: normalizedFolder }
        });

        // 2. Update Password if provided (don't overwrite if masked / empty)
        if (password && typeof password === 'string' && password.trim() !== '' && !password.includes('••••')) {
            await prisma.systemSetting.upsert({
                where: { key: 'NEXTCLOUD_PASSWORD' },
                update: { value: password.trim() },
                create: { key: 'NEXTCLOUD_PASSWORD', value: password.trim() }
            });
        }

        // 3. Test the connection with newly saved config
        const testRes = await verifyConnection();

        // Log audit event
        try {
            await logActivity(auth.userId, 'UPDATE', 'SYSTEM_SETTING', 'NEXTCLOUD', {
                url: normalizedUrl,
                username: normalizedUser,
                connected: testRes.success,
            });
        } catch {
            // Ignore non-blocking audit failure
        }

        return NextResponse.json({
            success: true,
            connectionStatus: testRes.success ? 'CONNECTED' : 'DISCONNECTED',
            quota: testRes.quota || null,
            error: testRes.error || null,
            message: testRes.success
                ? 'Nextcloud settings saved and connection verified successfully!'
                : `Settings saved, but connection test failed: ${testRes.error}`
        });
    } catch (err: any) {
        console.error('Failed to save Nextcloud settings:', err);
        return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
    }
}
