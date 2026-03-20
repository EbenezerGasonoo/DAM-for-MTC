'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const demoAssets = [
    { id: '1', title: 'Sunday_Service_Main_Camera.mp4', type: 'video', mimeType: 'video/mp4', size: 2400000000, status: 'DRAFT', tags: ['sermon', 'sunday'], time: '2 hours ago' },
    { id: '2', title: 'Youth_Retreat_Banner.psd', type: 'image', mimeType: 'image/psd', size: 145000000, status: 'REVIEW', tags: ['youth', 'promo'], time: '5 hours ago' },
    { id: '3', title: 'Podcast_Episode_42.wav', type: 'audio', mimeType: 'audio/wav', size: 890000000, status: 'APPROVED', tags: ['podcast'], time: '1 day ago' },
    { id: '4', title: 'Social_Reel_Easter.mp4', type: 'video', mimeType: 'video/mp4', size: 320000000, status: 'EDITING', tags: ['social', 'easter'], time: '1 day ago' },
    { id: '5', title: 'Church_Logo_Final.svg', type: 'image', mimeType: 'image/svg+xml', size: 2100000, status: 'PUBLISHED', tags: ['branding'], time: '3 days ago' },
    { id: '6', title: 'Event_Flyer_March.pdf', type: 'document', mimeType: 'application/pdf', size: 8500000, status: 'APPROVED', tags: ['print', 'events'], time: '4 days ago' },
    { id: '7', title: 'Worship_Song_Instrumental.mp3', type: 'audio', mimeType: 'audio/mp3', size: 12000000, status: 'PUBLISHED', tags: ['worship', 'music'], time: '5 days ago' },
    { id: '8', title: 'Promo_Video_TikTok.mp4', type: 'video', mimeType: 'video/mp4', size: 85000000, status: 'REVIEW', tags: ['social', 'tiktok'], time: '1 week ago' },
];

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

type ViewMode = 'grid' | 'list';

export default function AssetsPage() {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    const filtered = demoAssets.filter((a) => {
        if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.tags.some(t => t.includes(search.toLowerCase()))) return false;
        if (filterType && a.type !== filterType) return false;
        if (filterStatus && a.status !== filterStatus) return false;
        return true;
    });

    return (
        <Sidebar>
            <Header title="Assets" subtitle={`${filtered.length} assets found`} />
            <div className="content-area">
                {/* Filter Bar */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search assets, tags, keywords..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 40px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.9rem' }}
                        />
                    </div>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '10px 14px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <option value="">All Types</option>
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                        <option value="audio">Audio</option>
                        <option value="document">Document</option>
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px 14px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <option value="">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="EDITING">Editing</option>
                        <option value="REVIEW">Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="PUBLISHED">Published</option>
                    </select>
                    <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <button onClick={() => setViewMode('grid')} style={{ padding: '8px 14px', backgroundColor: viewMode === 'grid' ? 'var(--accent-light)' : 'var(--panel-bg)', color: viewMode === 'grid' ? 'var(--accent-color)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Grid</button>
                        <button onClick={() => setViewMode('list')} style={{ padding: '8px 14px', backgroundColor: viewMode === 'list' ? 'var(--accent-light)' : 'var(--panel-bg)', color: viewMode === 'list' ? 'var(--accent-color)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', borderLeft: '1px solid var(--border-color)' }}>List</button>
                    </div>
                </div>

                {/* Grid View */}
                {viewMode === 'grid' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                        {filtered.map((asset) => (
                            <div key={asset.id} className="card" style={{ padding: '0', overflow: 'hidden', cursor: 'pointer' }}>
                                <div style={{ height: '140px', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', borderBottom: '1px solid var(--border-color)' }}>
                                    {typeIcons[asset.type]}
                                </div>
                                <div style={{ padding: '16px' }}>
                                    <div style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.title}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatSize(asset.size)}</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: statusColors[asset.status], backgroundColor: `${statusColors[asset.status]}15`, padding: '2px 8px', borderRadius: '10px' }}>{asset.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        {asset.tags.map((tag) => (
                                            <span key={tag} style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'var(--panel-hover)', borderRadius: '4px', color: 'var(--text-muted)' }}>#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Size</th>
                                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((asset) => (
                                    <tr key={asset.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--panel-hover)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span>{typeIcons[asset.type]}</span>
                                            <span style={{ fontWeight: 500 }}>{asset.title}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{asset.type}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{formatSize(asset.size)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: statusColors[asset.status], backgroundColor: `${statusColors[asset.status]}15`, padding: '3px 10px', borderRadius: '10px' }}>{asset.status}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{asset.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📂</div>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>No assets match your filters</div>
                        <div style={{ fontSize: '0.85rem' }}>Try adjusting your search or filters</div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}
