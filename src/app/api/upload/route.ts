import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset } from '@/lib/nextcloud';
import { prisma } from '@/lib/prisma';
import { extractImageMetadata, generateImageThumbnail, extractVideoMetadata } from '@/lib/media-processor';

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

        if (!creatorId) {
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
        } else if (mimeType.startsWith('audio/')) {
            type = 'audio';
        }

        const asset = await prisma.asset.create({
            data: {
                title,
                description,
                type,
                mimeType,
                size: Number(file.size),
                creatorId,
                status: 'DRAFT',
                metadata: assetMetadata,
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

        return NextResponse.json({ success: true, asset });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        console.error('Upload API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
