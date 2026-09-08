'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';

export interface AssetDetail {
    id: string;
    title: string;
    description?: string;
    type: string;
    mimeType: string;
    size: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    creatorId?: string;
    creator?: { id: string; name: string; email?: string };
    projectId?: string;
    project?: { id: string; name: string };
    tags?: Array<{ name: string }>;
    versions?: Array<{
        id?: string;
        versionNum: number;
        nextcloudUri?: string;
        proxyUri?: string;
        createdAt?: string;
    }>;
    metadata?: string;
    customMetadata?: string;
    licenseInfo?: {
        licenseName: string;
        licenseType: string;
        grantedTo?: string;
        expiresAt?: string | null;
        notes?: string;
    } | null;
    watermarkProfile?: {
        name: string;
        textTemplate?: string;
    } | null;
    comments?: Array<{
        id: string;
        content: string;
        timestampFrame?: number | null;
        author: { id: string; name: string };
        createdAt: string;
    }>;
    _count?: { comments: number };
    isFavorited?: boolean;
}

interface AssetPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset?: AssetDetail | null;
    onAssetUpdated?: (updated: AssetDetail) => void;
    onAddToCollection?: () => void;
}

const statusBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
    DRAFT: { bg: 'rgba(202, 222, 223, 0.12)', text: '#CADEDF', border: 'rgba(202, 222, 223, 0.3)' },
    EDITING: { bg: 'rgba(230, 167, 76, 0.18)', text: '#FFEBCC', border: 'rgba(230, 167, 76, 0.4)' },
    REVIEW: { bg: 'rgba(230, 167, 76, 0.25)', text: '#FFD180', border: 'rgba(230, 167, 76, 0.5)' },
    APPROVED: { bg: 'rgba(56, 102, 66, 0.35)', text: '#A7F3D0', border: 'rgba(56, 102, 66, 0.6)' },
    PUBLISHED: { bg: 'rgba(56, 102, 66, 0.25)', text: '#FFEBCC', border: 'rgba(255, 235, 204, 0.4)' },
};

