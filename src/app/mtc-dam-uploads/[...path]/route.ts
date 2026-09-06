import { NextRequest } from 'next/server';
import { handleMediaRequest } from '@/lib/media-stream';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return handleMediaRequest(req, 'mtc-dam-uploads', path);
}
