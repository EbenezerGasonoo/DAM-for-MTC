'use client';

import { useState, useEffect } from 'react';

interface ActivityLogEntry {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
}

interface ActivityLogProps {
    entityType?: string;
    entityId?: string;
    limit?: number;
}

export function ActivityLog({ entityType, entityId, limit = 20 }: ActivityLogProps) {
    const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (entityType) params.set('entityType', entityType);
                if (entityId) params.set('entityId', entityId);
                params.set('limit', limit.toString());

                const response = await fetch(`/api/activity?${params}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch activities');
                }

                const data = await response.json();
                setActivities(data.activities);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, [entityType, entityId, limit]);

    const formatAction = (action: string) => {
        const actionMap: Record<string, string> = {
            CREATE: 'created',
            UPDATE: 'updated',
            DELETE: 'deleted',
            UPLOAD: 'uploaded',
            DOWNLOAD: 'downloaded',
            VIEW: 'viewed',
            APPROVE: 'approved',
            REJECT: 'rejected',
            COMMENT: 'commented on',
        };
        return actionMap[action] || action.toLowerCase();
    };

    const formatEntityType = (entityType: string) => {
        const typeMap: Record<string, string> = {
            ASSET: 'asset',
            PROJECT: 'project',
            COLLECTION: 'collection',
            COMMENT: 'comment',
            USER: 'user',
            SAVED_SEARCH: 'saved search',
        };
        return typeMap[entityType] || entityType.toLowerCase();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)} hour${Math.floor(diffHours) !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg border border-red-200">
                Error loading activity log: {error}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-gray-500 text-sm text-center py-8">
                No activity found
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Activity Log</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-600">
                                    {activity.user.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                                <span className="font-medium">{activity.user.name}</span>{' '}
                                {formatAction(activity.action)}{' '}
                                <span className="text-gray-600">{formatEntityType(activity.entityType)}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {formatDate(activity.createdAt)}
                            </p>
                            {activity.details && (
                                <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">
                                    {activity.details}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}