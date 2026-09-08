import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
    from: string;
    fromName?: string;
}

/**
 * Dynamically fetch active SMTP configuration from database with fallback to process.env
 */
export async function getActiveSmtpConfig(): Promise<SmtpConfig> {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: {
                    in: [
                        'SMTP_HOST',
                        'SMTP_PORT',
                        'SMTP_SECURE',
                        'SMTP_USER',
                        'SMTP_PASSWORD',
                        'SMTP_FROM',
                        'SMTP_FROM_NAME',
                    ],
                },
            },
        });

        const map = new Map(settings.map(s => [s.key, s.value]));

        return {
            host: map.get('SMTP_HOST') || process.env.SMTP_HOST || '',
            port: parseInt(map.get('SMTP_PORT') || process.env.SMTP_PORT || '587', 10),
            secure: (map.get('SMTP_SECURE') || process.env.SMTP_SECURE || 'false') === 'true',
            user: map.get('SMTP_USER') || process.env.SMTP_USER || '',
            password: map.get('SMTP_PASSWORD') || process.env.SMTP_PASSWORD || '',
            from: map.get('SMTP_FROM') || process.env.SMTP_FROM || 'notifications@mtc-network.space',
            fromName: map.get('SMTP_FROM_NAME') || process.env.SMTP_FROM_NAME || 'MTC Digital Asset Management',
        };
    } catch {
        return {
            host: process.env.SMTP_HOST || '',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            user: process.env.SMTP_USER || '',
            password: process.env.SMTP_PASSWORD || '',
            from: process.env.SMTP_FROM || 'notifications@mtc-network.space',
            fromName: process.env.SMTP_FROM_NAME || 'MTC Digital Asset Management',
        };
    }
}

/**
 * Create a Nodemailer transporter from a given or dynamic SMTP configuration
 */
export function createTransporter(config: SmtpConfig) {
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user && config.password ? {
            user: config.user,
            pass: config.password,
        } : undefined,
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production' && config.host !== 'localhost' && !config.host.startsWith('192.168.') && !config.host.startsWith('127.'),
        },
    });
}

/**
 * Verify SMTP connection and credentials handshake
 */
export async function verifySmtpConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.host) {
        return { success: false, error: 'SMTP Host is not configured.' };
    }
    try {
        const transporter = createTransporter(config);
        await transporter.verify();
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to authenticate with SMTP server' };
    }
}

/**
 * Send a branded test email to verify end-to-end delivery
 */
export async function sendTestEmail(
    toEmail: string,
    customConfig?: Partial<SmtpConfig>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const active = await getActiveSmtpConfig();
        const config: SmtpConfig = { ...active, ...customConfig };

        if (!config.host) {
            return { success: false, error: 'SMTP server host is not configured.' };
        }

        const transporter = createTransporter(config);
        const fromAddress = config.fromName ? `"${config.fromName}" <${config.from}>` : config.from;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc-network.space';

        const info = await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: '✅ MTC DAM — Test Notification Delivery',
            text: `Hello! This is a test email from your MTC Digital Asset Management platform.\n\nHost: ${config.host}:${config.port}\nSender: ${fromAddress}\nTime: ${new Date().toUTCString()}\n\nIf you received this, your email notification system is working correctly!\n${appUrl}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0D1512; color: #F7F4EB; margin: 0; padding: 24px; }
                        .card { max-width: 580px; margin: 0 auto; background: #15221C; border: 1px solid rgba(202, 222, 223, 0.2); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                        .header { background: linear-gradient(135deg, #1A2F25, #386642); padding: 28px 32px; border-bottom: 1px solid rgba(202, 222, 223, 0.15); }
                        .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #F7F4EB; letter-spacing: -0.01em; }
                        .header p { margin: 6px 0 0; font-size: 13px; color: #A7F3D0; }
                        .body { padding: 32px; color: #E5E7EB; line-height: 1.6; font-size: 14px; }
                        .status-box { background: rgba(56, 102, 66, 0.2); border: 1px solid #386642; border-radius: 8px; padding: 16px; margin: 20px 0; }
                        .status-title { font-weight: 700; color: #6EE7B7; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
                        .details-table { width: 100%; font-size: 12px; border-collapse: collapse; margin-top: 12px; }
                        .details-table td { padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
                        .details-table td.label { color: #9CA3AF; width: 35%; }
                        .details-table td.val { color: #F7F4EB; font-family: monospace; }
                        .btn { display: inline-block; background: #386642; color: #F7F4EB; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 20px; }
                        .footer { padding: 20px 32px; background: #0F1A15; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: #6B7280; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">
                            <h1>Mountain Top Communications</h1>
                            <p>Studio-Grade Digital Asset Management</p>
                        </div>
                        <div class="body">
                            <p style="margin-top:0; font-size: 15px;">Hello,</p>
                            <p>This is a live test email sent from your <strong>MTC Digital Asset Management</strong> system to verify that your SMTP mail server settings are configured properly.</p>
                            <div class="status-box">
                                <div class="status-title">✔ SMTP Delivery Verified</div>
                                <table class="details-table">
                                    <tr><td class="label">SMTP Server:</td><td class="val">${config.host}:${config.port}</td></tr>
                                    <tr><td class="label">Encryption:</td><td class="val">${config.secure ? 'SSL (465)' : 'STARTTLS / TLS (587)'}</td></tr>
                                    <tr><td class="label">Sender Address:</td><td class="val">${fromAddress}</td></tr>
                                    <tr><td class="label">Recipient:</td><td class="val">${toEmail}</td></tr>
                                    <tr><td class="label">Timestamp:</td><td class="val">${new Date().toUTCString()}</td></tr>
                                </table>
                            </div>
                            <p>Your team will now receive real-time notifications for asset uploads, external share downloads, expiration warnings, and approval requests.</p>
                            <a href="${appUrl}" class="btn">Open MTC DAM Portal →</a>
                        </div>
                        <div class="footer">
                            MTC Digital Asset Management &bull; Automated System Dispatch &bull; <a href="${appUrl}" style="color: #6EE7B7; text-decoration: none;">${appUrl}</a>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        return { success: true, messageId: info.messageId };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to send test email' };
    }
}

export type NotificationType = 'SHARE_ACCESS' | 'SHARE_EXPIRING' | 'APPROVAL_NEEDED' | 'APPROVAL_GRANTED' | 'ASSET_UPLOADED';

export interface NotificationPayload {
    type: NotificationType;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    data: Record<string, unknown>;
}

/**
 * Send email notification
 */
export async function sendEmailNotification(payload: NotificationPayload): Promise<boolean> {
    try {
        const config = await getActiveSmtpConfig();
        if (!config.host) {
            console.warn('SMTP not configured, skipping email:', payload.recipientEmail);
            return true; // Don't fail if SMTP not configured
        }

        const transporter = createTransporter(config);
        const htmlContent = generateEmailHTML(payload.type, payload.data);
        const fromAddress = config.fromName ? `"${config.fromName}" <${config.from}>` : config.from;

        const mailOptions = {
            from: fromAddress,
            to: payload.recipientEmail,
            subject: payload.subject,
            html: htmlContent,
            text: `${payload.subject}\n\n${String(payload.data.message ?? '')}`,
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${payload.recipientEmail}:`, result.messageId);

        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
}

