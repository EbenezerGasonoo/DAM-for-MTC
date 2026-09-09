import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import {
    createNextcloudClientInstance,
    getNextcloudClient,
    EXTENSION_MAP,
    LOCAL_STORAGE_DIR,
    getLocalPath,
    NextcloudConfig,
} from '@/lib/nextcloud';
import path from 'path';
import fs from 'fs';

export interface FolderItem {
    name: string;
    path: string;
    lastmod: string;
    itemCount?: number;
}

export interface FileItem {
    name: string;
    path: string;
    size: number;
    sizeFormatted: string;
    type: 'video' | 'image' | 'audio' | 'document' | 'other';
    mime: string;
    lastmod: string;
    isVideo: boolean;
    isImported: boolean;
    assetId?: string;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function buildBreadcrumbs(cleanPath: string): Array<{ name: string; path: string }> {
    if (cleanPath === '/' || !cleanPath) {
        return [{ name: 'Root (/)', path: '/' }];
    }

    const parts = cleanPath.split('/').filter(Boolean);
    const crumbs: Array<{ name: string; path: string }> = [{ name: 'Root (/)', path: '/' }];

    let acc = '';
    for (const part of parts) {
        acc += `/${part}`;
        crumbs.push({ name: part, path: acc });
    }

    return crumbs;
}

// POST /api/settings/nextcloud/folders
// Scans Nextcloud folder contents (or local fallback) and returns subdirectories and files
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (auth instanceof NextResponse) return auth;


