'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface NLEAsset {
    id: string;
    title: string;
    description?: string;
    type: 'video' | 'audio' | 'image' | 'document';
    mimeType: string;
    size: number;
    status: string;
    createdAt: string;
    projectName: string | null;
    tags: string[];
    versionNum: number;
    streamUri: string;
    downloadUri: string;
    duration: string | null;
    dimensions: string | null;
    codec: string | null;
}

interface ProjectOption {
    id: string;
    name: string;
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function NLEPanelContent() {
    const searchParams = useSearchParams();
    const host = searchParams.get('host') || 'browser'; // 'premiere' | 'resolve' | 'browser'
    const initialToken = searchParams.get('token') || '';

    const [assets, setAssets] = useState<NLEAsset[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    const [activePreviewVideo, setActivePreviewVideo] = useState<string | null>(null);
    
    // Status notifications inside NLE panel
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('info');

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
        setToastMessage(msg);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Fetch Assets
    const fetchAssets = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.set('q', searchQuery.trim());
            if (selectedType !== 'all') params.set('type', selectedType);
            if (selectedProject) params.set('projectId', selectedProject);
            params.set('limit', '50');

            const headers: HeadersInit = {};
            if (initialToken) {
                headers['Authorization'] = `Bearer ${initialToken}`;
            }

            const res = await fetch(`/api/nle/assets?${params.toString()}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setAssets(data.assets || []);
                if (data.projects) setProjects(data.projects);
            }
        } catch (err) {
            console.error('Failed to load NLE assets:', err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedType, selectedProject, initialToken]);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    // Handle messages back from parent CEP or Resolve container
    useEffect(() => {
        const handleParentMessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data) return;

            if (data.type === 'IMPORT_RESULT') {
                if (data.result?.success) {
                    showToast(`✓ ${data.result.message || 'Imported to Premiere project!'}`, 'success');
                } else {
                    showToast(`✕ ${data.result?.error || 'Import to Premiere failed'}`, 'error');
                }
            } else if (data.type === 'INSERT_RESULT') {
                if (data.result?.success) {
                    showToast(`✓ ${data.result.message || 'Placed on sequence timeline!'}`, 'success');
                } else {
                    showToast(`✕ ${data.result?.error || 'Timeline insert failed'}`, 'error');
                }
            } else if (data.type === 'RESOLVE_IMPORT_RESULT') {
                if (data.result?.success) {
                    showToast(`✓ ${data.result.message || 'Imported to DaVinci Media Pool!'}`, 'success');
                } else {
                    showToast(`✕ ${data.result?.error || 'Resolve import failed'}`, 'error');
                }
            }
        };

        window.addEventListener('message', handleParentMessage);
        return () => window.removeEventListener('message', handleParentMessage);
    }, []);

    // 1. IMPORT TO PREMIERE PRO
    const handleImportPremiere = (asset: NLEAsset, insertTimeline = false) => {
        showToast(`Preparing "${asset.title}" for Premiere...`, 'info');
        const activeToken = initialToken || (typeof window !== 'undefined' ? localStorage.getItem('mtc_dam_nle_token') : '') || '';
        let fullDownloadUrl = asset.downloadUri.startsWith('http')
            ? asset.downloadUri
            : `${window.location.origin}${asset.downloadUri}`;

        if (activeToken && !fullDownloadUrl.includes('token=')) {
            fullDownloadUrl += (fullDownloadUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(activeToken)}`;
        }

        const ext = asset.mimeType.split('/')[1] || 'mp4';
        const fileName = `${asset.title.replace(/[^a-zA-Z0-9.\-_]/g, '_')}.${ext}`;
        const binName = asset.projectName || 'MTC DAM Assets';

        // Post message to parent container (index.html inside CEP)
        window.parent.postMessage({
            type: 'DOWNLOAD_AND_IMPORT',
            id: asset.id,
            downloadUrl: fullDownloadUrl,
            fileName,
            binName,
            insertTimeline,
            token: activeToken,
        }, '*');
    };

    // 2. IMPORT TO DAVINCI RESOLVE
    const handleImportResolve = (asset: NLEAsset) => {
        showToast(`Sending "${asset.title}" to DaVinci Resolve...`, 'info');
        const activeToken = initialToken || (typeof window !== 'undefined' ? localStorage.getItem('mtc_dam_nle_token') : '') || '';
        let fullDownloadUrl = asset.downloadUri.startsWith('http')
            ? asset.downloadUri
            : `${window.location.origin}${asset.downloadUri}`;

        if (activeToken && !fullDownloadUrl.includes('token=')) {
            fullDownloadUrl += (fullDownloadUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(activeToken)}`;
        }

        const ext = asset.mimeType.split('/')[1] || 'mp4';
        const fileName = `${asset.title.replace(/[^a-zA-Z0-9.\-_]/g, '_')}.${ext}`;
        const binName = asset.projectName || 'MTC DAM Assets';

        // Send to parent container (or directly to localhost bridge)
        window.parent.postMessage({
            type: 'IMPORT_TO_RESOLVE',
            id: asset.id,
            downloadUrl: fullDownloadUrl,
            fileName,
            binName,
            token: activeToken,
        }, '*');

        // Direct fetch to local bridge
        fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                downloadUrl: fullDownloadUrl,
                fileName,
                binName,
                token: activeToken,
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showToast(`✓ Imported into DaVinci "${binName}" bin!`, 'success');
            } else {
                showToast(`✕ Resolve: ${data.error || 'Import failed'}`, 'error');
            }
        })
        .catch(() => {
            showToast(`⚠️ Bridge on 127.0.0.1:8765 not responding. Check DaVinci script console.`, 'error');
        });
    };

    // 3. AUDIO PLAYBACK
    const toggleAudio = (asset: NLEAsset) => {
        if (activeAudioId === asset.id) {
            if (audioRef.current) audioRef.current.pause();
            setActiveAudioId(null);
        } else {
            setActiveAudioId(asset.id);
            if (audioRef.current) {
                audioRef.current.src = asset.streamUri;
                audioRef.current.play().catch(() => {});
            }
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#0E1315',
            color: '#CADEDF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: 'hidden',
            fontSize: '13px'
        }}>
            {/* Hidden Audio Player */}
            <audio ref={audioRef} onEnded={() => setActiveAudioId(null)} />

            {/* Top Toolbar */}
            <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid rgba(202, 222, 223, 0.1)',
                backgroundColor: '#141C1E',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search media by title or tag..."
                        style={{
                            width: '100%',
                            padding: '7px 10px 7px 28px',
                            backgroundColor: '#090D0F',
                            border: '1px solid rgba(202, 222, 223, 0.2)',
                            borderRadius: '5px',
                            color: '#FEFAE0',
                            fontSize: '12px',
                            outline: 'none',
                        }}
                    />
                    <span style={{ position: 'absolute', left: '8px', top: '7px', color: '#8A9D9E', fontSize: '13px' }}>🔍</span>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{ position: 'absolute', right: '8px', top: '7px', background: 'none', border: 'none', color: '#8A9D9E', cursor: 'pointer' }}
                        >✕</button>
                    )}
                </div>

                {/* Filters Ribbon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    {/* Media Type Chips */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'video', label: '🎬 Video' },
                            { id: 'audio', label: '🎵 Audio' },
                            { id: 'image', label: '🖼️ Stills' },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedType(t.id)}
                                style={{
                                    padding: '3px 7px',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: selectedType === t.id ? '#386642' : 'rgba(202, 222, 223, 0.08)',
                                    color: selectedType === t.id ? '#FEFAE0' : '#8A9D9E',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Project Filter */}
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        style={{
                            maxWidth: '120px',
                            padding: '3px 6px',
                            backgroundColor: '#090D0F',
                            border: '1px solid rgba(202, 222, 223, 0.15)',
                            borderRadius: '4px',
                            color: '#CADEDF',
                            fontSize: '11px',
                            outline: 'none'
                        }}
                    >
                        <option value="">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
                <div style={{
                    padding: '6px 12px',
                    backgroundColor: toastType === 'success' ? '#24452C' : toastType === 'error' ? '#5E2222' : '#1A2930',
                    color: toastType === 'success' ? '#A7F3D0' : toastType === 'error' ? '#FCA5A5' : '#CADEDF',
                    borderBottom: '1px solid rgba(202, 222, 223, 0.15)',
                    fontSize: '11px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    animation: 'fadeIn 0.2s'
                }}>
                    <span>{toastMessage}</span>
                    <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {/* Assets List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {loading ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#8A9D9E', fontSize: '12px' }}>
                        Loading MTC assets...
                    </div>
                ) : assets.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#8A9D9E', fontSize: '12px' }}>
                        No media assets match your criteria.
                    </div>
                ) : (
                    assets.map((asset) => (
                        <div
                            key={asset.id}
                            style={{
                                backgroundColor: '#141C1E',
                                border: '1px solid rgba(202, 222, 223, 0.1)',
                                borderRadius: '6px',
                                padding: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                transition: 'border-color 0.15s, background-color 0.15s',
                            }}
                        >
                            {/* Top Info Row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                {/* Media Icon / Thumbnail Preview */}
                                <div style={{
                                    width: '54px',
                                    height: '54px',
                                    borderRadius: '4px',
                                    backgroundColor: '#090D0F',
                                    border: '1px solid rgba(202, 222, 223, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    cursor: asset.type === 'video' || asset.type === 'audio' ? 'pointer' : 'default'
                                }}
                                onClick={() => {
                                    if (asset.type === 'audio') toggleAudio(asset);
                                    if (asset.type === 'video') setActivePreviewVideo(activePreviewVideo === asset.id ? null : asset.id);
                                }}
                                title="Click to preview"
                                >
                                    {asset.type === 'image' && asset.streamUri ? (
                                        <img src={asset.streamUri} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : asset.type === 'video' ? (
                                        <div style={{ fontSize: '1.4rem' }}>🎬</div>
                                    ) : asset.type === 'audio' ? (
                                        <div style={{ fontSize: '1.4rem', color: activeAudioId === asset.id ? '#A7F3D0' : '#CADEDF' }}>
                                            {activeAudioId === asset.id ? '⏸' : '🎵'}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '1.4rem' }}>📄</div>
                                    )}
                                </div>

                                {/* Asset Title & Badges */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        color: '#FEFAE0',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }} title={asset.title}>
                                        {asset.title}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: '#8A9D9E', marginTop: '3px', flexWrap: 'wrap' }}>
                                        <span>{formatBytes(asset.size)}</span>
                                        {asset.duration && <span>• {asset.duration}</span>}
                                        {asset.dimensions && <span>• {asset.dimensions}</span>}
                                        {asset.projectName && (
                                            <span style={{ color: '#A7F3D0' }}>📁 {asset.projectName}</span>
                                        )}
                                    </div>
                                    {asset.tags.length > 0 && (
                                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                            {asset.tags.slice(0, 3).map((t, idx) => (
                                                <span key={idx} style={{
                                                    fontSize: '9px',
                                                    padding: '1px 5px',
                                                    backgroundColor: 'rgba(202, 222, 223, 0.08)',
                                                    borderRadius: '3px',
                                                    color: '#CADEDF'
                                                }}>
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* In-Panel Video Preview Player if toggled */}
                            {activePreviewVideo === asset.id && asset.type === 'video' && (
                                <div style={{ width: '100%', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#000' }}>
                                    <video
                                        src={asset.streamUri}
                                        controls
                                        autoPlay
                                        style={{ width: '100%', maxHeight: '160px' }}
                                    />
                                </div>
                            )}

                            {/* Action Buttons for NLE Editors */}
                            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                {host === 'premiere' ? (
                                    <>
                                        <button
                                            onClick={() => handleImportPremiere(asset, false)}
                                            style={{
                                                flex: 1,
                                                padding: '5px 8px',
                                                backgroundColor: '#386642',
                                                color: '#FEFAE0',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            📥 Import to Bin
                                        </button>
                                        <button
                                            onClick={() => handleImportPremiere(asset, true)}
                                            title="Insert directly onto active timeline"
                                            style={{
                                                padding: '5px 8px',
                                                backgroundColor: 'rgba(202, 222, 223, 0.1)',
                                                color: '#CADEDF',
                                                border: '1px solid rgba(202, 222, 223, 0.2)',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ⏱ Timeline
                                        </button>
                                    </>
                                ) : host === 'resolve' ? (
                                    <button
                                        onClick={() => handleImportResolve(asset)}
                                        style={{
                                            flex: 1,
                                            padding: '5px 8px',
                                            backgroundColor: '#D4A373',
                                            color: '#141C1E',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        📥 Import to Media Pool
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleImportPremiere(asset, false)}
                                            style={{
                                                flex: 1,
                                                padding: '5px 6px',
                                                backgroundColor: '#386642',
                                                color: '#FEFAE0',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                            title="Send to Adobe Premiere Pro"
                                        >
                                            Premiere
                                        </button>
                                        <button
                                            onClick={() => handleImportResolve(asset)}
                                            style={{
                                                flex: 1,
                                                padding: '5px 6px',
                                                backgroundColor: '#D4A373',
                                                color: '#141C1E',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                            title="Send to DaVinci Resolve Media Pool"
                                        >
                                            Resolve
                                        </button>
                                    </>
                                )}

                                {/* Direct Download Link */}
                                <a
                                    href={asset.downloadUri}
                                    download
                                    style={{
                                        padding: '5px 8px',
                                        backgroundColor: 'rgba(202, 222, 223, 0.08)',
                                        color: '#CADEDF',
                                        border: '1px solid rgba(202, 222, 223, 0.15)',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Download asset to disk"
                                >
                                    💾
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Status Bar */}
            <div style={{
                padding: '6px 12px',
                borderTop: '1px solid rgba(202, 222, 223, 0.1)',
                backgroundColor: '#141C1E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#8A9D9E'
            }}>
                <span>
                    {host === 'premiere' ? 'Adobe Premiere Pro Connected' : host === 'resolve' ? 'DaVinci Resolve Connected' : 'MTC DAM NLE Workspace'}
                </span>
                <span>{assets.length} assets available</span>
            </div>
        </div>
    );
}

export default function NLEPanelPage() {
    return (
        <React.Suspense fallback={
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0E1315',
                color: '#8A9D9E',
                fontSize: '12px'
            }}>
                Loading NLE Media Panel...
            </div>
        }>
            <NLEPanelContent />
        </React.Suspense>
    );
}
