import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';

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

export async function generateVideoProxy(buffer: Buffer, originalMime?: string): Promise<Buffer | null> {
    // If original video is already MP4 or WebM, it is natively streamable by browsers!
    if (originalMime === 'video/mp4' || originalMime === 'video/webm') {
        return null;
    }

    // Do not attempt full synchronous proxy transcoding for files > 30MB
    if (buffer.length > 30 * 1024 * 1024) {
        return null;
    }

    const timestamp = Date.now();
    const tempInputPath = path.join(os.tmpdir(), `temp_video_input_${timestamp}.mp4`);
    const tempOutputPath = path.join(os.tmpdir(), `temp_video_output_${timestamp}.mp4`);

    try {
        await fs.promises.writeFile(tempInputPath, buffer);

        return await new Promise<Buffer | null>((resolve) => {
            const timer = setTimeout(() => {
                try {
                    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                } catch {}
                resolve(null);
            }, 10000);

            try {
                ffmpeg(tempInputPath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .videoBitrate('1000k')
                    .audioBitrate('128k')
                    .size('1280x720')
                    .autopad()
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
                            console.error('Error reading proxy buffer:', error);
                            resolve(null);
                        }
                    })
                    .on('error', (err) => {
                        clearTimeout(timer);
                        console.warn('FFmpeg video proxy generation failed (non-blocking):', err?.message || err);
                        try {
                            if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                            if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                        } catch {}
                        resolve(null);
                    })
                    .run();
            } catch (runErr) {
                clearTimeout(timer);
                try {
                    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                } catch {}
                resolve(null);
            }
        });
    } catch (err) {
        console.warn('Error in generateVideoProxy:', err);
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
