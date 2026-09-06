'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface Project {
    id: string;
    name: string;
    description?: string;
    status: string;
    ownerId: string;
    owner?: { id: string; name: string; email?: string };
    _count?: { assets: number };
    createdAt: string;
    updatedAt: string;
}

const statusColors: Record<string, string> = {
    DRAFT: 'var(--text-muted)',
    EDITING: 'var(--warning-color)',
    REVIEW: '#FFD180',
    APPROVED: 'var(--mtc-hunter-green)',
    PUBLISHED: 'var(--mtc-cornsilk)',
    ARCHIVED: 'var(--text-dim)',
};

const statusBg: Record<string, string> = {
    DRAFT: 'rgba(202,222,223,0.1)',
    EDITING: 'rgba(230,167,76,0.15)',
    REVIEW: 'rgba(230,167,76,0.25)',
    APPROVED: 'rgba(56,102,66,0.25)',
    PUBLISHED: 'rgba(56,102,66,0.15)',
    ARCHIVED: 'rgba(202,222,223,0.06)',
};

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newStatus, setNewStatus] = useState('DRAFT');
    const [isCreating, setIsCreating] = useState(false);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setProjects(data);
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            setIsCreating(true);
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName.trim(),
                    description: newDesc.trim(),
                    status: newStatus,
                }),
            });

            if (res.ok) {
                setNewName('');
                setNewDesc('');
                setShowCreate(false);
                fetchProjects();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create project');
            }
        } catch (err) {
            console.error('Error creating project:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <Sidebar>
            <Header
                title="Projects"
                subtitle={`${projects.length} production workspaces`}
                actions={
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ padding: '8px 16px' }}>
                        + New Project
                    </button>
                }
            />

            <div className="content-area">
                {/* Search & Filter Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ position: 'relative', width: '320px' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>🔍</span>
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter projects..."
                            style={{
                                width: '100%',
                                padding: '9px 12px 9px 34px',
                                backgroundColor: 'var(--panel-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--mtc-cornsilk)',
                                fontSize: '0.85rem',
                                outline: 'none',
                            }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                        Loading production workspaces...
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '22px' }}>
                        {filteredProjects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/assets?projectId=${project.id}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <div
                                    className="card"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '14px',
                                        height: '100%',
                                        transition: 'all 0.2s',
                                        border: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)';
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{
                                                fontSize: '1.08rem',
                                                fontWeight: 600,
                                                marginBottom: '6px',
                                                color: 'var(--mtc-cornsilk)',
                                                fontFamily: 'var(--font-brand)',
                                            }}>
                                                {project.name}
                                            </h3>
                                            <p style={{
                                                fontSize: '0.82rem',
                                                color: 'var(--text-muted)',
                                                lineHeight: '1.45',
                                                minHeight: '36px',
                                            }}>
                                                {project.description || 'No description provided'}
                                            </p>
                                        </div>
                                        <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            color: statusColors[project.status] || '#CADEDF',
                                            backgroundColor: statusBg[project.status] || 'rgba(202,222,223,0.1)',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                            marginLeft: '10px',
                                            border: `1px solid ${statusColors[project.status] || '#CADEDF'}40`,
                                        }}>
                                            {project.status}
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.78rem',
                                        color: 'var(--text-muted)',
                                        borderTop: '1px solid var(--border-color)',
                                        paddingTop: '14px',
                                        marginTop: 'auto',
                                    }}>
                                        <span>🧑 {project.owner?.name || 'Producer'}</span>
                                        <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                                            ◰ {project._count?.assets || 0} assets
                                        </span>
                                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {filteredProjects.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📂</div>
                        <div style={{ fontWeight: 500, marginBottom: '6px' }}>No projects found</div>
                        <div style={{ fontSize: '0.85rem' }}>Create a project to organize production assets</div>
                    </div>
                )}

                {/* Create Project Modal */}
                {showCreate && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)',
                        padding: '20px',
                    }}>
                        <form onSubmit={handleCreateProject} className="card" style={{ width: '480px', backgroundColor: 'var(--panel-bg)', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)' }}>
                                    Create Production Workspace
                                </h2>
                                <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>
                                    ✕
                                </button>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    Project Name *
                                </label>
                                <input
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Summer Camp 2026 Master Series"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: 'var(--radius-sm)',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    Initial Status
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: 'var(--radius-sm)',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="DRAFT">DRAFT</option>
                                    <option value="EDITING">EDITING</option>
                                    <option value="REVIEW">REVIEW</option>
                                    <option value="APPROVED">APPROVED</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    Description
                                </label>
                                <textarea
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Scope of production, broadcast channels, deliverable formats..."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: 'var(--radius-sm)',
                                        outline: 'none',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isCreating || !newName.trim()} className="btn btn-primary">
                                    {isCreating ? 'Creating...' : 'Create Workspace'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}