/**
 * Generate HTML email content
 */
function generateEmailHTML(type: NotificationType, data: Record<string, unknown>): string {
    const d = data as Record<string, string | number | Date | undefined | null>;
    const baseStyle = `
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 4px 4px; }
        .button { display: inline-block; background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #7f8c8d; }
    </style>`;

    let content = '';

    switch (type) {
        case 'SHARE_ACCESS':
            content = `
                <p>Your shared asset "<strong>${d.assetTitle || 'Asset'}</strong>" was accessed.</p>
                <p><strong>Details:</strong></p>
                <ul>
                    <li>Asset: ${d.assetTitle}</li>
                    <li>Type: ${d.assetType}</li>
                    <li>Accessed at: ${new Date(String(d.accessedAt)).toLocaleString()}</li>
                </ul>
                <p><a href="${d.dashboardUrl}" class="button">View Analytics</a></p>
            `;
            break;

        case 'SHARE_EXPIRING':
            content = `
                <p>Your share link for "<strong>${d.assetTitle || 'Asset'}</strong>" will expire soon.</p>
                <p><strong>Expires at:</strong> ${new Date(String(d.expiresAt)).toLocaleString()}</p>
                <p><a href="${d.shareUrl}" class="button">Extend Share</a></p>
            `;
            break;

        case 'APPROVAL_NEEDED':
            content = `
                <p>A new asset is awaiting your approval.</p>
                <p><strong>Asset:</strong> ${d.assetTitle}</p>
                <p><strong>Uploaded by:</strong> ${d.uploadedBy}</p>
                <p><strong>Type:</strong> ${d.assetType}</p>
                <p><a href="${d.reviewUrl}" class="button">Review Asset</a></p>
            `;
            break;

        case 'APPROVAL_GRANTED':
            content = `
                <p>Your asset "<strong>${d.assetTitle}</strong>" has been approved!</p>
                <p><strong>Approved by:</strong> ${d.approvedBy}</p>
                <p><strong>Status:</strong> Now publicly available</p>
                <p><a href="${d.assetUrl}" class="button">View Asset</a></p>
            `;
            break;

        case 'ASSET_UPLOADED':
            content = `
                <p>Your asset "<strong>${d.assetTitle}</strong>" was successfully uploaded.</p>
                <p><strong>Details:</strong></p>
                <ul>
                    <li>Size: ${formatBytes(Number(d.fileSize))}</li>
                    <li>Type: ${d.assetType}</li>
                    <li>Status: ${d.status}</li>
                </ul>
                <p><a href="${d.assetUrl}" class="button">View Asset</a></p>
            `;
            break;

        default:
            content = `<p>${d.message || 'You have a new notification'}</p>`;
    }

    return `
        ${baseStyle}
        <div class="container">
            <div class="header">
                <h2>DAM Notification</h2>
            </div>
            <div class="content">
                ${content}
                <div class="footer">
                    <p>This is an automated notification from DAM. Please do not reply to this email.</p>
                    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}">Visit DAM</a></p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Send multiple notifications
 */
export async function sendBatchNotifications(payloads: NotificationPayload[]): Promise<{ sent: number; failed: number }> {
    const results = await Promise.all(payloads.map(p => sendEmailNotification(p)));
    return {
        sent: results.filter(r => r).length,
        failed: results.filter(r => !r).length,
    };
}
