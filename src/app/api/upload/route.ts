import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset } from '@/lib/nextcloud';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { 
    extractImageMetadata, 
    generateImageThumbnail, 
    extractVideoMetadata,
    generateVideoProxy,
    extractAudioMetadata,
    generateAudioWaveform
} from '@/lib/media-processor';
import { logActivity } from '@/lib/activity';
import { triggerAutomationRules } from '@/lib/automation';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const title = formData.get('title') as string || 'Untitled';
        const description = formData.get('description') as string || '';
        const creatorId = formData.get('creatorId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const auth = await getAuthFromCookies();
        let validCreatorId = creatorId;

        if (!validCreatorId || validCreatorId === 'demo-user-id') {
            if (auth?.userId) {
                validCreatorId = auth.userId;
            } else {
                const defaultUser = await prisma.user.findFirst();
                if (defaultUser) validCreatorId = defaultUser.id;
            }
        } else {
            const userExists = await prisma.user.findUnique({ where: { id: validCreatorId } });
            if (!userExists) {
                if (auth?.userId) {
                    validCreatorId = auth.userId;
                } else {
                    const defaultUser = await prisma.user.findFirst();
                    if (defaultUser) validCreatorId = defaultUser.id;
                }
            }
        }

        if (!validCreatorId) {
            return NextResponse.json({ error: 'Creator ID required' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const timestamp = Date.now();
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
        const nextcloudPath = `/mtc-dam-uploads/${timestamp}_${cleanName}`;

        console.log(`Starting Nextcloud upload to ${nextcloudPath}...`);
        await uploadAsset(nextcloudPath, buffer);
        console.log(`Nextcloud upload complete.`);

        const mimeType = file.type;
        let type = 'document';
        let assetMetadata: Record<string, unknown> = {};
        let proxyUri: string | null = null;

        if (mimeType.startsWith('image/')) {
            type = 'image';
            assetMetadata = (await extractImageMetadata(buffer)) || {};
            const thumbBuffer = await generateImageThumbnail(buffer);
            if (thumbBuffer) {
                const thumbPath = `/mtc-dam-proxies/${timestamp}_thumb_${cleanName}.webp`;
                await uploadAsset(thumbPath, thumbBuffer);
                proxyUri = thumbPath;
            }
        } else if (mimeType.startsWith('video/')) {
            type = 'video';
            assetMetadata = (await extractVideoMetadata(buffer)) || {};
            const proxyBuffer = await generateVideoProxy(buffer);
            if (proxyBuffer) {
                const proxyPath = `/mtc-dam-proxies/${timestamp}_proxy_${cleanName}.mp4`;
                await uploadAsset(proxyPath, proxyBuffer);
                proxyUri = proxyPath;
            }
        } else if (mimeType.startsWith('audio/')) {
            type = 'audio';
            assetMetadata = (await extractAudioMetadata(buffer)) || {};
            const waveformBuffer = await generateAudioWaveform(buffer);
            if (waveformBuffer) {
                const waveformPath = `/mtc-dam-proxies/${timestamp}_waveform_${cleanName}.mp3`;
                await uploadAsset(waveformPath, waveformBuffer);
                proxyUri = waveformPath;
            }
        }

        const asset = await prisma.asset.create({
            data: {
                title,
                description,
                type,
                mimeType,
                size: Number(file.size),
                creatorId: validCreatorId,
                status: 'DRAFT',
                metadata: Object.keys(assetMetadata).length > 0 ? JSON.stringify(assetMetadata) : null,
                versions: {
                    create: [{
                        versionNum: 1,
                        nextcloudUri: nextcloudPath,
                        proxyUri,
                    }]
                }
            },
            include: {
                versions: true
            }
        });

        // Log upload activity
        await logActivity(
            validCreatorId,
            'UPLOAD',
            'ASSET',
            asset.id,
            {
                title,
                type,
                mimeType,
                size: file.size,
                nextcloudPath,
                proxyUri,
            },
            req
        );

        // Trigger automation rules for upload event
        try {
            await triggerAutomationRules('upload', asset.id, creatorId);
        } catch (automationError) {
            console.error('Automation rules execution failed (non-blocking):', automationError);
        }

        return NextResponse.json({ success: true, asset });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        console.error('Upload API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
