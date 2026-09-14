import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MEDIA_EXTENSION_REGEX = /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|mp4|webm|mov|m4v|mkv|avi|wmv|flv|ts|mxf|mp3|wav|ogg|flac|m4a|aac|pdf|arw|cr2|cr3|nef|dng|raw)$/i;

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only intercept direct requests to asset files that are not internal routes
    if (
        !pathname.startsWith('/_next') &&
        !pathname.startsWith('/api') &&
        !pathname.startsWith('/favicon') &&
        MEDIA_EXTENSION_REGEX.test(pathname)
    ) {
        // Rewrite to the universal media handler
        const mediaUrl = request.nextUrl.clone();
        mediaUrl.pathname = `/api/media${pathname}`;
        return NextResponse.rewrite(mediaUrl);
    }

    return NextResponse.next();
}

export const config = {
    // Run on all paths except Next.js internal static assets and API routes
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
