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
        console.error('Image metadata extraction failed:', error);
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
        console.error('Thumbnail generation failed:', error);
        return null;
    }
}

export async function extractVideoMetadata(buffer: Buffer): Promise<Record<string, unknown> | null> {
    const tempPath = path.join(os.tmpdir(), `temp_video_${Date.now()}.mp4`);
    fs.writeFileSync(tempPath, buffer);

    return new Promise((resolve) => {
        ffmpeg.ffprobe(tempPath, (err, metadata) => {
            fs.unlinkSync(tempPath);
            if (err) {
                console.error('FFmpeg ffprobe failed:', err);
                resolve(null);
            } else {
                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                resolve({
                    duration: metadata.format.duration,
                    width: videoStream?.width,
                    height: videoStream?.height,
                    codec: videoStream?.codec_name,
                    bitrate: metadata.format.bit_rate
                });
            }
        });
    });
}

export async function generateVideoProxy(buffer: Buffer): Promise<Buffer | null> {
    const timestamp = Date.now();
    const tempInputPath = path.join(os.tmpdir(), `temp_video_input_${timestamp}.mp4`);
    const tempOutputPath = path.join(os.tmpdir(), `temp_video_output_${timestamp}.mp4`);
    
    fs.writeFileSync(tempInputPath, buffer);

    return new Promise((resolve) => {
        ffmpeg(tempInputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .videoBitrate('1000k')
            .audioBitrate('128k')
            .size('1280x720')
            .autopad()
            .output(tempOutputPath)
            .on('end', () => {
                try {
                    const proxyBuffer = fs.readFileSync(tempOutputPath);
                    fs.unlinkSync(tempInputPath);
                    fs.unlinkSync(tempOutputPath);
                    resolve(proxyBuffer);
                } catch (error) {
                    console.error('Error reading proxy buffer:', error);
                    resolve(null);
                }
            })
            .on('error', (err) => {
                console.error('FFmpeg video proxy generation failed:', err);
                try {
                    fs.unlinkSync(tempInputPath);
                    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                } catch (e) {}
                resolve(null);
            })
            .run();
    });
}

export async function generateAudioWaveform(buffer: Buffer): Promise<Buffer | null> {
    const timestamp = Date.now();
    const tempInputPath = path.join(os.tmpdir(), `temp_audio_input_${timestamp}.mp3`);
    const tempOutputPath = path.join(os.tmpdir(), `temp_audio_output_${timestamp}.mp3`);
    
    fs.writeFileSync(tempInputPath, buffer);

    return new Promise((resolve) => {
        ffmpeg(tempInputPath)
            .audioChannels(1)
            .audioFrequency(22050)
            .output(tempOutputPath)
            .on('end', () => {
                try {
                    const proxyBuffer = fs.readFileSync(tempOutputPath);
                    fs.unlinkSync(tempInputPath);
                    fs.unlinkSync(tempOutputPath);
                    resolve(proxyBuffer);
                } catch (error) {
                    console.error('Error reading audio waveform buffer:', error);
                    resolve(null);
                }
            })
            .on('error', (err) => {
                console.error('FFmpeg audio waveform generation failed:', err);
                try {
                    fs.unlinkSync(tempInputPath);
                    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                } catch (e) {}
                resolve(null);
            })
            .run();
    });
}

export async function extractAudioMetadata(buffer: Buffer): Promise<Record<string, unknown> | null> {
    const tempPath = path.join(os.tmpdir(), `temp_audio_${Date.now()}.mp3`);
    fs.writeFileSync(tempPath, buffer);

    return new Promise((resolve) => {
        ffmpeg.ffprobe(tempPath, (err, metadata) => {
            fs.unlinkSync(tempPath);
            if (err) {
                console.error('FFmpeg audio metadata extraction failed:', err);
                resolve(null);
            } else {
                const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
                resolve({
                    duration: metadata.format.duration,
                    bitrate: metadata.format.bit_rate,
                    codec: audioStream?.codec_name,
                    channels: audioStream?.channels,
                    sampleRate: audioStream?.sample_rate,
                });
            }
        });
    });
}
