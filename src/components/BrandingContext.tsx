'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface BrandingColors {
    primary: string;
    secondary: string;
    accent: string;
    danger: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
}

export interface BrandIdentity {
    brandName: string;
    brandShortName: string;
    brandTagline: string;
    brandDescription: string;
    brandLogoUrl: string | null;
}

const defaultColors: BrandingColors = {
    primary: '#386642', // Hunter Green
    secondary: '#CADEDF', // Platinum
    accent: '#FFEBCC', // Cornsilk
    danger: '#EF4444', // Danger Red
    background: '#141C1E', // Oxford Dark
    surface: '#1D2729', // Oxford Blue
    text: '#FFEBCC', // Cornsilk
    textMuted: '#CADEDF', // Platinum
    border: 'rgba(202, 222, 223, 0.18)',
};

const defaultIdentity: BrandIdentity = {
    brandName: 'Mountain Top Communications',
    brandShortName: 'MTC',
    brandTagline: 'Studio-Grade Digital Asset Management',
    brandDescription:
        'The official content brain for Mountain Top Communications — delivering values-based, educational, and inspiring media across Ghana and West Africa.',
    brandLogoUrl: null,
};

interface BrandingContextType {
    colors: BrandingColors;
    updateColor: (key: keyof BrandingColors, value: string) => void;
    saveColors: () => void;
    resetToDefaults: () => void;
    hasUnsavedChanges: boolean;

    // Brand Identity & Logo
    brandName: string;
    brandShortName: string;
    brandTagline: string;
    brandDescription: string;
    brandLogoUrl: string | null;
    updateBrandIdentity: (identity: Partial<BrandIdentity>) => void;
    saveBrandSettings: () => Promise<{ success: boolean; error?: string }>;
    uploadLogo: (file: File) => Promise<{ success: boolean; logoUrl?: string; error?: string }>;
    removeLogo: () => Promise<{ success: boolean; error?: string }>;
    isLoadingBranding: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
    // Initialize colors from localStorage or defaults
    const getInitialColors = (): BrandingColors => {
        if (typeof window === 'undefined') return defaultColors;

        const savedColors = localStorage.getItem('dam-branding-colors-v2');
        if (savedColors) {
            try {
                const parsed = JSON.parse(savedColors);
                return { ...defaultColors, ...parsed };
            } catch (error) {
                console.error('Error loading saved colors:', error);
                return defaultColors;
            }
        }
        return defaultColors;
    };

    const [colors, setColors] = useState<BrandingColors>(getInitialColors);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Brand Identity State
    const [brandName, setBrandName] = useState(defaultIdentity.brandName);
    const [brandShortName, setBrandShortName] = useState(defaultIdentity.brandShortName);
    const [brandTagline, setBrandTagline] = useState(defaultIdentity.brandTagline);
    const [brandDescription, setBrandDescription] = useState(defaultIdentity.brandDescription);
    const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
    const [isLoadingBranding, setIsLoadingBranding] = useState(true);

