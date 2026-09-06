import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadAsset } from '@/lib/nextcloud';
import { 
    extractImageMetadata, 
    generateImageThumbnail, 
    extractVideoMetadata,
    generateVideoProxy,
    extractAudioMetadata,
    generateAudioWaveform
} from '@/lib/media-processor';
import { logActivity } from '@/lib/activity';
import { getAuthFromCookies } from '@/lib/auth';

// GET /api/assets/[id]/versions — Get version history
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const versions = await prisma.assetVersion.findMany({
            where: { assetId: id },
            orderBy: { versionNum: 'desc' },
            include: {
                comments: {
                    include: { author: { select: { id: true, name: true } } },
                }
            }
        });

        if (versions.length === 0) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        return NextResponse.json({ versions, totalVersions: versions.length });
    } catch (error) {
        console.error('Error fetching asset versions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/assets/[id]/versions — Upload new version
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const versionNotes = formData.get('notes') as string || '';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Verify asset exists and user has edit permission
        const asset = await prisma.asset.findUnique({
            where: { id },
            include: { versions: { orderBy: { versionNum: 'desc' }, take: 1 } }
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // TODO: Check edit permissions in access control
        if (asset.creatorId !== auth.userId) {
            return NextResponse.json({ error: 'Forbidden - only creator can update versions' }, { status: 403 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const timestamp = Date.now();
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_');

        // Get next version number
        const nextVersionNum = asset.versions.length > 0 ? asset.versions[0].versionNum + 1 : 2;

        // Upload to Nextcloud
        const nextcloudPath = `/mtc-dam-uploads/${id}/v${nextVersionNum}_${timestamp}_${cleanName}`;
        console.log(`Starting Nextcloud upload for version ${nextVersionNum} to ${nextcloudPath}...`);
        await uploadAsset(nextcloudPath, buffer);

        const mimeType = file.type;
        let proxyUri: string | null = null;
        let metadata: Record<string, unknown> = {};

        // Generate proxies based on file type
        if (mimeType.startsWith('image/')) {
            metadata = (await extractImageMetadata(buffer)) || {};
            const thumbBuffer = await generateImageThumbnail(buffer);
            if (thumbBuffer) {
                const thumbPath = `/mtc-dam-proxies/${id}/v${nextVersionNum}_thumb_${timestamp}.webp`;
                await uploadAsset(thumbPath, thumbBuffer);
                proxyUri = thumbPath;
            }
        } else if (mimeType.startsWith('video/')) {
            metadata = (await extractVideoMetadata(buffer)) || {};
            const proxyBuffer = await generateVideoProxy(buffer);
            if (proxyBuffer) {
                const proxyPath = `/mtc-dam-proxies/${id}/v${nextVersionNum}_proxy_${timestamp}.mp4`;
                await uploadAsset(proxyPath, proxyBuffer);
                proxyUri = proxyPath;
            }
        } else if (mimeType.startsWith('audio/')) {
            metadata = (await extractAudioMetadata(buffer)) || {};
            const waveformBuffer = await generateAudioWaveform(buffer);
            if (waveformBuffer) {
                const waveformPath = `/mtc-dam-proxies/${id}/v${nextVersionNum}_waveform_${timestamp}.mp3`;
                await uploadAsset(waveformPath, waveformBuffer);
                proxyUri = waveformPath;
            }
        }

        // Create version record
        const newVersion = await prisma.assetVersion.create({
            data: {
                assetId: id,
                versionNum: nextVersionNum,
                nextcloudUri: nextcloudPath,
                proxyUri,
            },
            include: {
                comments: { include: { author: { select: { id: true, name: true } } } }
            }
        });

        // Update asset metadata and size
        await prisma.asset.update({
            where: { id },
            data: {
                mimeType,
                size: Number(file.size),
                metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : asset.metadata,
                updatedAt: new Date(),
            }
        });

        // Log activity
        await logActivity(
            auth.userId,
            'UPDATE',
            'ASSET',
            id,
            {
                versionNum: nextVersionNum,
                previousSize: asset.size,
                newSize: file.size,
                mimeType,
                notes: versionNotes,
                nextcloudPath,
                proxyUri,
            },
            req
        );

        return NextResponse.json({ success: true, version: newVersion }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Version upload failed';
        console.error('Asset versioning API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// DELETE /api/assets/[id]/versions/[versionNum] — Delete specific version (optional)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { versionNum } = body;

        if (!versionNum) {
            return NextResponse.json({ error: 'Version number required' }, { status: 400 });
        }

        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        if (asset.creatorId !== auth.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const versionCount = await prisma.assetVersion.count({ where: { assetId: id } });
        if (versionCount <= 1) {
            return NextResponse.json({ error: 'Cannot delete the only version' }, { status: 400 });
        }

        const versionToDelete = await prisma.assetVersion.findFirst({
            where: { assetId: id, versionNum: Number(versionNum) },
        });
        if (!versionToDelete) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        const deletedVersion = await prisma.assetVersion.delete({
            where: {
                id: versionToDelete.id,
            },
        });

        // Log activity
        await logActivity(
            auth.userId,
            'DELETE',
            'ASSET',
            id,
            {
                deletedVersionNum: versionNum,
                nextcloudUri: deletedVersion.nextcloudUri,
                proxyUri: deletedVersion.proxyUri,
            },
            req
        );

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Version deletion failed';
        console.error('Asset version deletion error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
