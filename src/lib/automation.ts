import { prisma } from '@/lib/prisma';
import type { AutomationRule, Prisma } from '@prisma/client';

type AssetWithTags = Prisma.AssetGetPayload<{ include: { tags: true } }>;

export type AutomationActionType = 'AUTO_TAG' | 'SET_STATUS' | 'DELETE_ASSET' | 'MOVE_COLLECTION' | 'CLEANUP';

export interface AutomationCondition {
    field: string; // 'type', 'status', 'createdAt', 'creatorId', 'tags'
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'inList';
    value: string | number | string[];
}

export interface AutomationAction {
    type: AutomationActionType;
    value?: string | string[];
    additionalData?: Record<string, unknown>;
}

/**
 * Parse and evaluate automation rule conditions
 */
export function evaluateConditions(conditions: AutomationCondition[], asset: Record<string, unknown>): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
        const fieldValue = asset[condition.field];

        switch (condition.operator) {
            case 'equals':
                return fieldValue === condition.value;
            case 'contains':
                return String(fieldValue).includes(String(condition.value));
            case 'greaterThan':
                return Number(fieldValue) > Number(condition.value);
            case 'lessThan':
                return Number(fieldValue) < Number(condition.value);
            case 'inList': {
                const list = Array.isArray(condition.value) ? condition.value : [condition.value];
                return list.some(
                    item => item === fieldValue || String(item) === String(fieldValue)
                );
            }
            default:
                return false;
        }
    });
}

/**
 * Execute automation action on asset
 */
export async function executeAction(action: AutomationAction, assetId: string, _userId: string): Promise<boolean> {
    try {
        switch (action.type) {
            case 'AUTO_TAG': {
                const raw = Array.isArray(action.value) ? action.value : [action.value];
                const tagNames = raw.filter((t): t is string => typeof t === 'string' && t.length > 0);
                await prisma.asset.update({
                    where: { id: assetId },
                    data: {
                        tags: {
                            connectOrCreate: tagNames.map(name => ({
                                where: { name },
                                create: { name },
                            })),
                        },
                    },
                });
                return true;
            }

            case 'SET_STATUS': {
                await prisma.asset.update({
                    where: { id: assetId },
                    data: { status: String(action.value) },
                });
                return true;
            }

            case 'DELETE_ASSET': {
                await prisma.comment.deleteMany({ where: { assetId } });
                await prisma.assetVersion.deleteMany({ where: { assetId } });
                await prisma.asset.delete({ where: { id: assetId } });
                return true;
            }

            case 'MOVE_COLLECTION': {
                const collectionId = String(action.value);
                await prisma.collectionAsset.deleteMany({ where: { assetId } });
                await prisma.collectionAsset.create({
                    data: {
                        collectionId,
                        assetId,
                    },
                });
                return true;
            }

            case 'CLEANUP': {
                // Custom cleanup logic
                await prisma.asset.update({
                    where: { id: assetId },
                    data: { status: 'ARCHIVED' },
                });
                return true;
            }

            default:
                return false;
        }
    } catch (error) {
        console.error('Failed to execute automation action:', error);
        return false;
    }
}

/**
 * Process automation rule against asset
 */
export async function processAutomationRule(
    rule: AutomationRule,
    asset: AssetWithTags,
    userId: string
): Promise<{ succeeded: boolean; message: string }> {
    try {
        let conditions: AutomationCondition[] = [];
        try {
            conditions = rule.conditions ? JSON.parse(rule.conditions) : [];
        } catch (e) {
            console.error('Failed to parse conditions:', e);
        }

        // Evaluate conditions
        if (!evaluateConditions(conditions, asset)) {
            return { succeeded: false, message: 'Conditions not met' };
        }

        // Parse and execute actions
        let actions: AutomationAction[] = [];
        try {
            actions = rule.actions ? JSON.parse(rule.actions) : [];
        } catch (e) {
            console.error('Failed to parse actions:', e);
            return { succeeded: false, message: 'Invalid action configuration' };
        }

        const results = await Promise.all(
            actions.map(action => executeAction(action, asset.id, userId))
        );

        if (results.every(r => r)) {
            return { succeeded: true, message: 'All actions executed successfully' };
        } else {
            return { succeeded: false, message: 'Some actions failed' };
        }
    } catch (error) {
        console.error('Error processing automation rule:', error);
        return { succeeded: false, message: String(error) };
    }
}

/**
 * Trigger automation rules for an event
 */
export async function triggerAutomationRules(
    trigger: string,
    assetId: string,
    userId: string
): Promise<{ processedRules: number; succeededRules: number }> {
    try {
        const asset = await prisma.asset.findUnique({
            where: { id: assetId },
            include: { tags: true },
        });

        if (!asset) {
            return { processedRules: 0, succeededRules: 0 };
        }

        const rules = await prisma.automationRule.findMany({
            where: {
                isActive: true,
                trigger,
            },
        });

        let succeededCount = 0;
        for (const rule of rules) {
            const result = await processAutomationRule(rule, asset, userId);
            if (result.succeeded) {
                succeededCount++;
            }
        }

        return { processedRules: rules.length, succeededRules: succeededCount };
    } catch (error) {
        console.error('Error triggering automation rules:', error);
        return { processedRules: 0, succeededRules: 0 };
    }
}

/**
 * Run cleanup automation - delete old drafts
 */
export async function runCleanupAutomation(daysOld: number = 30): Promise<{ deletedCount: number }> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const oldDrafts = await prisma.asset.findMany({
            where: {
                status: 'DRAFT',
                createdAt: {
                    lte: cutoffDate,
                },
            },
            select: { id: true },
        });

        for (const asset of oldDrafts) {
            await executeAction({ type: 'DELETE_ASSET' }, asset.id, 'SYSTEM');
        }

        return { deletedCount: oldDrafts.length };
    } catch (error) {
        console.error('Error running cleanup automation:', error);
        return { deletedCount: 0 };
    }
}
