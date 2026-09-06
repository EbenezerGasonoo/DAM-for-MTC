import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset } from '@/lib/nextcloud';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { 
    extractImageMetadata, 
    generateImageThumbnail, 
    extractVideoMetadata,
    generateVideoThumbnail,
    extractAudioMetadata,
    generateAudioWaveform
} from '@/lib/media-processor';
import { logActivity } from '@/lib/activity';
import { triggerAutomationRules } from '@/lib/automation';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const title = formData.get('title') as string || 'Untitled';
        const description = formData.get('description') as string || '';
        const creatorId = formData.get('creatorId') as string;
        const projectId = (formData.get('projectId') as string) || null;
        const tags = (formData.get('tags') as string) || '';

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

        // Automatic fallback user if no user session or DB user exists
        if (!validCreatorId) {
            let fallbackUser = await prisma.user.findFirst();
            if (!fallbackUser) {
                fallbackUser = await prisma.user.create({
                    data: {
                        name: 'Enterprise Producer',
                        email: 'producer@mtc-network.space',
                        password: '$2a$10$wT8KzQ4h6qQy.WJ0LhE91OK6d7Hn/rL2oH6.m9e0mI4l8wT8KzQ4h',
                        role: 'ADMIN'
                    }
                });
            }
            validCreatorId = fallbackUser.id;
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const timestamp = Date.now();
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
        const nextcloudPath = `/mtc-dam-uploads/${timestamp}_${cleanName}`;

        console.log(`Starting media storage upload to ${nextcloudPath} (${buffer.length} bytes)...`);
        await uploadAsset(nextcloudPath, buffer);
        console.log(`Media storage upload complete for ${nextcloudPath}`);

        const mimeType = file.type || 'application/octet-stream';
        let type = 'document';
        let assetMetadata: Record<string, unknown> = {};
        let proxyUri: string | null = null;

        if (mimeType.startsWith('image/')) {
            type = 'image';
            try {
                assetMetadata = (await extractImageMetadata(buffer)) || {};
            } catch (err) {
                console.warn('Image metadata error (non-blocking):', err);
            }
            try {
                const thumbBuffer = await generateImageThumbnail(buffer);
                if (thumbBuffer) {
                    const thumbPath = `/mtc-dam-proxies/${timestamp}_thumb_${cleanName}.webp`;
                    await uploadAsset(thumbPath, thumbBuffer);
                    proxyUri = thumbPath;
                }
            } catch (thumbErr) {
                console.warn('Image thumbnail error (non-blocking):', thumbErr);
            }
        } else if (mimeType.startsWith('video/')) {
            type = 'video';
            try {
                assetMetadata = (await extractVideoMetadata(buffer)) || {};
            } catch (metaErr) {
                console.warn('Video metadata error (non-blocking):', metaErr);
            }

            // Fast 1-frame poster thumbnail extraction (<0.5s)
            try {
                const thumbBuffer = await generateVideoThumbnail(buffer);
                if (thumbBuffer) {
                    const thumbPath = `/mtc-dam-proxies/${timestamp}_thumb_${cleanName}.jpg`;
                    await uploadAsset(thumbPath, thumbBuffer);
                    proxyUri = thumbPath;
                }
            } catch (thumbErr) {
                console.warn('Video poster thumbnail error (non-blocking):', thumbErr);
            }

            // If no separate proxy generated, default to the streamable master video file
            if (!proxyUri) {
                proxyUri = nextcloudPath;
            }
        } else if (mimeType.startsWith('audio/')) {
            type = 'audio';
            try {
                assetMetadata = (await extractAudioMetadata(buffer)) || {};
            } catch (metaErr) {
                console.warn('Audio metadata error (non-blocking):', metaErr);
            }
            try {
                const waveformBuffer = await generateAudioWaveform(buffer);
                if (waveformBuffer) {
                    const waveformPath = `/mtc-dam-proxies/${timestamp}_waveform_${cleanName}.mp3`;
                    await uploadAsset(waveformPath, waveformBuffer);
                    proxyUri = waveformPath;
                }
            } catch (audioErr) {
                console.warn('Audio waveform error (non-blocking):', audioErr);
            }
            if (!proxyUri) {
                proxyUri = nextcloudPath;
            }
        }

        // Parse tags
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
        const tagConnect = tagList.map(name => ({
            where: { name },
            create: { name },
        }));

        // Verify project exists if provided
        let assignedProjectId: string | undefined = undefined;
        if (projectId) {
            const proj = await prisma.project.findUnique({ where: { id: projectId } });
            if (proj) assignedProjectId = proj.id;
        }

        const asset = await prisma.asset.create({
            data: {
                title,
                description,
                type,
                mimeType,
                size: Number(file.size),
                creatorId: validCreatorId,
                projectId: assignedProjectId,
                status: 'DRAFT',
                metadata: Object.keys(assetMetadata).length > 0 ? JSON.stringify(assetMetadata) : null,
                tags: tagConnect.length > 0 ? { connectOrCreate: tagConnect } : undefined,
                versions: {
                    create: [{
                        versionNum: 1,
                        nextcloudUri: nextcloudPath,
                        proxyUri,
                    }]
                }
            },
            include: {
                versions: true,
                tags: true,
                project: true,
            }
        });

        // Log upload activity
        try {
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
        } catch (activityError) {
            console.warn('Activity logging failed (non-blocking):', activityError);
        }

        // Trigger automation rules for upload event
        try {
            await triggerAutomationRules('upload', asset.id, validCreatorId);
        } catch (automationError) {
            console.warn('Automation rules execution failed (non-blocking):', automationError);
        }

        return NextResponse.json({ success: true, asset });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        console.error('Upload API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
