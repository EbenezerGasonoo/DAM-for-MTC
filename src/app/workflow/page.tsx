'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { AssetPreviewModal, AssetDetail } from '@/components/AssetPreviewModal';

const baseColumnsConfig = [
    { key: 'DRAFT', label: 'Draft / Ingest', color: 'var(--text-muted)', bg: 'rgba(202, 222, 223, 0.08)' },
    { key: 'REVIEW', label: 'In Review & QC', color: '#FFD180', bg: 'rgba(230, 167, 76, 0.12)' },
    { key: 'APPROVED', label: 'Approved Masters', color: 'var(--mtc-hunter-green)', bg: 'rgba(56, 102, 66, 0.18)' },
    { key: 'PUBLISHED', label: 'Published / Delivered', color: 'var(--mtc-cornsilk)', bg: 'rgba(56, 102, 66, 0.25)' },
];

const closedColumnConfig = {
    key: 'ARCHIVED',
    label: 'Closed / Archived',
    color: '#94A3B8',
    bg: 'rgba(202, 222, 223, 0.04)',
};

const typeIcons: Record<string, string> = {
    video: '🎬',
    image: '🖼️',
    audio: '🎵',
    document: '📄',
};

export default function WorkflowPage() {
    const [assets, setAssets] = useState<AssetDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [updatingAssetId, setUpdatingAssetId] = useState<string | null>(null);
    const [showClosedColumn, setShowClosedColumn] = useState(false);
    const [actionModalAsset, setActionModalAsset] = useState<AssetDetail | null>(null);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/assets?limit=100');
            if (res.ok) {
                const data = await res.json();
                setAssets(data.assets || []);
            }
        } catch (err) {
            console.error('Failed to load workflow assets:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const handleUpdateStatus = async (assetId: string, newStatus: string) => {
        try {
            setUpdatingAssetId(assetId);
            // Optimistic update
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: newStatus } : a));

            const res = await fetch(`/api/assets/${assetId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                // Revert on error
                fetchAssets();
            }
        } catch (err) {
            console.error('Failed to update asset status:', err);
            fetchAssets();
        } finally {
            setUpdatingAssetId(null);
            setActionModalAsset(null);
        }
    };

    const handleRemoveFromProject = async (assetId: string) => {
        try {
            setUpdatingAssetId(assetId);
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, projectId: undefined, project: undefined } : a));

            const res = await fetch(`/api/assets/${assetId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: null }),
            });

            if (!res.ok) {
                fetchAssets();
            }
        } catch (err) {
            console.error('Failed to unlink asset from project:', err);
            fetchAssets();
        } finally {
            setUpdatingAssetId(null);
            setActionModalAsset(null);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (id: string) => {
        setDraggedAssetId(id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (status: string) => {
        if (draggedAssetId) {
            handleUpdateStatus(draggedAssetId, status);
            setDraggedAssetId(null);
        }
    };

    // Extract unique projects for filter
    const projectsList = Array.from(
        new Set(assets.map(a => a.project?.name).filter(Boolean))
    ) as string[];

    // Filtered assets
    const filteredAssets = assets.filter(a => {
        const matchesProject = selectedProject === 'all' || a.project?.name === selectedProject;
        const matchesType = selectedType === 'all' || a.type === selectedType;
        return matchesProject && matchesType;
    });

    const closedCount = filteredAssets.filter(a => a.status === 'ARCHIVED' || a.status === 'CLOSED').length;
    const columns = showClosedColumn ? [...baseColumnsConfig, closedColumnConfig] : baseColumnsConfig;

    return (
        <Sidebar>
            <Header
                title="Workflow & Approvals"
                subtitle="Live production pipeline — review and progress media across broadcast stages"
            />

            <div className="content-area" style={{ maxWidth: '100%', padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
                {/* Pipeline Filters & Actions Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0, gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '8px' }}>Project:</span>
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                style={{
                                    backgroundColor: 'var(--panel-bg)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--mtc-cornsilk)',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                }}
                            >
                                <option value="all">All Production Projects</option>
                                {projectsList.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '8px' }}>Media Type:</span>
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                style={{
                                    backgroundColor: 'var(--panel-bg)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--mtc-cornsilk)',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                }}
                            >
                                <option value="all">All Formats</option>
                                <option value="video">Videos 🎬</option>
                                <option value="image">Graphics / Photos 🖼️</option>
                                <option value="audio">Audio / Podcasts 🎵</option>
                                <option value="document">Documents 📄</option>
                            </select>
                        </div>

                        {/* Toggle Closed / Archived Column */}
                        <button
                            type="button"
                            onClick={() => setShowClosedColumn(prev => !prev)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: showClosedColumn ? 'rgba(56, 102, 66, 0.25)' : 'var(--panel-bg)',
                                border: `1px solid ${showClosedColumn ? 'var(--mtc-hunter-green)' : 'var(--border-color)'}`,
                                color: showClosedColumn ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                            title={showClosedColumn ? 'Hide closed and archived workflows' : 'Show closed and archived workflows'}
                        >
                            <span>🗃️</span>
                            <span>{showClosedColumn ? 'Hide Closed' : 'Show Closed'}</span>
                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                padding: '1px 6px',
                                borderRadius: '8px',
                                color: showClosedColumn ? '#A7F3D0' : 'var(--text-dim)',
                                border: '1px solid var(--border-color)',
                            }}>
                                {closedCount}
                            </span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Drag cards between columns or use stage controls
                        </span>
                    </div>
                </div>

                {/* Kanban Board Container */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))`,
                    gap: '18px',
                    flex: 1,
                    minHeight: 0,
                    overflowX: 'auto',
                }}>
                    {columns.map((col) => {
                        const colAssets = filteredAssets.filter(a => {
                            if (col.key === 'DRAFT') return a.status === 'DRAFT' || a.status === 'EDITING';
                            if (col.key === 'ARCHIVED') return a.status === 'ARCHIVED' || a.status === 'CLOSED';
                            return a.status === col.key;
                        });

                        return (
                            <div
                                key={col.key}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(col.key)}
                                style={{
                                    backgroundColor: 'var(--panel-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-lg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    minWidth: '280px',
                                }}
                            >
                                {/* Column Header */}
                                <div style={{
                                    padding: '16px',
                                    borderBottom: '1px solid var(--border-color)',
                                    backgroundColor: col.bg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }} />
                                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--mtc-cornsilk)' }}>
                                            {col.label}
                                        </span>
                                    </div>
                                    <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                        color: col.color,
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        {colAssets.length}
                                    </span>
                                </div>

                                {/* Cards List */}
                                <div style={{
                                    padding: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    flex: 1,
                                    overflowY: 'auto',
                                }}>
                                    {colAssets.map((asset) => (
                                        <div
                                            key={asset.id}
                                            draggable
                                            onDragStart={() => handleDragStart(asset.id)}
                                            onClick={() => {
                                                setSelectedAsset(asset);
                                                setShowPreviewModal(true);
                                            }}
                                            style={{
                                                padding: '14px',
                                                backgroundColor: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'grab',
                                                transition: 'all 0.15s ease',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                                opacity: updatingAssetId === asset.id ? 0.5 : 1,
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            {/* Card Top Row */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                    <span style={{ fontSize: '1.2rem' }}>{typeIcons[asset.type]}</span>
                                                    <h4 style={{
                                                        fontSize: '0.86rem',
                                                        fontWeight: 600,
                                                        color: 'var(--mtc-cornsilk)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        fontFamily: 'var(--font-brand)',
                                                    }}>
                                                        {asset.title}
                                                    </h4>
                                                </div>

                                                {/* Close or Remove Action Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActionModalAsset(asset);
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: '1px solid rgba(202, 222, 223, 0.15)',
                                                        borderRadius: '4px',
                                                        color: 'var(--text-muted)',
                                                        padding: '2px 6px',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.color = '#FFFFFF';
                                                        e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.color = 'var(--text-muted)';
                                                        e.currentTarget.style.borderColor = 'rgba(202, 222, 223, 0.15)';
                                                    }}
                                                    title="Close or Remove from Workflow"
                                                >
                                                    •••
                                                </button>
                                            </div>

                                            {/* Project Name Tag */}
                                            {asset.project && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>📁</span>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {asset.project.name}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Bottom Card Controls */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '0.72rem',
                                                color: 'var(--text-dim)',
                                                borderTop: '1px solid var(--border-color)',
                                                paddingTop: '8px',
                                                marginTop: '6px',
                                                gap: '8px',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>💬 {asset._count?.comments || 0}</span>
                                                    {col.key === 'PUBLISHED' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateStatus(asset.id, 'ARCHIVED');
                                                            }}
                                                            style={{
                                                                background: 'rgba(56, 102, 66, 0.25)',
                                                                border: '1px solid rgba(56, 102, 66, 0.5)',
                                                                color: '#A7F3D0',
                                                                borderRadius: '4px',
                                                                padding: '2px 7px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                            }}
                                                            title="Deliveries complete: close and archive workflow"
                                                        >
                                                            ✓ Close
                                                        </button>
                                                    )}
                                                    {col.key === 'ARCHIVED' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateStatus(asset.id, 'DRAFT');
                                                            }}
                                                            style={{
                                                                background: 'rgba(202, 222, 223, 0.1)',
                                                                border: '1px solid var(--border-color)',
                                                                color: '#A7F3D0',
                                                                borderRadius: '4px',
                                                                padding: '2px 7px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                            }}
                                                            title="Reopen into active pipeline"
                                                        >
                                                            ↺ Reopen
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Prev / Next Stage Controls */}
                                                <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                                    {col.key !== 'DRAFT' && col.key !== 'ARCHIVED' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const prev = col.key === 'PUBLISHED' ? 'APPROVED' : col.key === 'APPROVED' ? 'REVIEW' : 'DRAFT';
                                                                handleUpdateStatus(asset.id, prev);
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px', fontSize: '0.8rem' }}
                                                            title="Move back a stage"
                                                        >
                                                            ◀
                                                        </button>
                                                    )}
                                                    {col.key !== 'PUBLISHED' && col.key !== 'ARCHIVED' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = col.key === 'DRAFT' ? 'REVIEW' : col.key === 'REVIEW' ? 'APPROVED' : 'PUBLISHED';
                                                                handleUpdateStatus(asset.id, next);
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: 'var(--mtc-cornsilk)', cursor: 'pointer', padding: '0 4px', fontSize: '0.8rem', fontWeight: 700 }}
                                                            title="Advance stage"
                                                        >
                                                            ▶
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {colAssets.length === 0 && (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '40px 10px',
                                            color: 'var(--text-dim)',
                                            fontSize: '0.8rem',
                                            border: '1px dashed var(--border-color)',
                                            borderRadius: '6px',
                                            margin: '10px 0',
                                        }}>
                                            {col.key === 'ARCHIVED' ? 'No closed assets' : 'Drop assets here'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Close or Remove Options Modal Dialog */}
                {actionModalAsset && (
                    <div
                        onClick={() => setActionModalAsset(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px',
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '440px',
                                backgroundColor: 'var(--panel-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '24px',
                                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                                        Workflow Stage Options
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Asset: <strong style={{ color: 'var(--mtc-cornsilk)' }}>{actionModalAsset.title}</strong>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActionModalAsset(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Option 1: Close Workflow */}
                                {actionModalAsset.status !== 'ARCHIVED' && actionModalAsset.status !== 'CLOSED' ? (
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(actionModalAsset.id, 'ARCHIVED')}
                                        style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'rgba(56, 102, 66, 0.15)',
                                            border: '1px solid rgba(56, 102, 66, 0.4)',
                                            borderRadius: '8px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56, 102, 66, 0.3)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(56, 102, 66, 0.15)'}
                                    >
                                        <div style={{ fontWeight: 600, color: '#A7F3D0', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            ✓ Close Workflow (Archive)
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                            Mark broadcast stage as completed. Removes card from the active workflow board while preserving file in library.
                                        </div>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(actionModalAsset.id, 'DRAFT')}
                                        style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'rgba(56, 102, 66, 0.15)',
                                            border: '1px solid rgba(56, 102, 66, 0.4)',
                                            borderRadius: '8px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, color: '#A7F3D0', fontSize: '0.86rem' }}>
                                            ↺ Reopen into Active Workflow (Draft)
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                            Return asset back into the active production pipeline.
                                        </div>
                                    </button>
                                )}

                                {/* Option 2: Remove from Workflow */}
                                {actionModalAsset.status !== 'ARCHIVED' && actionModalAsset.status !== 'CLOSED' && (
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(actionModalAsset.id, 'ARCHIVED')}
                                        style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'rgba(202, 222, 223, 0.05)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                    >
                                        <div style={{ fontWeight: 600, color: 'var(--mtc-cornsilk)', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            ⊘ Remove from Workflow Board
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                            Take off the active pipeline board without deleting the asset from the DAM.
                                        </div>
                                    </button>
                                )}

                                {/* Option 3: Remove from Project (if assigned) */}
                                {actionModalAsset.project && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFromProject(actionModalAsset.id)}
                                        style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'rgba(202, 222, 223, 0.05)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                    >
                                        <div style={{ fontWeight: 600, color: 'var(--mtc-cornsilk)', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            📁 Remove from Project &quot;{actionModalAsset.project.name}&quot;
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                            Unlink from this project. Media remains available in the catalog.
                                        </div>
                                    </button>
                                )}
                            </div>

                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setActionModalAsset(null)}
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Asset Inspector Modal */}
                <AssetPreviewModal
                    isOpen={showPreviewModal}
                    onClose={() => setShowPreviewModal(false)}
                    asset={selectedAsset}
                    onAssetUpdated={(updated) => {
                        setAssets(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
                    }}
                />
            </div>
        </Sidebar>
    );
}
