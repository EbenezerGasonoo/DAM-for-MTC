import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

export type AccelType = 'nvidia' | 'intel' | 'cpu';

let cachedAccel: AccelType | null = null;

// Probe and detect available hardware video acceleration (NVIDIA NVENC -> Intel QuickSync/VAAPI -> CPU fallback)
export async function detectHardwareAcceleration(): Promise<AccelType> {
    if (cachedAccel) return cachedAccel;

    // 1. Probe NVIDIA NVENC first
    const hasNvidia = await new Promise<boolean>((resolve) => {
        try {
            const proc = spawn('ffmpeg', [
                '-f', 'lavfi', '-i', 'testsrc=duration=1:size=64x64:rate=1',
                '-c:v', 'h264_nvenc',
                '-f', 'null', '-'
            ]);
            proc.on('close', (code) => resolve(code === 0));
            proc.on('error', () => resolve(false));
            setTimeout(() => {
                try { proc.kill(); } catch {}
                resolve(false);
            }, 3000);
        } catch {
            resolve(false);
        }
    });

    if (hasNvidia) {
        console.log('[Media Processor] 🚀 NVIDIA NVENC hardware acceleration detected and active.');
        cachedAccel = 'nvidia';
        return 'nvidia';
    }

    // 2. Fallback to Intel QuickSync / VAAPI
    const hasIntel = await new Promise<boolean>((resolve) => {
        try {
            const devPath = fs.existsSync('/dev/dri/renderD128')
                ? '/dev/dri/renderD128'
                : (fs.existsSync('/dev/dri/card0') ? '/dev/dri/card0' : null);

            if (!devPath) return resolve(false);

            const proc = spawn('ffmpeg', [
                '-f', 'lavfi', '-i', 'testsrc=duration=1:size=64x64:rate=1',
                '-vaapi_device', devPath,
                '-vf', 'format=nv12,hwupload',
                '-c:v', 'h264_vaapi',
                '-f', 'null', '-'
            ]);
            proc.on('close', (code) => resolve(code === 0));
            proc.on('error', () => resolve(false));
            setTimeout(() => {
                try { proc.kill(); } catch {}
                resolve(false);
            }, 3000);
        } catch {
            resolve(false);
        }
    });

    if (hasIntel) {
        console.log('[Media Processor] ⚡ Intel QuickSync / VAAPI hardware acceleration detected and active.');
        cachedAccel = 'intel';
        return 'intel';
    }

    console.log('[Media Processor] 💻 Using CPU software encoding (libx264).');
    cachedAccel = 'cpu';
    return 'cpu';
}

export async function extractImageMetadata(buffer: Buffer) {
    try {
        const metadata = await sharp(buffer).metadata();
        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            channels: metadata.channels,
        };
    } catch (error) {
        console.warn('Image metadata extraction failed (non-blocking):', error);
        return null;
    }
}

