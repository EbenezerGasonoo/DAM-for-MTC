import { createClient, AuthType, WebDAVClient } from 'webdav';
import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

// Format URL to proper Nextcloud WebDAV endpoint
export function formatNextcloudWebdavUrl(rawUrl: string, _username?: string): string {
    let clean = (rawUrl || '').trim();
    if (!clean) return '';
    clean = clean.replace(/\/+$/, '');

    // If it already targets a remote.php endpoint, preserve it
    if (clean.includes('remote.php')) {
        return clean.endsWith('/') ? clean : `${clean}/`;
    }

    // Default Nextcloud WebDAV endpoint
    return `${clean}/remote.php/webdav/`;
}

export interface NextcloudConfig {
    url: string;
    username: string;
    password?: string;
    rootFolder?: string;
    hasPassword?: boolean;
}

// Local fallback storage directory
export const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'public', 'storage');

async function ensureLocalDir(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
}

export function getLocalPath(cloudPath: string): string {
    const sanitized = cloudPath.replace(/^\/+/, '');
    return path.join(LOCAL_STORAGE_DIR, sanitized);
}

// Fetch active config from database or environment variables
export async function getActiveNextcloudConfig(): Promise<NextcloudConfig> {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: {
                    in: ['NEXTCLOUD_URL', 'NEXTCLOUD_USERNAME', 'NEXTCLOUD_PASSWORD', 'NEXTCLOUD_ROOT_FOLDER']
                }
            }
        });
        const map = new Map(settings.map(s => [s.key, s.value]));

        const url = map.get('NEXTCLOUD_URL') || process.env.NEXTCLOUD_URL || 'https://nextcloud.mtc-network.space/';
        const username = map.get('NEXTCLOUD_USERNAME') || process.env.NEXTCLOUD_USERNAME || '';
        const password = map.get('NEXTCLOUD_PASSWORD') || process.env.NEXTCLOUD_PASSWORD || '';
        const rootFolder = map.get('NEXTCLOUD_ROOT_FOLDER') || '/';

        return {
            url,
            username,
            password,
            rootFolder,
            hasPassword: Boolean(password)
        };
    } catch {
        const url = process.env.NEXTCLOUD_URL || 'https://nextcloud.mtc-network.space/';
        const username = process.env.NEXTCLOUD_USERNAME || '';
        const password = process.env.NEXTCLOUD_PASSWORD || '';
        return {
            url,
            username,
            password,
            rootFolder: '/',
            hasPassword: Boolean(password)
        };
    }
}

