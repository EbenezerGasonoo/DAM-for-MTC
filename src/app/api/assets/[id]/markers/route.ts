import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exportToResolveEdl, exportToResolveCsv, exportToPremiereCsv, MarkerComment } from '@/lib/marker-exporter';
import { parseFramerate } from '@/lib/timecode';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = new URL(req.url);
        const format = url.searchParams.get('format') || 'resolve-edl';
        const rawFps = url.searchParams.get('fps');
        const rawStartHour = url.searchParams.get('startHour');

        const asset = await prisma.asset.findUnique({
            where: { id },
            include: {
                comments: {
                    include: {
                        author: { select: { name: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // Determine framerate from asset metadata if not explicitly provided
        let fps = 24;
        if (rawFps) {
            fps = parseFloat(rawFps) || 24;
        } else if (asset.metadata) {
            try {
                const meta = JSON.parse(asset.metadata);
                fps = parseFramerate(meta.framerate).fps;
            } catch { }
        }

        const startHour = rawStartHour !== null ? parseInt(rawStartHour, 10) : 1;

        const markerComments: MarkerComment[] = asset.comments.map(c => ({
            id: c.id,
            content: c.content,
            timestampFrame: c.timestampFrame,
            authorName: c.author?.name || 'Producer',
            createdAt: c.createdAt.toISOString(),
        }));

        const cleanTitle = (asset.title || 'asset').replace(/[^a-zA-Z0-9.\-_]/g, '_');

        if (format === 'resolve-csv') {
            const csvData = exportToResolveCsv(markerComments, { clipTitle: asset.title, fps, startHour });
            return new NextResponse(csvData, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${cleanTitle}_Resolve_Markers.csv"`,
                },
            });
        }

        if (format === 'premiere-csv') {
            const csvData = exportToPremiereCsv(markerComments, { clipTitle: asset.title, fps, startHour: 0 });
            return new NextResponse(csvData, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${cleanTitle}_Premiere_Markers.csv"`,
                },
            });
        }

        // Default: DaVinci Resolve CMX 3600 EDL
        const edlData = exportToResolveEdl(markerComments, { clipTitle: asset.title, fps, startHour });
        return new NextResponse(edlData, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="${cleanTitle}_Resolve_Markers.edl"`,
            },
        });
    } catch (err: any) {
        console.error('Failed to export markers:', err);
        return NextResponse.json({ error: err?.message || 'Failed to export markers' }, { status: 500 });
    }
}
