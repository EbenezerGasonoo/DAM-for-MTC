import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const logoSetting = await prisma.systemSetting.findUnique({
            where: { key: 'BRAND_LOGO_DATA' },
        });

        if (!logoSetting || !logoSetting.value) {
            return new NextResponse('Logo not found', { status: 404 });
        }

        const dataUrl = logoSetting.value;
        const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Length': imageBuffer.length.toString(),
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('Error serving brand logo:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}
