import { prisma } from '@/lib/prisma';

export type AccessLevel = 'VIEW' | 'COMMENT' | 'EDIT' | 'DELETE';
export type EntityType = 'ASSET' | 'PROJECT' | 'COLLECTION';

/**
 * Check if user has permission to access entity
 */
export async function checkEntityAccess(
    userId: string,
    entityType: EntityType,
    entityId: string,
    requiredLevel: AccessLevel
): Promise<boolean> {
    try {
        // Admins have full access
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        if (user?.role === 'ADMIN') {
            return true;
        }

        // Check explicit permissions
        const permission = await prisma.accessPermission.findFirst({
            where: {
                entityType,
                entityId,
                AND: [
                    {
                        OR: [
                            {
                                subjectType: 'USER',
                                subjectId: userId,
                            },
                            {
                                subjectType: 'ROLE',
                                subjectRole: user?.role,
                            },
                        ],
                    },
                    {
                        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                    },
                ],
            },
        });

        if (permission) {
            return hasRequiredLevel(permission.accessLevel, requiredLevel);
        }

        // Check group permissions
        const userGroups = await prisma.groupMembership.findMany({
            where: { userId },
            select: { groupId: true },
        });

        if (userGroups.length > 0) {
            const groupPermission = await prisma.accessPermission.findFirst({
                where: {
                    entityType,
                    entityId,
                    subjectType: 'GROUP',
                    subjectId: { in: userGroups.map(g => g.groupId) },
                    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
            });

            if (groupPermission) {
                return hasRequiredLevel(groupPermission.accessLevel, requiredLevel);
            }
        }

        // Check if user is the creator/owner
        if (entityType === 'ASSET') {
            const asset = await prisma.asset.findUnique({
                where: { id: entityId },
                select: { creatorId: true },
            });

            if (asset?.creatorId === userId) {
                return true;
            }
        } else if (entityType === 'PROJECT') {
            const project = await prisma.project.findUnique({
                where: { id: entityId },
                select: { ownerId: true },
            });

            if (project?.ownerId === userId) {
                return true;
            }
        } else if (entityType === 'COLLECTION') {
            const collection = await prisma.collection.findUnique({
                where: { id: entityId },
                select: { ownerId: true },
            });

            if (collection?.ownerId === userId) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking entity access:', error);
        return false;
    }
}

/**
 * Compare access levels
 */
function hasRequiredLevel(grantedLevel: string, requiredLevel: AccessLevel): boolean {
    const levels = ['VIEW', 'COMMENT', 'EDIT', 'DELETE'];
    const grantedIndex = levels.indexOf(grantedLevel);
    const requiredIndex = levels.indexOf(requiredLevel);

    return grantedIndex >= requiredIndex;
}

/**
 * Grant permission
 */
export async function grantPermission(
    entityType: EntityType,
    entityId: string,
    subjectType: 'USER' | 'GROUP' | 'ROLE',
    subjectId: string | null,
    subjectRole: string | null,
    accessLevel: AccessLevel,
    expiresAtMs?: number
) {
    const expiresAt = expiresAtMs ? new Date(expiresAtMs) : null;

    return await prisma.accessPermission.create({
        data: {
            entityType,
            entityId,
            subjectType,
            subjectId,
            subjectRole,
            accessLevel,
            expiresAt,
        },
    });
}

/**
 * Revoke permission
 */
export async function revokePermission(permissionId: string) {
    return await prisma.accessPermission.delete({
        where: { id: permissionId },
    });
}

/**
 * Get all permissions for entity
 */
export async function getEntityPermissions(entityType: EntityType, entityId: string) {
    return await prisma.accessPermission.findMany({
        where: {
            entityType,
            entityId,
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Check if permission has expired
 */
export function isPermissionExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
}
