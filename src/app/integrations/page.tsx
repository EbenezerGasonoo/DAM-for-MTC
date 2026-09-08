'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function IntegrationsPage() {
    const { user } = useAuth();
    const [nleToken, setNleToken] = useState<string>('');
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);
    const [copiedScript, setCopiedScript] = useState<string | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);

    // Auto-load token from localStorage if available
    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('mtc_dam_nle_token');
            if (saved) setNleToken(saved);
        } catch { }
    }, []);

    const handleGenerateToken = async () => {
        setIsGeneratingToken(true);
        setTokenError(null);
        try {
            const res = await fetch('/api/nle/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', userId: user?.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.token) {
                setNleToken(data.token);
                try {
                    localStorage.setItem('mtc_dam_nle_token', data.token);
                } catch { }
            } else {
                setTokenError(data.error || `Server returned error (${res.status})`);
            }
        } catch (err: any) {
            console.error('Failed to generate NLE token:', err);
            setTokenError(err?.message || 'Network error while generating token.');
        } finally {
            setIsGeneratingToken(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        if (id === 'token') {
            setCopiedToken(true);
            setTimeout(() => setCopiedToken(false), 2000);
        } else {
            setCopiedScript(id);
            setTimeout(() => setCopiedScript(null), 2000);
        }
    };

    return (
        <Sidebar>
            <Header
                title="NLE Workflow Integrations"
                subtitle="Connect Adobe Premiere Pro & Blackmagic DaVinci Resolve directly into MTC DAM"
            />
            <div className="content-area" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.8rem' }}>🎬</span>
                    <h1 style={{ fontFamily: 'var(--font-brand)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--mtc-cornsilk)' }}>
                        NLE Workflow Integrations
                    </h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '800px' }}>
                    Connect MTC DAM directly into your broadcast editing suite. Search, preview, and drag broadcast media masters directly onto your active timeline inside <strong>Adobe Premiere Pro</strong> and <strong>Blackmagic DaVinci Resolve</strong>.
                </p>
            </div>

            {/* Quick Launch Banner */}
            <div style={{
                padding: '20px 24px',
                backgroundColor: 'rgba(56, 102, 66, 0.15)',
                border: '1px solid rgba(56, 102, 66, 0.4)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                        ⚡ Live In-Browser NLE Dock Panel
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                        Test or use the compact NLE panel in a secondary monitor window or side browser view.
                    </p>
                </div>
                <a
                    href={nleToken ? `/integrations/nle?token=${encodeURIComponent(nleToken)}` : '/integrations/nle'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '9px 20px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    Launch Compact NLE Panel ↗
                </a>
            </div>

            {/* Personal NLE Token Card */}
            <div style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                marginBottom: '36px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                            🔑 Personal NLE Access Token
                        </h2>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Paste this key into the Premiere Pro or DaVinci Resolve settings modal to stay persistently logged in.
                        </p>
                    </div>
                    <button
                        onClick={handleGenerateToken}
                        disabled={isGeneratingToken}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.84rem', minWidth: '140px' }}
                    >
                        {isGeneratingToken ? 'Generating...' : nleToken ? 'Regenerate Token' : 'Generate Token'}
                    </button>
                </div>

                {tokenError && (
                    <div style={{
                        padding: '10px 14px',
                        marginBottom: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        color: '#FCA5A5'
                    }}>
                        ⚠️ {tokenError}
                    </div>
                )}

                {nleToken ? (
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            backgroundColor: 'var(--bg-color)',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            marginBottom: '10px'
                        }}>
                            <input
                                type="text"
                                readOnly
                                value={nleToken}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--mtc-cornsilk)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.82rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={() => copyToClipboard(nleToken, 'token')}
                                className="btn btn-secondary"
                                style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                            >
                                {copiedToken ? '✓ Copied!' : 'Copy Token'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.78rem', color: '#86EFAC' }}>
                                ✓ Active Key Ready
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>•</span>
                            <a
                                href={`/integrations/nle?token=${encodeURIComponent(nleToken)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '0.78rem', color: 'var(--mtc-cornsilk)', textDecoration: 'underline' }}
                            >
                                Open NLE Panel with this Token ↗
                            </a>
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        No token generated yet. Click &quot;Generate Token&quot; to create your personal key.
                    </div>
                )}
            </div>

            {/* Two Column Grid: Premiere Pro & DaVinci Resolve */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))', gap: '24px' }}>
                
                {/* 1. ADOBE PREMIERE PRO CARD */}
                <div style={{
                    backgroundColor: 'var(--panel-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                backgroundColor: '#9999FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '1.2rem',
                                color: '#00005B'
                            }}>
                                Pr
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                    Adobe Premiere Pro
                                </h3>
                                <span style={{ fontSize: '0.74rem', color: '#A7F3D0', fontWeight: 600 }}>
                                    CEP Panel Extension (Premiere 2020 – 2026+)
                                </span>
                            </div>
                        </div>

                        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                            Docks natively as a side panel next to your Project Bin. Allows 1-click import into dedicated project bins and direct placement onto active sequence timelines.
                        </p>

                        {/* Setup Steps */}
                        <div style={{ backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '10px' }}>
                                Installation Instructions:
                            </h4>
                            <ol style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <li>Download the <strong>MTC Premiere CEP Extension</strong> package.</li>
                                <li>Run the included <code>install_windows.bat</code> (or <code>install_mac.sh</code>).</li>
                                <li>Open Adobe Premiere Pro -&gt; <code>Window -&gt; Extensions -&gt; MTC DAM Media Hub</code>.</li>
                            </ol>
                        </div>
                    </div>

                    {/* Download & Links */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <a
                            href="/extensions/MTC_Premiere_Extension.zip"
                            download="MTC_Premiere_Extension.zip"
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '10px 14px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            📦 Download Full Premiere Extension (.zip)
                        </a>
                        <a
                            href="/extensions/premiere/install_windows.bat"
                            download="MTC_Premiere_Installer.bat"
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            ⬇ Windows Script (.bat)
                        </a>
                        <a
                            href="/extensions/premiere/install_mac.sh"
                            download="MTC_Premiere_Installer.sh"
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            ⬇ Mac Script (.sh)
                        </a>
                    </div>
                </div>

                {/* 2. BLACKMAGIC DAVINCI RESOLVE CARD */}
                <div style={{
                    backgroundColor: 'var(--panel-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                backgroundColor: '#D4A373',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '1.2rem',
                                color: '#141C1E'
                            }}>
                                Da
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                    Blackmagic DaVinci Resolve
                                </h3>
                                <span style={{ fontSize: '0.74rem', color: '#D4A373', fontWeight: 600 }}>
                                    Workflow Plugin &amp; MediaPool API (Resolve 17 – 19+)
                                </span>
                            </div>
                        </div>

                        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                            Works across both DaVinci Resolve Free and Studio. Automatically imports media files into an organized <em>&quot;MTC DAM Assets&quot;</em> bin in your active Media Pool.
                        </p>

                        {/* Setup Steps */}
                        <div style={{ backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '10px' }}>
                                Installation Instructions:
                            </h4>
                            <ol style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <li>Download the <strong>MTC DaVinci Resolve Package</strong> (or standalone installer).</li>
                                <li>Run <code>install_windows.bat</code> (or <code>install_mac.sh</code>).</li>
                                <li>Studio: <code>Workspace -&gt; Workflow Integrations -&gt; MTC DAM Media Hub</code>.</li>
                                <li>Free/Studio Script: <code>Workspace -&gt; Scripts -&gt; MTC_DAM_Importer</code>.</li>
                            </ol>
                        </div>
                    </div>

                    {/* Download & Links */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <a
                            href="/extensions/MTC_Resolve_Integration.zip"
                            download="MTC_Resolve_Integration.zip"
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '10px 14px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            📦 Download Full DaVinci Package (.zip)
                        </a>
                        <a
                            href="/extensions/resolve/install_windows.bat"
                            download="MTC_Resolve_Installer.bat"
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            ⬇ Windows Script (.bat)
                        </a>
                        <a
                            href="/extensions/resolve/install_mac.sh"
                            download="MTC_Resolve_Installer.sh"
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            ⬇ Mac Script (.sh)
                        </a>
                    </div>
                </div>

            </div>
        </div>
    </Sidebar>
    );
}
