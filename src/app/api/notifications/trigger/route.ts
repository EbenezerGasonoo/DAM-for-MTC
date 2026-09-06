import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmailNotification } from '@/lib/notifications';

async function getAssetForShare(share: { entityType: string; entityId: string }) {
    if (share.entityType !== 'ASSET') return null;
    return prisma.asset.findUnique({
        where: { id: share.entityId },
        select: { id: true, title: true, mimeType: true },
    });
}

/**
 * Event-driven notification system - triggers notifications based on system events
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event, userId, assetId, shareId, data } = body;

        if (!event || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: event, userId' },
                { status: 400 }
            );
        }

        // Get user preferences
        const preferences = await prisma.notificationPreference.findUnique({
            where: { userId },
        });

        // Default preferences if not found
        const prefs = preferences || {
            shareAccessNotifications: true,
            shareExpiryNotifications: true,
            approvalNotifications: true,
            uploadNotifications: true,
            emailNotifications: true,
            digestFrequency: 'DAILY',
        };

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        let notification = null;
        const shouldSendEmail = Boolean(prefs.emailNotifications && user.email);

        switch (event) {
            case 'SHARE_ACCESSED':
                if (!prefs.shareAccessNotifications) break;

                if (!shareId) break;

                {
                    const share = await prisma.externalShare.findUnique({
                        where: { id: shareId },
                    });

                    if (share) {
                        const linkedAsset = await getAssetForShare(share);
                        const payload = {
                            shareId,
                            assetId: linkedAsset?.id,
                            assetTitle: linkedAsset?.title || 'Unknown',
                            assetType: linkedAsset?.mimeType || 'Unknown',
                            accessedAt: new Date().toISOString(),
                            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/shares/${shareId}/analytics`,
                        };
                        notification = await prisma.notification.create({
                            data: {
                                type: 'SHARE_ACCESS',
                                recipientId: userId,
                                subject: 'Your shared asset was accessed',
                                message: `Asset "${linkedAsset?.title || 'Asset'}" was accessed`,
                                data: JSON.stringify(payload),
                            },
                        });

                        if (shouldSendEmail) {
                            await sendEmailNotification({
                                type: 'SHARE_ACCESS',
                                recipientEmail: user.email,
                                recipientName: user.name || user.email,
                                subject: 'Your shared asset was accessed',
                                data: {
                                    assetTitle: linkedAsset?.title || 'Asset',
                                    assetType: linkedAsset?.mimeType || 'Unknown',
                                    accessedAt: new Date().toISOString(),
                                    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/shares/${shareId}/analytics`,
                                },
                            });
                        }
                    }
                }
                break;

            case 'SHARE_EXPIRING':
                if (!prefs.shareExpiryNotifications) break;

                if (!shareId) break;

                {
                    const expiringShare = await prisma.externalShare.findUnique({
                        where: { id: shareId },
                    });

                    if (expiringShare) {
                        const linkedAsset = await getAssetForShare(expiringShare);
                        const payload = {
                            shareId,
                            assetTitle: linkedAsset?.title || 'Unknown',
                            expiresAt: expiringShare.expiresAt,
                            shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/shares/${shareId}`,
                        };
                        notification = await prisma.notification.create({
                            data: {
                                type: 'SHARE_EXPIRING',
                                recipientId: userId,
                                subject: 'Your share link expires soon',
                                message: `Share for "${linkedAsset?.title || 'Asset'}" expires ${expiringShare.expiresAt?.toLocaleString()}`,
                                data: JSON.stringify(payload),
                            },
                        });

                        if (shouldSendEmail) {
                            await sendEmailNotification({
                                type: 'SHARE_EXPIRING',
                                recipientEmail: user.email,
                                recipientName: user.name || user.email,
                                subject: 'Your share link expires soon',
                                data: {
                                    assetTitle: linkedAsset?.title || 'Asset',
                                    expiresAt: expiringShare.expiresAt,
                                    shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/shares/${shareId}`,
                                },
                            });
                        }
                    }
                }
                break;

            case 'APPROVAL_NEEDED':
                if (!prefs.approvalNotifications) break;

                {
                    const assetForApproval = await prisma.asset.findUnique({
                        where: { id: assetId },
                        include: { creator: { select: { name: true, email: true } } },
                    });

                    if (assetForApproval) {
                        const payload = {
                            assetId,
                            assetTitle: assetForApproval.title,
                            assetType: assetForApproval.mimeType,
                            uploadedBy: assetForApproval.creator?.name || 'Unknown',
                            reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/assets/${assetId}`,
                        };
                        notification = await prisma.notification.create({
                            data: {
                                type: 'APPROVAL_NEEDED',
                                recipientId: userId,
                                subject: 'Asset awaiting approval',
                                message: `"${assetForApproval.title}" uploaded by ${assetForApproval.creator?.name} is waiting for approval`,
                                data: JSON.stringify(payload),
                            },
                        });

                        if (shouldSendEmail) {
                            await sendEmailNotification({
                                type: 'APPROVAL_NEEDED',
                                recipientEmail: user.email,
                                recipientName: user.name || user.email,
                                subject: 'Asset awaiting approval',
                                data: {
                                    assetTitle: assetForApproval.title,
                                    assetType: assetForApproval.mimeType,
                                    uploadedBy: assetForApproval.creator?.name || 'Unknown',
                                    reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/assets/${assetId}`,
                                },
                            });
                        }
                    }
                }
                break;

            case 'APPROVAL_GRANTED':
                if (!prefs.approvalNotifications) break;

                {
                    const asset = await prisma.asset.findUnique({
                        where: { id: assetId },
                    });

                    if (asset) {
                        const payload = {
                            assetId,
                            assetTitle: asset.title,
                            approvedBy: data?.approvedBy || 'Admin',
                            assetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/assets/${assetId}`,
                        };
                        notification = await prisma.notification.create({
                            data: {
                                type: 'APPROVAL_GRANTED',
                                recipientId: userId,
                                subject: 'Your asset was approved!',
                                message: `"${asset.title}" has been approved`,
                                data: JSON.stringify(payload),
                            },
                        });

                        if (shouldSendEmail) {
                            await sendEmailNotification({
                                type: 'APPROVAL_GRANTED',
                                recipientEmail: user.email,
                                recipientName: user.name || user.email,
                                subject: 'Your asset was approved!',
                                data: {
                                    assetTitle: asset.title,
                                    approvedBy: data?.approvedBy || 'Admin',
                                    assetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/assets/${assetId}`,
                                },
                            });
                        }
                    }
                }
                break;

            case 'ASSET_UPLOADED':
                if (!prefs.uploadNotifications) break;

                {
                    const uploadedAsset = await prisma.asset.findUnique({
                        where: { id: assetId },
                    });

                    if (uploadedAsset) {
                        const payload = {
                            assetId,
                            assetTitle: uploadedAsset.title,
                            assetType: uploadedAsset.mimeType,
                            fileSize: uploadedAsset.size,
                            status: uploadedAsset.status,
                            assetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/assets/${assetId}`,
                        };
                        notification = await prisma.notification.create({
                            data: {
                                type: 'ASSET_UPLOADED',
                                recipientId: userId,
                                subject: 'Your asset was uploaded',
                                message: `"${uploadedAsset.title}" has been successfully uploaded`,
                                data: JSON.stringify(payload),
                            },
                        });

                        if (shouldSendEmail) {
                            await sendEmailNotification({
                                type: 'ASSET_UPLOADED',
                                recipientEmail: user.email,
                                recipientName: user.name || user.email,
                                subject: 'Your asset was uploaded',
                                data: {
                                    assetTitle: uploadedAsset.title,
                                    assetType: uploadedAsset.mimeType,
                                    fileSize: uploadedAsset.size,
                                    status: uploadedAsset.status,
                                    assetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dam.mtc.local'}/assets/${assetId}`,
                                },
                            });
                        }
                    }
                }
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown event type: ${event}` },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            notificationId: notification?.id,
            eventType: event,
            emailSent: shouldSendEmail,
        });
    } catch (error) {
        console.error('Failed to trigger notification:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
