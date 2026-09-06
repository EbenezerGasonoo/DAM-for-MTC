import nodemailer from 'nodemailer';

// Create transporter (should be configured with environment variables)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    } : undefined,
});

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
        if (!process.env.SMTP_HOST) {
            console.warn('SMTP not configured, skipping email:', payload.recipientEmail);
            return true; // Don't fail if SMTP not configured
        }

        const htmlContent = generateEmailHTML(payload.type, payload.data);

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@dam.mtc.local',
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
