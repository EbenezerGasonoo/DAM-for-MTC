import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/prisma';
import { readAssetFile } from '@/lib/nextcloud';
import { extractAudioTrack, transcribeAudioFile, FullTranscriptData } from '@/lib/transcription';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes for long video transcription

// GET: Check transcription status
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const asset = await prisma.asset.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                transcriptStatus: true,
                transcript: true,
            }
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        let parsedTranscript: FullTranscriptData | null = null;
        if (asset.transcript) {
            try {
                parsedTranscript = JSON.parse(asset.transcript);
            } catch { }
        }

        return NextResponse.json({
            status: asset.transcriptStatus,
            hasTranscript: Boolean(parsedTranscript),
            transcript: parsedTranscript,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Error fetching status' }, { status: 500 });
    }
}

// POST: Trigger AI Speech-to-Text Transcription
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const asset = await prisma.asset.findUnique({
        where: { id },
        include: {
            versions: {
                orderBy: { versionNum: 'desc' },
                take: 1,
            }
        }
    });

    if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (asset.type !== 'video' && asset.type !== 'audio') {
        return NextResponse.json({ error: 'Only video and audio assets can be transcribed.' }, { status: 400 });
    }

    // Set status to PROCESSING
    await prisma.asset.update({
        where: { id },
        data: { transcriptStatus: 'PROCESSING' }
    });

    let tempMediaFile: string | null = null;
    let tempAudioFile: string | null = null;

    try {
        // Locate source file (prefer proxy for speed, or master)
        const latestVersion = asset.versions[0];
        const mediaUri = latestVersion?.proxyUri || latestVersion?.nextcloudUri;

        if (!mediaUri) {
            throw new Error('No media storage URI found for asset.');
        }

        const fileBuffer = await readAssetFile(mediaUri);
        if (!fileBuffer || fileBuffer.length === 0) {
            throw new Error(`Could not read media file from storage: ${mediaUri}`);
        }

        const ext = path.extname(mediaUri) || (asset.type === 'video' ? '.mp4' : '.mp3');
        tempMediaFile = path.join(os.tmpdir(), `transcribe_${Date.now()}_${id}${ext}`);
        await fs.promises.writeFile(tempMediaFile, fileBuffer);

        // 1. Extract 16kHz mono audio via FFmpeg
        tempAudioFile = await extractAudioTrack(tempMediaFile);

        // 2. Transcribe via Whisper
        const transcriptData = await transcribeAudioFile(tempAudioFile, asset.title);

        // 3. Save transcript to database
        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: {
                transcript: JSON.stringify(transcriptData),
                transcriptStatus: 'COMPLETED',
            }
        });

        // 4. Log activity
        try {
            await logActivity(
                asset.creatorId,
                'UPDATE',
                'ASSET',
                `Generated AI dialogue transcript (${transcriptData.segments.length} cues)`,
                { assetId: id, segmentsCount: transcriptData.segments.length, duration: transcriptData.duration }
            );
        } catch { }

        return NextResponse.json({
            success: true,
            status: 'COMPLETED',
            segmentsCount: transcriptData.segments.length,
            duration: transcriptData.duration,
            transcript: transcriptData,
        });

    } catch (err: any) {
        console.error(`[Whisper API] Transcription failed for asset ${id}:`, err);
        await prisma.asset.update({
            where: { id },
            data: { transcriptStatus: 'ERROR' }
        }).catch(() => { });

        return NextResponse.json({
            success: false,
            status: 'ERROR',
            error: err?.message || 'Speech-to-Text transcription failed.',
        }, { status: 500 });

    } finally {
        // Cleanup temporary files
        if (tempMediaFile && fs.existsSync(tempMediaFile)) {
            fs.promises.unlink(tempMediaFile).catch(() => { });
        }
        if (tempAudioFile && fs.existsSync(tempAudioFile)) {
            fs.promises.unlink(tempAudioFile).catch(() => { });
        }
    }
}
