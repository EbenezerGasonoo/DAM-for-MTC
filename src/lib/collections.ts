import { prisma } from '@/lib/prisma';

export interface CollectionNode {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    parentCollectionId: string | null;
    createdAt: Date;
    updatedAt: Date;
    assetCount: number;
    childrenCount: number;
    children?: CollectionNode[];
}

/**
 * Build collection hierarchy tree
 */
type CollectionTreeNode = CollectionNode & { children: CollectionNode[] };

export async function buildCollectionTree(collections: CollectionNode[]): Promise<CollectionNode[]> {
    // Map collections by ID for quick lookup
    const collectionMap = new Map<string, CollectionTreeNode>(
        collections.map(c => [c.id, { ...c, children: [] }])
    );

    const roots: CollectionNode[] = [];

    for (const collection of collections) {
        const node = collectionMap.get(collection.id);
        if (!node) continue;

        if (collection.parentCollectionId) {
            const parent = collectionMap.get(collection.parentCollectionId);
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(node);
            }
        } else {
            roots.push(node);
        }
    }

    return roots;
}

/**
 * Get all collections for user with hierarchy
 */
export async function getUserCollectionsTree(userId: string): Promise<CollectionNode[]> {
    const collections = await prisma.collection.findMany({
        where: { ownerId: userId },
        include: {
            _count: {
                select: {
                    assets: true,
                    childCollections: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    const enriched = collections.map(c => ({
        ...c,
        assetCount: c._count.assets,
        childrenCount: c._count.childCollections,
    }));

    return buildCollectionTree(enriched);
}

/**
 * Get flat list of all descendant collection IDs
 */
export async function getAllDescendantIds(collectionId: string): Promise<string[]> {
    const collection = await prisma.collection.findUnique({
        where: { id: collectionId },
        include: { childCollections: true },
    });

    if (!collection) return [];

    const descendants = [collectionId];
    const toProcess = [...collection.childCollections];

    while (toProcess.length > 0) {
        const current = toProcess.pop();
        if (!current) continue;

        descendants.push(current.id);

        const children = await prisma.collection.findUnique({
            where: { id: current.id },
            include: { childCollections: true },
        });

        if (children?.childCollections) {
            toProcess.push(...children.childCollections);
        }
    }

    return descendants;
}

/**
 * Move collection to new parent (with cycle prevention)
 */
export async function moveCollection(
    collectionId: string,
    newParentId: string | null
): Promise<{ success: boolean; message: string }> {
    // Prevent moving to self
    if (collectionId === newParentId) {
        return { success: false, message: 'Cannot move collection to itself' };
    }

    // Prevent moving to descendant (would create cycle)
    if (newParentId) {
        const descendants = await getAllDescendantIds(collectionId);
        if (descendants.includes(newParentId)) {
            return { success: false, message: 'Cannot move collection to its own descendant' };
        }
    }

    try {
        await prisma.collection.update({
            where: { id: collectionId },
            data: { parentCollectionId: newParentId },
        });

        return { success: true, message: 'Collection moved successfully' };
    } catch (error) {
        return { success: false, message: String(error) };
    }
}

/**
 * Get parent path (breadcrumb)
 */
export async function getCollectionPath(collectionId: string): Promise<Array<{ id: string; name: string }>> {
    const path: Array<{ id: string; name: string }> = [];
    let current = await prisma.collection.findUnique({ where: { id: collectionId } });

    while (current) {
        path.unshift({ id: current.id, name: current.name });
        if (current.parentCollectionId) {
            current = await prisma.collection.findUnique({
                where: { id: current.parentCollectionId },
            });
        } else {
            current = null;
        }
    }

    return path;
}
