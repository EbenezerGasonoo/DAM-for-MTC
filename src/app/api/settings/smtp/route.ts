import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { getActiveSmtpConfig, verifySmtpConnection, SmtpConfig } from '@/lib/notifications';
import { logActivity } from '@/lib/activity';

// GET /api/settings/smtp — Get current SMTP configuration and live connection status
export async function GET() {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const config = await getActiveSmtpConfig();
        const hasConfig = Boolean(config.host);
        let connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'UNCONFIGURED' = 'UNCONFIGURED';
        let error: string | null = null;

        if (hasConfig) {
            const verification = await verifySmtpConnection(config);
            if (verification.success) {
                connectionStatus = 'CONNECTED';
            } else {
                connectionStatus = 'DISCONNECTED';
                error = verification.error || 'Failed to authenticate with SMTP server';
            }
        }

        return NextResponse.json({
            host: config.host,
            port: config.port,
            secure: config.secure,
            user: config.user,
            hasPassword: Boolean(config.password),
            from: config.from,
            fromName: config.fromName,
            connectionStatus,
            error,
        });
    } catch (err: any) {
        console.error('Failed to load SMTP settings:', err);
        return NextResponse.json({ error: err?.message || 'Failed to load SMTP configuration' }, { status: 500 });
    }
}

// POST /api/settings/smtp — Save and update SMTP configuration
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { host, port, secure, user, password, from, fromName } = body;

        if (!host) {
            return NextResponse.json({ error: 'SMTP Server Host is required' }, { status: 400 });
        }

        const normalizedHost = String(host).trim();
        const normalizedPort = String(port ? parseInt(String(port), 10) : 587);
        const normalizedSecure = secure === true || secure === 'true' ? 'true' : 'false';
        const normalizedUser = user ? String(user).trim() : '';
        const normalizedFrom = from ? String(from).trim() : 'notifications@mtc-network.space';
        const normalizedFromName = fromName ? String(fromName).trim() : 'MTC Digital Asset Management';

        // 1. Update basic settings
        await prisma.systemSetting.upsert({
            where: { key: 'SMTP_HOST' },
            update: { value: normalizedHost },
            create: { key: 'SMTP_HOST', value: normalizedHost },
        });

        await prisma.systemSetting.upsert({
            where: { key: 'SMTP_PORT' },
            update: { value: normalizedPort },
            create: { key: 'SMTP_PORT', value: normalizedPort },
        });

        await prisma.systemSetting.upsert({
            where: { key: 'SMTP_SECURE' },
            update: { value: normalizedSecure },
            create: { key: 'SMTP_SECURE', value: normalizedSecure },
        });

        await prisma.systemSetting.upsert({
            where: { key: 'SMTP_USER' },
            update: { value: normalizedUser },
            create: { key: 'SMTP_USER', value: normalizedUser },
        });

        await prisma.systemSetting.upsert({
            where: { key: 'SMTP_FROM' },
            update: { value: normalizedFrom },
            create: { key: 'SMTP_FROM', value: normalizedFrom },
        });

        await prisma.systemSetting.upsert({
            where: { key: 'SMTP_FROM_NAME' },
            update: { value: normalizedFromName },
            create: { key: 'SMTP_FROM_NAME', value: normalizedFromName },
        });

        // 2. Update password only if a new password string is supplied
        let activePassword = '';
        if (password && !password.includes('••••')) {
            await prisma.systemSetting.upsert({
                where: { key: 'SMTP_PASSWORD' },
                update: { value: String(password).trim() },
                create: { key: 'SMTP_PASSWORD', value: String(password).trim() },
            });
            activePassword = String(password).trim();
        } else {
            const current = await getActiveSmtpConfig();
            activePassword = current.password || '';
        }

        // 3. Log administrative audit action
        await logActivity(auth.userId, 'UPDATE', 'SYSTEM_SETTING', 'SMTP', {
            host: normalizedHost,
            port: normalizedPort,
            secure: normalizedSecure,
            user: normalizedUser,
            from: normalizedFrom,
        });

        // 4. Verify connection immediately
        const testConfig: SmtpConfig = {
            host: normalizedHost,
            port: parseInt(normalizedPort, 10),
            secure: normalizedSecure === 'true',
            user: normalizedUser,
            password: activePassword,
            from: normalizedFrom,
            fromName: normalizedFromName,
        };

        const verification = await verifySmtpConnection(testConfig);

        return NextResponse.json({
            success: true,
            connectionStatus: verification.success ? 'CONNECTED' : 'DISCONNECTED',
            message: verification.success
                ? 'SMTP settings saved and connection verified successfully!'
                : 'SMTP settings saved, but server authentication check failed.',
            error: verification.error || null,
        });
    } catch (err: any) {
        console.error('Failed to save SMTP configuration:', err);
        return NextResponse.json({ error: err?.message || 'Failed to save SMTP settings' }, { status: 500 });
    }
}
