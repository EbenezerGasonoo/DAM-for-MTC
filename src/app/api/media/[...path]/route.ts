import { NextRequest, NextResponse } from 'next/server';
import { readAssetFile } from '@/lib/nextcloud';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const { path } = await params;
        const relativePath = '/' + path.join('/');
        const buffer = await readAssetFile(relativePath);

        if (!buffer) {
            return new NextResponse('Asset not found', { status: 404 });
        }

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Length': buffer.length.toString(),
                'Cache-Control': 'public, max-age=86400, immutable',
            },
        });
    } catch (err: any) {
        return new NextResponse(err?.message || 'Error fetching media', { status: 500 });
    }
}
