/**
 * Resolves any asset storage URI (e.g. Nextcloud path, proxy path, or upload path)
 * to a browser-accessible streaming media URL served by DAM.
 */
export function getMediaUrl(uri?: string | null): string {
    if (!uri || typeof uri !== 'string') return '';
    const trimmed = uri.trim();
    if (!trimmed) return '';

    // Direct HTTP(S), data, or blob URLs
    if (/^(https?:|data:|blob:)/i.test(trimmed)) {
        return trimmed;
    }

    // Already routed through DAM media endpoint
    if (trimmed.startsWith('/api/media/')) {
        return trimmed;
    }

    // Ensure leading slash
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

    // Route everything through /api/media to guarantee byte-range streaming,
    // correct MIME types, and Nextcloud WebDAV proxying.
    return `/api/media${cleanPath}`;
}
