'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MtcLogoIcon } from '@/components/MtcLogo';

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
                        margin: '0 auto 16px',
                        display: 'flex',
                        justifyContent: 'center',
                        animation: 'pulse 1.6s ease-in-out infinite',
                    }}>
                        <MtcLogoIcon size={56} bgColor="#386642" peakColor="#FFEBCC" />
                    </div>
                    <div style={{
                        color: 'var(--mtc-cornsilk)',
                        fontFamily: 'var(--font-brand)',
                        fontWeight: 500,
                        fontSize: '0.92rem',
                        letterSpacing: '0.04em',
                    }}>
                        Loading Mountain Top Communications...
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return <>{children}</>;
}