// Helper to create client instance
export function createNextcloudClientInstance(url: string, username: string, password: string): WebDAVClient {
    const webdavUrl = formatNextcloudWebdavUrl(url, username);
    return createClient(webdavUrl, {
        authType: AuthType.Password,
        username: username.trim(),
        password: password.trim(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    });
}

// Get dynamic WebDAV client
export async function getNextcloudClient(): Promise<{ client: WebDAVClient | null; config: NextcloudConfig }> {
    const config = await getActiveNextcloudConfig();
    if (!config.url || !config.username || !config.password) {
        return { client: null, config };
    }
    if (config.url.includes('default-nextcloud-url') || config.url.includes('nextcloud-instance.com')) {
        return { client: null, config };
    }

    try {
        const client = createNextcloudClientInstance(config.url, config.username, config.password);
        return { client, config };
    } catch (err) {
        console.error('Failed to create Nextcloud client:', err);
        return { client: null, config };
    }
}

// Backwards-compatible fallback singleton
export const nextcloudClient = createClient(
    formatNextcloudWebdavUrl(process.env.NEXTCLOUD_URL || 'https://nextcloud.mtc-network.space/'),
    {
        authType: AuthType.Password,
        username: process.env.NEXTCLOUD_USERNAME || '',
        password: process.env.NEXTCLOUD_PASSWORD || '',
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    }
);

// Ensure remote folder exists on Nextcloud
async function ensureRemoteDir(client: WebDAVClient, fullPath: string) {
    const dir = path.posix.dirname(fullPath);
    if (!dir || dir === '/' || dir === '.') return;
    try {
        const exists = await client.exists(dir);
        if (!exists) {
            await client.createDirectory(dir, { recursive: true });
        }
    } catch {
        // Best effort creation
    }
}

// Verify connection with specified or active credentials
export async function verifyConnection(customConfig?: { url: string; username: string; password: string }) {
    try {
        let client: WebDAVClient | null = null;
        if (customConfig) {
            client = createNextcloudClientInstance(customConfig.url, customConfig.username, customConfig.password);
        } else {
            const res = await getNextcloudClient();
            client = res.client;
        }

        if (!client) {
            return { success: false, error: 'Nextcloud credentials not configured' };
        }

        let quota: any = null;
        try {
            quota = await client.getQuota();
        } catch {
            await client.getDirectoryContents('/');
        }

        return {
            success: true,
            quota: quota && typeof quota === 'object' ? {
                used: quota.used ?? 0,
                available: quota.available ?? 0,
            } : null
        };
    } catch (error: any) {
        let message = error?.message || 'Connection failed';
        if (error?.status === 401 || message.includes('401')) {
            message = 'Invalid username or password/app token (401 Unauthorized)';
        }
        return { success: false, error: message };
    }
}

export async function uploadAsset(filePath: string, buffer: Buffer): Promise<boolean> {
    try {
        const { client } = await getNextcloudClient();
        if (client) {
            await ensureRemoteDir(client, filePath);
            await client.putFileContents(filePath, buffer, {
                overwrite: true
            });
            console.log(`[Nextcloud WebDAV] Successfully uploaded ${filePath} (${buffer.length} bytes)`);
            return true;
        } else {
            console.warn('[Nextcloud WebDAV] Client not configured, using local storage fallback');
        }
    } catch (error: any) {
        console.warn(`[Nextcloud WebDAV] Upload to ${filePath} failed, falling back to local storage:`, error?.message || error);
    }

    // Local storage fallback
    try {
        const localPath = getLocalPath(filePath);
        await ensureLocalDir(localPath);
        await fs.promises.writeFile(localPath, buffer);
        console.log(`[Local Fallback] Saved ${filePath} (${buffer.length} bytes)`);
        return true;
    } catch (localErr: any) {
        console.error(`[Storage] Failed to save ${filePath} to local storage:`, localErr);
        throw new Error(`Failed to save file to both Nextcloud and local fallback: ${localErr?.message}`);
    }
}

// Stream large files directly from disk to storage without holding the entire file in RAM
export async function uploadAssetFromPath(remotePath: string, localFilePath: string): Promise<boolean> {
    try {
        const { client } = await getNextcloudClient();
        if (client) {
            await ensureRemoteDir(client, remotePath);
            const stream = fs.createReadStream(localFilePath);
            await client.putFileContents(remotePath, stream, { overwrite: true });
            console.log(`[Nextcloud WebDAV] Successfully streamed ${localFilePath} to ${remotePath}`);
            return true;
        } else {
            console.warn('[Nextcloud WebDAV] Client not configured, streaming to local storage fallback');
        }
    } catch (error: any) {
        console.warn(`[Nextcloud WebDAV] Stream to ${remotePath} failed, falling back to local storage:`, error?.message || error);
    }

    // Local storage fallback via fast disk copy
    try {
        const destPath = getLocalPath(remotePath);
        await ensureLocalDir(destPath);
        await fs.promises.copyFile(localFilePath, destPath);
        console.log(`[Local Fallback] Copied ${localFilePath} to ${destPath}`);
        return true;
    } catch (localErr: any) {
        console.error(`[Storage] Failed to copy to local storage:`, localErr);
        throw new Error(`Failed to save file to storage: ${localErr?.message}`);
    }
}

export async function readAssetFile(filePath: string): Promise<Buffer | null> {
    try {
        const { client } = await getNextcloudClient();
        if (client) {
            const content = await client.getFileContents(filePath);
            if (typeof content === 'string') {
                return Buffer.from(content);
            }
            return content as Buffer;
        }
    } catch {
        // Fall through to local fallback
    }

    try {
        const localPath = getLocalPath(filePath);
        if (fs.existsSync(localPath)) {
            return await fs.promises.readFile(localPath);
        }
    } catch {
        return null;
    }
    return null;
}

export async function getAssetStream(filePath: string) {
    try {
        const { client } = await getNextcloudClient();
        if (client) {
            return client.createReadStream(filePath);
        }
    } catch {
        // Fall through to local fallback
    }

    const localPath = getLocalPath(filePath);
    return fs.createReadStream(localPath);
}

export async function listDirectory(dirPath: string) {
    try {
        const { client } = await getNextcloudClient();
        if (client) {
            return await client.getDirectoryContents(dirPath);
        }
    } catch {
        // Fall through to local fallback
    }

    const localDir = getLocalPath(dirPath);
    if (!fs.existsSync(localDir)) return [];
    const files = await fs.promises.readdir(localDir);
    return files.map(f => ({ filename: f, basename: f }));
}

export async function moveAssetFile(sourcePath: string, destPath: string): Promise<boolean> {
    try {
        const { client } = await getNextcloudClient();
        if (client) {
            await ensureRemoteDir(client, destPath);
            await client.moveFile(sourcePath, destPath);
            console.log(`[Nextcloud WebDAV] Moved ${sourcePath} -> ${destPath}`);
            return true;
        }
    } catch (err) {
        console.warn(`[Nextcloud WebDAV] Failed to move ${sourcePath} to ${destPath}:`, err);
    }

    try {
        const localSrc = getLocalPath(sourcePath);
        const localDest = getLocalPath(destPath);
        if (fs.existsSync(localSrc)) {
            await ensureLocalDir(localDest);
            await fs.promises.rename(localSrc, localDest);
            console.log(`[Local Storage] Moved ${localSrc} -> ${localDest}`);
            return true;
        }
    } catch (err) {
        console.warn(`[Local Storage] Failed to move ${sourcePath} to ${destPath}:`, err);
    }
    return false;
}

export interface ScannedMediaFile {
    filename: string;
    basename: string;
    cleanTitle: string;
    size: number;
    type: 'video' | 'image' | 'audio' | 'document';
    mimeType: string;
    lastmod: string;
    source: 'nextcloud' | 'local';
}

export const EXTENSION_MAP: Record<string, { type: 'video' | 'image' | 'audio' | 'document'; mime: string }> = {
    // Video
    mp4: { type: 'video', mime: 'video/mp4' },
    mov: { type: 'video', mime: 'video/quicktime' },
    webm: { type: 'video', mime: 'video/webm' },
    mkv: { type: 'video', mime: 'video/x-matroska' },
    avi: { type: 'video', mime: 'video/x-msvideo' },
    m4v: { type: 'video', mime: 'video/mp4' },
    wmv: { type: 'video', mime: 'video/x-ms-wmv' },
    flv: { type: 'video', mime: 'video/x-flv' },

    // Image
    jpg: { type: 'image', mime: 'image/jpeg' },
    jpeg: { type: 'image', mime: 'image/jpeg' },
    png: { type: 'image', mime: 'image/png' },
    webp: { type: 'image', mime: 'image/webp' },
    gif: { type: 'image', mime: 'image/gif' },
    svg: { type: 'image', mime: 'image/svg+xml' },
    psd: { type: 'image', mime: 'image/vnd.adobe.photoshop' },
    ai: { type: 'image', mime: 'application/illustrator' },
    tif: { type: 'image', mime: 'image/tiff' },
    tiff: { type: 'image', mime: 'image/tiff' },
    bmp: { type: 'image', mime: 'image/bmp' },
    ico: { type: 'image', mime: 'image/x-icon' },

    // Audio
    mp3: { type: 'audio', mime: 'audio/mpeg' },
    wav: { type: 'audio', mime: 'audio/wav' },
    ogg: { type: 'audio', mime: 'audio/ogg' },
    flac: { type: 'audio', mime: 'audio/flac' },
    m4a: { type: 'audio', mime: 'audio/mp4' },
    aac: { type: 'audio', mime: 'audio/aac' },
    wma: { type: 'audio', mime: 'audio/x-ms-wma' },

    // Documents
    pdf: { type: 'document', mime: 'application/pdf' },
    zip: { type: 'document', mime: 'application/zip' },
    doc: { type: 'document', mime: 'application/msword' },
    docx: { type: 'document', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    ppt: { type: 'document', mime: 'application/vnd.ms-powerpoint' },
    pptx: { type: 'document', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    xls: { type: 'document', mime: 'application/vnd.ms-excel' },
    xlsx: { type: 'document', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

export async function scanNextcloudFiles(
    targetFolder: string = '/',
    recursive: boolean = true,
    maxDepth: number = 5
): Promise<ScannedMediaFile[]> {
    const results: ScannedMediaFile[] = [];
    const { client } = await getNextcloudClient();

    if (client) {
        const queue: Array<{ path: string; depth: number }> = [{ path: targetFolder || '/', depth: 0 }];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current.path)) continue;
            visited.add(current.path);

            try {
                const items = await client.getDirectoryContents(current.path);
                const itemsList = Array.isArray(items) ? items : (items as any)?.data || [];

                for (const item of itemsList) {
                    const basename = item.basename || path.posix.basename(item.filename);
                    if (basename.startsWith('.') || basename === '.Trash' || basename === 'Thumbs.db') continue;

                    if (item.type === 'directory') {
                        if (recursive && current.depth < maxDepth) {
                            queue.push({ path: item.filename, depth: current.depth + 1 });
                        }
                    } else {
                        const ext = (basename.split('.').pop() || '').toLowerCase();
                        const match = EXTENSION_MAP[ext];
                        if (match) {
                            const cleanTitle = basename.replace(/\.[^/.]+$/, '').replace(/[_\\-]+/g, ' ').trim();
                            results.push({
                                filename: item.filename,
                                basename,
                                cleanTitle: cleanTitle || basename,
                                size: Number(item.size || 0),
                                type: match.type,
                                mimeType: item.mime || match.mime,
                                lastmod: item.lastmod || new Date().toISOString(),
                                source: 'nextcloud',
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn(`Failed to scan Nextcloud path: ${current.path}`, err);
            }
        }
    } else {
        // Local directory fallback scanner
        const localBase = LOCAL_STORAGE_DIR;
        if (fs.existsSync(localBase)) {
            const queue: Array<{ dir: string; relative: string; depth: number }> = [{ dir: localBase, relative: '', depth: 0 }];
            while (queue.length > 0) {
                const { dir, relative, depth } = queue.shift()!;
                try {
                    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.name.startsWith('.')) continue;
                        const fullPath = path.join(dir, entry.name);
                        const relPath = relative ? `${relative}/${entry.name}` : entry.name;
                        if (entry.isDirectory()) {
                            if (recursive && depth < maxDepth) {
                                queue.push({ dir: fullPath, relative: relPath, depth: depth + 1 });
                            }
                        } else if (entry.isFile()) {
                            const ext = (entry.name.split('.').pop() || '').toLowerCase();
                            const match = EXTENSION_MAP[ext];
                            if (match) {
                                const stat = await fs.promises.stat(fullPath);
                                const cleanTitle = entry.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]+/g, ' ').trim();
                                results.push({
                                    filename: `/storage/${relPath.replace(/\\\\/g, '/')}`,
                                    basename: entry.name,
                                    cleanTitle: cleanTitle || entry.name,
                                    size: stat.size,
                                    type: match.type,
                                    mimeType: match.mime,
                                    lastmod: stat.mtime.toISOString(),
                                    source: 'local',
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.warn('Failed to read local dir:', dir, err);
                }
            }
        }
    }

    return results;
}
