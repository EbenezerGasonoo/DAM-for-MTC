'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export interface ViewAssetsDestinationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenNextcloudViewer: () => void;
    nextcloudUrl?: string;
    totalAssetsCount?: number;
}

export function ViewAssetsDestinationModal({
    isOpen,
    onClose,
    onOpenNextcloudViewer,
    nextcloudUrl = 'https://nextcloud.mtc-network.space/',
    totalAssetsCount,
}: ViewAssetsDestinationModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const handleGoToDam = () => {
        onClose();
        router.push('/assets');
    };

    const handleOpenNextcloudInDam = () => {
        onClose();
        onOpenNextcloudViewer();
    };

    const cleanNextcloudWebUrl = () => {
        let base = (nextcloudUrl || 'https://nextcloud.mtc-network.space/').trim().replace(/\/+$/, '');
        // If pointing to remote.php or webdav, strip back to root
        base = base.replace(/\/remote\.php.*$/, '');
        return `${base}/apps/files/`;
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(5, 10, 12, 0.85)',
                backdropFilter: 'blur(10px)',
                zIndex: 9998,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    backgroundColor: 'var(--panel-bg, #1D2729)',
                    border: '1.5px solid var(--border-color, rgba(202, 222, 223, 0.2))',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '820px',
                    overflow: 'hidden',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 40px rgba(56, 102, 66, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* MODAL HEADER */}
                <div
                    style={{
                        padding: '22px 28px',
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
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(56, 102, 66, 0.35)',
                                border: '1px solid rgba(167, 243, 208, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.3rem',
                            }}
                        >
                            🗂️
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', margin: 0 }}>
                                Where would you like to view assets?
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                                Choose to view ingested media in the DAM Production Library or browse files directly on Nextcloud
                                {totalAssetsCount ? ` (${totalAssetsCount.toLocaleString()} items total)` : ''}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            lineHeight: 1,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* DESTINATION OPTIONS GRID */}
                <div
                    style={{
                        padding: '28px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
                        gap: '20px',
                        backgroundColor: 'rgba(10, 15, 17, 0.3)',
                    }}
                >
                    {/* OPTION 1: DAM ASSET LIBRARY */}
                    <div
                        style={{
                            backgroundColor: 'rgba(29, 39, 41, 0.85)',
                            border: '1.5px solid rgba(56, 102, 66, 0.5)',
                            borderRadius: '16px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '20px',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(56, 102, 66, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(56, 102, 66, 0.5)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div>
                            {/* Card Top Icon & Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <div
                                    style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(56, 102, 66, 0.4)',
                                        border: '1px solid rgba(167, 243, 208, 0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                    }}
                                >
                                    🎬
                                </div>
                                <span
                                    style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        backgroundColor: 'rgba(56, 102, 66, 0.35)',
                                        color: '#A7F3D0',
                                        border: '1px solid rgba(167, 243, 208, 0.3)',
                                        borderRadius: '20px',
                                        padding: '3px 10px',
                                    }}
                                >
                                    DAM Studio
                                </span>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '8px' }}>
                                View in DAM Asset Library
                            </h3>

                            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                                Access production assets catalog with studio playback, search filters, and workflow tools:
                            </p>

                            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--mtc-cornsilk)', display: 'flex', flexDirection: 'column', gap: '6px', opacity: 0.9 }}>
                                <li>✨ Full-featured video player with timecode & speed control</li>
                                <li>🎙️ AI speech-to-text transcripts & dialogue jump markers</li>
                                <li>🏷️ Metadata, EXIF specs, rights & version rollback stack</li>
                                <li>📦 Multi-select batch tagging, moves, and delete workflows</li>
                            </ul>
                        </div>

                        <button
                            onClick={handleGoToDam}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '12px 18px',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                borderRadius: '10px',
                            }}
                        >
                            <span>Open DAM Library</span>
                            <span>→</span>
                        </button>
                    </div>

                    {/* OPTION 2: NEXTCLOUD FILES */}
                    <div
                        style={{
                            backgroundColor: 'rgba(29, 39, 41, 0.85)',
                            border: '1.5px solid rgba(202, 222, 223, 0.25)',
                            borderRadius: '16px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '20px',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(202, 222, 223, 0.6)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(202, 222, 223, 0.25)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div>
                            {/* Card Top Icon & Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <div
                                    style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(202, 222, 223, 0.12)',
                                        border: '1px solid rgba(202, 222, 223, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                    }}
                                >
                                    📁
                                </div>
                                <span
                                    style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        backgroundColor: 'rgba(202, 222, 223, 0.12)',
                                        color: '#CADEDF',
                                        border: '1px solid rgba(202, 222, 223, 0.25)',
                                        borderRadius: '20px',
                                        padding: '3px 10px',
                                    }}
                                >
                                    Nextcloud Storage
                                </span>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '8px' }}>
                                View on Nextcloud (Files)
                            </h3>

                            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                                Browse raw directory trees, camera folders, and cloud storage volumes directly:
                            </p>

                            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--mtc-cornsilk)', display: 'flex', flexDirection: 'column', gap: '6px', opacity: 0.9 }}>
                                <li>📂 Explore full directory hierarchy (<code style={{ color: '#A7F3D0' }}>/MTC Online</code>, camera cards)</li>
                                <li>📥 Check which raw files are already in DAM vs new</li>
                                <li>⚡ Selectively import specific videos or entire folders</li>
                                <li>🌐 Direct access to the live Nextcloud Files web workspace</li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={handleOpenNextcloudInDam}
                                className="btn btn-secondary"
                                style={{
                                    width: '100%',
                                    padding: '10px 18px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(56, 102, 66, 0.35)',
                                    borderColor: 'rgba(167, 243, 208, 0.4)',
                                    color: '#FFEBCC',
                                }}
                            >
                                <span>📂 Browse Nextcloud in DAM</span>
                            </button>

                            <a
                                href={cleanNextcloudWebUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    textDecoration: 'none',
                                    width: '100%',
                                    padding: '8px 18px',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    borderRadius: '8px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid rgba(202, 222, 223, 0.12)',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--mtc-cornsilk)';
                                    e.currentTarget.style.borderColor = 'rgba(202, 222, 223, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--text-muted)';
                                    e.currentTarget.style.borderColor = 'rgba(202, 222, 223, 0.12)';
                                }}
                            >
                                <span>Open Nextcloud Web Workspace</span>
                                <span>↗</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* MODAL FOOTER */}
                <div
                    style={{
                        padding: '14px 28px',
                        borderTop: '1px solid var(--border-color)',
                        backgroundColor: 'rgba(20, 28, 30, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                    }}
                >
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.82rem', padding: '6px 16px' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
