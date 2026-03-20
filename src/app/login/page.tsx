'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const roleDescriptions: Record<string, string> = {
    ADMIN: 'Full system access — manage users, settings, and all content',
    PRODUCER: 'Manage projects, approve assets, oversee workflows',
    EDITOR: 'Upload, edit, and manage assets within assigned projects',
    VIEWER: 'View and download approved content',
};

export default function LoginPage() {
    const { login, signup } = useAuth();
    const router = useRouter();

    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            let result;
            if (mode === 'signup') {
                result = await signup(name, email, password);
            } else {
                result = await login(email, password);
            }

            if (result.error) {
                setError(result.error);
            } else {
                router.replace('/');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 35%, #0f172a 65%, #0a0a0a 100%)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background orbs */}
            <div style={{
                position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                top: '-200px', right: '-100px', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
                bottom: '-150px', left: '-50px', pointerEvents: 'none',
            }} />

            <div style={{
                display: 'flex',
                gap: '80px',
                alignItems: 'center',
                maxWidth: '1000px',
                width: '100%',
                padding: '40px',
            }}>
                {/* Left side — branding */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, var(--accent-color), #ec4899)',
                            }} />
                            <span style={{ fontWeight: 'bold', fontSize: '1.5rem', letterSpacing: '0.04em' }}>
                                MTC <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>DAM</span>
                            </span>
                        </div>
                        <h1 style={{
                            fontSize: '2.2rem', fontWeight: 700, lineHeight: 1.2,
                            letterSpacing: '-0.03em', marginBottom: '12px',
                            background: 'linear-gradient(135deg, #ededed, #a1a1aa)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            Studio-Grade Digital Asset Management
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '380px' }}>
                            The central content brain for Mountain Top Communications — Ingest, Organize, Review, and Publish your media.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                            Team Roles
                        </div>
                        {Object.entries(roleDescriptions).map(([role, desc]) => (
                            <div key={role} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 12px', borderRadius: '8px',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                                    backgroundColor: role === 'ADMIN' ? 'var(--danger-color)' : role === 'PRODUCER' ? 'var(--accent-color)' : role === 'EDITOR' ? 'var(--warning-color)' : 'var(--text-muted)',
                                }} />
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{role}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '8px' }}>{desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right side — form card */}
                <div style={{
                    width: '420px', flexShrink: 0,
                    background: 'rgba(20,20,20,0.8)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '40px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(139,92,246,0.06)',
                }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '4px' }}>
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '28px' }}>
                        {mode === 'login' ? 'Sign in to your MTC DAM workspace' : 'Join the Mountain Top team'}
                    </p>

                    {error && (
                        <div style={{
                            padding: '10px 14px', borderRadius: '8px', marginBottom: '20px',
                            backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#fca5a5', fontSize: '0.85rem',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {mode === 'signup' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Full Name</label>
                                <input
                                    id="auth-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. John Davis"
                                    required
                                    style={{
                                        width: '100%', padding: '11px 14px',
                                        backgroundColor: 'rgba(10,10,10,0.6)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-main)', borderRadius: '8px', outline: 'none', fontSize: '0.9rem',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                />
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Email</label>
                            <input
                                id="auth-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@mtc.org"
                                required
                                style={{
                                    width: '100%', padding: '11px 14px',
                                    backgroundColor: 'rgba(10,10,10,0.6)', border: '1px solid var(--border-color)',
                                    color: 'var(--text-main)', borderRadius: '8px', outline: 'none', fontSize: '0.9rem',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Password</label>
                            <input
                                id="auth-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === 'signup' ? 'Minimum 8 characters' : '••••••••'}
                                required
                                minLength={mode === 'signup' ? 8 : undefined}
                                style={{
                                    width: '100%', padding: '11px 14px',
                                    backgroundColor: 'rgba(10,10,10,0.6)', border: '1px solid var(--border-color)',
                                    color: 'var(--text-main)', borderRadius: '8px', outline: 'none', fontSize: '0.9rem',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            />
                        </div>

                        <button
                            id="auth-submit"
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary"
                            style={{
                                width: '100%', padding: '12px', marginTop: '8px',
                                fontSize: '0.95rem', fontWeight: 600,
                                opacity: isSubmitting ? 0.7 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    <div style={{
                        textAlign: 'center', marginTop: '24px', fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                    }}>
                        {mode === 'login' ? (
                            <>
                                Don&apos;t have an account?{' '}
                                <button
                                    id="toggle-mode"
                                    onClick={() => { setMode('signup'); setError(''); }}
                                    style={{
                                        background: 'none', border: 'none', color: 'var(--accent-color)',
                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                    }}
                                >
                                    Create one
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    id="toggle-mode"
                                    onClick={() => { setMode('login'); setError(''); }}
                                    style={{
                                        background: 'none', border: 'none', color: 'var(--accent-color)',
                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                    }}
                                >
                                    Sign in
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
