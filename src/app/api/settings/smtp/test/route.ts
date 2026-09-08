import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { sendTestEmail, SmtpConfig, getActiveSmtpConfig } from '@/lib/notifications';

// POST /api/settings/smtp/test — Send test email using active or on-the-fly credentials
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { recipientEmail, host, port, secure, user, password, from, fromName } = body;

        const targetEmail = recipientEmail ? String(recipientEmail).trim() : auth.email;

        if (!targetEmail || !targetEmail.includes('@')) {
            return NextResponse.json({ error: 'A valid recipient email address is required' }, { status: 400 });
        }

        // Build custom config if supplied from test form
        let customConfig: Partial<SmtpConfig> | undefined = undefined;

        if (host) {
            let activePassword = password;
            if (!activePassword || activePassword.includes('••••')) {
                const current = await getActiveSmtpConfig();
                activePassword = current.password || '';
            }

            customConfig = {
                host: String(host).trim(),
                port: port ? parseInt(String(port), 10) : 587,
                secure: secure === true || secure === 'true',
                user: user ? String(user).trim() : '',
                password: activePassword,
                from: from ? String(from).trim() : 'notifications@mtc-network.space',
                fromName: fromName ? String(fromName).trim() : 'MTC Digital Asset Management',
            };
        }

        const result = await sendTestEmail(targetEmail, customConfig);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Test email dispatched successfully to ${targetEmail}! Check your inbox or spam folder.`,
                messageId: result.messageId,
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error || 'Failed to dispatch test email',
            }, { status: 400 });
        }
    } catch (err: any) {
        console.error('Test email delivery failed:', err);
        return NextResponse.json({ error: err?.message || 'Failed to deliver test email' }, { status: 500 });
    }
}