        const body = await req.json().catch(() => ({}));
        const rawPath = typeof body.path === 'string' ? body.path.trim() : '/';
        const normalizedPath = ('/' + rawPath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')).replace(/\/+/g, '/');
        const targetPath = normalizedPath === '' ? '/' : normalizedPath;

        // Custom config override or active DB config
        let client: any = null;
        let config: NextcloudConfig;

        if (body.url && body.username && body.password && !body.password.includes('••••')) {
            client = createNextcloudClientInstance(body.url, body.username, body.password);
            config = {
                url: body.url,
                username: body.username,
                password: body.password,
                rootFolder: body.rootFolder || '/',
                hasPassword: true,
            };
        } else {
            const res = await getNextcloudClient();
            client = res.client;
            config = res.config;
        }

        // Action: Create folder
        if (body.action === 'create-folder' && body.newFolderName) {
            const sanitizedName = String(body.newFolderName).trim().replace(/[\\/:*?"<>|]/g, '');
            if (!sanitizedName) {
                return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 });
            }

            const folderToCreate = targetPath === '/' ? `/${sanitizedName}` : `${targetPath}/${sanitizedName}`;

            if (client) {
                try {
                    const exists = await client.exists(folderToCreate);
                    if (!exists) {
                        await client.createDirectory(folderToCreate, { recursive: true });
                    }
                } catch (err: any) {
                    return NextResponse.json(
                        { error: `Failed to create folder on Nextcloud: ${err?.message || err}` },
                        { status: 500 }
                    );
                }
            } else {
                // Local fallback directory creation
                const localDir = getLocalPath(folderToCreate);
                if (!fs.existsSync(localDir)) {
                    await fs.promises.mkdir(localDir, { recursive: true });
                }
            }
        }

        // Pre-fetch all existing asset URIs to cross-reference with files
        const existingVersions = await prisma.assetVersion.findMany({
            select: { nextcloudUri: true, assetId: true },
        });
        const importedMap = new Map<string, string>();
        for (const v of existingVersions) {
            if (v.nextcloudUri) {
                importedMap.set(v.nextcloudUri.toLowerCase(), v.assetId);
            }
        }

        const folders: FolderItem[] = [];
        const files: FileItem[] = [];

        if (client) {
            try {
                const items = await client.getDirectoryContents(targetPath);
                const itemsList = Array.isArray(items) ? items : (items as any)?.data || [];

                for (const item of itemsList) {
                    const basename = item.basename || path.posix.basename(item.filename);

                    // Skip hidden system files
                    if (basename.startsWith('.') || basename === '.Trash' || basename === 'Thumbs.db') {
                        continue;
                    }

                    // Format path cleanly
                    const itemPath = ('/' + item.filename.replace(/^\/+/g, '')).replace(/\/+/g, '/');

                    if (item.type === 'directory') {
                        folders.push({
                            name: basename,
                            path: itemPath,
                            lastmod: item.lastmod || new Date().toISOString(),
                        });
                    } else {
                        const ext = (basename.split('.').pop() || '').toLowerCase();
                        const match = EXTENSION_MAP[ext];
                        const fileSize = Number(item.size || 0);
                        const isVideo = match?.type === 'video' || /\.(mp4|mov|mxf|avi|mkv|webm|wmv|r3d|braw|mts|m2ts|flv)$/i.test(basename);
                        const assetId = importedMap.get(itemPath.toLowerCase());

                        files.push({
                            name: basename,
                            path: itemPath,
                            size: fileSize,
                            sizeFormatted: formatBytes(fileSize),
                            type: match ? match.type : (isVideo ? 'video' : 'other'),
                            mime: item.mime || (match ? match.mime : 'application/octet-stream'),
                            lastmod: item.lastmod || new Date().toISOString(),
                            isVideo,
                            isImported: Boolean(assetId),
                            assetId: assetId || undefined,
                        });
                    }
                }
            } catch (scanErr: any) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Could not access directory '${targetPath}': ${scanErr?.message || scanErr}`,
                        currentPath: targetPath,
                        folders: [],
                        files: [],
                    },
                    { status: 400 }
                );
            }
        } else {
            // Local fallback directory scanner
            const localTarget = getLocalPath(targetPath);
            if (fs.existsSync(localTarget)) {
                try {
                    const entries = await fs.promises.readdir(localTarget, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.name.startsWith('.')) continue;

                        const itemPath = targetPath === '/' ? `/${entry.name}` : `${targetPath}/${entry.name}`;
                        const fullLocal = path.join(localTarget, entry.name);
                        const stat = await fs.promises.stat(fullLocal);

                        if (entry.isDirectory()) {
                            folders.push({
                                name: entry.name,
                                path: itemPath,
                                lastmod: stat.mtime.toISOString(),
                            });
                        } else {
                            const ext = (entry.name.split('.').pop() || '').toLowerCase();
                            const match = EXTENSION_MAP[ext];
                            const isVideo = match?.type === 'video' || /\.(mp4|mov|mxf|avi|mkv|webm|wmv|r3d|braw|mts|m2ts|flv)$/i.test(entry.name);
                            const assetId = importedMap.get(itemPath.toLowerCase());

                            files.push({
                                name: entry.name,
                                path: itemPath,
                                size: stat.size,
                                sizeFormatted: formatBytes(stat.size),
                                type: match ? match.type : (isVideo ? 'video' : 'other'),
                                mime: match ? match.mime : 'application/octet-stream',
                                lastmod: stat.mtime.toISOString(),
                                isVideo,
                                isImported: Boolean(assetId),
                                assetId: assetId || undefined,
                            });
                        }
                    }
                } catch (localErr: any) {
                    console.error('Error reading local directory:', localErr);
                }
            }
        }

        // Sort folders and files alphabetically
        folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        // Calculate parent path
        let parentPath: string | null = null;
        if (targetPath !== '/') {
            const dirname = path.posix.dirname(targetPath);
            parentPath = dirname === '.' ? '/' : dirname;
        }

        return NextResponse.json({
            success: true,
            isUsingNextcloud: Boolean(client),
            serverUrl: config.url,
            currentPath: targetPath,
            parentPath,
            breadcrumbs: buildBreadcrumbs(targetPath),
            folders,
            files,
            totalFolders: folders.length,
            totalFiles: files.length,
            totalVideos: files.filter(f => f.isVideo).length,
            unimportedVideos: files.filter(f => f.isVideo && !f.isImported).length,
        });

    } catch (err: any) {
        console.error('Nextcloud folder scan error:', err);
        return NextResponse.json({ error: err?.message || 'Failed to scan Nextcloud folders' }, { status: 500 });
    }
}
