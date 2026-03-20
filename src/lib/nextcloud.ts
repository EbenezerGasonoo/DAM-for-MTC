import { createClient, AuthType } from 'webdav';

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

// Ensure the connection is valid (optional utility)
export async function verifyConnection() {
    try {
        const quota = await nextcloudClient.getQuota();
        return { success: true, quota };
    } catch (error) {
        console.error('Nextcloud connection failed:', error);
        return { success: false, error };
    }
}

export async function getAssetStream(path: string) {
    try {
        return nextcloudClient.createReadStream(path);
    } catch (error) {
        console.error('Nextcloud read stream error:', error);
        throw error;
    }
}

export async function uploadAsset(path: string, buffer: Buffer) {
    try {
        return await nextcloudClient.putFileContents(path, buffer);
    } catch (error) {
        console.error('Nextcloud upload error:', error);
        throw error;
    }
}

export async function listDirectory(path: string) {
    try {
        return await nextcloudClient.getDirectoryContents(path);
    } catch (error) {
        console.error('Nextcloud list dir error:', error);
        throw error;
    }
}
