'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

interface NotificationItem {
    id: string;
    type: string;
    subject: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

const typeIcons: Record<string, string> = {
    ASSET_UPLOADED: '📥',
    SHARE_ACCESS: '🔗',
    SHARE_EXPIRING: '⏰',
    APPROVAL_NEEDED: '⏳',
    APPROVAL_GRANTED: '✅',
    SYSTEM: '📢',
};

export default function Header({ title, subtitle, actions }: HeaderProps) {
    const { user, logout } = useAuth();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    const notificationRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const initials = user
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '??';

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setLoadingNotifications(true);
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                const list: NotificationItem[] = data.notifications || [];
                setNotifications(list);
                setUnreadCount(list.filter(n => !n.isRead).length);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoadingNotifications(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    // Handle outside clicks to close dropdowns
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: true }),
            });
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: true }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/assets?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleSignOut = async () => {
        setShowUserMenu(false);
        await logout();
        router.replace('/login');
    };

    return (
        <header className="header">
            {/* Page Title & Subtitle */}
            <div style={{ flex: 1, minWidth: '180px' }}>
                <h1 style={{
                    fontFamily: 'var(--font-brand)',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: 'var(--mtc-cornsilk)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                }}>
                    {title}
                </h1>
                {subtitle && (
                    <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginTop: '2px',
                    }}>
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Quick Header Search Bar */}
            <form
                onSubmit={handleSearchSubmit}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(20, 28, 30, 0.75)',
                    border: '1px solid rgba(202, 222, 223, 0.18)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 12px',
                    width: '300px',
                    margin: '0 20px',
                    transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(56, 102, 66, 0.3)';
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(202, 222, 223, 0.18)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '8px' }}>🔍</span>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search media, projects, tags..."
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--mtc-cornsilk)',
                        outline: 'none',
                        fontSize: '0.85rem',
                        fontFamily: 'var(--font-body)',
                        width: '100%',
                    }}
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '0 4px',
                        }}
                    >
                        ✕
                    </button>
                )}
            </form>

            {/* Right Side Actions & User Area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Page specific action (e.g. + Upload Asset) */}
                {actions}

                {/* Notifications Bell & Popover */}
                <div ref={notificationRef} style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowUserMenu(false);
                            if (!showNotifications) fetchNotifications();
                        }}
                        style={{
                            background: showNotifications ? 'rgba(56, 102, 66, 0.3)' : 'transparent',
                            border: '1px solid ' + (showNotifications ? 'rgba(56, 102, 66, 0.5)' : 'transparent'),
                            color: 'var(--mtc-cornsilk)',
                            fontSize: '1.15rem',
                            cursor: 'pointer',
                            position: 'relative',
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                        title="Notifications"
                        onMouseEnter={(e) => {
                            if (!showNotifications) e.currentTarget.style.backgroundColor = 'rgba(202, 222, 223, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                            if (!showNotifications) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        🔔
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                minWidth: '16px',
                                height: '16px',
                                padding: '0 4px',
                                backgroundColor: 'var(--danger-color)',
                                color: '#FFFFFF',
                                borderRadius: '8px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid var(--panel-bg)',
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown Panel */}
                    {showNotifications && (
                        <div style={{
                            position: 'absolute',
                            top: '48px',
                            right: '0',
                            width: '340px',
                            backgroundColor: 'var(--panel-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 102, 66, 0.15)',
                            zIndex: 100,
                            overflow: 'hidden',
                            animation: 'pulse 0.15s ease-out',
                        }}>
                            {/* Panel Header */}
                            <div style={{
                                padding: '14px 18px',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'rgba(20, 28, 30, 0.6)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-brand)', fontSize: '0.95rem', color: 'var(--mtc-cornsilk)' }}>
                                        Notifications
                                    </span>
                                    {unreadCount > 0 && (
                                        <span style={{
                                            fontSize: '0.68rem',
                                            backgroundColor: 'var(--mtc-hunter-green)',
                                            color: 'var(--mtc-cornsilk)',
                                            padding: '2px 6px',
                                            borderRadius: '10px',
                                            fontWeight: 600,
                                        }}>
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--mtc-platinum)',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                        }}
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {/* Notifications Content */}
                            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                {loadingNotifications ? (
                                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        Loading notifications...
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✨</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--mtc-cornsilk)' }}>
                                            You&apos;re all caught up!
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            No recent notifications for your account.
                                        </div>
                                    </div>
                                ) : (
                                    notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => markAsRead(n.id)}
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom: '1px solid rgba(202, 222, 223, 0.08)',
                                                cursor: 'pointer',
                                                backgroundColor: n.isRead ? 'transparent' : 'rgba(56, 102, 66, 0.12)',
                                                transition: 'background-color 0.15s',
                                                display: 'flex',
                                                gap: '12px',
                                                alignItems: 'flex-start',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--panel-hover)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = n.isRead ? 'transparent' : 'rgba(56, 102, 66, 0.12)';
                                            }}
                                        >
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '6px',
                                                backgroundColor: 'rgba(202, 222, 223, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.9rem',
                                                flexShrink: 0,
                                            }}>
                                                {typeIcons[n.type] || '📢'}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: n.isRead ? 500 : 700,
                                                    fontSize: '0.85rem',
                                                    color: 'var(--mtc-cornsilk)',
                                                    marginBottom: '2px',
                                                }}>
                                                    {n.subject}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.78rem',
                                                    color: 'var(--text-muted)',
                                                    lineHeight: 1.35,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {n.message}
                                                </div>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                                    {new Date(n.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                            {!n.isRead && (
                                                <div style={{
                                                    width: '7px',
                                                    height: '7px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--mtc-hunter-green)',
                                                    marginTop: '6px',
                                                    flexShrink: 0,
                                                }} />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{
                                padding: '10px 16px',
                                borderTop: '1px solid var(--border-color)',
                                backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                textAlign: 'center',
                            }}>
                                <Link
                                    href="/settings"
                                    onClick={() => setShowNotifications(false)}
                                    style={{
                                        fontSize: '0.78rem',
                                        color: 'var(--mtc-cornsilk)',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontWeight: 500,
                                    }}
                                >
                                    ⚙️ Notification Preferences
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile Avatar & Dropdown */}
                <div ref={userMenuRef} style={{ position: 'relative' }}>
                    <div
                        onClick={() => {
                            setShowUserMenu(!showUserMenu);
                            setShowNotifications(false);
                        }}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--mtc-hunter-green), #24442A)',
                            color: 'var(--mtc-cornsilk)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontFamily: 'var(--font-brand)',
                            fontSize: '12.5px',
                            border: '1.5px solid rgba(255, 235, 204, 0.35)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                            cursor: 'pointer',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(56, 102, 66, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                        }}
                        title={user?.name || 'User Profile'}
                    >
                        {initials}
                    </div>

                    {/* User Profile Popover */}
                    {showUserMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '48px',
                            right: '0',
                            width: '240px',
                            backgroundColor: 'var(--panel-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 102, 66, 0.15)',
                            zIndex: 100,
                            overflow: 'hidden',
                        }}>
                            {/* Profile Info */}
                            <div style={{
                                padding: '16px',
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: 'rgba(20, 28, 30, 0.6)',
                            }}>
                                <div style={{ fontWeight: 700, fontFamily: 'var(--font-brand)', fontSize: '0.95rem', color: 'var(--mtc-cornsilk)' }}>
                                    {user?.name || 'MTC User'}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.email || 'user@mtc.com'}
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        fontFamily: 'var(--font-brand)',
                                        letterSpacing: '0.06em',
                                        backgroundColor: 'rgba(56, 102, 66, 0.3)',
                                        color: 'var(--mtc-cornsilk)',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255, 235, 204, 0.2)',
                                    }}>
                                        {user?.role || 'VIEWER'}
                                    </span>
                                </div>
                            </div>

                            {/* Navigation Shortcuts */}
                            <div style={{ padding: '8px' }}>
                                {[
                                    { label: 'Dashboard', icon: '⊞', href: '/' },
                                    { label: 'Media Assets', icon: '◰', href: '/assets' },
                                    { label: 'Production Projects', icon: '▣', href: '/projects' },
                                    { label: 'Settings & Branding', icon: '⚙️', href: '/settings' },
                                ].map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setShowUserMenu(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 12px',
                                            borderRadius: 'var(--radius-sm)',
                                            color: 'var(--mtc-cornsilk)',
                                            fontSize: '0.85rem',
                                            fontFamily: 'var(--font-brand)',
                                            textDecoration: 'none',
                                            transition: 'background-color 0.15s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--panel-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </Link>
                                ))}
                            </div>

                            {/* Sign out */}
                            <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(20, 28, 30, 0.4)' }}>
                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        color: '#FCA5A5',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        fontSize: '0.85rem',
                                        fontFamily: 'var(--font-brand)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background-color 0.15s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <span>🚪</span>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
