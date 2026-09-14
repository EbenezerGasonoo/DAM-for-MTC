import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getAssetStat, getAssetReadStream, readAssetFile } from '@/lib/nextcloud';

const MIME_MAP: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.arw': 'image/x-sony-arw',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
};

export async function handleMediaRequest(req: NextRequest, prefix: string, pathSegments: string[]) {
    try {
        const decodedSegments = pathSegments.map(seg => {
            try {
                return decodeURIComponent(seg);
            } catch {
                return seg;
            }
        });
        const cleanPrefix = prefix ? prefix.replace(/^\/+|\/+$/g, '') : '';
        const relativePath = cleanPrefix ? `/${cleanPrefix}/${decodedSegments.join('/')}` : `/${decodedSegments.join('/')}`;
        const ext = ('.' + relativePath.split('.').pop()?.toLowerCase()) || '';
        const contentType = MIME_MAP[ext] || 'application/octet-stream';

        // 1. Check file stat (size and existence) without loading into RAM
        const stat = await getAssetStat(relativePath);

        if (stat && stat.size > 0) {
            const totalLength = stat.size;
            const rangeHeader = req.headers.get('range');

            if (rangeHeader && rangeHeader.startsWith('bytes=')) {
                const parts = rangeHeader.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10) || 0;
                const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

                if (start >= totalLength || end >= totalLength) {
                    return new NextResponse('Requested range not satisfiable', {
                        status: 416,
                        headers: { 'Content-Range': `bytes */${totalLength}` },
                    });
                }

                const nodeStream = await getAssetReadStream(relativePath, { start, end });
                if (nodeStream) {
                    const webStream = Readable.toWeb(nodeStream as any);
                    const chunkSize = end - start + 1;
                    return new NextResponse(webStream as any, {
                        status: 206,
                        headers: {
                            'Content-Range': `bytes ${start}-${end}/${totalLength}`,
                            'Accept-Ranges': 'bytes',
                            'Content-Length': chunkSize.toString(),
                            'Content-Type': contentType,
                            'Cache-Control': 'public, max-age=86400, immutable',
                        },
                    });
                }
            }

            // Stream full file
            const fullStream = await getAssetReadStream(relativePath);
            if (fullStream) {
                const webStream = Readable.toWeb(fullStream as any);
                return new NextResponse(webStream as any, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Content-Length': totalLength.toString(),
                        'Accept-Ranges': 'bytes',
                        'Cache-Control': 'public, max-age=86400, immutable',
                    },
                });
            }
        }

        // 2. Fallback to buffered read for small assets or legacy files
        const buffer = await readAssetFile(relativePath);
        if (!buffer) {
            return new NextResponse('Asset not found', { status: 404 });
        }

        const totalLength = buffer.length;
        const rangeHeader = req.headers.get('range');
        if (rangeHeader && rangeHeader.startsWith('bytes=')) {
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10) || 0;
            const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

            if (start >= totalLength || end >= totalLength) {
                return new NextResponse('Requested range not satisfiable', {
                    status: 416,
                    headers: { 'Content-Range': `bytes */${totalLength}` },
                });
            }

            const chunk = buffer.subarray(start, end + 1);
            return new NextResponse(new Uint8Array(chunk), {
                status: 206,
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${totalLength}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunk.length.toString(),
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=86400, immutable',
                },
            });
        }

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': totalLength.toString(),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=86400, immutable',
            },
        });
    } catch (err: any) {
        console.error(`Media stream error for ${prefix}/${pathSegments.join('/')}:`, err);
        return new NextResponse(err?.message || 'Error streaming media', { status: 500 });
    }
}
