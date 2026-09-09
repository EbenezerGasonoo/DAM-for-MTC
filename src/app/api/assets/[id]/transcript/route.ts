import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatToSrt, formatToVtt, formatToPlainText, FullTranscriptData } from '@/lib/transcription';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = new URL(req.url);
        const format = url.searchParams.get('format') || 'json';

        const asset = await prisma.asset.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                transcript: true,
                transcriptStatus: true,
            }
        });

        if (!asset || !asset.transcript) {
            return NextResponse.json({ error: 'No transcript available for this asset.' }, { status: 404 });
        }

        let data: FullTranscriptData;
        try {
            data = JSON.parse(asset.transcript);
        } catch {
            return NextResponse.json({ error: 'Failed to parse transcript data.' }, { status: 500 });
        }

        const cleanTitle = (asset.title || 'transcript').replace(/[^a-zA-Z0-9.\-_]/g, '_');

        if (format === 'srt') {
            const srt = formatToSrt(data.segments);
            return new NextResponse(srt, {
                status: 200,
                headers: {
                    'Content-Type': 'application/x-subrip; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${cleanTitle}.srt"`,
                },
            });
        }

        if (format === 'vtt') {
            const vtt = formatToVtt(data.segments);
            return new NextResponse(vtt, {
                status: 200,
                headers: {
                    'Content-Type': 'text/vtt; charset=utf-8',
                    'Content-Disposition': `inline; filename="${cleanTitle}.vtt"`,
                },
            });
        }

        if (format === 'txt') {
            const txt = formatToPlainText(data);
            return new NextResponse(txt, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${cleanTitle}_transcript.txt"`,
                },
            });
        }

        // Default JSON
        return NextResponse.json(data);

    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Error exporting transcript' }, { status: 500 });
    }
}
