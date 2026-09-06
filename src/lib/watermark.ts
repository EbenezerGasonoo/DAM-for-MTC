import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface WatermarkConfig {
    logoUri?: string;
    textTemplate?: string;
    opacity?: number; // 0-1
    scale?: number; // 0.01-0.5 (percentage of image)
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

/**
 * Apply text watermark to image
 */
export async function applyImageWatermark(
    buffer: Buffer,
    config: WatermarkConfig
): Promise<Buffer | null> {
    try {
        let image = sharp(buffer);
        const metadata = await image.metadata();

        if (!metadata.width || !metadata.height) {
            return null;
        }

        // Create SVG watermark text
        if (config.textTemplate) {
            const fontSize = Math.max(20, Math.floor(metadata.width * 0.03));

            const svg = `
                <svg width="${metadata.width}" height="${metadata.height}">
                    <defs>
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.8"/>
                        </filter>
                    </defs>
                    <text 
                        x="50%" 
                        y="50%" 
                        font-size="${fontSize}" 
                        font-family="Arial, sans-serif"
                        font-weight="bold"
                        fill="white" 
                        fill-opacity="${config.opacity || 0.3}"
                        text-anchor="middle" 
                        dominant-baseline="middle"
                        filter="url(#shadow)"
                        transform="rotate(-45)"
                    >
                        ${config.textTemplate}
                    </text>
                </svg>
            `;

            const svgBuffer = Buffer.from(svg);
            image = image.composite([
                {
                    input: svgBuffer,
                    gravity: 'center',
                },
            ]);
        }

        return await image.png().toBuffer();
    } catch (error) {
        console.error('Image watermark application failed:', error);
        return null;
    }
}

/**
 * Apply watermark to video (adds text overlay)
 */
export async function applyVideoWatermark(
    buffer: Buffer,
    config: WatermarkConfig
): Promise<Buffer | null> {
    const timestamp = Date.now();
    const tempInputPath = path.join(os.tmpdir(), `temp_video_watermark_input_${timestamp}.mp4`);
    const tempOutputPath = path.join(os.tmpdir(), `temp_video_watermark_output_${timestamp}.mp4`);

    fs.writeFileSync(tempInputPath, buffer);

    return new Promise((resolve) => {
        let filterChain = '';

        if (config.textTemplate) {
            const escapedText = config.textTemplate.replace(/'/g, "'\\''");
            const fontSize = config.scale ? Math.floor(config.scale * 100) : 24;
            
            filterChain = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=white:fontfile_path=/Windows/Fonts/arial.ttf:alpha=${config.opacity || 0.3}:x=(w-text_w)/2:y=(h-text_h)/2`;
        }

        let command = ffmpeg(tempInputPath)
            .videoCodec('libx264')
            .preset('fast')
            .outputOptions(['-crf', '23']);

        if (filterChain) {
            command = command.videoFilter(filterChain);
        }

        command
            .on('end', () => {
                try {
                    const watermarkedBuffer = fs.readFileSync(tempOutputPath);
                    fs.unlinkSync(tempInputPath);
                    fs.unlinkSync(tempOutputPath);
                    resolve(watermarkedBuffer);
                } catch (error) {
                    console.error('Error reading watermarked video:', error);
                    resolve(null);
                }
            })
            .on('error', (err: unknown) => {
                console.error('FFmpeg video watermark failed:', err);
                try {
                    fs.unlinkSync(tempInputPath);
                    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                } catch (_e) {
                    /* ignore cleanup errors */
                }
                resolve(null);
            })
            .output(tempOutputPath)
            .run();
    });
}

/**
 * Generate preview of watermarked image
 */
export async function generateWatermarkPreview(
    buffer: Buffer,
    config: WatermarkConfig
): Promise<Buffer | null> {
    try {
        // Resize to thumbnail for preview
        let image = sharp(buffer)
            .resize({ width: 400, withoutEnlargement: true });

        const metadata = await image.metadata();

        if (config.textTemplate && metadata.width && metadata.height) {
            const fontSize = Math.max(12, Math.floor(metadata.width * 0.04));

            const svg = `
                <svg width="${metadata.width}" height="${metadata.height}">
                    <text 
                        x="50%" 
                        y="50%" 
                        font-size="${fontSize}" 
                        font-family="Arial, sans-serif"
                        font-weight="bold"
                        fill="white" 
                        fill-opacity="${config.opacity || 0.3}"
                        text-anchor="middle" 
                        dominant-baseline="middle"
                        transform="rotate(-45)"
                    >
                        ${config.textTemplate}
                    </text>
                </svg>
            `;

            const svgBuffer = Buffer.from(svg);
            image = image.composite([
                {
                    input: svgBuffer,
                    gravity: 'center',
                },
            ]);
        }

        return await image.webp({ quality: 80 }).toBuffer();
    } catch (error) {
        console.error('Watermark preview generation failed:', error);
        return null;
    }
}

/**
 * Get watermark config based on user role
 */
export function getWatermarkConfigForRole(
    roleLevel: string,
    profileConfig: WatermarkConfig
): WatermarkConfig | null {
    const roleLevelMap: Record<string, number> = {
        'ADMIN': 0,
        'EDITOR': 1,
        'REVIEWER': 2,
        'VIEWER': 3,
        'GUEST': 4,
    };

    const userLevel = roleLevelMap[roleLevel] || 4;

    // Only apply watermark to VIEWER and GUEST roles
    if (userLevel < 2) {
        return null;
    }

    return {
        ...profileConfig,
        opacity: profileConfig.opacity || 0.25,
        scale: profileConfig.scale || 0.15,
    };
}
