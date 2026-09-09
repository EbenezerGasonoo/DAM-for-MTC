'use client';

import React, { useState, useEffect, useMemo } from 'react';

export interface NextcloudFolderImporterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete?: (importedCount: number) => void;
    initialPath?: string;
}

interface Breadcrumb {
    name: string;
    path: string;
}

interface FolderItem {
    name: string;
    path: string;
    lastmod: string;
}

interface FileItem {
    name: string;
    path: string;
    size: number;
    sizeFormatted: string;
    type: 'video' | 'image' | 'audio' | 'document' | 'other';
    mime: string;
    lastmod: string;
    isVideo: boolean;
    isImported: boolean;
    assetId?: string;
}

interface ProjectOption {
    id: string;
    name: string;
}

export function NextcloudFolderImporterModal({
    isOpen,
    onClose,
    onImportComplete,
    initialPath = '/',
}: NextcloudFolderImporterModalProps) {
    const [currentPath, setCurrentPath] = useState<string>(initialPath);
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ name: 'Root (/)', path: '/' }]);
    const [parentPath, setParentPath] = useState<string | null>(null);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters and search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'video' | 'all' | 'unimported'>('video');

    // Selection
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const [importFeedback, setImportFeedback] = useState<{
        type: 'success' | 'error';
        message: string;
        count?: number;
    } | null>(null);

    // Projects list
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    // Fetch projects for target selection
    useEffect(() => {
        if (!isOpen) return;
        const fetchProjects = async () => {
            try {
                const res = await fetch('/api/projects');
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data.projects || []);
                }
            } catch {
                // Ignore failure
            }
        };
        fetchProjects();
    }, [isOpen]);

    // Fetch folder contents
    const loadFolder = async (path: string) => {
        setLoading(true);
        setError(null);
        setSelectedPaths(new Set());
        try {
            const res = await fetch('/api/settings/nextcloud/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setCurrentPath(data.currentPath);
                setBreadcrumbs(data.breadcrumbs || []);
                setParentPath(data.parentPath || null);
                setFolders(data.folders || []);
                setFiles(data.files || []);
            } else {
                setError(data.error || 'Failed to list Nextcloud directory');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error accessing Nextcloud');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadFolder(initialPath || '/');
            setImportFeedback(null);
        }
    }, [isOpen, initialPath]);

    // Filtered files
    const displayedFiles = useMemo(() => {
        return files.filter(file => {
            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                if (!file.name.toLowerCase().includes(q)) return false;
            }

            // Mode filter
            if (filterType === 'video') {
                return file.isVideo;
            }
            if (filterType === 'unimported') {
                return !file.isImported;
            }
            return true; // 'all'
        });
    }, [files, searchQuery, filterType]);

    // Video files count in current folder
    const totalVideosInFolder = useMemo(() => files.filter(f => f.isVideo).length, [files]);
    const unimportedVideosInFolder = useMemo(() => files.filter(f => f.isVideo && !f.isImported).length, [files]);

    // Selection handlers
    const toggleSelect = (path: string) => {
        setSelectedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleSelectAllVideos = () => {
        const selectableVideos = displayedFiles.filter(f => f.isVideo && !f.isImported);
        const allSelected = selectableVideos.every(f => selectedPaths.has(f.path));

        if (allSelected) {
            // Deselect all displayed
            setSelectedPaths(prev => {
                const next = new Set(prev);
                selectableVideos.forEach(f => next.delete(f.path));
                return next;
            });
        } else {
            // Select all displayed
            setSelectedPaths(prev => {
                const next = new Set(prev);
                selectableVideos.forEach(f => next.add(f.path));
                return next;
            });
        }
    };

    // Import Execution
    const executeImport = async (filePathsToImport: string[]) => {
        if (filePathsToImport.length === 0) return;

        setIsImporting(true);
        setImportFeedback(null);

        try {
            const res = await fetch('/api/settings/nextcloud/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePaths: filePathsToImport,
                    projectId: selectedProjectId || undefined,
                    videoOnly: true,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setImportFeedback({
                    type: 'success',
                    message: data.message || `Imported ${data.importedCount} video(s) into your library!`,
                    count: data.importedCount,
                });
                // Reload current folder so statuses update to "In Library"
                await loadFolder(currentPath);
                if (onImportComplete && data.importedCount > 0) {
                    onImportComplete(data.importedCount);
                }
            } else {
                setImportFeedback({
                    type: 'error',
                    message: data.error || 'Failed to import selected videos.',
                });
            }
        } catch (err: any) {
            setImportFeedback({
                type: 'error',
                message: err?.message || 'Network error during video import.',
            });
        } finally {
            setIsImporting(false);
        }
    };

    // Import all unimported videos in current folder
    const handleImportAllFolderVideos = () => {
        const unimported = files.filter(f => f.isVideo && !f.isImported).map(f => f.path);
        if (unimported.length === 0) {
            alert('All video files in this folder are already imported!');
            return;
        }
        executeImport(unimported);
    };

    // Import selected
    const handleImportSelected = () => {
        const list = Array.from(selectedPaths);
        if (list.length === 0) return;
        executeImport(list);
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(5, 10, 12, 0.82)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isImporting) onClose();
            }}
        >
            <div
                style={{
                    backgroundColor: 'var(--panel-bg, #1D2729)',
                    border: '1.5px solid var(--border-color, rgba(202, 222, 223, 0.2))',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '1100px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 32px rgba(56, 102, 66, 0.25)',
                }}
            >
                {/* MODAL HEADER */}
                <div
                    style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'rgba(20, 28, 30, 0.6)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(56, 102, 66, 0.35)',
                                border: '1px solid rgba(167, 243, 208, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                            }}
                        >
                            📂
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', margin: 0 }}>
                                Nextcloud Media Explorer & Video Importer
                            </h2>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                Browse storage directories and selectively ingest camera footage & broadcast videos into your DAM
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={isImporting}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '1.4rem',
                            cursor: isImporting ? 'not-allowed' : 'pointer',
                            padding: '4px 8px',
                            lineHeight: 1,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* FEEDBACK BANNER */}
                {importFeedback && (
                    <div
                        style={{
                            padding: '12px 24px',
                            backgroundColor: importFeedback.type === 'success' ? 'rgba(56, 102, 66, 0.35)' : 'rgba(239, 68, 68, 0.25)',
                            borderBottom: `1px solid ${importFeedback.type === 'success' ? 'rgba(167, 243, 208, 0.4)' : 'rgba(252, 165, 165, 0.4)'}`,
                            color: importFeedback.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{importFeedback.type === 'success' ? '✅' : '❌'}</span>
                            <span style={{ fontWeight: 600 }}>{importFeedback.message}</span>
                        </div>
                        <button
                            onClick={() => setImportFeedback(null)}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* BREADCRUMBS & NAVIGATION TOOLBAR */}
                <div
                    style={{
                        padding: '12px 24px',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'rgba(10, 15, 17, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                    }}
                >
                    {/* Interactive Breadcrumbs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: '240px' }}>
                        {parentPath !== null && (
                            <button
                                onClick={() => loadFolder(parentPath)}
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Go to parent directory"
                            >
                                ⬆ Up
                            </button>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', padding: '2px 0' }}>
                            {breadcrumbs.map((crumb, idx) => (
                                <React.Fragment key={crumb.path}>
                                    {idx > 0 && <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>/</span>}
                                    <button
                                        onClick={() => loadFolder(crumb.path)}
                                        style={{
                                            background: crumb.path === currentPath ? 'rgba(56, 102, 66, 0.35)' : 'transparent',
                                            border: crumb.path === currentPath ? '1px solid rgba(167, 243, 208, 0.3)' : '1px solid transparent',
                                            color: crumb.path === currentPath ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                            borderRadius: '4px',
                                            padding: '3px 8px',
                                            fontSize: '0.78rem',
                                            fontWeight: crumb.path === currentPath ? 700 : 500,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {crumb.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>

                        <button
                            onClick={() => loadFolder(currentPath)}
                            disabled={loading}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: '4px',
                            }}
                            title="Refresh folder"
                        >
                            ↻
                        </button>
                    </div>

                    {/* Quick Folder Shortcuts */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Shortcuts:
                        </span>
                        {['/', '/MTC Online', '/Footage_Ingest', '/mtc-dam-uploads'].map(shortcut => (
                            <button
                                key={shortcut}
                                onClick={() => loadFolder(shortcut)}
                                style={{
                                    backgroundColor: currentPath === shortcut ? 'var(--mtc-hunter-green)' : 'rgba(202, 222, 223, 0.08)',
                                    border: '1px solid rgba(202, 222, 223, 0.15)',
                                    color: 'var(--mtc-cornsilk)',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                }}
                            >
                                {shortcut === '/' ? 'Root' : shortcut.replace(/^\//, '')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FILTER & SEARCH BAR */}
                <div
                    style={{
                        padding: '10px 24px',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'rgba(20, 28, 30, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                    }}
                >
                    {/* View Filters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            onClick={() => setFilterType('video')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: filterType === 'video' ? 700 : 500,
                                backgroundColor: filterType === 'video' ? 'var(--mtc-hunter-green)' : 'rgba(202, 222, 223, 0.06)',
                                border: '1px solid ' + (filterType === 'video' ? 'rgba(167, 243, 208, 0.4)' : 'rgba(202, 222, 223, 0.15)'),
                                color: filterType === 'video' ? '#FFEBCC' : 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <span>🎬</span>
                            <span>Videos Only</span>
                            <span style={{
                                fontSize: '0.7rem',
                                padding: '1px 5px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(0,0,0,0.3)',
                            }}>{totalVideosInFolder}</span>
                        </button>

                        <button
                            onClick={() => setFilterType('unimported')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: filterType === 'unimported' ? 700 : 500,
                                backgroundColor: filterType === 'unimported' ? 'var(--mtc-hunter-green)' : 'rgba(202, 222, 223, 0.06)',
                                border: '1px solid ' + (filterType === 'unimported' ? 'rgba(167, 243, 208, 0.4)' : 'rgba(202, 222, 223, 0.15)'),
                                color: filterType === 'unimported' ? '#FFEBCC' : 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <span>⚡</span>
                            <span>Unimported Only</span>
                            <span style={{
                                fontSize: '0.7rem',
                                padding: '1px 5px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(0,0,0,0.3)',
                            }}>{unimportedVideosInFolder}</span>
                        </button>

                        <button
                            onClick={() => setFilterType('all')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: filterType === 'all' ? 700 : 500,
                                backgroundColor: filterType === 'all' ? 'var(--mtc-hunter-green)' : 'rgba(202, 222, 223, 0.06)',
                                border: '1px solid ' + (filterType === 'all' ? 'rgba(167, 243, 208, 0.4)' : 'rgba(202, 222, 223, 0.15)'),
                                color: filterType === 'all' ? '#FFEBCC' : 'var(--text-muted)',
                                cursor: 'pointer',
                            }}
                        >
                            All Files ({files.length})
                        </button>
                    </div>

                    {/* Search Field */}
                    <div style={{ position: 'relative', width: '260px' }}>
                        <input
                            type="text"
                            placeholder="Filter files in folder..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px 12px 6px 30px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--mtc-cornsilk)',
                                fontSize: '0.78rem',
                                outline: 'none',
                            }}
                        />
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', opacity: 0.5 }}>
                            🔍
                        </span>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* EXPLORER BODY: DUAL PANE (FOLDERS + FILES) */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: '380px' }}>
                    {/* LEFT PANE: SUBFOLDERS LIST */}
                    <div
                        style={{
                            width: '260px',
                            borderRight: '1px solid var(--border-color)',
                            backgroundColor: 'rgba(15, 22, 24, 0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                            flexShrink: 0,
                        }}
                    >
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Directories ({folders.length})
                        </div>

                        {folders.length === 0 ? (
                            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                                No subdirectories
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', padding: '6px' }}>
                                {folders.map(f => (
                                    <button
                                        key={f.path}
                                        onClick={() => loadFolder(f.path)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            color: 'var(--mtc-cornsilk)',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.82rem',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56, 102, 66, 0.2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <span style={{ fontSize: '1rem' }}>📁</span>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                            {f.name}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>›</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANE: FILES TABLE */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: 'rgba(20, 28, 30, 0.2)' }}>
                        {loading ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2rem' }}>⏳</div>
                                <div style={{ fontSize: '0.85rem' }}>Scanning Nextcloud directory...</div>
                            </div>
                        ) : error ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#FCA5A5', padding: '24px' }}>
                                <div style={{ fontSize: '2rem' }}>⚠️</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Error Accessing Folder</div>
                                <div style={{ fontSize: '0.8rem', textAlign: 'center', maxWidth: '400px' }}>{error}</div>
                                <button onClick={() => loadFolder(currentPath)} className="btn btn-secondary" style={{ marginTop: '8px' }}>
                                    Retry
                                </button>
                            </div>
                        ) : displayedFiles.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2.5rem' }}>🎬</div>
                                <div style={{ fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>No media files match your filter</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                    {filterType === 'video' ? 'No video files found in this folder.' : 'This directory contains no files.'}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {/* Table Header */}
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '40px 1fr 100px 110px 140px',
                                        padding: '10px 16px',
                                        backgroundColor: 'rgba(15, 22, 24, 0.6)',
                                        borderBottom: '1px solid var(--border-color)',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: 'var(--text-dim)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 10,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={displayedFiles.filter(f => f.isVideo && !f.isImported).length > 0 && displayedFiles.filter(f => f.isVideo && !f.isImported).every(f => selectedPaths.has(f.path))}
                                            onChange={handleSelectAllVideos}
                                            disabled={displayedFiles.filter(f => f.isVideo && !f.isImported).length === 0}
                                            title="Select / Deselect all unimported videos"
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </div>
                                    <div>File Name & Format</div>
                                    <div>Size</div>
                                    <div>Type</div>
                                    <div>Library Status</div>
                                </div>

                                {/* Table Rows */}
                                {displayedFiles.map(file => {
                                    const isSelected = selectedPaths.has(file.path);
                                    const ext = (file.name.split('.').pop() || '').toUpperCase();

                                    return (
                                        <div
                                            key={file.path}
                                            onClick={() => {
                                                if (!file.isImported && file.isVideo) {
                                                    toggleSelect(file.path);
                                                }
                                            }}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '40px 1fr 100px 110px 140px',
                                                padding: '12px 16px',
                                                borderBottom: '1px solid rgba(202, 222, 223, 0.08)',
                                                alignItems: 'center',
                                                fontSize: '0.82rem',
                                                backgroundColor: isSelected
                                                    ? 'rgba(56, 102, 66, 0.25)'
                                                    : 'transparent',
                                                cursor: file.isImported ? 'default' : 'pointer',
                                                transition: 'background-color 0.15s',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(202, 222, 223, 0.04)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            {/* Checkbox */}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={file.isImported}
                                                    onChange={() => toggleSelect(file.path)}
                                                    style={{ cursor: file.isImported ? 'not-allowed' : 'pointer' }}
                                                />
                                            </div>

                                            {/* Title & Badge */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                <span style={{ fontSize: '1rem' }}>
                                                    {file.isVideo ? '🎬' : file.type === 'image' ? '🖼️' : file.type === 'audio' ? '🎵' : '📄'}
                                                </span>
                                                <span
                                                    style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        fontWeight: 500,
                                                        color: file.isImported ? 'var(--text-muted)' : 'var(--mtc-cornsilk)',
                                                    }}
                                                    title={file.name}
                                                >
                                                    {file.name}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        padding: '1px 5px',
                                                        borderRadius: '3px',
                                                        backgroundColor: file.isVideo ? 'rgba(56, 102, 66, 0.4)' : 'rgba(202, 222, 223, 0.1)',
                                                        color: file.isVideo ? '#A7F3D0' : 'var(--text-dim)',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {ext}
                                                </span>
                                            </div>

                                            {/* Size */}
                                            <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                                                {file.sizeFormatted}
                                            </div>

                                            {/* Type */}
                                            <div style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                                {file.type}
                                            </div>

                                            {/* Status Badge */}
                                            <div>
                                                {file.isImported ? (
                                                    <span
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            padding: '3px 8px',
                                                            borderRadius: '12px',
                                                            backgroundColor: 'rgba(56, 102, 66, 0.35)',
                                                            color: '#A7F3D0',
                                                            border: '1px solid rgba(167, 243, 208, 0.3)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                        }}
                                                    >
                                                        ✓ In Library
                                                    </span>
                                                ) : (
                                                    <span
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            padding: '3px 8px',
                                                            borderRadius: '12px',
                                                            backgroundColor: 'rgba(230, 167, 76, 0.2)',
                                                            color: '#FDE68A',
                                                            border: '1px solid rgba(253, 230, 138, 0.3)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                        }}
                                                    >
                                                        📥 New
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL FOOTER WITH IMPORT ACTIONS */}
                <div
                    style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--border-color)',
                        backgroundColor: 'rgba(20, 28, 30, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                    }}
                >
                    {/* Left: Project Selector & Selection stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Target Project:
                            </label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                disabled={isImporting}
                                style={{
                                    backgroundColor: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--mtc-cornsilk)',
                                    padding: '5px 10px',
                                    fontSize: '0.78rem',
                                    outline: 'none',
                                }}
                            >
                                <option value="">(None / General Library)</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedPaths.size > 0 && (
                            <span style={{ fontSize: '0.82rem', color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                                {selectedPaths.size} video(s) selected
                            </span>
                        )}
                    </div>

                    {/* Right: Import Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {unimportedVideosInFolder > 0 && (
                            <button
                                onClick={handleImportAllFolderVideos}
                                disabled={isImporting}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                title="Import all unimported videos currently in this folder"
                            >
                                ⚡ Import All in Folder ({unimportedVideosInFolder})
                            </button>
                        )}

                        <button
                            onClick={handleImportSelected}
                            disabled={isImporting || selectedPaths.size === 0}
                            className="btn btn-primary"
                            style={{
                                fontSize: '0.82rem',
                                padding: '8px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 600,
                            }}
                        >
                            {isImporting ? (
                                <>⏳ Importing Videos...</>
                            ) : (
                                <>📥 Import Selected ({selectedPaths.size})</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
