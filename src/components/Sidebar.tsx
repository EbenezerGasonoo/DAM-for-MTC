'use client';

import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AuthGuard from '@/components/AuthGuard';

const navItems = [
    { name: 'Dashboard', path: '/', icon: '⊞' },
    { name: 'Projects', path: '/projects', icon: '▣' },
    { name: 'Assets', path: '/assets', icon: '◰' },
    { name: 'Workflow', path: '/workflow', icon: '◩' },
    { name: 'Settings', path: '/settings', icon: '⛭' },
];

const roleColors: Record<string, string> = {
    ADMIN: 'var(--danger-color)',
    PRODUCER: 'var(--accent-color)',
    EDITOR: 'var(--warning-color)',
    VIEWER: 'var(--text-muted)',
};

export default function Sidebar({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();

    return (
        <AuthGuard>
            <div className="layout-container">
                <aside className="sidebar" style={{ width: collapsed ? '72px' : '260px', transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
                    <div style={{ padding: collapsed ? '24px 16px' : '24px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
                        <div
                            style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--accent-color), #ec4899)', flexShrink: 0, cursor: 'pointer' }}
                            onClick={() => setCollapsed(!collapsed)}
                        />
                        {!collapsed && (
                            <span style={{ fontWeight: 'bold', fontSize: '1.15rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                MTC <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>DAM</span>
                            </span>
                        )}
                    </div>

                    <nav style={{ padding: collapsed ? '0 8px' : '0 16px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        {navItems.map((item) => {
                            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.path}
                                    style={{
                                        padding: collapsed ? '12px' : '10px 14px',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                                        color: isActive ? 'var(--accent-color)' : 'var(--text-muted)',
                                        fontWeight: isActive ? 600 : 400,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                        transition: 'all 0.2s ease',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem',
                                        borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                                    }}
                                >
                                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                                    {!collapsed && item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div style={{ padding: collapsed ? '16px 8px' : '16px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                        {user && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: collapsed ? '0' : '10px' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                    background: 'linear-gradient(135deg, var(--accent-color), #ec4899)',
                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '12px',
                                }}>
                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                {!collapsed && (
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user.name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: roleColors[user.role] || 'var(--text-muted)' }} />
                                            <span style={{ fontSize: '0.7rem', color: roleColors[user.role] || 'var(--text-muted)', fontWeight: 500 }}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {!collapsed && (
                            <button
                                onClick={logout}
                                style={{
                                    width: '100%', padding: '8px', backgroundColor: 'transparent',
                                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--panel-hover)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            >
                                Sign Out
                            </button>
                        )}
                    </div>
                </aside>

                <main className="main-content">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
