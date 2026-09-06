import { createClient, AuthType } from 'webdav';
import fs from 'fs';
import path from 'path';

const nextcloudUrl = process.env.NEXTCLOUD_URL || 'https://default-nextcloud-url.com/remote.php/webdav/';
const username = process.env.NEXTCLOUD_USERNAME || '';
const password = process.env.NEXTCLOUD_PASSWORD || '';

export const nextcloudClient = createClient(
    nextcloudUrl,
    {
        authType: AuthType.Password,
        username,
        password
    }
);

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

// Ensure the connection is valid (optional utility)
export async function verifyConnection() {
    try {
        const quota = await nextcloudClient.getQuota();
        return { success: true, quota };
    } catch (error) {
        return { success: false, error };
    }
}

export async function getAssetStream(filePath: string) {
    try {
        return nextcloudClient.createReadStream(filePath);
    } catch {
        const localPath = getLocalPath(filePath);
        return fs.createReadStream(localPath);
    }
}

export async function uploadAsset(filePath: string, buffer: Buffer) {
    try {
        // Attempt Nextcloud upload if configured
        if (username && password && !nextcloudUrl.includes('default-nextcloud-url') && !nextcloudUrl.includes('nextcloud-instance.com')) {
            return await nextcloudClient.putFileContents(filePath, buffer);
        }
    } catch (error) {
        console.warn('Nextcloud unreachable, storing locally:', error);
    }

    // Local storage fallback
    const localPath = getLocalPath(filePath);
    await ensureLocalDir(localPath);
    await fs.promises.writeFile(localPath, buffer);
    return true;
}

export async function listDirectory(dirPath: string) {
    try {
        return await nextcloudClient.getDirectoryContents(dirPath);
    } catch {
        const localDir = getLocalPath(dirPath);
        if (!fs.existsSync(localDir)) return [];
        const files = await fs.promises.readdir(localDir);
        return files.map(f => ({ filename: f, basename: f }));
    }
}

export async function readAssetFile(filePath: string): Promise<Buffer | null> {
    try {
        const content = await nextcloudClient.getFileContents(filePath);
        if (typeof content === 'string') {
            return Buffer.from(content);
        }
        return content as Buffer;
    } catch {
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
}
