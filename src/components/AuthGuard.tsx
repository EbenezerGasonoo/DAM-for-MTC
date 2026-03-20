'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-color)',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--accent-color), #ec4899)',
                        margin: '0 auto 16px',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading...</div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return <>{children}</>;
}
