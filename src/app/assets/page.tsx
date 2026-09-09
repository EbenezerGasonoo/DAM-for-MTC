'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SearchFilter, SearchFilters } from '@/components/SearchFilter';
import { AssetPreviewModal } from '@/components/AssetPreviewModal';
import { ActivityLog } from '@/components/ActivityLog';
import FavoriteButton from '@/components/FavoriteButton';

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
    versions: any[];
    _count: { comments: number };
    isFavorited: boolean;
};

const typeIcons: Record<string, string> = {
    video: '🎬',
    image: '🖼️',
    audio: '🎵',
    document: '📄',
};

const statusColors: Record<string, string> = {
    DRAFT: 'var(--text-muted)',
    EDITING: 'var(--warning-color)',
    REVIEW: '#FFD180',
    APPROVED: 'var(--mtc-hunter-green)',
    PUBLISHED: 'var(--mtc-cornsilk)',
};

function formatSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

type ViewMode = 'grid' | 'list';

export default function AssetsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filters, setFilters] = useState<SearchFilters>({});
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // Enterprise Multi-select & Batch state
    const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
    const [isPerformingBulk, setIsPerformingBulk] = useState(false);
    const [bulkTagInput, setBulkTagInput] = useState('');
    const [showTagModal, setShowTagModal] = useState(false);

    // Nextcloud quick sync state
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncToast, setSyncToast] = useState<string | null>(null);

    const handleSyncNextcloud = async () => {
        setIsSyncing(true);
        setSyncToast(null);
        try {
            const res = await fetch('/api/settings/nextcloud/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: '/', recursive: true })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSyncToast(data.message);
                await fetchAssets();
            } else {
                setSyncToast(data.error || 'Sync failed.');
            }
        } catch {
            setSyncToast('Network error during sync.');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncToast(null), 6000);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, [filters]);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            if (filters.search) params.set('search', filters.search);
            if (filters.type) params.set('type', filters.type);
            if (filters.status) params.set('status', filters.status);
            if (filters.creatorId) params.set('creatorId', filters.creatorId);
            if (filters.projectId) params.set('projectId', filters.projectId);
            if (filters.tags && filters.tags.length > 0) {
                filters.tags.forEach(tag => params.append('tags', tag));
            }
            if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.set('dateTo', filters.dateTo);

            const response = await fetch(`/api/assets?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setAssets(data.assets || []);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSearch = async (name: string, searchFilters: SearchFilters) => {
        try {
            const response = await fetch('/api/saved-searches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, filters: searchFilters }),
            });
            if (response.ok) {
                alert('Search filter saved successfully!');
            }
        } catch (error) {
            console.error('Error saving search:', error);
        }
    };

    const handleOpenPreview = (asset: Asset) => {
        setSelectedAsset(asset);
        setShowPreviewModal(true);
    };

    const handleAssetUpdated = (updated: any) => {
        setAssets(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    };

    // Selection Toggles
    const toggleSelectAsset = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedAssetIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedAssetIds.size === assets.length) {
            setSelectedAssetIds(new Set());
        } else {
            setSelectedAssetIds(new Set(assets.map(a => a.id)));
        }
    };

    // Bulk Status Transition
    const handleBulkStatus = async (status: string) => {
        if (selectedAssetIds.size === 0) return;
        try {
            setIsPerformingBulk(true);
            const res = await fetch('/api/assets/bulk/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetIds: Array.from(selectedAssetIds),
                    status,
                }),
            });
            if (res.ok) {
                setAssets(prev => prev.map(a =>
                    selectedAssetIds.has(a.id) ? { ...a, status } : a
                ));
                setSelectedAssetIds(new Set());
            }
        } catch (err) {
            console.error('Failed bulk status update:', err);
        } finally {
            setIsPerformingBulk(false);
        }
    };

    // Bulk Add Tag
    const handleBulkAddTag = async () => {
        if (!bulkTagInput.trim() || selectedAssetIds.size === 0) return;
        try {
            setIsPerformingBulk(true);
            const tag = bulkTagInput.trim();
            const res = await fetch('/api/assets/bulk/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetIds: Array.from(selectedAssetIds),
                    tags: [tag],
                    action: 'add',
                }),
            });
            if (res.ok) {
                fetchAssets();
                setBulkTagInput('');
                setShowTagModal(false);
                setSelectedAssetIds(new Set());
            }
        } catch (err) {
            console.error('Failed bulk tag:', err);
        } finally {
            setIsPerformingBulk(false);
        }
    };

    // Bulk Export ZIP
    const handleBulkExport = async () => {
        if (selectedAssetIds.size === 0) return;
        try {
            setIsPerformingBulk(true);
            const res = await fetch('/api/assets/bulk/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetIds: Array.from(selectedAssetIds),
                    includeMetadata: true,
                }),
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `MTC_DAM_Export_${new Date().toISOString().slice(0, 10)}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert('Export failed. Please check asset accessibility.');
            }
        } catch (err) {
            console.error('Failed bulk export:', err);
        } finally {
            setIsPerformingBulk(false);
        }
    };

    // Bulk Delete
    const handleBulkDelete = async () => {
        if (selectedAssetIds.size === 0) return;
        if (!confirm(`Are you sure you want to permanently delete ${selectedAssetIds.size} selected asset(s)? This cannot be undone.`)) return;

        try {
            setIsPerformingBulk(true);
            const res = await fetch('/api/assets/bulk/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetIds: Array.from(selectedAssetIds), confirm: true }),
            });
            if (res.ok) {
                const json = await res.json();
                setAssets(prev => prev.filter(a => !selectedAssetIds.has(a.id)));
                setSelectedAssetIds(new Set());
                if (json.deletedCount < json.totalAssets) {
                    alert(`${json.deletedCount} of ${json.totalAssets} assets deleted. Some may have been skipped.`);
                }
            } else {
                const json = await res.json().catch(() => ({}));
                alert(`Delete failed: ${json.error || res.statusText}`);
            }
        } catch (err) {
            console.error('Failed bulk delete:', err);
            alert('Network error during delete. Please try again.');
        } finally {
            setIsPerformingBulk(false);
        }
    };

    return (
        <Sidebar>
            <Header
                title="Assets"
                subtitle={`${assets.length} production assets found`}
                actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={handleSyncNextcloud}
                            disabled={isSyncing}
                            style={{ fontSize: '0.82rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title="Scan Nextcloud and local folders to discover and import media files"
                        >
                            {isSyncing ? '⏳ Syncing...' : '🔄 Sync Nextcloud'}
                        </button>
                    </div>
                }
            />
            <div className="content-area" style={{ position: 'relative', paddingBottom: selectedAssetIds.size > 0 ? '90px' : '20px' }}>
                {syncToast && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px 18px',
                        borderRadius: '8px',
                        backgroundColor: syncToast.includes('Failed') || syncToast.includes('error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 102, 66, 0.25)',
                        border: syncToast.includes('Failed') || syncToast.includes('error') ? '1px solid rgba(252, 165, 165, 0.4)' : '1px solid rgba(167, 243, 208, 0.4)',
                        color: syncToast.includes('Failed') || syncToast.includes('error') ? '#FCA5A5' : '#A7F3D0',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                    }}>
                        <span>{syncToast}</span>
                        <button onClick={() => setSyncToast(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                    </div>
                )}
                <SearchFilter onSearch={setFilters} onSaveSearch={handleSaveSearch} />

                {/* Subheader Controls & View Toggle */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--mtc-cornsilk)' }}>
                            <input
                                type="checkbox"
                                checked={assets.length > 0 && selectedAssetIds.size === assets.length}
                                onChange={toggleSelectAll}
                                style={{ accentColor: 'var(--mtc-hunter-green)', width: '16px', height: '16px' }}
                            />
                            <span>{selectedAssetIds.size > 0 ? `${selectedAssetIds.size} of ${assets.length} selected` : 'Select All'}</span>
                        </label>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            • Total: {assets.length} media files
                        </span>
                    </div>

                    <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '8px 14px',
                                backgroundColor: viewMode === 'grid' ? 'var(--accent-light)' : 'var(--panel-bg)',
                                color: viewMode === 'grid' ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: viewMode === 'grid' ? 600 : 400,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            ⊞ Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '8px 14px',
                                backgroundColor: viewMode === 'list' ? 'var(--accent-light)' : 'var(--panel-bg)',
                                color: viewMode === 'list' ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: viewMode === 'list' ? 600 : 400,
                                borderLeft: '1px solid var(--border-color)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            ☰ List
                        </button>
                    </div>
                </div>

                {/* GRID VIEW */}
                {viewMode === 'grid' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '22px' }}>
                        {assets.map((asset) => {
                            const isSelected = selectedAssetIds.has(asset.id);
                            return (
                                <div
                                    key={asset.id}
                                    className="asset-card"
                                    onClick={() => handleOpenPreview(asset)}
                                    style={{
                                        background: 'var(--panel-bg)',
                                        border: `1.5px solid ${isSelected ? 'var(--mtc-hunter-green)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-lg)',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected ? '0 0 16px rgba(56, 102, 66, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.2)',
                                        position: 'relative',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.borderColor = 'rgba(56, 102, 66, 0.6)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                        }
                                    }}
                                >
                                    {/* Thumbnail Viewport */}
                                    <div style={{
                                        height: '160px',
                                        background: 'linear-gradient(135deg, rgba(20, 28, 30, 0.95), rgba(29, 39, 41, 0.95))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '3.8rem',
                                        position: 'relative',
                                        borderBottom: '1px solid var(--border-color)',
                                        overflow: 'hidden',
                                    }}>
                                        {(() => {
                                            const thumb = asset.versions?.[0]?.proxyUri;
                                            const mimeType = asset.mimeType || '';
                                            // Check if proxy is a web-renderable image (webp thumbnail generated by watch-folder)
                                            const isWebThumb = Boolean(thumb && /\.(jpg|jpeg|png|webp|gif)$/i.test(thumb));
                                            // For image-type assets without a generated thumbnail, try loading via media API
                                            const isRawOrProfessional = /\.(arw|cr2|cr3|nef|dng|raf|orf|rw2|pef|nrw|x3f|srf|sr2|heic|heif)$/i.test(thumb || '');
                                            const isMxfOrBroadcast = /\.(mxf|r3d|braw|mts|m2ts|dv)$/i.test(thumb || asset.versions?.[0]?.nextcloudUri || '');

                                            if (isWebThumb) {
                                                return (
                                                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                        <img
                                                            src={thumb!}
                                                            alt={asset.title}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                        {asset.type === 'video' && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                                color: 'var(--mtc-cornsilk)',
                                                                fontSize: '2rem',
                                                            }}>
                                                                ▶
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            // Format badge for professional camera formats
                                            const formatBadge = isMxfOrBroadcast ? 'MXF'
                                                : isRawOrProfessional ? (asset.mimeType?.split('-').pop()?.toUpperCase() || 'RAW')
                                                : null;

                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '3.8rem' }}>{typeIcons[asset.type] || '📁'}</span>
                                                    {formatBadge && (
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 800,
                                                            letterSpacing: '0.08em',
                                                            color: '#CADEDF',
                                                            backgroundColor: 'rgba(56, 102, 66, 0.35)',
                                                            border: '1px solid rgba(56, 102, 66, 0.6)',
                                                            borderRadius: '4px',
                                                            padding: '2px 7px',
                                                            fontFamily: 'var(--font-brand)',
                                                        }}>{formatBadge}</span>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Multi-Select Checkbox Overlay */}
                                        <div
                                            onClick={(e) => toggleSelectAsset(asset.id, e)}
                                            style={{
                                                position: 'absolute',
                                                top: '12px',
                                                left: '12px',
                                                zIndex: 5,
                                                backgroundColor: 'rgba(20, 28, 30, 0.75)',
                                                borderRadius: '4px',
                                                padding: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                style={{ accentColor: 'var(--mtc-hunter-green)', width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                        </div>

                                        {/* Status Chip */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            fontSize: '0.68rem',
                                            fontWeight: 700,
                                            color: statusColors[asset.status] || '#CADEDF',
                                            backgroundColor: 'rgba(20, 28, 30, 0.85)',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            border: `1px solid ${statusColors[asset.status]}50`,
                                        }}>
                                            {asset.status}
                                        </div>

                                        {/* Project Badge */}
                                        {asset.project && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '10px',
                                                left: '12px',
                                                fontSize: '0.7rem',
                                                color: 'var(--mtc-cornsilk)',
                                                backgroundColor: 'rgba(20, 28, 30, 0.85)',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(255, 235, 204, 0.2)',
                                            }}>
                                                📁 {asset.project.name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Metadata */}
                                    <div style={{ padding: '16px 18px' }}>
                                        <h3 style={{
                                            fontSize: '0.92rem',
                                            fontWeight: 600,
                                            marginBottom: '6px',
                                            color: 'var(--mtc-cornsilk)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            fontFamily: 'var(--font-brand)',
                                        }}>
                                            {asset.title}
                                        </h3>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                            <span>{formatSize(asset.size)}</span>
                                            <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                                        </div>

                                        {/* Tags */}
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px', minHeight: '24px' }}>
                                            {asset.tags?.slice(0, 3).map((tag) => (
                                                <span
                                                    key={tag.name}
                                                    style={{
                                                        fontSize: '0.68rem',
                                                        padding: '2px 6px',
                                                        backgroundColor: 'rgba(56, 102, 66, 0.2)',
                                                        border: '1px solid rgba(56, 102, 66, 0.35)',
                                                        borderRadius: '4px',
                                                        color: 'var(--mtc-cornsilk)',
                                                    }}
                                                >
                                                    #{tag.name}
                                                </span>
                                            ))}
                                            {asset.tags && asset.tags.length > 3 && (
                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', padding: '2px' }}>
                                                    +{asset.tags.length - 3}
                                                </span>
                                            )}
                                        </div>

                                        {/* Footer Info */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                            <span>💬 {asset._count?.comments || 0} comments</span>
                                            <span>{asset.creator?.name || 'Producer'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', backgroundColor: 'rgba(20, 28, 30, 0.6)' }}>
                                    <th style={{ padding: '12px 16px', width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={assets.length > 0 && selectedAssetIds.size === assets.length}
                                            onChange={toggleSelectAll}
                                            style={{ accentColor: 'var(--mtc-hunter-green)', cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase' }}>Name</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase' }}>Type</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase' }}>Size</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase' }}>Project</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset) => {
                                    const isSelected = selectedAssetIds.has(asset.id);
                                    return (
                                        <tr
                                            key={asset.id}
                                            style={{
                                                borderBottom: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? 'rgba(56, 102, 66, 0.15)' : 'transparent',
                                                transition: 'background 0.15s',
                                            }}
                                            onClick={() => handleOpenPreview(asset)}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--panel-hover)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => toggleSelectAsset(asset.id, e as any)}
                                                    style={{ accentColor: 'var(--mtc-hunter-green)', cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span>{typeIcons[asset.type]}</span>
                                                <span style={{ fontWeight: 500, color: 'var(--mtc-cornsilk)' }}>{asset.title}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{asset.type}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{formatSize(asset.size)}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{asset.project?.name || '—'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 600,
                                                    color: statusColors[asset.status] || '#CADEDF',
                                                    backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${statusColors[asset.status]}40`,
                                                }}>
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{new Date(asset.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {assets.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📂</div>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>No assets match your filters</div>
                        <div style={{ fontSize: '0.85rem' }}>Try adjusting your search or filters</div>
                    </div>
                )}

                {/* Activity Log */}
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                    <ActivityLog entityType="ASSET" limit={10} />
                </div>

                {/* FLOATING ENTERPRISE BULK ACTION TOOLBAR */}
                {selectedAssetIds.size > 0 && (
                    <div style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'var(--panel-bg)',
                        border: '1.5px solid var(--mtc-hunter-green)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 24px rgba(56, 102, 66, 0.3)',
                        zIndex: 500,
                        animation: 'fadeIn 0.2s ease-out',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--mtc-hunter-green)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                            }}>
                                {selectedAssetIds.size}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>Selected</span>
                        </div>

                        <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

                        {/* Bulk Status Transitions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status:</span>
                            {['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED'].map((st) => (
                                <button
                                    key={st}
                                    disabled={isPerformingBulk}
                                    onClick={() => handleBulkStatus(st)}
                                    style={{
                                        background: 'rgba(202, 222, 223, 0.08)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

                        {/* Bulk Tag Button */}
                        <button
                            disabled={isPerformingBulk}
                            onClick={() => setShowTagModal(true)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                            🏷️ Add Tag
                        </button>

                        {/* Bulk Export ZIP */}
                        <button
                            disabled={isPerformingBulk}
                            onClick={handleBulkExport}
                            className="btn btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        >
                            📦 Export ZIP
                        </button>

                        {/* Bulk Delete */}
                        <button
                            disabled={isPerformingBulk}
                            onClick={handleBulkDelete}
                            style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#FCA5A5',
                                borderRadius: 'var(--radius-sm)',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                            }}
                        >
                            🗑️ Delete
                        </button>

                        {/* Clear Selection */}
                        <button
                            onClick={() => setSelectedAssetIds(new Set())}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            ✕ Clear
                        </button>
                    </div>
                )}

                {/* BATCH TAG MODAL */}
                {showTagModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100,
                    }}>
                        <div className="card" style={{ width: '400px', backgroundColor: 'var(--panel-bg)', padding: '24px' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '12px' }}>
                                Batch Tag {selectedAssetIds.size} Assets
                            </h3>
                            <input
                                autoFocus
                                value={bulkTagInput}
                                onChange={(e) => setBulkTagInput(e.target.value)}
                                placeholder="e.g. Easter2026, Worship, 4K"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--mtc-cornsilk)',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    marginBottom: '16px',
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button className="btn" onClick={() => setShowTagModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleBulkAddTag} disabled={!bulkTagInput.trim()}>
                                    Apply Tag
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Asset Preview Modal */}
                <AssetPreviewModal
                    isOpen={showPreviewModal}
                    onClose={() => setShowPreviewModal(false)}
                    asset={selectedAsset}
                    onAssetUpdated={handleAssetUpdated}
                />
            </div>
        </Sidebar>
    );
}
