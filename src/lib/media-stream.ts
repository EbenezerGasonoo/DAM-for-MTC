import { NextRequest, NextResponse } from 'next/server';
import { readAssetFile } from '@/lib/nextcloud';

const MIME_MAP: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
};

export async function handleMediaRequest(req: NextRequest, prefix: string, pathSegments: string[]) {
    try {
        const relativePath = `/${prefix}/${pathSegments.join('/')}`;
        const buffer = await readAssetFile(relativePath);

        if (!buffer) {
            return new NextResponse('Asset not found', { status: 404 });
        }

        const ext = ('.' + relativePath.split('.').pop()?.toLowerCase()) || '';
        const contentType = MIME_MAP[ext] || 'application/octet-stream';
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
        return new NextResponse(err?.message || 'Error streaming media', { status: 500 });
    }
}