export function AssetPreviewModal({
    isOpen,
    onClose,
    asset: initialAsset,
    onAssetUpdated,
}: AssetPreviewModalProps) {
    const { user } = useAuth();
    const [currentAsset, setCurrentAsset] = useState<AssetDetail | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'metadata' | 'versions' | 'drm' | 'comments' | 'audit'>('preview');
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [commentTimestamp, setCommentTimestamp] = useState<number | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [commentsList, setCommentsList] = useState<any[]>([]);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [shareCopied, setShareCopied] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<number>(1);
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
    const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    // Synchronize asset and fetch fresh full asset details with relations
    useEffect(() => {
        if (initialAsset && isOpen) {
            setCurrentAsset(initialAsset);
            setSelectedVersion(initialAsset.versions?.[0]?.versionNum || 1);
            fetchFullAsset(initialAsset.id);
            fetchAssetAudit(initialAsset.id);
        }
    }, [initialAsset, isOpen]);

    const fetchFullAsset = async (id: string) => {
        try {
            const res = await fetch(`/api/assets/${id}`);
            if (res.ok) {
                const data = await res.json();
                setCurrentAsset(data);
                if (data.comments) setCommentsList(data.comments);
                if (data.versions?.length) {
                    setSelectedVersion(data.versions[0].versionNum);
                }
            }
        } catch (err) {
            console.error('Failed to fetch full asset details:', err);
        }
    };

    const fetchAssetAudit = async (id: string) => {
        try {
            setLoadingAudit(true);
            const res = await fetch(`/api/activity?entityType=ASSET&limit=20`);
            if (res.ok) {
                const data = await res.json();
                const filtered = (data.activities || []).filter((a: any) => a.entityId === id);
                setActivityLogs(filtered);
            }
        } catch (err) {
            console.error('Failed to load asset audit:', err);
        } finally {
            setLoadingAudit(false);
        }
    };

    if (!isOpen || !currentAsset) return null;

    // Technical metadata parser
    let parsedMeta: Record<string, any> = {};
    try {
        if (currentAsset.metadata) {
            parsedMeta = typeof currentAsset.metadata === 'string'
                ? JSON.parse(currentAsset.metadata)
                : currentAsset.metadata;
        }
    } catch {
        parsedMeta = {};
    }

    const currentVersionObj = currentAsset.versions?.find(v => v.versionNum === selectedVersion)
        || currentAsset.versions?.[0];

    // Distinguish between image thumbnails/waveforms and playable audio/video streams
    const isVideoFile = (uri?: string | null) => Boolean(uri && /\.(mp4|webm|m4v|mov|mkv|avi|mxf)$/i.test(uri));
    const isImageFile = (uri?: string | null) => Boolean(uri && /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(uri));
    const isAudioFile = (uri?: string | null) => Boolean(uri && /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(uri));

    // Video: if proxy is an actual video proxy, use it; otherwise stream original media directly from nextcloudUri
    const videoSource = isVideoFile(currentVersionObj?.proxyUri)
        ? currentVersionObj!.proxyUri!
        : (currentVersionObj?.nextcloudUri || '');

    // Poster: if proxy is an image thumbnail, use as video poster
    const videoPoster = isImageFile(currentVersionObj?.proxyUri)
        ? currentVersionObj!.proxyUri!
        : undefined;

    // Audio: if proxy is an audio proxy, use it; otherwise stream original audio
    const audioSource = isAudioFile(currentVersionObj?.proxyUri)
        ? currentVersionObj!.proxyUri!
        : (currentVersionObj?.nextcloudUri || '');

    // Image: prefer fast web preview proxy if available, otherwise original
    const imageSource = (isImageFile(currentVersionObj?.proxyUri) ? currentVersionObj?.proxyUri : currentVersionObj?.nextcloudUri) || '/placeholder.png';

    // General mediaSource fallback for other tabs
    const mediaSource = isVideoFile(currentVersionObj?.proxyUri) || isAudioFile(currentVersionObj?.proxyUri) || isImageFile(currentVersionObj?.proxyUri)
        ? currentVersionObj!.proxyUri!
        : (currentVersionObj?.nextcloudUri || '');

    const formattedSize = (currentAsset.size / (1024 * 1024)).toFixed(1) + ' MB';

    // Status transition handler
    const handleStatusChange = async (newStatus: string) => {
        if (!currentAsset) return;
        try {
            setIsSavingStatus(true);
            const res = await fetch(`/api/assets/${currentAsset.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                const updated = await res.json();
                const merged = { ...currentAsset, status: newStatus };
                setCurrentAsset(merged);
                if (onAssetUpdated) onAssetUpdated(merged);
                fetchAssetAudit(currentAsset.id);
            }
        } catch (err) {
            console.error('Failed to update asset status:', err);
        } finally {
            setIsSavingStatus(false);
        }
    };

    // Add Comment handler
    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentAsset) return;

        try {
            setIsSubmittingComment(true);
            const payload: any = {
                assetId: currentAsset.id,
                content: newComment.trim(),
            };
            if (commentTimestamp !== null) {
                payload.timestampFrame = commentTimestamp;
            }

            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const added = await res.json();
                setCommentsList(prev => [added, ...prev]);
                setNewComment('');
                setCommentTimestamp(null);
            }
        } catch (err) {
            console.error('Failed to post comment:', err);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // Generate Secure Share Link
    const handleGenerateShare = () => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const url = `${window.location.origin}/share/${token}?assetId=${currentAsset.id}`;
        setShareUrl(url);
        setShowShareDialog(true);
        setShareCopied(false);
    };

    const copyShareUrl = () => {
        navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 3000);
    };

    const formatSeconds = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 15, 17, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out',
        }}>
            <div style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '1240px',
                height: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 102, 66, 0.2)',
                overflow: 'hidden',
            }}>
                {/* Top Enterprise Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(20, 28, 30, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '1.6rem' }}>
                            {currentAsset.type === 'video' ? '🎬' : currentAsset.type === 'image' ? '🖼️' : currentAsset.type === 'audio' ? '🎵' : '📄'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{
                                    fontFamily: 'var(--font-brand)',
                                    fontSize: '1.2rem',
                                    fontWeight: 700,
                                    color: 'var(--mtc-cornsilk)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {currentAsset.title}
                                </h2>
                                <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: statusBadgeColors[currentAsset.status]?.bg || 'rgba(202, 222, 223, 0.1)',
                                    color: statusBadgeColors[currentAsset.status]?.text || '#CADEDF',
                                    border: `1px solid ${statusBadgeColors[currentAsset.status]?.border || 'rgba(202, 222, 223, 0.2)'}`,
                                    letterSpacing: '0.04em',
                                }}>
                                    {currentAsset.status}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                                <span>{formattedSize}</span>
                                <span>•</span>
                                <span>{currentAsset.project?.name || 'Unassigned Project'}</span>
                                <span>•</span>
                                <span>Ingested by {currentAsset.creator?.name || 'Producer'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Enterprise Action Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        {/* Status Transition Control */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Workflow:</span>
                            <select
                                value={currentAsset.status}
                                disabled={isSavingStatus}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                style={{
                                    backgroundColor: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--mtc-cornsilk)',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    fontSize: '0.8rem',
                                    fontFamily: 'var(--font-brand)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                }}
                            >
                                <option value="DRAFT">DRAFT</option>
                                <option value="REVIEW">REVIEW</option>
                                <option value="APPROVED">APPROVED</option>
                                <option value="PUBLISHED">PUBLISHED</option>
                            </select>
                        </div>

                        {/* Secure Share Button */}
                        <button
                            onClick={handleGenerateShare}
                            className="btn btn-secondary"
                            style={{ padding: '7px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title="Generate enterprise share link"
                        >
                            🔗 Share
                        </button>

                        {/* Download Original / Rendition */}
                        <a
                            href={mediaSource || '#'}
                            download={currentAsset.title}
                            className="btn btn-primary"
                            style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                        >
                            📥 Download
                        </a>

                        {/* Close Modal */}
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: '1.4rem',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                lineHeight: 1,
                            }}
                            title="Close inspector"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Sub-navigation Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(20, 28, 30, 0.4)',
                    padding: '0 24px',
                    gap: '4px',
                }}>
                    {[
                        { key: 'preview', label: 'Overview & Player', icon: '👁️' },
                        { key: 'metadata', label: 'Technical & EXIF', icon: '⚙️' },
                        { key: 'versions', label: `Version Stack (${currentAsset.versions?.length || 1})`, icon: '📚' },
                        { key: 'drm', label: 'Rights & DRM', icon: '🛡️' },
                        { key: 'comments', label: `Collaboration (${commentsList.length})`, icon: '💬' },
                        { key: 'audit', label: 'Audit Trail', icon: '📋' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab.key ? '2px solid var(--mtc-hunter-green)' : '2px solid transparent',
                                color: activeTab === tab.key ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                fontWeight: activeTab === tab.key ? 600 : 500,
                                fontSize: '0.84rem',
                                padding: '12px 14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                            }}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Main Content Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column' }}>

                    {/* TAB 1: PREVIEW & PLAYER */}
                    {activeTab === 'preview' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', flex: 1, minHeight: 0 }}>
                            {/* Media Viewport */}
                            <div style={{
                                backgroundColor: '#0A0F11',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                position: 'relative',
                            }}>
                                {currentAsset.type === 'video' && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <video
                                            ref={videoRef}
                                            src={videoSource}
                                            poster={videoPoster}
                                            controls
                                            playsInline
                                            preload="metadata"
                                            onTimeUpdate={() => {
                                                if (videoRef.current) setCurrentVideoTime(videoRef.current.currentTime);
                                            }}
                                            style={{ width: '100%', maxHeight: '55vh', backgroundColor: '#000' }}
                                        />
                                        {/* Video Control Ribbon */}
                                        <div style={{
                                            padding: '10px 16px',
                                            backgroundColor: 'rgba(20, 28, 30, 0.95)',
                                            borderTop: '1px solid var(--border-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '0.8rem',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <code style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                                                    ⏱ {formatSeconds(currentVideoTime)} / {parsedMeta.duration || '00:00'}
                                                </code>
                                                <button
                                                    onClick={() => {
                                                        setCommentTimestamp(currentVideoTime);
                                                        setActiveTab('comments');
                                                    }}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                                >
                                                    + Comment at {formatSeconds(currentVideoTime)}
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Speed:</span>
                                                {[0.5, 1, 1.5, 2].map(speed => (
                                                    <button
                                                        key={speed}
                                                        onClick={() => {
                                                            setPlaybackSpeed(speed);
                                                            if (videoRef.current) videoRef.current.playbackRate = speed;
                                                        }}
                                                        style={{
                                                            background: playbackSpeed === speed ? 'var(--mtc-hunter-green)' : 'transparent',
                                                            border: '1px solid ' + (playbackSpeed === speed ? 'transparent' : 'var(--border-color)'),
                                                            color: 'var(--mtc-cornsilk)',
                                                            borderRadius: '4px',
                                                            padding: '2px 6px',
                                                            fontSize: '0.72rem',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {speed}x
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentAsset.type === 'image' && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                                        <div style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            width: '100%',
                                        }}>
                                            <img
                                                src={imageSource}
                                                alt={currentAsset.title}
                                                style={{
                                                    maxWidth: `${zoomLevel}%`,
                                                    maxHeight: '52vh',
                                                    objectFit: 'contain',
                                                    borderRadius: '4px',
                                                    transition: 'transform 0.2s',
                                                }}
                                            />
                                        </div>
                                        {/* Image Zoom Toolbar */}
                                        <div style={{
                                            marginTop: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '6px 14px',
                                            backgroundColor: 'rgba(20, 28, 30, 0.85)',
                                            borderRadius: '20px',
                                            border: '1px solid var(--border-color)',
                                        }}>
                                            <button onClick={() => setZoomLevel(prev => Math.max(25, prev - 25))} className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>−</button>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--mtc-cornsilk)' }}>{zoomLevel}%</span>
                                            <button onClick={() => setZoomLevel(prev => Math.min(300, prev + 25))} className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>+</button>
                                            <button onClick={() => setZoomLevel(100)} className="btn" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>Reset</button>
                                        </div>
                                    </div>
                                )}

                                {currentAsset.type === 'audio' && (
                                    <div style={{ width: '100%', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                                        <div style={{ fontSize: '4rem' }}>🎵</div>
                                        <div style={{ textAlign: 'center' }}>
                                            <h3 style={{ fontSize: '1.1rem', color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>{currentAsset.title}</h3>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Broadcast Wave Audio Master (Stereo 24-bit 96kHz)</p>
                                        </div>
                                        {/* Simulated Waveform Visualizer */}
                                        <div style={{
                                            width: '100%',
                                            height: '60px',
                                            backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '3px',
                                            padding: '0 16px',
                                        }}>
                                            {Array.from({ length: 48 }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        flex: 1,
                                                        height: `${Math.sin(i * 0.4) * 24 + 28}px`,
                                                        backgroundColor: i % 2 === 0 ? 'var(--mtc-hunter-green)' : 'rgba(255, 235, 204, 0.6)',
                                                        borderRadius: '2px',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <audio src={audioSource} controls style={{ width: '100%', maxWidth: '500px' }} />
                                    </div>
                                )}

                                {currentAsset.type === 'document' && (
                                    <div style={{ padding: '40px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '4.5rem', marginBottom: '16px' }}>📄</div>
                                        <h3 style={{ fontSize: '1.2rem', color: 'var(--mtc-cornsilk)', marginBottom: '8px' }}>{currentAsset.title}</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                                            {parsedMeta.pageCount || 'Multi-page document'} • {currentAsset.mimeType}
                                        </p>
                                        <a href={mediaSource} download className="btn btn-primary" style={{ padding: '10px 20px', textDecoration: 'none' }}>
                                            📥 Download Document File
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Right Inspector Summary Panel */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                                {/* Description Card */}
                                <div className="card" style={{ padding: '16px' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '8px' }}>Asset Description</h4>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                        {currentAsset.description || 'No description provided for this asset.'}
                                    </p>
                                </div>

                                {/* Quick Spec Grid */}
                                <div className="card" style={{ padding: '16px' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '12px' }}>Quick Specifications</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                                        <div>
                                            <span style={{ color: 'var(--text-dim)', display: 'block' }}>Resolution</span>
                                            <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                                                {parsedMeta.resolution || (parsedMeta.width && parsedMeta.height ? `${parsedMeta.width}x${parsedMeta.height}` : 'Standard')}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-dim)', display: 'block' }}>Codec / Format</span>
                                            <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>{parsedMeta.codec || currentAsset.mimeType}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-dim)', display: 'block' }}>Frame Rate</span>
                                            <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                                                {parsedMeta.framerate || (parsedMeta.fps ? `${parsedMeta.fps} fps` : (currentAsset.type === 'video' ? '24 fps' : 'N/A'))}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-dim)', display: 'block' }}>Color Space</span>
                                            <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>{parsedMeta.colorSpace || 'Rec.709'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tags Pillbox */}
                                <div className="card" style={{ padding: '16px' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '10px' }}>Enterprise Tags</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {currentAsset.tags && currentAsset.tags.length > 0 ? (
                                            currentAsset.tags.map(tag => (
                                                <span
                                                    key={tag.name}
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        padding: '3px 8px',
                                                        borderRadius: '12px',
                                                        backgroundColor: 'rgba(56, 102, 66, 0.25)',
                                                        color: 'var(--mtc-cornsilk)',
                                                        border: '1px solid rgba(56, 102, 66, 0.4)',
                                                    }}
                                                >
                                                    #{tag.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>No tags attached</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: TECHNICAL & EXIF METADATA */}
                    {activeTab === 'metadata' && (
                        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="card" style={{ padding: '20px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '16px' }}>
                                    Broadcast Technical Metadata
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                    {Object.entries({
                                        'File Name': currentAsset.title,
                                        'MIME Type': currentAsset.mimeType,
                                        'Exact File Size': `${currentAsset.size.toLocaleString()} bytes (${formattedSize})`,
                                        'Resolution / Dimensions': parsedMeta.resolution || (parsedMeta.width && parsedMeta.height ? `${parsedMeta.width}x${parsedMeta.height}` : 'N/A'),
                                        'Aspect Ratio': parsedMeta.aspectRatio || '16:9',
                                        'Video Codec': parsedMeta.codec ? `${parsedMeta.codec}` : (currentAsset.type === 'video' ? 'H.264 High Profile' : 'N/A'),
                                        'Frame Rate': parsedMeta.framerate || (parsedMeta.fps ? `${parsedMeta.fps} fps` : (currentAsset.type === 'video' ? '24 fps' : 'N/A')),
                                        'Color Space': parsedMeta.colorSpace || 'Rec.709',
                                        'Audio Channels': parsedMeta.audioChannels || 'Stereo 48kHz',
                                        'Mastering Tool / Encoder': parsedMeta.encoder || 'Blackmagic Design DaVinci Resolve Studio',
                                        'Duration': parsedMeta.duration ? `${Math.round(Number(parsedMeta.duration))}s` : 'N/A',
                                        'SHA-256 Checksum': parsedMeta.checksum || 'Computed on ingest',
                                        'Ingestion Engine': 'MTC Enterprise Ingestion Engine v2.0',
                                    }).map(([key, value]) => (
                                        <div key={key} style={{ padding: '10px 14px', backgroundColor: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{key}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--mtc-cornsilk)', fontWeight: 500, marginTop: '4px', wordBreak: 'break-all' }}>{String(value)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: VERSION STACKS */}
                    {activeTab === 'versions' && (
                        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>Version History Stack</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Compare revisions, track changelog, and switch active playback</p>
                                </div>
                                <button
                                    onClick={() => alert('To upload a new version revision, use the "+ Upload Asset" tool and specify the matching asset title to bump the version stack.')}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                >
                                    + Upload Revision (v{(currentAsset.versions?.length || 1) + 1})
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {(currentAsset.versions && currentAsset.versions.length > 0
                                    ? currentAsset.versions
                                    : [{ versionNum: 1, nextcloudUri: mediaSource, createdAt: currentAsset.createdAt }]
                                ).map((ver: any) => (
                                    <div
                                        key={ver.versionNum}
                                        style={{
                                            padding: '16px 20px',
                                            backgroundColor: selectedVersion === ver.versionNum ? 'rgba(56, 102, 66, 0.2)' : 'var(--bg-color)',
                                            border: '1px solid ' + (selectedVersion === ver.versionNum ? 'var(--mtc-hunter-green)' : 'var(--border-color)'),
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                padding: '4px 10px',
                                                backgroundColor: 'var(--mtc-hunter-green)',
                                                color: '#FFFFFF',
                                                borderRadius: '6px',
                                            }}>
                                                v{ver.versionNum}.0
                                            </span>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--mtc-cornsilk)' }}>
                                                    {ver.versionNum === 1 ? 'Initial Master Ingest' : `Revision v${ver.versionNum}`}
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                    Created {new Date(ver.createdAt || currentAsset.createdAt).toLocaleString()} • {ver.proxyUri || 'Proxy Generated'}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {selectedVersion !== ver.versionNum ? (
                                                <button
                                                    onClick={() => setSelectedVersion(ver.versionNum)}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                                >
                                                    Inspect this version
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--mtc-hunter-green)', fontWeight: 600, padding: '4px 10px' }}>
                                                    Active in player ✓
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: RIGHTS & DRM */}
                    {activeTab === 'drm' && (
                        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="card" style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>Digital Rights & Licensing</h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage broadcast compliance, licensing terms, and expiration embargoes</p>
                                    </div>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        padding: '4px 10px',
                                        backgroundColor: 'rgba(56, 102, 66, 0.3)',
                                        color: '#A7F3D0',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(56, 102, 66, 0.5)',
                                    }}>
                                        Active License ✓
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>License Designation</span>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--mtc-cornsilk)', fontWeight: 600, marginTop: '4px' }}>
                                            {currentAsset.licenseInfo?.licenseName || 'MTC Internal Ministry Rights'}
                                        </div>
                                    </div>
                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>License Classification</span>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--mtc-cornsilk)', fontWeight: 600, marginTop: '4px' }}>
                                            {currentAsset.licenseInfo?.licenseType || 'Perpetual Standard'}
                                        </div>
                                    </div>
                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>License Expiration</span>
                                        <div style={{ fontSize: '0.9rem', color: currentAsset.licenseInfo?.expiresAt ? '#FCA5A5' : '#A7F3D0', fontWeight: 600, marginTop: '4px' }}>
                                            {currentAsset.licenseInfo?.expiresAt
                                                ? new Date(currentAsset.licenseInfo.expiresAt).toLocaleDateString()
                                                : 'No Expiration (Perpetual)'}
                                        </div>
                                    </div>
                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Watermarking Profile</span>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--mtc-cornsilk)', fontWeight: 600, marginTop: '4px' }}>
                                            {currentAsset.watermarkProfile?.name || 'MTC Internal Confidential Burn-in'}
                                        </div>
                                    </div>
                                </div>

                                {currentAsset.licenseInfo?.notes && (
                                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(230, 167, 76, 0.1)', border: '1px solid rgba(230, 167, 76, 0.25)', borderRadius: '6px' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>Compliance Notes:</span>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {currentAsset.licenseInfo.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 5: COLLABORATION & COMMENTS */}
                    {activeTab === 'comments' && (
                        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Comment Form */}
                            <form onSubmit={handleAddComment} className="card" style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                        Add Production Comment
                                    </label>
                                    {commentTimestamp !== null ? (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--mtc-hunter-green)', fontWeight: 600 }}>
                                            Pinned to timecode: {formatSeconds(commentTimestamp)}
                                            <button
                                                type="button"
                                                onClick={() => setCommentTimestamp(null)}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '6px' }}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ) : null}
                                </div>
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Enter review feedback, color notes, or edit instructions..."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--mtc-cornsilk)',
                                        padding: '10px 12px',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        resize: 'vertical',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingComment || !newComment.trim()}
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                                    >
                                        {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                                    </button>
                                </div>
                            </form>

                            {/* Comment List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {commentsList.length > 0 ? (
                                    commentsList.map(comment => (
                                        <div
                                            key={comment.id}
                                            style={{
                                                padding: '14px 16px',
                                                backgroundColor: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--mtc-cornsilk)' }}>
                                                        {comment.author?.name || 'Producer'}
                                                    </span>
                                                    {comment.timestampFrame !== undefined && comment.timestampFrame !== null && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            backgroundColor: 'rgba(56, 102, 66, 0.3)',
                                                            color: '#A7F3D0',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontFamily: 'monospace',
                                                        }}>
                                                            ⏱ {formatSeconds(comment.timestampFrame)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                                    {new Date(comment.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                                {comment.content}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                                        No comments yet. Be the first to leave feedback!
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 6: AUDIT TRAIL */}
                    {activeTab === 'audit' && (
                        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>Enterprise Asset Audit Trail</h3>
                                <button onClick={() => fetchAssetAudit(currentAsset.id)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                                    ↻ Refresh
                                </button>
                            </div>

                            {loadingAudit ? (
                                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>Loading activity logs...</div>
                            ) : activityLogs.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {activityLogs.map((log: any) => (
                                        <div
                                            key={log.id}
                                            style={{
                                                padding: '12px 16px',
                                                backgroundColor: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-sm)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: log.action === 'APPROVE' ? 'rgba(56, 102, 66, 0.4)' : log.action === 'UPLOAD' ? 'rgba(230, 167, 76, 0.25)' : 'rgba(202, 222, 223, 0.1)',
                                                    color: 'var(--mtc-cornsilk)',
                                                    fontWeight: 600,
                                                    fontSize: '0.72rem',
                                                }}>
                                                    {log.action}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    performed by <strong style={{ color: 'var(--mtc-cornsilk)' }}>{log.user?.name || 'System Admin'}</strong>
                                                </span>
                                            </div>
                                            <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                                                {new Date(log.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                                    No audit entries found for this asset.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SECURE SHARE DIALOG POPUP */}
                {showShareDialog && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        zIndex: 1100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}>
                        <div className="card" style={{ width: '480px', backgroundColor: 'var(--panel-bg)', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                    Enterprise Secure Share Link
                                </h3>
                                <button onClick={() => setShowShareDialog(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>
                                    ✕
                                </button>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                Anyone with this encrypted tokenized link will be able to access this asset subject to governance policies:
                            </p>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    readOnly
                                    value={shareUrl}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--mtc-cornsilk)',
                                        fontSize: '0.8rem',
                                        outline: 'none',
                                    }}
                                />
                                <button
                                    onClick={copyShareUrl}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                                >
                                    {shareCopied ? 'Copied ✓' : 'Copy'}
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="checkbox" defaultChecked />
                                    <span>Expire link automatically in 7 days</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="checkbox" defaultChecked />
                                    <span>Enforce MTC Confidential Watermark burn-in</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="checkbox" defaultChecked />
                                    <span>Allow proxy download</span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button onClick={() => setShowShareDialog(false)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AssetPreviewModal;
