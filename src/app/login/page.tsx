'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import MtcLogo from '@/components/MtcLogo';
import AfrihausPattern from '@/components/AfrihausPattern';

const roleDescriptions: Record<string, string> = {
    ADMIN: 'Full system governance — manage users, settings, and all assets',
    PRODUCER: 'Manage projects, review & approve assets, oversee broadcast pipelines',
    EDITOR: 'Upload, edit, and organize media assets across collections',
    VIEWER: 'Browse, stream, and download approved content',
};

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const result = await login(email, password);

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
            position: 'relative',
            backgroundColor: '#141C1E',
            overflow: 'hidden',
        }}>
            {/* Ambient Brand Glows (Hunter Green & Oxford Slate) */}
            <div style={{
                position: 'absolute',
                width: '700px',
                height: '700px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(56,102,66,0.22) 0%, transparent 68%)',
                top: '-240px',
                left: '-100px',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(202,222,223,0.08) 0%, transparent 70%)',
                bottom: '-150px',
                right: '180px',
                pointerEvents: 'none',
            }} />

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px',
                zIndex: 2,
            }}>
                <div style={{
                    display: 'flex',
                    gap: '64px',
                    alignItems: 'center',
                    maxWidth: '1080px',
                    width: '100%',
                }}>
                    {/* Left Brand Showcase */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div>
                            <div style={{ marginBottom: '28px' }}>
                                <MtcLogo variant="horizontal" size="lg" theme="cornsilk" />
                            </div>

                            <h1 style={{
                                fontFamily: 'var(--font-brand)',
                                fontSize: '2.4rem',
                                fontWeight: 800,
                                lineHeight: 1.15,
                                letterSpacing: '-0.025em',
                                marginBottom: '14px',
                                color: 'var(--mtc-cornsilk)',
                            }}>
                                Studio-Grade Digital Asset Management
                            </h1>
                            <p style={{
                                fontFamily: 'var(--font-body)',
                                color: 'var(--mtc-platinum)',
                                fontSize: '1rem',
                                lineHeight: 1.6,
                                maxWidth: '440px',
                                opacity: 0.9,
                            }}>
                                The official content brain for Mountain Top Communications — delivering values-based, educational, and inspiring media across Ghana and West Africa.
                            </p>
                        </div>

                        {/* Team Roles Chips */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '460px' }}>
                            <div style={{
                                fontFamily: 'var(--font-brand)',
                                fontSize: '0.75rem',
                                color: 'var(--mtc-cornsilk)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                fontWeight: 600,
                                marginBottom: '2px',
                            }}>
                                Access Privileges
                            </div>
                            {Object.entries(roleDescriptions).map(([role, desc]) => (
                                <div key={role} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(29, 39, 41, 0.75)',
                                    border: '1px solid rgba(202, 222, 223, 0.12)',
                                }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        backgroundColor: role === 'ADMIN'
                                            ? '#EF4444'
                                            : role === 'PRODUCER'
                                            ? '#386642'
                                            : role === 'EDITOR'
                                            ? '#E6A74C'
                                            : '#CADEDF',
                                    }} />
                                    <div>
                                        <span style={{
                                            fontFamily: 'var(--font-brand)',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            color: 'var(--mtc-cornsilk)',
                                        }}>
                                            {role}
                                        </span>
                                        <span style={{
                                            fontFamily: 'var(--font-body)',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.74rem',
                                            marginLeft: '8px',
                                        }}>
                                            {desc}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Auth Card */}
                    <div style={{
                        width: '420px',
                        flexShrink: 0,
                        backgroundColor: 'rgba(29, 39, 41, 0.94)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(202, 222, 223, 0.22)',
                        borderRadius: '16px',
                        padding: '38px',
                        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(56, 102, 66, 0.12)',
                    }}>
                        <h2 style={{
                            fontFamily: 'var(--font-brand)',
                            fontSize: '1.45rem',
                            fontWeight: 700,
                            color: 'var(--mtc-cornsilk)',
                            marginBottom: '4px',
                        }}>
                            Sign In to Workspace
                        </h2>
                        <p style={{
                            fontFamily: 'var(--font-body)',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            marginBottom: '26px',
                        }}>
                            Access your Mountain Top Communications studio assets
                        </p>

                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#FCA5A5',
                                fontSize: '0.85rem',
                                fontFamily: 'var(--font-body)',
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontSize: '0.82rem',
                                    fontFamily: 'var(--font-brand)',
                                    fontWeight: 500,
                                    color: 'var(--mtc-cornsilk)',
                                }}>
                                    Email Address
                                </label>
                                <input
                                    id="auth-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@mtc.com"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '11px 14px',
                                        backgroundColor: '#141C1E',
                                        border: '1px solid rgba(202, 222, 223, 0.22)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        fontSize: '0.9rem',
                                        fontFamily: 'var(--font-body)',
                                        transition: 'all 0.2s',
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 102, 66, 0.25)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(202, 222, 223, 0.22)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontSize: '0.82rem',
                                    fontFamily: 'var(--font-brand)',
                                    fontWeight: 500,
                                    color: 'var(--mtc-cornsilk)',
                                }}>
                                    Password
                                </label>
                                <input
                                    id="auth-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '11px 14px',
                                        backgroundColor: '#141C1E',
                                        border: '1px solid rgba(202, 222, 223, 0.22)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        fontSize: '0.9rem',
                                        fontFamily: 'var(--font-body)',
                                        transition: 'all 0.2s',
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 102, 66, 0.25)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(202, 222, 223, 0.22)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            <button
                                id="auth-submit"
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '13px',
                                    marginTop: '10px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-brand)',
                                    letterSpacing: '0.02em',
                                    opacity: isSubmitting ? 0.7 : 1,
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isSubmitting ? 'Authenticating...' : 'Sign In to DAM'}
                            </button>
                        </form>

                        <div style={{
                            textAlign: 'center',
                            marginTop: '22px',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-body)',
                            padding: '10px 14px',
                            backgroundColor: 'rgba(20, 28, 30, 0.5)',
                            borderRadius: '8px',
                            border: '1px solid rgba(202, 222, 223, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}>
                            <span>🔒</span>
                            <span>Restricted access. Only administrators can create accounts.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Authentic Brand Guideline Afrihaus Pattern Decorative Tapestry (Right Side) */}
            <div style={{ display: 'flex', height: '100vh', flexShrink: 0 }}>
                <AfrihausPattern width={140} height="100%" />
            </div>
        </div>
    );
}
