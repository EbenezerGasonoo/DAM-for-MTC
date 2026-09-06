import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { readAssetFile } from '@/lib/nextcloud';
import { applyImageWatermark, applyVideoWatermark, getWatermarkConfigForRole } from '@/lib/watermark';
import { logActivity } from '@/lib/activity';

// GET /api/assets/[id]/download — Download asset (with watermark applied if applicable)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();

        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const withWatermark = searchParams.get('watermark') === 'true';

        const asset = await prisma.asset.findUnique({
            where: { id },
            include: {
                versions: { orderBy: { versionNum: 'desc' }, take: 1 },
                watermarkProfile: true,
                creator: { select: { id: true, name: true } },
            },
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        if (!asset.versions || asset.versions.length === 0) {
            return NextResponse.json({ error: 'No asset version available' }, { status: 404 });
        }

        const currentVersion = asset.versions[0];

        // Read file from Nextcloud
        const fileBuffer = await readAssetFile(currentVersion.nextcloudUri);
        if (!fileBuffer) {
            return NextResponse.json({ error: 'Could not read asset file' }, { status: 500 });
        }

        // Get user role for watermark determination
        const user = await prisma.user.findUnique({ where: { id: auth.userId } });
        const userRole = user?.role || 'VIEWER';

        // Determine if watermark should be applied
        let responseBuffer = fileBuffer;
        let contentType = asset.mimeType;

        if (withWatermark && asset.watermarkProfile && asset.watermarkProfile.isActive) {
            const watermarkConfig = getWatermarkConfigForRole(userRole, {
                logoUri: asset.watermarkProfile.logoUri || undefined,
                textTemplate: asset.watermarkProfile.textTemplate || undefined,
            });

            if (watermarkConfig) {
                if (asset.type === 'image' && asset.mimeType.startsWith('image/')) {
                    const watermarkedBuffer = await applyImageWatermark(fileBuffer, watermarkConfig);
                    if (watermarkedBuffer) {
                        responseBuffer = watermarkedBuffer;
                        contentType = 'image/png';
                    }
                } else if (asset.type === 'video' && asset.mimeType.startsWith('video/')) {
                    const watermarkedBuffer = await applyVideoWatermark(fileBuffer, watermarkConfig);
                    if (watermarkedBuffer) {
                        responseBuffer = watermarkedBuffer;
                        contentType = 'video/mp4';
                    }
                }
            }
        }

        // Log download activity
        try {
            await prisma.analyticsEvent.create({
                data: {
                    userId: auth.userId,
                    assetId: id,
                    eventType: 'DOWNLOAD',
                    metadata: JSON.stringify({
                        type: asset.type,
                        watermarkApplied: withWatermark && responseBuffer !== fileBuffer,
                    }),
                },
            });
        } catch (analyticsError) {
            console.error('Failed to log download analytics:', analyticsError);
        }

        // Log activity
        await logActivity(
            auth.userId,
            'DOWNLOAD',
            'ASSET',
            id,
            {
                assetTitle: asset.title,
                assetType: asset.type,
                watermarkApplied: withWatermark && responseBuffer !== fileBuffer,
            },
            req
        );

        const filename = `${asset.title.replace(/[^a-zA-Z0-9.\-]/g, '_')}_${asset.id.slice(-8)}`;
        const ext = asset.mimeType.split('/')[1] || 'bin';

        return new NextResponse(new Uint8Array(responseBuffer), {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}.${ext}"`,
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Error downloading asset:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
