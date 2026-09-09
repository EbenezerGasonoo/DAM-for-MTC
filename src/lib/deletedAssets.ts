import { prisma } from './prisma';

const SETTING_KEY = 'DELETED_ASSET_URIS';

/**
 * Retrieves the set of all deleted Nextcloud URIs / file paths in lowercase.
 */
export async function getDeletedUris(): Promise<Set<string>> {
    try {
        const record = await prisma.systemSetting.findUnique({
            where: { key: SETTING_KEY },
        });

        if (!record || !record.value) {
            return new Set<string>();
        }

        const parsed = JSON.parse(record.value);
        if (Array.isArray(parsed)) {
            return new Set(parsed.map((u: string) => String(u).trim().toLowerCase()).filter(Boolean));
        }
        return new Set<string>();
    } catch (err) {
        console.warn('Failed to retrieve deleted URIs list:', err);
        return new Set<string>();
    }
}

/**
 * Records newly deleted asset URIs into the persistent system settings blocklist.
 */
export async function addDeletedUris(uris: string[]): Promise<void> {
    if (!uris || uris.length === 0) return;

    try {
        const currentSet = await getDeletedUris();
        let added = 0;

        for (const uri of uris) {
            if (!uri) continue;
            const norm = String(uri).trim().toLowerCase();
            if (norm && !currentSet.has(norm)) {
                currentSet.add(norm);
                added++;
            }
        }

        if (added > 0) {
            const arrayToStore = Array.from(currentSet);
            await prisma.systemSetting.upsert({
                where: { key: SETTING_KEY },
                update: { value: JSON.stringify(arrayToStore) },
                create: {
                    key: SETTING_KEY,
                    value: JSON.stringify(arrayToStore),
                },
            });
        }
    } catch (err) {
        console.error('Failed to add deleted URIs to blocklist:', err);
    }
}

/**
 * Checks whether a given Nextcloud URI or filename was previously deleted.
 */
export async function isUriDeleted(uri: string): Promise<boolean> {
    if (!uri) return false;
    const deletedSet = await getDeletedUris();
    return deletedSet.has(String(uri).trim().toLowerCase());
}
