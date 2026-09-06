/**
 * Export utilities for bulk export operations
 */

export interface ExportOptions {
    includeMetadata?: boolean;
    includeVersions?: boolean;
    includeCustomFields?: boolean;
    versionType?: 'latest' | 'all';
    compressionLevel?: number; // 0-9
    nameFormat?: 'id' | 'title' | 'both'; // How to name files
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
    includeMetadata: true,
    includeVersions: false,
    includeCustomFields: true,
    versionType: 'latest',
    compressionLevel: 6,
    nameFormat: 'title',
};

/**
 * Map MIME types to file extensions
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
    // Images
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/tiff': '.tiff',
    'image/bmp': '.bmp',

    // Video
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',
    'video/webm': '.webm',
    'video/x-m4v': '.m4v',
    'video/x-flv': '.flv',

    // Audio
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/aac': '.aac',
    'audio/ogg': '.ogg',
    'audio/flac': '.flac',
    'audio/x-m4a': '.m4a',
    'audio/aiff': '.aiff',

    // Documents
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'text/html': '.html',
    'application/json': '.json',
    'application/xml': '.xml',

    // Archives
    'application/zip': '.zip',
    'application/x-tar': '.tar',
    'application/gzip': '.gz',
    'application/x-7z-compressed': '.7z',
    'application/x-rar-compressed': '.rar',
};

/**
 * Get file extension from MIME type
 */
export function getFileExtension(mimeType: string, defaultExt: string = '.bin'): string {
    return MIME_TO_EXTENSION[mimeType] || defaultExt;
}

/**
 * Create safe filename from title
 */
export function createSafeFilename(title: string, maxLength: number = 100): string {
    return title
        .slice(0, maxLength)
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .toLowerCase()
        .replace(/^_|_$/g, '');
}

/**
 * Build folder structure for export
 * Format: asset_title/asset_id/file.ext
 */
export function buildExportPath(
    assetId: string,
    assetTitle: string,
    filename: string,
    nameFormat: 'id' | 'title' | 'both' = 'title'
): string {
    const safeName = createSafeFilename(assetTitle);

    switch (nameFormat) {
        case 'id':
            return `${assetId}/${filename}`;
        case 'both':
            return `${safeName}_${assetId}/${filename}`;
        case 'title':
        default:
            return `${safeName}/${filename}`;
    }
}

/**
 * Estimate archive size before creation (rough estimate)
 */
export function estimateArchiveSize(
    assets: Array<{ size: number; versionCount?: number }>,
    includeVersions: boolean = false,
    includeMetadata: boolean = true
): number {
    let total = 0;

    // Sum asset sizes
    for (const asset of assets) {
        total += asset.size;

        if (includeVersions && asset.versionCount) {
            // Assume average version size is 70% of current version
            total += asset.size * 0.7 * (asset.versionCount - 1);
        }
    }

    // Metadata overhead (rough estimate)
    if (includeMetadata) {
        total += 10 * 1024; // ~10KB for metadata JSON
    }

    // ZIP overhead (compression usually reduces by 50-80%, but ZIP has headers)
    const zipOverhead = total * 0.05; // 5% overhead
    return total + zipOverhead;
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Build metadata document content
 */
interface MetadataAssetRow {
    id: string;
    title: string;
    description: string | null;
    type: string;
    mimeType: string;
    size: number;
    status: string;
    createdAt: Date;
    tags?: { name: string }[];
    fieldValues?: { value: string | null; definition: { name: string } }[];
    versions?: { versionNum: number; createdAt: Date }[];
}

export function buildMetadataContent(
    assets: MetadataAssetRow[],
    exportOptions: ExportOptions,
    exportedAt: Date,
    exportedBy: string
): string {
    const metadata = {
        exportInfo: {
            exportedAt: exportedAt.toISOString(),
            exportedBy,
            assetCount: assets.length,
            options: exportOptions,
        },
        assets: assets.map(asset => ({
            id: asset.id,
            title: asset.title,
            description: asset.description,
            type: asset.type,
            mimeType: asset.mimeType,
            size: asset.size,
            status: asset.status,
            createdAt: asset.createdAt,
            tags: asset.tags?.map(t => t.name) || [],
            customFields:
                asset.fieldValues?.reduce(
                    (acc: Record<string, string>, fv) => {
                        acc[fv.definition.name] = fv.value ?? '';
                        return acc;
                    },
                    {}
                ) || {},
            versions: exportOptions.includeVersions
                ? asset.versions?.map(v => ({
                    versionNum: v.versionNum,
                    createdAt: v.createdAt,
                })) || []
                : undefined,
        })),
    };

    return JSON.stringify(metadata, null, 2);
}

/**
 * Get mime type from file extension
 */
export function getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const extMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        mkv: 'video/x-matroska',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        aac: 'audio/aac',
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        zip: 'application/zip',
    };

    return extMap[ext || ''] || 'application/octet-stream';
}
