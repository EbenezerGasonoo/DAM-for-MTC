'use client';

import { useState, useEffect } from 'react';

interface Collection {
    id: string;
    name: string;
    description?: string;
    assets: Array<{ assetId: string }>;
}

interface CollectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToCollection?: (collectionId: string, assetId: string) => void;
    assetId?: string;
}

export function CollectionsModal({
    isOpen,
    onClose,
    onAddToCollection,
    assetId,
}: CollectionsModalProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [newCollName, setNewCollName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCollections();
        }
    }, [isOpen]);

    const fetchCollections = async () => {
        try {
            const res = await fetch('/api/collections');
            if (res.ok) {
                setCollections(await res.json());
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    };

    const handleCreateCollection = async () => {
        if (!newCollName.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCollName, description: '' }),
            });

            if (res.ok) {
                setNewCollName('');
                await fetchCollections();
            }
        } catch (error) {
            console.error('Error creating collection:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCollection = async (collectionId: string) => {
        if (!assetId || !onAddToCollection) return;

        try {
            const res = await fetch(`/api/collections/${collectionId}/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId }),
            });

            if (res.ok) {
                onAddToCollection(collectionId, assetId);
                onClose();
            }
        } catch (error) {
            console.error('Error adding to collection:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Collections</h2>

                {/* Create New Collection */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New collection name..."
                            value={newCollName}
                            onChange={(e) => setNewCollName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleCreateCollection}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
                        >
                            Create
                        </button>
                    </div>
                </div>

                {/* Existing Collections */}
                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {collections.length === 0 ? (
                        <p className="text-gray-500 text-sm">No collections yet</p>
                    ) : (
                        collections.map((coll) => (
                            <div
                                key={coll.id}
                                className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{coll.name}</p>
                                    <p className="text-xs text-gray-500">{coll.assets?.length || 0} assets</p>
                                </div>
                                {assetId && (
                                    <button
                                        onClick={() => handleAddToCollection(coll.id)}
                                        className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
                                    >
                                        Add
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