export async function generateImageThumbnail(buffer: Buffer) {
    try {
        return await sharp(buffer)
            .resize({ width: 600, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
    } catch (error) {
        console.warn('Thumbnail generation failed (non-blocking):', error);
        return null;
    }
}

export async function extractVideoMetadata(buffer: Buffer): Promise<Record<string, unknown> | null> {
    const tempPath = path.join(os.tmpdir(), `temp_video_${Date.now()}.mp4`);
    try {
        await fs.promises.writeFile(tempPath, buffer);

        return await new Promise<Record<string, unknown> | null>((resolve) => {
            const timer = setTimeout(() => {
                try {
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                } catch {}
                resolve(null);
            }, 5000);

            try {
                ffmpeg.ffprobe(tempPath, (err, metadata) => {
                    clearTimeout(timer);
                    try {
                        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                    } catch {}

                    if (err) {
                        console.warn('FFmpeg ffprobe failed (non-blocking):', err?.message || err);
                        resolve(null);
                    } else {
                        const videoStream = metadata?.streams?.find(s => s.codec_type === 'video');
                        resolve({
                            duration: metadata?.format?.duration,
                            width: videoStream?.width,
                            height: videoStream?.height,
                            codec: videoStream?.codec_name,
                            bitrate: metadata?.format?.bit_rate
                        });
                    }
                });
            } catch (ffprobeErr) {
                clearTimeout(timer);
                console.warn('ffprobe execution error (non-blocking):', ffprobeErr);
                try {
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                } catch {}
                resolve(null);
            }
        });
    } catch (writeErr) {
        console.warn('Video metadata write error (non-blocking):', writeErr);
        return null;
    }
}

export async function extractVideoMetadataFromPath(filePath: string): Promise<Record<string, unknown> | null> {
    try {
        return await new Promise<Record<string, unknown> | null>((resolve) => {
            const timer = setTimeout(() => resolve(null), 8000);
            try {
                ffmpeg.ffprobe(filePath, (err, metadata) => {
                    clearTimeout(timer);
                    if (err) {
                        console.warn('FFmpeg ffprobe failed (non-blocking):', err?.message || err);
                        resolve(null);
                    } else {
                        const videoStream = metadata?.streams?.find(s => s.codec_type === 'video');
                        resolve({
                            duration: metadata?.format?.duration,
                            width: videoStream?.width,
                            height: videoStream?.height,
                            codec: videoStream?.codec_name,
                            bitrate: metadata?.format?.bit_rate
                        });
                    }
                });
            } catch {
                clearTimeout(timer);
                resolve(null);
            }
        });
    } catch {
        return null;
    }
}

export async function generateVideoThumbnailFromPath(filePath: string): Promise<Buffer | null> {
    const timestamp = Date.now();
    const tempOutputPath = path.join(os.tmpdir(), `temp_vid_thumb_${timestamp}.jpg`);

    return await new Promise<Buffer | null>((resolve) => {
        const timer = setTimeout(() => {
            try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch {}
            resolve(null);
        }, 8000);

        try {
            ffmpeg(filePath)
                .seekInput(1.0)
                .frames(1)
                .size('640x360')
                .output(tempOutputPath)
                .on('end', async () => {
                    clearTimeout(timer);
                    try {
                        const thumbBuffer = await fs.promises.readFile(tempOutputPath);
                        try { if (fs.existsSync(tempOutputPath)) await fs.promises.unlink(tempOutputPath); } catch {}
                        resolve(thumbBuffer);
                    } catch {
                        resolve(null);
                    }
                })
                .on('error', (err) => {
                    clearTimeout(timer);
                    console.warn('FFmpeg video thumbnail extraction failed (non-blocking):', err?.message || err);
                    try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch {}
                    resolve(null);
                })
                .run();
        } catch {
            clearTimeout(timer);
            resolve(null);
        }
    });
}

// Fast 1-frame video thumbnail extraction (<0.5s) for instant previews
export async function generateVideoThumbnail(buffer: Buffer): Promise<Buffer | null> {
    const timestamp = Date.now();
    const tempInputPath = path.join(os.tmpdir(), `temp_vid_in_${timestamp}.mp4`);
    const tempOutputPath = path.join(os.tmpdir(), `temp_vid_thumb_${timestamp}.jpg`);

    try {
        await fs.promises.writeFile(tempInputPath, buffer);

        return await new Promise<Buffer | null>((resolve) => {
            const timer = setTimeout(() => {
                try {
                    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                } catch {}
                resolve(null);
            }, 6000);

            try {
                ffmpeg(tempInputPath)
                    .seekInput(1.0)
                    .frames(1)
                    .size('640x360')
                    .output(tempOutputPath)
                    .on('end', async () => {
                        clearTimeout(timer);
                        try {
                            const thumbBuffer = await fs.promises.readFile(tempOutputPath);
                            try {
                                if (fs.existsSync(tempInputPath)) await fs.promises.unlink(tempInputPath);
                                if (fs.existsSync(tempOutputPath)) await fs.promises.unlink(tempOutputPath);
                            } catch {}
                            resolve(thumbBuffer);
                        } catch {
                            resolve(null);
                        }
                    })
                    .on('error', (err) => {
                        clearTimeout(timer);
                        console.warn('FFmpeg video thumbnail generation failed (non-blocking):', err?.message || err);
                        try {
                            if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                            if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                        } catch {}
                        resolve(null);
                    })
                    .run();
            } catch (spawnErr) {
                clearTimeout(timer);
                console.warn('FFmpeg spawn failed (non-blocking):', spawnErr);
                try {
                    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                } catch {}
                resolve(null);
            }
        });
    } catch (err) {
        console.warn('Video thumbnail write error (non-blocking):', err);
        return null;
    }
}

// Hardware-accelerated 720p streaming proxy generation from file path
export async function generateVideoProxyFromPath(filePath: string): Promise<Buffer | null> {
    const timestamp = Date.now();
    const tempOutputPath = path.join(os.tmpdir(), `temp_proxy_${timestamp}.mp4`);
    const accel = await detectHardwareAcceleration();

    return await new Promise<Buffer | null>((resolve) => {
        // 90s timeout for transcoding
        const timer = setTimeout(() => {
            try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch {}
            resolve(null);
        }, 90000);

        let cmdArgs: string[] = [];

        if (accel === 'nvidia') {
            cmdArgs = [
                '-y', '-i', filePath,
                '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
                '-c:v', 'h264_nvenc', '-preset', 'p4', '-b:v', '2000k',
                '-c:a', 'aac', '-b:a', '128k',
                '-movflags', '+faststart',
                tempOutputPath
            ];
        } else if (accel === 'intel') {
            const devPath = fs.existsSync('/dev/dri/renderD128') ? '/dev/dri/renderD128' : '/dev/dri/card0';
            cmdArgs = [
                '-y',
                '-vaapi_device', devPath,
                '-i', filePath,
                '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=nv12,hwupload',
                '-c:v', 'h264_vaapi', '-qp', '24',
                '-c:a', 'aac', '-b:a', '128k',
                '-movflags', '+faststart',
                tempOutputPath
            ];
        } else {
            cmdArgs = [
                '-y', '-i', filePath,
                '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24',
                '-c:a', 'aac', '-b:a', '128k',
                '-movflags', '+faststart',
                tempOutputPath
            ];
        }

        const runFfmpeg = (args: string[], onFailFallbackToCpu: boolean) => {
            try {
                const proc = spawn('ffmpeg', args);
                proc.on('close', async (code) => {
                    if (code === 0 && fs.existsSync(tempOutputPath)) {
                        clearTimeout(timer);
                        try {
                            const buf = await fs.promises.readFile(tempOutputPath);
                            await fs.promises.unlink(tempOutputPath).catch(() => {});
                            resolve(buf);
                            return;
                        } catch {
                            resolve(null);
                            return;
                        }
                    }

                    if (onFailFallbackToCpu) {
                        console.warn(`[Media Processor] Hardware acceleration failed (exit code ${code}), retrying with CPU software encoder...`);
                        const cpuArgs = [
                            '-y', '-i', filePath,
                            '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
                            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
                            '-c:a', 'aac', '-b:a', '128k',
                            '-movflags', '+faststart',
                            tempOutputPath
                        ];
                        runFfmpeg(cpuArgs, false);
                    } else {
                        clearTimeout(timer);
                        try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch {}
                        resolve(null);
                    }
                });

                proc.on('error', (err) => {
                    console.warn(`[Media Processor] FFmpeg process error:`, err);
                    if (onFailFallbackToCpu) {
                        const cpuArgs = [
                            '-y', '-i', filePath,
                            '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
                            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
                            '-c:a', 'aac', '-b:a', '128k',
                            '-movflags', '+faststart',
                            tempOutputPath
                        ];
                        runFfmpeg(cpuArgs, false);
                    } else {
                        clearTimeout(timer);
                        resolve(null);
                    }
                });
            } catch {
                clearTimeout(timer);
                resolve(null);
            }
        };

        runFfmpeg(cmdArgs, accel !== 'cpu');
    });
}

export async function generateVideoProxy(buffer: Buffer, originalMime?: string): Promise<Buffer | null> {
    const timestamp = Date.now();
    const tempInputPath = path.join(os.tmpdir(), `temp_video_input_${timestamp}.mp4`);
    try {
        await fs.promises.writeFile(tempInputPath, buffer);
        const result = await generateVideoProxyFromPath(tempInputPath);
        try { if (fs.existsSync(tempInputPath)) await fs.promises.unlink(tempInputPath); } catch {}
        return result;
    } catch (err) {
        console.warn('Error in generateVideoProxy:', err);
        try { if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath); } catch {}
        return null;
    }
}

export async function generateAudioWaveform(buffer: Buffer): Promise<Buffer | null> {
    const timestamp = Date.now();
    const tempInputPath = path.join(os.tmpdir(), `temp_audio_input_${timestamp}.mp3`);
    const tempOutputPath = path.join(os.tmpdir(), `temp_audio_output_${timestamp}.mp3`);

    try {
        await fs.promises.writeFile(tempInputPath, buffer);

        return await new Promise<Buffer | null>((resolve) => {
            const timer = setTimeout(() => {
                try {
                    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                } catch {}
                resolve(null);
            }, 6000);

            try {
                ffmpeg(tempInputPath)
                    .audioChannels(1)
                    .audioFrequency(22050)
                    .output(tempOutputPath)
                    .on('end', () => {
                        clearTimeout(timer);
                        try {
                            const proxyBuffer = fs.readFileSync(tempOutputPath);
                            try {
                                if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                                if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                            } catch {}
                            resolve(proxyBuffer);
                        } catch (error) {
                            console.error('Error reading audio waveform buffer:', error);
                            resolve(null);
                        }
                    })
                    .on('error', (err) => {
                        clearTimeout(timer);
                        console.warn('FFmpeg audio waveform generation failed (non-blocking):', err?.message || err);
                        try {
                            if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                            if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                        } catch {}
                        resolve(null);
                    })
                    .run();
            } catch (spawnErr) {
                clearTimeout(timer);
                try {
                    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                } catch {}
                resolve(null);
            }
        });
    } catch (err) {
        console.warn('Audio waveform write error (non-blocking):', err);
        return null;
    }
}

export async function extractAudioMetadata(buffer: Buffer): Promise<Record<string, unknown> | null> {
    const tempPath = path.join(os.tmpdir(), `temp_audio_${Date.now()}.mp3`);
    try {
        await fs.promises.writeFile(tempPath, buffer);

        return await new Promise<Record<string, unknown> | null>((resolve) => {
            const timer = setTimeout(() => {
                try {
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                } catch {}
                resolve(null);
            }, 5000);

            try {
                ffmpeg.ffprobe(tempPath, (err, metadata) => {
                    clearTimeout(timer);
                    try {
                        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                    } catch {}

                    if (err) {
                        console.warn('FFmpeg audio metadata extraction failed (non-blocking):', err?.message || err);
                        resolve(null);
                    } else {
                        const audioStream = metadata?.streams?.find(s => s.codec_type === 'audio');
                        resolve({
                            duration: metadata?.format?.duration,
                            bitrate: metadata?.format?.bit_rate,
                            codec: audioStream?.codec_name,
                            channels: audioStream?.channels,
                            sampleRate: audioStream?.sample_rate,
                        });
                    }
                });
            } catch (ffprobeErr) {
                clearTimeout(timer);
                console.warn('Audio ffprobe execution error (non-blocking):', ffprobeErr);
                try {
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                } catch {}
                resolve(null);
            }
        });
    } catch (err) {
        console.warn('Audio metadata write error (non-blocking):', err);
        return null;
    }
}
