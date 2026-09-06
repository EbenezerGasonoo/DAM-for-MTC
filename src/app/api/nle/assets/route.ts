import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies, verifyToken } from '@/lib/auth';

// GET /api/nle/assets — Fast, compact media asset feed for Premiere Pro and DaVinci Resolve
export async function GET(req: NextRequest) {
    try {
        // Authenticate via Bearer token in header or cookie
        let userId: string | null = null;
        const authHeader = req.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            const payload = verifyToken(token);
            if (payload?.userId) userId = payload.userId;
        }

        if (!userId) {
            const cookieAuth = await getAuthFromCookies();
            if (cookieAuth?.userId) userId = cookieAuth.userId;
        }

        const { searchParams } = new URL(req.url);
        const query = (searchParams.get('q') || '').trim();
        const type = searchParams.get('type'); // 'video' | 'audio' | 'image' | 'document' | 'all'
        const projectId = searchParams.get('projectId');
        const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '40', 10)));
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const skip = (page - 1) * limit;

        const where: any = {};

        if (query) {
            where.OR = [
                { title: { contains: query } },
                { description: { contains: query } },
                { tags: { some: { name: { contains: query } } } },
            ];
        }

        if (type && type !== 'all') {
            where.type = type;
        }

        if (projectId) {
            where.projectId = projectId;
        }

        const [assets, totalCount] = await Promise.all([
            prisma.asset.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    project: { select: { id: true, name: true } },
                    tags: { select: { id: true, name: true } },
                    versions: {
                        orderBy: { versionNum: 'desc' },
                        take: 1,
                        select: {
                            versionNum: true,
                            nextcloudUri: true,
                            proxyUri: true,
                            createdAt: true,
                        }
                    }
                }
            }),
            prisma.asset.count({ where }),
        ]);

        const formatted = assets.map(a => {
            const latestVer = a.versions[0];
            let meta: Record<string, any> = {};
            try {
                if (a.metadata) meta = JSON.parse(a.metadata);
            } catch {}

            return {
                id: a.id,
                title: a.title,
                description: a.description,
                type: a.type,
                mimeType: a.mimeType,
                size: a.size,
                status: a.status,
                createdAt: a.createdAt,
                projectName: a.project?.name || null,
                projectId: a.projectId,
                tags: a.tags.map(t => t.name),
                versionNum: latestVer?.versionNum || 1,
                // Direct streaming / preview URI
                streamUri: latestVer?.proxyUri || latestVer?.nextcloudUri || '',
                // Full download URI for NLE local cache import
                downloadUri: `/api/assets/${a.id}/download`,
                // File path inside Nextcloud
                nextcloudPath: latestVer?.nextcloudUri || '',
                // Technical video/audio metadata
                duration: meta.duration ? formatDuration(meta.duration) : null,
                dimensions: meta.width && meta.height ? `${meta.width}x${meta.height}` : null,
                codec: meta.codec || null,
                bitrate: meta.bitrate || null,
            };
        });

        // Also fetch project list for the NLE panel filter dropdown
        const projects = await prisma.project.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
            take: 50,
        });

        return NextResponse.json({
            success: true,
            assets: formatted,
            total: totalCount,
            page,
            limit,
            projects,
        });
    } catch (err: any) {
        console.error('Error fetching NLE assets:', err);
        return NextResponse.json({ error: err?.message || 'Error fetching media assets' }, { status: 500 });
    }
}

function formatDuration(seconds: number): string {
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    const remS = s % 60;
    if (h > 0) {
        return `${h}:${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
    }
    return `${remM}:${remS.toString().padStart(2, '0')}`;
}
