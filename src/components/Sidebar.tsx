'use client';

import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AuthGuard from '@/components/AuthGuard';
import MtcLogo from '@/components/MtcLogo';

const navItems = [
    { name: 'Dashboard', path: '/', icon: '⊞' },
    { name: 'Projects', path: '/projects', icon: '▣' },
    { name: 'Assets', path: '/assets', icon: '◰' },
    { name: 'Favorites', path: '/favorites', icon: '❤️' },
    { name: 'Workflow', path: '/workflow', icon: '◩' },
    { name: 'Settings', path: '/settings', icon: '⛭' },
];

const roleColors: Record<string, { bg: string; text: string }> = {
    ADMIN: { bg: 'rgba(239, 68, 68, 0.2)', text: '#FCA5A5' },
    PRODUCER: { bg: 'rgba(56, 102, 66, 0.3)', text: '#FFEBCC' },
    EDITOR: { bg: 'rgba(230, 167, 76, 0.25)', text: '#FFEBCC' },
    VIEWER: { bg: 'rgba(202, 222, 223, 0.15)', text: '#CADEDF' },
};

export default function Sidebar({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();

    return (
        <AuthGuard>
            <div className="layout-container">
                <aside
                    className="sidebar"
                    style={{
                        width: collapsed ? '72px' : '270px',
                        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        backgroundColor: 'var(--mtc-oxford-blue)',
                        borderRight: '1px solid var(--border-color)',
                        flexShrink: 0,
                    }}
                >
                    {/* Top Branding Section */}
                    <div
                        style={{
                            padding: collapsed ? '14px 8px' : '18px 16px',
                            display: 'flex',
                            flexDirection: collapsed ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: collapsed ? 'center' : 'space-between',
                            gap: collapsed ? '10px' : '0',
                            borderBottom: '1px solid var(--border-subtle)',
                            minHeight: '68px',
                        }}
                    >
                        <Link
                            href="/"
                            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', overflow: 'hidden' }}
                            title="MTC DAM Dashboard"
                        >
                            {collapsed ? (
                                <MtcLogo variant="icon" size="sm" theme="green" />
                            ) : (
                                <MtcLogo variant="horizontal" size="sm" theme="cornsilk" />
                            )}
                        </Link>

                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            style={{
                                background: 'rgba(202, 222, 223, 0.08)',
                                border: '1px solid rgba(202, 222, 223, 0.15)',
                                color: 'var(--mtc-cornsilk)',
                                cursor: 'pointer',
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                                marginLeft: collapsed ? '0' : '6px',
                            }}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--mtc-hunter-green)';
                                e.currentTarget.style.borderColor = 'rgba(255, 235, 204, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(202, 222, 223, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(202, 222, 223, 0.15)';
                            }}
                        >
                            {collapsed ? '▶' : '◀'}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav
                        style={{
                            padding: collapsed ? '16px 8px' : '16px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            flex: 1,
                        }}
                    >
                        {navItems.map((item) => {
                            const isActive =
                                pathname === item.path ||
                                (item.path !== '/' && pathname.startsWith(item.path));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.path}
                                    style={{
                                        fontFamily: 'var(--font-brand)',
                                        padding: collapsed ? '12px' : '10px 14px',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: isActive
                                            ? 'var(--accent-light)'
                                            : 'transparent',
                                        color: isActive
                                            ? 'var(--mtc-cornsilk)'
                                            : 'var(--text-muted)',
                                        fontWeight: isActive ? 600 : 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                        transition: 'all 0.2s ease',
                                        textDecoration: 'none',
                                        fontSize: '0.88rem',
                                        borderLeft: isActive
                                            ? '3px solid var(--mtc-hunter-green)'
                                            : '3px solid transparent',
                                        boxShadow: isActive
                                            ? 'inset 0 0 12px rgba(56, 102, 66, 0.25)'
                                            : 'none',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.backgroundColor =
                                                'rgba(202, 222, 223, 0.06)';
                                            e.currentTarget.style.color = 'var(--mtc-cornsilk)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-muted)';
                                        }
                                    }}
                                >
                                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                                        {item.icon}
                                    </span>
                                    {!collapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Section */}
                    <div
                        style={{
                            padding: collapsed ? '16px 8px' : '16px',
                            borderTop: '1px solid var(--border-color)',
                            backgroundColor: 'rgba(20, 28, 30, 0.5)',
                            marginTop: 'auto',
                        }}
                    >
                        {user && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: collapsed ? '0' : '12px',
                                }}
                            >
                                <div
                                    style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        background:
                                            'linear-gradient(135deg, var(--mtc-hunter-green), #24442A)',
                                        border: '1.5px solid rgba(255, 235, 204, 0.3)',
                                        color: 'var(--mtc-cornsilk)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontFamily: 'var(--font-brand)',
                                        fontSize: '12px',
                                    }}
                                >
                                    {user.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                </div>
                                {!collapsed && (
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                                fontFamily: 'var(--font-brand)',
                                                color: 'var(--mtc-cornsilk)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {user.name}
                                        </div>
                                        <div
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                marginTop: '2px',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                backgroundColor:
                                                    roleColors[user.role]?.bg ||
                                                    'rgba(202, 222, 223, 0.15)',
                                                color:
                                                    roleColors[user.role]?.text ||
                                                    'var(--text-muted)',
                                                fontSize: '0.68rem',
                                                fontWeight: 600,
                                                letterSpacing: '0.04em',
                                            }}
                                        >
                                            {user.role}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {!collapsed && (
                            <button
                                onClick={logout}
                                style={{
                                    fontFamily: 'var(--font-brand)',
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: 500,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        'rgba(239, 68, 68, 0.15)';
                                    e.currentTarget.style.borderColor =
                                        'rgba(239, 68, 68, 0.3)';
                                    e.currentTarget.style.color = '#FCA5A5';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                    e.currentTarget.style.color = 'var(--text-muted)';
                                }}
                            >
                                Sign Out
                            </button>
                        )}
                    </div>
                </aside>

                <main className="main-content">{children}</main>
            </div>
        </AuthGuard>
    );
}
