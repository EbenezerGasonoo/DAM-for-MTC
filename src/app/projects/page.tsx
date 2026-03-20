'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const demoProjects = [
    { id: '1', name: 'Sunday Service Master', description: 'Weekly service recordings and edits', status: 'EDITING', assetCount: 42, owner: 'John Davis', updatedAt: '2 hours ago' },
    { id: '2', name: 'Youth Retreat Promo', description: 'Promotional materials for youth retreat camp', status: 'REVIEW', assetCount: 15, owner: 'Sarah Kim', updatedAt: '5 hours ago' },
    { id: '3', name: 'Easter Campaign 2026', description: 'Full campaign across social, print, and video', status: 'DRAFT', assetCount: 8, owner: 'Mike Johnson', updatedAt: '1 day ago' },
    { id: '4', name: 'Podcast Season 3', description: 'Audio production for podcast season', status: 'APPROVED', assetCount: 24, owner: 'Lisa Chen', updatedAt: '3 days ago' },
    { id: '5', name: 'Website Rebrand', description: 'New visual identity and brand assets', status: 'PUBLISHED', assetCount: 67, owner: 'John Davis', updatedAt: '1 week ago' },
    { id: '6', name: 'Q1 Social Content', description: 'Social media posts for January–March', status: 'ARCHIVED', assetCount: 120, owner: 'Sarah Kim', updatedAt: '2 weeks ago' },
];

const statusColors: Record<string, string> = {
    DRAFT: 'var(--text-muted)',
    EDITING: 'var(--warning-color)',
    REVIEW: 'var(--accent-color)',
    APPROVED: 'var(--success-color)',
    PUBLISHED: '#06b6d4',
    ARCHIVED: '#6b7280',
};

const statusBg: Record<string, string> = {
    DRAFT: 'rgba(161,161,170,0.1)',
    EDITING: 'rgba(245,158,11,0.1)',
    REVIEW: 'rgba(139,92,246,0.15)',
    APPROVED: 'rgba(16,185,129,0.1)',
    PUBLISHED: 'rgba(6,182,212,0.1)',
    ARCHIVED: 'rgba(107,114,128,0.1)',
};

export default function ProjectsPage() {
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    return (
        <Sidebar>
            <Header
                title="Projects"
                subtitle={`${demoProjects.length} projects`}
                actions={
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
                }
            />

            <div className="content-area">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {demoProjects.map((project) => (
                        <div key={project.id} className="card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px' }}>{project.name}</h3>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{project.description}</p>
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColors[project.status], backgroundColor: statusBg[project.status], padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    {project.status}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                <span>🧑 {project.owner}</span>
                                <span>◰ {project.assetCount} assets</span>
                                <span>🕐 {project.updatedAt}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Create Modal */}
                {showCreate && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div className="card" style={{ width: '480px', backgroundColor: 'var(--panel-bg)' }}>
                            <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Create New Project</h2>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Project Name</label>
                                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Easter Campaign" style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', outline: 'none' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Description</label>
                                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Describe the project..." rows={3} style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', outline: 'none', resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button className="btn btn-primary">Create Project</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}
