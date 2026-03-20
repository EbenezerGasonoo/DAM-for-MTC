'use client';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const roles = [
    { name: 'Admin', desc: 'Full system access', color: 'var(--danger-color)' },
    { name: 'Producer', desc: 'Manages projects and approvals', color: 'var(--accent-color)' },
    { name: 'Editor', desc: 'Uploads and edits assets', color: 'var(--warning-color)' },
    { name: 'Viewer', desc: 'View/download only', color: 'var(--text-muted)' },
];

export default function SettingsPage() {
    return (
        <Sidebar>
            <Header title="Settings" subtitle="System configuration and access control" />

            <div className="content-area" style={{ maxWidth: '800px' }}>
                {/* Nextcloud Integration */}
                <section className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '20px' }}>☁️ Nextcloud Connection</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>WebDAV URL</label>
                            <input defaultValue="https://cloud.mtc.org/remote.php/webdav/" style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: '0.88rem' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Username</label>
                                <input defaultValue="admin" style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: '0.88rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Password</label>
                                <input type="password" defaultValue="••••••••" style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: '0.88rem' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                            <button className="btn btn-primary">Save Connection</button>
                            <button className="btn">Test Connection</button>
                        </div>
                    </div>
                </section>

                {/* Roles */}
                <section className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '20px' }}>🔐 Access Roles</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {roles.map((role) => (
                            <div key={role.name} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: role.color, flexShrink: 0 }}></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{role.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{role.desc}</div>
                                </div>
                                <button className="btn" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>Configure</button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Export Presets */}
                <section className="card">
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '20px' }}>📤 Distribution Presets</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {[
                            { platform: 'YouTube', format: '16:9 · 1080p', icon: '▶️' },
                            { platform: 'Instagram Reels', format: '9:16 · 1080p', icon: '📸' },
                            { platform: 'TikTok', format: '9:16 · 1080p', icon: '🎵' },
                            { platform: 'Facebook', format: '1:1 · 720p', icon: '📘' },
                            { platform: 'Website', format: '16:9 · 4K', icon: '🌐' },
                            { platform: 'TV Broadcast', format: '16:9 · 1080i', icon: '📺' },
                        ].map((preset) => (
                            <div key={preset.platform} style={{ padding: '14px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)')}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                            >
                                <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{preset.icon}</div>
                                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{preset.platform}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{preset.format}</div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </Sidebar>
    );
}
