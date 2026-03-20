'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
    const { user } = useAuth();

    const initials = user
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '??';

    return (
        <header className="header">
            <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 500 }}>{title}</h1>
                {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {actions}
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', position: 'relative' }}>
                    🔔
                    <span style={{ position: 'absolute', top: '-2px', right: '-4px', width: '8px', height: '8px', backgroundColor: 'var(--danger-color)', borderRadius: '50%', border: '2px solid var(--panel-bg)' }}></span>
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #ec4899)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                    {initials}
                </div>
            </div>
        </header>
    );
}
