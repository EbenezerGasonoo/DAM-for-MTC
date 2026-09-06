'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useBranding } from '@/components/BrandingContext';
import MtcLogo, { MtcLogoIcon } from '@/components/MtcLogo';

interface ActivityItem {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
    user?: { id: string; name: string; email: string };
}

const rbacMatrix = [
    { permission: 'Ingest Media & Stems', admin: true, producer: true, editor: true, viewer: false },
    { permission: 'Edit Technical Metadata & Tags', admin: true, producer: true, editor: true, viewer: false },
    { permission: 'Approve / Reject Workflow Stages', admin: true, producer: true, editor: false, viewer: false },
    { permission: 'Publish to Broadcast Channels', admin: true, producer: true, editor: false, viewer: false },
    { permission: 'Create Production Workspaces', admin: true, producer: true, editor: false, viewer: false },
    { permission: 'Export High-Res Master Masters (ZIP)', admin: true, producer: true, editor: true, viewer: false },
    { permission: 'Stream 1080p Proxy Media', admin: true, producer: true, editor: true, viewer: true },
    { permission: 'Configure DRM & Watermark Profiles', admin: true, producer: false, editor: false, viewer: false },
    { permission: 'View Enterprise System Audit Logs', admin: true, producer: false, editor: false, viewer: false },
    { permission: 'Delete Assets & Rollback Versions', admin: true, producer: false, editor: false, viewer: false },
];

