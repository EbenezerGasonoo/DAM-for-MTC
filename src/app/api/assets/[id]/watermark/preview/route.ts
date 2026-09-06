import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { generateWatermarkPreview } from '@/lib/watermark';
import { readAssetFile } from '@/lib/nextcloud';

// GET /api/assets/[id]/watermark/preview — Preview asset with watermark
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const watermarkProfileId = searchParams.get('watermarkProfileId');

        const asset = await prisma.asset.findUnique({
            where: { id },
            include: {
                versions: { orderBy: { versionNum: 'desc' }, take: 1 },
                watermarkProfile: true,
            },
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        if (!asset.versions || asset.versions.length === 0) {
            return NextResponse.json({ error: 'No asset version found' }, { status: 404 });
        }

        const currentVersion = asset.versions[0];
        let profile = asset.watermarkProfile;

        if (watermarkProfileId && !profile) {
            profile = await prisma.watermarkProfile.findUnique({
                where: { id: watermarkProfileId },
            });
        }

        if (!profile || !profile.isActive) {
            return NextResponse.json({ error: 'Watermark profile not found or inactive' }, { status: 404 });
        }

        // Read asset file
        const fileBuffer = await readAssetFile(currentVersion.nextcloudUri);
        if (!fileBuffer) {
            return NextResponse.json({ error: 'Could not read asset file' }, { status: 500 });
        }

        const watermarkConfig = {
            logoUri: profile.logoUri || undefined,
            textTemplate: profile.textTemplate || undefined,
        };

        const previewBuffer = await generateWatermarkPreview(fileBuffer, watermarkConfig);
        if (!previewBuffer) {
            return NextResponse.json({ error: 'Failed to generate watermark preview' }, { status: 500 });
        }

        return new NextResponse(new Uint8Array(previewBuffer), {
            headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Error generating watermark preview:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
