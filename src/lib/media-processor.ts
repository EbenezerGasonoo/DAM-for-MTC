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

export async function extractVideoMetadata(buffer: Buffer): Promise<any> {
    const tempPath = path.join(os.tmpdir(), `temp_video_${Date.now()}.mp4`);
    fs.writeFileSync(tempPath, buffer);

    return new Promise((resolve, reject) => {
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
