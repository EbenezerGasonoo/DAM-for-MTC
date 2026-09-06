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
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'public', 'storage');

async function ensureLocalDir(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
}

function getLocalPath(cloudPath: string): string {
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
        password: password.trim()
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
        password: process.env.NEXTCLOUD_PASSWORD || ''
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
            await client.putFileContents(filePath, buffer, { overwrite: true });
            return true;
        }
    } catch (error) {
        console.warn('Nextcloud upload failed, falling back to local storage:', error);
    }

    // Local storage fallback
    const localPath = getLocalPath(filePath);
    await ensureLocalDir(localPath);
    await fs.promises.writeFile(localPath, buffer);
    return true;
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
