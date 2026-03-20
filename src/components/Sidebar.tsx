'use client';

import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { name: 'Dashboard', path: '/', icon: '⊞' },
    { name: 'Projects', path: '/projects', icon: '▣' },
    { name: 'Assets', path: '/assets', icon: '◰' },
    { name: 'Workflow', path: '/workflow', icon: '◩' },
    { name: 'Settings', path: '/settings', icon: '⛭' },
];

export default function Sidebar({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
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

                <div style={{ padding: collapsed ? '16px 8px' : '16px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                    {!collapsed && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            Mountain Top Communications
                        </div>
                    )}
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