    const lightenColor = useCallback((color: string, percent: number) => {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = ((num >> 8) & 0x00ff) + amt;
        const B = (num & 0x0000ff) + amt;
        return (
            '#' +
            (
                0x1000000 +
                (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
                (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
                (B < 255 ? (B < 1 ? 0 : B) : 255)
            )
                .toString(16)
                .slice(1)
        );
    }, []);

    const applyColors = useCallback(
        (colorSet: BrandingColors) => {
            if (typeof window === 'undefined') return;

            const root = document.documentElement;
            root.style.setProperty('--accent-color', colorSet.primary);
            root.style.setProperty('--success-color', colorSet.secondary);
            root.style.setProperty('--warning-color', colorSet.accent);
            root.style.setProperty('--danger-color', colorSet.danger);
            root.style.setProperty('--bg-color', colorSet.background);
            root.style.setProperty('--panel-bg', colorSet.surface);
            root.style.setProperty('--text-main', colorSet.text);
            root.style.setProperty('--text-muted', colorSet.textMuted);
            root.style.setProperty('--border-color', colorSet.border);
            root.style.setProperty('--accent-light', `${colorSet.primary}20`);
            root.style.setProperty(
                '--panel-hover',
                colorSet.surface === '#141414' ? '#1e1e1e' : lightenColor(colorSet.surface, 10)
            );
        },
        [lightenColor]
    );

    // Fetch server branding on mount
    useEffect(() => {
        let isMounted = true;
        async function fetchBranding() {
            try {
                const res = await fetch('/api/settings/branding');
                if (res.ok) {
                    const data = await res.json();
                    if (!isMounted) return;
                    if (data.brandName) setBrandName(data.brandName);
                    if (data.brandShortName) setBrandShortName(data.brandShortName);
                    if (data.brandTagline) setBrandTagline(data.brandTagline);
                    if (data.brandDescription) setBrandDescription(data.brandDescription);
                    if (data.brandLogoUrl) setBrandLogoUrl(data.brandLogoUrl);
                    if (data.colors) {
                        setColors(prev => ({ ...prev, ...data.colors }));
                        applyColors({ ...defaultColors, ...data.colors });
                    }
                }
            } catch (err) {
                console.error('Failed to load server branding:', err);
            } finally {
                if (isMounted) setIsLoadingBranding(false);
            }
        }

        fetchBranding();
        return () => {
            isMounted = false;
        };
    }, [applyColors]);

    useEffect(() => {
        applyColors(colors);
    }, [colors, applyColors]);

    const updateColor = (key: keyof BrandingColors, value: string) => {
        const newColors = { ...colors, [key]: value };
        setColors(newColors);
        setHasUnsavedChanges(true);
        applyColors(newColors);
    };

    const updateBrandIdentity = (identity: Partial<BrandIdentity>) => {
        if (identity.brandName !== undefined) setBrandName(identity.brandName);
        if (identity.brandShortName !== undefined) setBrandShortName(identity.brandShortName);
        if (identity.brandTagline !== undefined) setBrandTagline(identity.brandTagline);
        if (identity.brandDescription !== undefined) setBrandDescription(identity.brandDescription);
        if (identity.brandLogoUrl !== undefined) setBrandLogoUrl(identity.brandLogoUrl);
        setHasUnsavedChanges(true);
    };

    const saveBrandSettings = async (): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await fetch('/api/settings/branding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brandName,
                    brandShortName,
                    brandTagline,
                    brandDescription,
                    colors,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                localStorage.setItem('dam-branding-colors-v2', JSON.stringify(colors));
                setHasUnsavedChanges(false);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Failed to save brand identity' };
            }
        } catch (err: any) {
            return { success: false, error: err?.message || 'Network error saving brand identity' };
        }
    };

    const uploadLogo = async (file: File): Promise<{ success: boolean; logoUrl?: string; error?: string }> => {
        try {
            const formData = new FormData();
            formData.append('logo', file);
            formData.append('brandName', brandName);
            formData.append('brandShortName', brandShortName);
            formData.append('brandTagline', brandTagline);
            formData.append('brandDescription', brandDescription);

            const res = await fetch('/api/settings/branding', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.success) {
                // Add timestamp to bust client image cache
                const newUrl = `/api/settings/branding/logo?t=${Date.now()}`;
                setBrandLogoUrl(newUrl);
                setHasUnsavedChanges(false);
                return { success: true, logoUrl: newUrl };
            } else {
                return { success: false, error: data.error || 'Failed to upload logo' };
            }
        } catch (err: any) {
            return { success: false, error: err?.message || 'Network error uploading logo' };
        }
    };

    const removeLogo = async (): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await fetch('/api/settings/branding', {
                method: 'DELETE',
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setBrandLogoUrl(null);
                setHasUnsavedChanges(false);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Failed to remove logo' };
            }
        } catch (err: any) {
            return { success: false, error: err?.message || 'Network error removing logo' };
        }
    };

    const saveColors = () => {
        saveBrandSettings();
    };

    const resetToDefaults = () => {
        setColors(defaultColors);
        applyColors(defaultColors);
        setHasUnsavedChanges(true);
    };

    return (
        <BrandingContext.Provider
            value={{
                colors,
                updateColor,
                saveColors,
                resetToDefaults,
                hasUnsavedChanges,
                brandName,
                brandShortName,
                brandTagline,
                brandDescription,
                brandLogoUrl,
                updateBrandIdentity,
                saveBrandSettings,
                uploadLogo,
                removeLogo,
                isLoadingBranding,
            }}
        >
            {children}
        </BrandingContext.Provider>
    );
}

export function useBranding() {
    const context = useContext(BrandingContext);
    if (context === undefined) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
}