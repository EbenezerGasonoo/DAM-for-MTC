'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FavoriteButton from '@/components/FavoriteButton';

type Comment = {
    id: string;
    content: string;
    timestampFrame?: number;
    authorId: string;
    author: { id: string; name: string };
    assetId?: string;
    assetVersionId?: string;
    createdAt: string;
};

type AssetVersion = {
    id: string;
    assetId: string;
    versionNum: number;
    nextcloudUri: string;
    proxyUri?: string;
    createdAt: string;
    comments: Comment[];
};

type Asset = {
    id: string;
    title: string;
    description?: string;
    type: string;
    mimeType: string;
    size: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    creatorId: string;
    creator: { id: string; name: string };
    projectId?: string;
    project?: { id: string; name: string };
    tags: { name: string }[];
    versions: AssetVersion[];
    _count: { comments: number };
    isFavorited: boolean;
};

const statusColors: Record<string, string> = {
    DRAFT: 'var(--text-muted)',
    EDITING: 'var(--warning-color)',
    REVIEW: 'var(--accent-color)',
    APPROVED: 'var(--success-color)',
    PUBLISHED: '#06b6d4',
    ARCHIVED: '#6b7280',
};

const typeIcons: Record<string, string> = {
    video: '🎬',
    image: '🖼️',
    audio: '🎵',
    document: '📄',
};

function formatSize(bytes: number) {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
    return bytes + ' B';
}

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/favorites');
            if (response.ok) {
                const data = await response.json();
                setFavorites(data.favorites);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sidebar>
            <Header title="Favorites" subtitle={`${favorites.length} favorited assets`} />

            <div className="content-area">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Loading favorites...
                    </div>
                ) : favorites.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❤️</div>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>No favorite assets yet</div>
                        <div style={{ fontSize: '0.85rem' }}>Click the heart icon on any asset to add it to your favorites</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                        {favorites.map((asset) => (
                            <div
                                key={asset.id}
                                className="asset-card"
                                style={{
                                    background: 'var(--panel-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-lg)',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                    position: 'relative'
                                }}
                            >
                                <div style={{
                                    height: '160px',
                                    background: 'linear-gradient(135deg, var(--accent-light), var(--panel-hover))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '4rem',
                                    position: 'relative'
                                }}>
                                    {typeIcons[asset.type]}
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: statusColors[asset.status],
                                        backgroundColor: `${statusColors[asset.status]}20`,
                                        padding: '4px 8px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${statusColors[asset.status]}40`
                                    }}>
                                        {asset.status}
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px'
                                    }}>
                                        <FavoriteButton
                                            assetId={asset.id}
                                            initialFavorited={asset.isFavorited}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                                <div style={{ padding: '20px' }}>
                                    <h3 style={{
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        marginBottom: '8px',
                                        color: 'var(--text-main)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {asset.title}
                                    </h3>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px'
                                    }}>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                            fontWeight: 500
                                        }}>
                                            {formatSize(asset.size)}
                                        </span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            {new Date(asset.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: '6px',
                                        flexWrap: 'wrap',
                                        marginBottom: '12px'
                                    }}>
                                        {asset.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag.name}
                                                style={{
                                                    fontSize: '0.7rem',
                                                    padding: '4px 8px',
                                                    backgroundColor: 'var(--accent-light)',
                                                    border: '1px solid var(--accent-color)',
                                                    borderRadius: 'var(--radius-md)',
                                                    color: 'var(--accent-color)',
                                                    fontWeight: 500
                                                }}
                                            >
                                                #{tag.name}
                                            </span>
                                        ))}
                                        {asset.tags.length > 3 && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '4px 8px',
                                                backgroundColor: 'var(--panel-hover)',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'var(--text-muted)'
                                            }}>
                                                +{asset.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-muted)'
                                    }}>
                                        <span>💬 {asset._count.comments}</span>
                                        <span>•</span>
                                        <span>{asset.creator.name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Sidebar>
    );
}