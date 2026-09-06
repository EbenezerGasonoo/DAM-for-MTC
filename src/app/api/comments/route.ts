import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

// POST /api/comments — Add a comment to an asset or version
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { content, authorId, assetId, assetVersionId, timestampFrame } = body;

        if (!content || !authorId) {
            return NextResponse.json({ error: 'Content and author are required' }, { status: 400 });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                authorId,
                assetId: assetId || null,
                assetVersionId: assetVersionId || null,
                timestampFrame: timestampFrame || null,
            },
            include: {
                author: { select: { id: true, name: true } },
            },
        });

        // Log comment activity
        await logActivity(
            authorId,
            'COMMENT',
            'COMMENT',
            comment.id,
            {
                content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                assetId,
                assetVersionId,
                timestampFrame,
            },
            req
        );

        return NextResponse.json(comment, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