export default function SettingsPage() {
    const { colors, updateColor, saveColors, resetToDefaults, hasUnsavedChanges } = useBranding();
    const [activeTab, setActiveTab] = useState<'brand' | 'rbac' | 'watermark' | 'audit' | 'nextcloud'>('brand');

    // Audit log state
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [auditSearch, setAuditSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');

    // Nextcloud Server State
    const [ncUrl, setNcUrl] = useState('https://nextcloud.mtc-network.space/');
    const [ncUsername, setNcUsername] = useState('');
    const [ncPassword, setNcPassword] = useState('');
    const [ncRootFolder, setNcRootFolder] = useState('/mtc-dam-uploads');
    const [ncStatus, setNcStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CHECKING'>('CHECKING');
    const [ncQuota, setNcQuota] = useState<{ used: number; available: number } | null>(null);
    const [ncWebdavUrl, setNcWebdavUrl] = useState('');
    const [ncHasPassword, setNcHasPassword] = useState(false);
    const [ncTesting, setNcTesting] = useState(false);
    const [ncSaving, setNcSaving] = useState(false);
    const [ncFeedback, setNcFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Watermark Profile state
    const [watermarkName, setWatermarkName] = useState('MTC Internal Confidential Burn-in');
    const [watermarkTemplate, setWatermarkTemplate] = useState('CONFIDENTIAL — MTC BROADCAST PIPELINE — {USER}');
    const [watermarkSaved, setWatermarkSaved] = useState(false);

    const applyOfficialMtc = () => {
        updateColor('primary', '#386642');
        updateColor('secondary', '#CADEDF');
        updateColor('accent', '#FFEBCC');
        updateColor('danger', '#EF4444');
        updateColor('background', '#141C1E');
        updateColor('surface', '#1D2729');
        updateColor('text', '#FFEBCC');
        updateColor('textMuted', '#CADEDF');
        updateColor('border', 'rgba(202, 222, 223, 0.18)');
    };

    const fetchAuditLogs = async () => {
        try {
            setLoadingAudit(true);
            const res = await fetch('/api/activity?limit=100');
            if (res.ok) {
                const data = await res.json();
                setActivities(data.activities || []);
            }
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoadingAudit(false);
        }
    };

    const fetchNextcloudSettings = async () => {
        try {
            setNcStatus('CHECKING');
            const res = await fetch('/api/settings/nextcloud');
            if (res.ok) {
                const data = await res.json();
                if (data.url) setNcUrl(data.url);
                if (data.username) setNcUsername(data.username);
                if (data.rootFolder) setNcRootFolder(data.rootFolder);
                if (data.webdavUrl) setNcWebdavUrl(data.webdavUrl);
                setNcHasPassword(Boolean(data.hasPassword));
                setNcStatus(data.connectionStatus || 'DISCONNECTED');
                setNcQuota(data.quota || null);
            } else {
                setNcStatus('DISCONNECTED');
            }
        } catch {
            setNcStatus('DISCONNECTED');
        }
    };

    const handleTestNextcloud = async () => {
        setNcTesting(true);
        setNcFeedback(null);
        try {
            const res = await fetch('/api/settings/nextcloud/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: ncUrl,
                    username: ncUsername,
                    password: ncPassword || (ncHasPassword ? '••••••••' : ''),
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setNcStatus('CONNECTED');
                if (data.quota) setNcQuota(data.quota);
                setNcFeedback({ type: 'success', message: 'Connection successful! WebDAV verified and ready.' });
            } else {
                setNcStatus('DISCONNECTED');
                setNcFeedback({ type: 'error', message: data.error || 'Connection failed. Please check credentials.' });
            }
        } catch (err: any) {
            setNcStatus('DISCONNECTED');
            setNcFeedback({ type: 'error', message: err?.message || 'Network error while testing connection.' });
        } finally {
            setNcTesting(false);
        }
    };

    const handleSaveNextcloud = async (e: React.FormEvent) => {
        e.preventDefault();
        setNcSaving(true);
        setNcFeedback(null);
        try {
            const res = await fetch('/api/settings/nextcloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: ncUrl,
                    username: ncUsername,
                    password: ncPassword,
                    rootFolder: ncRootFolder,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setNcStatus(data.connectionStatus);
                if (data.quota) setNcQuota(data.quota);
                if (ncPassword) setNcHasPassword(true);
                setNcPassword('');
                setNcFeedback({ type: 'success', message: data.message || 'Nextcloud settings saved successfully!' });
            } else {
                setNcFeedback({ type: 'error', message: data.error || 'Failed to save Nextcloud settings.' });
            }
        } catch (err: any) {
            setNcFeedback({ type: 'error', message: err?.message || 'Failed to save settings.' });
        } finally {
            setNcSaving(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'audit') {
            fetchAuditLogs();
        } else if (activeTab === 'nextcloud') {
            fetchNextcloudSettings();
        }
    }, [activeTab]);

    const filteredActivities = activities.filter(a => {
        const matchesAction = actionFilter === 'ALL' || a.action === actionFilter;
        const matchesSearch = !auditSearch ||
            a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
            a.entityType.toLowerCase().includes(auditSearch.toLowerCase()) ||
            (a.user?.name && a.user.name.toLowerCase().includes(auditSearch.toLowerCase())) ||
            (a.details && a.details.toLowerCase().includes(auditSearch.toLowerCase()));
        return matchesAction && matchesSearch;
    });

    return (
        <Sidebar>
            <Header title="Settings & Governance" subtitle="System configuration, enterprise RBAC, and MTC brand identity" />

            <div className="content-area" style={{ maxWidth: '1080px' }}>
                {/* Settings Navigation Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '24px',
                    gap: '6px',
                }}>
                    {[
                        { key: 'brand', label: 'Brand & Visual Identity', icon: '🎨' },
                        { key: 'nextcloud', label: 'Cloud Storage & Nextcloud', icon: '☁️' },
                        { key: 'rbac', label: 'Role-Based Access Control (RBAC)', icon: '🛡️' },
                        { key: 'watermark', label: 'DRM & Watermark Profiles', icon: '🔒' },
                        { key: 'audit', label: 'Enterprise System Audit Log', icon: '📋' },
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
                                fontSize: '0.88rem',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                            }}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* TAB 1: BRAND IDENTITY */}
                {activeTab === 'brand' && (
                    <>
                        {/* Official Brand Guidelines Reference Card */}
                        <section className="card" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <MtcLogoIcon size={28} bgColor="#386642" peakColor="#FFEBCC" />
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)' }}>
                                            Mountain Top Communications Brand Identity
                                        </h3>
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '650px' }}>
                                        Grounded in Christian values and servant leadership. Voice of hope and healing. Archetype: 60% Caregiver & 40% Innocent.
                                    </p>
                                </div>
                                <button
                                    onClick={applyOfficialMtc}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                                >
                                    Apply Official MTC Palette
                                </button>
                            </div>

                            {/* Color Swatch Overview */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                                <div style={{
                                    padding: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#386642',
                                    color: '#FFEBCC',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '90px',
                                }}>
                                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Primary</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-brand)' }}>Hunter Green</div>
                                        <code style={{ fontSize: '0.78rem', opacity: 0.9 }}>#386642</code>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#FFEBCC',
                                    color: '#1D2729',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '90px',
                                }}>
                                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Primary</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-brand)' }}>Cornsilk</div>
                                        <code style={{ fontSize: '0.78rem', opacity: 0.9 }}>#FFEBCC</code>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#CADEDF',
                                    color: '#1D2729',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '90px',
                                }}>
                                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Secondary</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-brand)' }}>Platinum</div>
                                        <code style={{ fontSize: '0.78rem', opacity: 0.9 }}>#CADEDF</code>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#1D2729',
                                    color: '#FFEBCC',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '90px',
                                    border: '1px solid rgba(202, 222, 223, 0.2)',
                                }}>
                                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Secondary</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-brand)' }}>Oxford Blue</div>
                                        <code style={{ fontSize: '0.78rem', opacity: 0.9 }}>#1D2729</code>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Logo System Showcase */}
                        <section className="card" style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-brand)' }}>
                                Official Vector Logo Variants
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <div style={{ padding: '24px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <MtcLogo variant="horizontal" size="md" theme="cornsilk" />
                                    <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Horizontal Wordmark (Cornsilk)</div>
                                </div>
                                <div style={{ padding: '24px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <MtcLogo variant="horizontal" size="md" theme="green" />
                                    <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Horizontal Wordmark (Hunter Green)</div>
                                </div>
                                <div style={{ padding: '24px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <MtcLogo variant="icon" size="md" theme="green" />
                                    <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Peak & Cross Icon Mark</div>
                                </div>
                            </div>
                        </section>

                        {/* Export Presets */}
                        <section className="card">
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-brand)' }}>📤 Distribution Presets</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                {[
                                    { platform: 'TV Broadcast', format: '16:9 · 1080i', icon: '📺' },
                                    { platform: 'YouTube', format: '16:9 · 1080p', icon: '▶️' },
                                    { platform: 'Instagram Reels', format: '9:16 · 1080p', icon: '📸' },
                                    { platform: 'TikTok', format: '9:16 · 1080p', icon: '🎵' },
                                    { platform: 'Facebook', format: '1:1 · 720p', icon: '📘' },
                                    { platform: 'Website', format: '16:9 · 4K', icon: '🌐' },
                                ].map((preset) => (
                                    <div key={preset.platform} style={{
                                        padding: '14px',
                                        backgroundColor: 'var(--bg-color)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{preset.icon}</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--mtc-cornsilk)' }}>{preset.platform}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{preset.format}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {/* TAB 2: ROLE-BASED ACCESS CONTROL (RBAC) */}
                {activeTab === 'rbac' && (
                    <section className="card">
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', fontFamily: 'var(--font-brand)' }}>
                                Enterprise Role-Based Access Control (RBAC)
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Permissions granted per user role across media ingestion, review workflows, broadcast publishing, and system audit logs.
                            </p>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(20, 28, 30, 0.6)' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)' }}>Governance Capability</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#FCA5A5' }}>ADMIN</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#A7F3D0' }}>PRODUCER</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#FFD180' }}>EDITOR</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#CADEDF' }}>VIEWER</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rbacMatrix.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '12px 16px', color: 'var(--mtc-cornsilk)', fontWeight: 500 }}>
                                                {item.permission}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {item.admin ? '✅' : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {item.producer ? '✅' : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {item.editor ? '✅' : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {item.viewer ? '✅' : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* TAB 3: WATERMARK & DRM PROFILES */}
                {activeTab === 'watermark' && (
                    <section className="card" style={{ maxWidth: '700px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', fontFamily: 'var(--font-brand)' }}>
                                Security Watermarking & DRM Compliance
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Protect pre-release masters and confidential media with automated visual burn-in overlays.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    Watermark Profile Name
                                </label>
                                <input
                                    value={watermarkName}
                                    onChange={(e) => setWatermarkName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    Burn-in Overlay Text Template
                                </label>
                                <input
                                    value={watermarkTemplate}
                                    onChange={(e) => setWatermarkTemplate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                    Supported tokens: <code>{'{USER}'}</code>, <code>{'{DATE}'}</code>, <code>{'{IP}'}</code>
                                </span>
                            </div>

                            {/* Live Simulation Preview */}
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    Burn-in Visual Preview
                                </label>
                                <div style={{
                                    height: '140px',
                                    backgroundColor: '#000',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <span style={{ fontSize: '2rem', opacity: 0.2 }}>🎬 4K Master Video</span>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '12px',
                                        right: '16px',
                                        color: 'rgba(255, 235, 204, 0.7)',
                                        fontFamily: 'monospace',
                                        fontSize: '0.78rem',
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        letterSpacing: '0.05em',
                                    }}>
                                        {watermarkTemplate.replace('{USER}', 'admin@mtc.com')}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                <button
                                    onClick={() => {
                                        setWatermarkSaved(true);
                                        setTimeout(() => setWatermarkSaved(false), 3000);
                                    }}
                                    className="btn btn-primary"
                                    style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                                >
                                    {watermarkSaved ? 'Profile Saved ✓' : 'Save Watermark Profile'}
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* TAB 4: ENTERPRISE SYSTEM AUDIT LOG */}
                {activeTab === 'audit' && (
                    <section className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', fontFamily: 'var(--font-brand)' }}>
                                    Enterprise System Audit Trail
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Immutable audit trail tracking all asset ingests, downloads, status approvals, and shares.
                                </p>
                            </div>
                            <button onClick={fetchAuditLogs} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                ↻ Refresh Logs
                            </button>
                        </div>

                        {/* Search & Action Filters */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                            <input
                                value={auditSearch}
                                onChange={(e) => setAuditSearch(e.target.value)}
                                placeholder="Search audit trail by user, action, or note..."
                                style={{
                                    flex: 1,
                                    maxWidth: '360px',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--mtc-cornsilk)',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                }}
                            />

                            <div style={{ display: 'flex', gap: '6px' }}>
                                {['ALL', 'UPLOAD', 'APPROVE', 'UPDATE', 'VIEW', 'DOWNLOAD'].map(act => (
                                    <button
                                        key={act}
                                        onClick={() => setActionFilter(act)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.74rem',
                                            fontWeight: 600,
                                            border: '1px solid ' + (actionFilter === act ? 'var(--mtc-hunter-green)' : 'var(--border-color)'),
                                            backgroundColor: actionFilter === act ? 'rgba(56, 102, 66, 0.3)' : 'transparent',
                                            color: actionFilter === act ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {act}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Audit Table */}
                        {loadingAudit ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                Querying enterprise activity log...
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(20, 28, 30, 0.6)', textAlign: 'left' }}>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Timestamp</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Action</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Entity</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Actor</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>IP Address</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Details / Note</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredActivities.map((log) => {
                                            let parsedDetails = '';
                                            try {
                                                if (log.details) {
                                                    const d = JSON.parse(log.details);
                                                    parsedDetails = d.note || d.fileName || d.operation || JSON.stringify(d);
                                                }
                                            } catch {
                                                parsedDetails = log.details || '';
                                            }

                                            return (
                                                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            backgroundColor: log.action === 'APPROVE' ? 'rgba(56, 102, 66, 0.35)'
                                                                : log.action === 'UPLOAD' ? 'rgba(230, 167, 76, 0.25)'
                                                                : log.action === 'DOWNLOAD' ? 'rgba(56, 102, 66, 0.2)'
                                                                : 'rgba(202, 222, 223, 0.1)',
                                                            color: log.action === 'APPROVE' ? '#A7F3D0'
                                                                : log.action === 'UPLOAD' ? '#FFD180'
                                                                : 'var(--mtc-cornsilk)',
                                                        }}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                                                        {log.entityType}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--mtc-cornsilk)', fontWeight: 500 }}>
                                                        {log.user?.name || 'System Admin'}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                                        {log.ipAddress || '127.0.0.1'}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {parsedDetails || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {filteredActivities.length === 0 && !loadingAudit && (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                                No activity logs match current search/filter.
                            </div>
                        )}
                    </section>
                )}

                {/* TAB 5: NEXTCLOUD STORAGE INTEGRATION & LINKING GUIDE */}
                {activeTab === 'nextcloud' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Live Status & Quota Banner */}
                        <section className="card" style={{
                            background: 'linear-gradient(135deg, rgba(29, 39, 41, 0.95), rgba(20, 28, 30, 0.95))',
                            border: ncStatus === 'CONNECTED' ? '1px solid rgba(56, 102, 66, 0.5)' : '1px solid var(--border-color)',
                            boxShadow: ncStatus === 'CONNECTED' ? '0 8px 32px rgba(56, 102, 66, 0.15)' : 'none',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        backgroundColor: ncStatus === 'CONNECTED' ? 'rgba(56, 102, 66, 0.25)' : 'rgba(230, 167, 76, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.4rem',
                                    }}>
                                        ☁️
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtc-cornsilk)' }}>
                                                Nextcloud WebDAV Server
                                            </h3>
                                            <span style={{
                                                padding: '3px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.04em',
                                                textTransform: 'uppercase',
                                                backgroundColor: ncStatus === 'CONNECTED' ? 'rgba(56, 102, 66, 0.35)' : 'rgba(239, 68, 68, 0.2)',
                                                color: ncStatus === 'CONNECTED' ? '#A7F3D0' : '#FCA5A5',
                                                border: ncStatus === 'CONNECTED' ? '1px solid rgba(167, 243, 208, 0.3)' : '1px solid rgba(252, 165, 165, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    backgroundColor: ncStatus === 'CONNECTED' ? '#34D399' : '#EF4444',
                                                    display: 'inline-block',
                                                    boxShadow: ncStatus === 'CONNECTED' ? '0 0 8px #34D399' : 'none',
                                                }} />
                                                {ncStatus === 'CHECKING' ? 'Checking...' : ncStatus}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            Target Server: <code style={{ color: 'var(--mtc-cornsilk)' }}>{ncUrl || 'https://nextcloud.mtc-network.space/'}</code>
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={handleTestNextcloud}
                                        disabled={ncTesting}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {ncTesting ? '⏳ Testing...' : '⚡ Test Connection'}
                                    </button>
                                    <a
                                        href="https://nextcloud.mtc-network.space/settings/user/security"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                                    >
                                        🔗 Nextcloud Security Page
                                    </a>
                                </div>
                            </div>

                            {/* Storage Quota Gauge (if available) */}
                            {ncQuota && ncQuota.available > 0 && (
                                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Nextcloud Storage Quota</span>
                                        <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                                            {(ncQuota.used / (1024 * 1024 * 1024)).toFixed(2)} GB used of {((ncQuota.used + ncQuota.available) / (1024 * 1024 * 1024)).toFixed(2)} GB
                                        </span>
                                    </div>
                                    <div style={{ height: '8px', backgroundColor: 'rgba(20, 28, 30, 0.8)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${Math.min(100, (ncQuota.used / (ncQuota.used + ncQuota.available)) * 100)}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, var(--mtc-hunter-green), #4ADE80)',
                                            borderRadius: '4px',
                                            transition: 'width 0.4s ease',
                                        }} />
                                    </div>
                                </div>
                            )}

                            {ncStatus === 'DISCONNECTED' && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(230, 167, 76, 0.12)',
                                    border: '1px solid rgba(230, 167, 76, 0.25)',
                                    fontSize: '0.82rem',
                                    color: '#FFD180',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>⚠️</span>
                                    <span>
                                        Nextcloud is currently not connected. The platform is operating in <strong>Local Storage Fallback</strong> mode. All asset uploads and streaming continue to function smoothly.
                                    </span>
                                </div>
                            )}
                        </section>

                        {/* Feedback Banner */}
                        {ncFeedback && (
                            <div style={{
                                padding: '12px 18px',
                                borderRadius: '8px',
                                backgroundColor: ncFeedback.type === 'success' ? 'rgba(56, 102, 66, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                                border: ncFeedback.type === 'success' ? '1px solid rgba(167, 243, 208, 0.4)' : '1px solid rgba(252, 165, 165, 0.4)',
                                color: ncFeedback.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                            }}>
                                <span>{ncFeedback.type === 'success' ? '✅' : '❌'}</span>
                                <span style={{ flex: 1 }}>{ncFeedback.message}</span>
                                <button
                                    onClick={() => setNcFeedback(null)}
                                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* Configuration Form & Server Settings */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
                            <section className="card">
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚙️</span>
                                    <span>WebDAV Credentials & Connection Parameters</span>
                                </h4>

                                <form onSubmit={handleSaveNextcloud} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            Nextcloud Server URL
                                        </label>
                                        <input
                                            type="url"
                                            value={ncUrl}
                                            onChange={e => setNcUrl(e.target.value)}
                                            required
                                            placeholder="https://nextcloud.mtc-network.space/"
                                            className="form-control"
                                            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                        />
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                            Resolved WebDAV endpoint: <code style={{ color: 'var(--mtc-cornsilk)' }}>{ncWebdavUrl || `${ncUrl.replace(/\/+$/, '')}/remote.php/webdav/`}</code>
                                        </span>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            Nextcloud WebDAV Username
                                        </label>
                                        <input
                                            type="text"
                                            value={ncUsername}
                                            onChange={e => setNcUsername(e.target.value)}
                                            required
                                            placeholder="e.g. admin or your Nextcloud username"
                                            className="form-control"
                                            style={{ width: '100%' }}
                                        />
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                            The account name associated with the App Password on Nextcloud.
                                        </span>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                                App Password / Token {ncHasPassword && <span style={{ color: '#A7F3D0', fontWeight: 400 }}>(configured)</span>}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{ background: 'none', border: 'none', color: 'var(--mtc-cornsilk)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                {showPassword ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={ncPassword}
                                            onChange={e => setNcPassword(e.target.value)}
                                            placeholder={ncHasPassword ? '•••••••••••••••• (leave blank to keep current)' : 'Enter generated Nextcloud App Token'}
                                            className="form-control"
                                            style={{ width: '100%', fontFamily: showPassword ? 'monospace' : 'inherit' }}
                                        />
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                            💡 Recommended: Generate a dedicated App Password from Nextcloud Settings → Security rather than your main password.
                                        </span>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            Target Storage Folder in Nextcloud
                                        </label>
                                        <input
                                            type="text"
                                            value={ncRootFolder}
                                            onChange={e => setNcRootFolder(e.target.value)}
                                            placeholder="/mtc-dam-uploads"
                                            className="form-control"
                                            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                        />
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                            Directory created inside your Nextcloud account for all media stems, proxies, and ingested masters.
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                        <button
                                            type="submit"
                                            disabled={ncSaving}
                                            className="btn btn-primary"
                                            style={{ flex: 1, padding: '10px 18px', fontSize: '0.88rem' }}
                                        >
                                            {ncSaving ? 'Saving Configuration...' : '💾 Save & Connect Server'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleTestNextcloud}
                                            disabled={ncTesting}
                                            className="btn btn-secondary"
                                            style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                                        >
                                            {ncTesting ? 'Testing...' : '⚡ Test'}
                                        </button>
                                    </div>
                                </form>
                            </section>

                            {/* Step-by-Step Linking Guide Panel */}
                            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>📖</span>
                                    <span>How to Link DAM to Nextcloud</span>
                                </h4>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(20, 28, 30, 0.6)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <div style={{ fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                                            1. Open Security Settings
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.78rem' }}>
                                            Log in at <a href="https://nextcloud.mtc-network.space/" target="_blank" rel="noopener noreferrer" style={{ color: '#A7F3D0' }}>nextcloud.mtc-network.space</a>. Click your user avatar in the top right → <strong>Personal Settings</strong> → <strong>Security</strong>.
                                        </p>
                                    </div>

                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(20, 28, 30, 0.6)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <div style={{ fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                                            2. Generate App Password
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.78rem' }}>
                                            Scroll down to <strong>"Devices & credentials"</strong>. In the <em>App name</em> input, type: <code style={{ color: 'var(--mtc-cornsilk)' }}>MTC DAM Studio</code>, then click <strong>Create new app password</strong>.
                                        </p>
                                    </div>

                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(20, 28, 30, 0.6)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <div style={{ fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                                            3. Paste & Connect
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.78rem' }}>
                                            Nextcloud will display a <strong>Username</strong> and a multi-word <strong>Password / Token</strong>. Copy them into this form and click <strong>Save & Connect Server</strong>!
                                        </p>
                                    </div>

                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(56, 102, 66, 0.15)',
                                        border: '1px solid rgba(56, 102, 66, 0.3)',
                                        color: '#CADEDF',
                                        fontSize: '0.76rem',
                                    }}>
                                        🔒 <strong>Security Note:</strong> App Passwords can be revoked at any time from your Nextcloud dashboard without altering your personal account login.
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}
