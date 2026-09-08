import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset, uploadAssetFromPath, getActiveNextcloudConfig } from '@/lib/nextcloud';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { 
    extractImageMetadata, 
    generateImageThumbnail, 
    extractVideoMetadataFromPath,
    generateVideoThumbnailFromPath,
    generateVideoProxyFromPath,
    extractAudioMetadata,
    generateAudioWaveform
} from '@/lib/media-processor';
import { logActivity } from '@/lib/activity';
import { triggerAutomationRules } from '@/lib/automation';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CHUNK_DIR_ROOT = path.join(os.tmpdir(), 'mtc_upload_chunks');

function ensureDirSync(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const chunk = formData.get('chunk') as File | null;
        const uploadId = formData.get('uploadId') as string;
        const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
        const totalChunks = parseInt(formData.get('totalChunks') as string, 10);
        const fileName = (formData.get('fileName') as string) || 'upload.bin';
        const fileSize = parseInt(formData.get('fileSize') as string, 10) || 0;
        const title = (formData.get('title') as string) || fileName;
        const description = (formData.get('description') as string) || '';
        const creatorId = formData.get('creatorId') as string;
        const projectId = (formData.get('projectId') as string) || null;
        const tags = (formData.get('tags') as string) || '';

        if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
            return NextResponse.json({ error: 'Missing required chunk parameters' }, { status: 400 });
        }

        const uploadDir = path.join(CHUNK_DIR_ROOT, uploadId);
        ensureDirSync(uploadDir);

        // 1. Write chunk to temporary disk file
        const chunkPath = path.join(uploadDir, `${chunkIndex}.part`);
        const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
        await fs.promises.writeFile(chunkPath, chunkBuffer);

        // 2. If intermediate chunk, acknowledge receipt immediately
        if (chunkIndex < totalChunks - 1) {
            return NextResponse.json({
                success: true,
                chunkIndex,
                totalChunks,
                uploaded: true
            });
        }

        // 3. Final chunk received — assemble the full file on disk via streaming
        console.log(`[Chunk Ingestion] All ${totalChunks} chunks received for ${fileName}. Assembling file...`);
        const cleanName = fileName.replace(/[^a-zA-Z0-9.\-]/g, '_');
        const timestamp = Date.now();
        const assembledPath = path.join(uploadDir, `${timestamp}_${cleanName}`);
        const writeStream = fs.createWriteStream(assembledPath);

        for (let i = 0; i < totalChunks; i++) {
            const partFile = path.join(uploadDir, `${i}.part`);
            if (!fs.existsSync(partFile)) {
                writeStream.destroy();
                return NextResponse.json({ error: `Missing chunk ${i} during assembly` }, { status: 400 });
            }
            const partBuffer = await fs.promises.readFile(partFile);
            writeStream.write(partBuffer);
            // Delete the part file immediately to free disk space
            try { await fs.promises.unlink(partFile); } catch {}
        }
        await new Promise((resolve) => writeStream.end(resolve));

        // 4. Resolve authenticated user
        const auth = await getAuthFromCookies();
        let validCreatorId = creatorId;
        if (!validCreatorId || validCreatorId === 'demo-user-id') {
            if (auth?.userId) {
                validCreatorId = auth.userId;
            } else {
                const defaultUser = await prisma.user.findFirst();
                if (defaultUser) validCreatorId = defaultUser.id;
            }
        }
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

        // 5. Stream assembled file to Nextcloud / persistent storage
        const ncConfig = await getActiveNextcloudConfig();
        const rootDir = (ncConfig.rootFolder || '/mtc-dam-uploads').replace(/\/+$/, '') || '/mtc-dam-uploads';
        const nextcloudPath = `${rootDir}/${timestamp}_${cleanName}`;
        console.log(`[Chunk Ingestion] Streaming assembled file to storage: ${nextcloudPath}...`);
        await uploadAssetFromPath(nextcloudPath, assembledPath);

        // 6. Determine media type and extract metadata/thumbnail directly from disk
        const lowerName = fileName.toLowerCase();
        let type = 'document';
        let mimeType = 'application/octet-stream';
        let assetMetadata: Record<string, unknown> = {};
        let proxyUri: string | null = null;

        if (/\.(mp4|mov|mkv|avi|webm|m4v|mxf|prores)$/i.test(lowerName)) {
            type = 'video';
            mimeType = lowerName.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
            try {
                assetMetadata = (await extractVideoMetadataFromPath(assembledPath)) || {};
            } catch (err) {
                console.warn('[Chunk Ingestion] Video metadata extraction non-blocking error:', err);
            }
            try {
                const thumbBuffer = await generateVideoThumbnailFromPath(assembledPath);
                if (thumbBuffer) {
                    const thumbPath = `/mtc-dam-proxies/${timestamp}_thumb_${cleanName}.jpg`;
                    await uploadAsset(thumbPath, thumbBuffer);
                    proxyUri = thumbPath;
                }
            } catch (thumbErr) {
                console.warn('[Chunk Ingestion] Thumbnail extraction non-blocking error:', thumbErr);
            }

            // Hardware-accelerated streaming video proxy (NVIDIA -> Intel QuickSync -> CPU fallback)
            try {
                const proxyBuffer = await generateVideoProxyFromPath(assembledPath);
                if (proxyBuffer) {
                    const videoProxyPath = `/mtc-dam-proxies/${timestamp}_proxy_${cleanName}.mp4`;
                    await uploadAsset(videoProxyPath, proxyBuffer);
                    proxyUri = videoProxyPath;
                }
            } catch (proxyErr) {
                console.warn('[Chunk Ingestion] Video proxy generation non-blocking error:', proxyErr);
            }

            if (!proxyUri) proxyUri = nextcloudPath;
        } else if (/\.(jpg|jpeg|png|webp|gif|svg|tiff|bmp)$/i.test(lowerName)) {
            type = 'image';
            mimeType = lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg';
            try {
                const imgBuf = await fs.promises.readFile(assembledPath);
                assetMetadata = (await extractImageMetadata(imgBuf)) || {};
                const thumbBuffer = await generateImageThumbnail(imgBuf);
                if (thumbBuffer) {
                    const thumbPath = `/mtc-dam-proxies/${timestamp}_thumb_${cleanName}.webp`;
                    await uploadAsset(thumbPath, thumbBuffer);
                    proxyUri = thumbPath;
                }
            } catch {}
        } else if (/\.(mp3|wav|aac|flac|ogg|m4a|aiff)$/i.test(lowerName)) {
            type = 'audio';
            mimeType = lowerName.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
            try {
                const audioBuf = await fs.promises.readFile(assembledPath);
                assetMetadata = (await extractAudioMetadata(audioBuf)) || {};
                const waveformBuffer = await generateAudioWaveform(audioBuf);
                if (waveformBuffer) {
                    const waveformPath = `/mtc-dam-proxies/${timestamp}_waveform_${cleanName}.mp3`;
                    await uploadAsset(waveformPath, waveformBuffer);
                    proxyUri = waveformPath;
                }
            } catch {}
            if (!proxyUri) proxyUri = nextcloudPath;
        }

        // Clean up assembled file from scratch disk
        try {
            await fs.promises.unlink(assembledPath);
            await fs.promises.rmdir(uploadDir, { recursive: true });
        } catch {}

        // 7. Parse tags and project
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
        const tagConnect = tagList.map(name => ({
            where: { name },
            create: { name },
        }));

        let assignedProjectId: string | undefined = undefined;
        if (projectId) {
            const proj = await prisma.project.findUnique({ where: { id: projectId } });
            if (proj) assignedProjectId = proj.id;
        }

        // 8. Create Asset in Database
        const finalSize = fileSize || (fs.existsSync(assembledPath) ? fs.statSync(assembledPath).size : 0);
        const asset = await prisma.asset.create({
            data: {
                title,
                description,
                type,
                mimeType,
                size: Number(finalSize),
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

        // 9. Activity & Automations
        try {
            await logActivity(
                validCreatorId,
                'UPLOAD',
                'ASSET',
                asset.id,
                { title, type, mimeType, size: finalSize, nextcloudPath },
                req
            );
        } catch {}

        try {
            await triggerAutomationRules('upload', asset.id, validCreatorId);
        } catch {}

        console.log(`[Chunk Ingestion] Ingestion complete for ${asset.id} (${title})`);
        return NextResponse.json({ success: true, asset });
    } catch (error: any) {
        console.error('[Chunk Ingestion] Fatal error:', error);
        return NextResponse.json({ error: error?.message || 'Chunk ingestion failed' }, { status: 500 });
    }
}
