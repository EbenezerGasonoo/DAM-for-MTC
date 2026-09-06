'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { AssetPreviewModal, AssetDetail } from '@/components/AssetPreviewModal';

const columnsConfig = [
    { key: 'DRAFT', label: 'Draft / Ingest', color: 'var(--text-muted)', bg: 'rgba(202, 222, 223, 0.08)' },
    { key: 'REVIEW', label: 'In Review & QC', color: '#FFD180', bg: 'rgba(230, 167, 76, 0.12)' },
    { key: 'APPROVED', label: 'Approved Masters', color: 'var(--mtc-hunter-green)', bg: 'rgba(56, 102, 66, 0.18)' },
    { key: 'PUBLISHED', label: 'Published / Delivered', color: 'var(--mtc-cornsilk)', bg: 'rgba(56, 102, 66, 0.25)' },
];

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

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/assets');
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

    return (
        <Sidebar>
            <Header
                title="Workflow & Approvals"
                subtitle="Live production pipeline — review and progress media across broadcast stages"
            />

            <div className="content-area" style={{ maxWidth: '100%', padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
                {/* Pipeline Filters */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
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
                    </div>

                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Drag cards between columns or use stage controls
                    </span>
                </div>

                {/* Kanban Board Container */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))',
                    gap: '18px',
                    flex: 1,
                    minHeight: 0,
                    overflowX: 'auto',
                }}>
                    {columnsConfig.map((col) => {
                        const colAssets = filteredAssets.filter(a => {
                            if (col.key === 'DRAFT') return a.status === 'DRAFT' || a.status === 'EDITING';
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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
                                            </div>

                                            {asset.project && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                                    📁 {asset.project.name}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '6px' }}>
                                                <span>💬 {asset._count?.comments || 0}</span>
                                                <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                                    {col.key !== 'DRAFT' && (
                                                        <button
                                                            onClick={() => {
                                                                const prev = col.key === 'PUBLISHED' ? 'APPROVED' : col.key === 'APPROVED' ? 'REVIEW' : 'DRAFT';
                                                                handleUpdateStatus(asset.id, prev);
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px', fontSize: '0.8rem' }}
                                                            title="Move back"
                                                        >
                                                            ◀
                                                        </button>
                                                    )}
                                                    {col.key !== 'PUBLISHED' && (
                                                        <button
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
                                            Drop assets here
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

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
