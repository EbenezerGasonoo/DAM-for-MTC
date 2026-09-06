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

interface BrandingContextType {
    colors: BrandingColors;
    updateColor: (key: keyof BrandingColors, value: string) => void;
    saveColors: () => void;
    resetToDefaults: () => void;
    hasUnsavedChanges: boolean;
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

    const lightenColor = useCallback((color: string, percent: number) => {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }, []);

    const applyColors = useCallback((colorSet: BrandingColors) => {
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
        root.style.setProperty('--panel-hover', colorSet.surface === '#141414' ? '#1e1e1e' : lightenColor(colorSet.surface, 10));
    }, [lightenColor]);

    useEffect(() => {
        // Apply colors on mount
        applyColors(colors);
    }, [colors, applyColors]);

    const updateColor = (key: keyof BrandingColors, value: string) => {
        const newColors = { ...colors, [key]: value };
        setColors(newColors);
        setHasUnsavedChanges(true);
        applyColors(newColors);
    };

    const saveColors = () => {
        localStorage.setItem('dam-branding-colors-v2', JSON.stringify(colors));
        setHasUnsavedChanges(false);

        // Show success notification
        if (typeof window !== 'undefined') {
            const notification = document.createElement('div');
            notification.textContent = 'Branding colors saved successfully!';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--success-color);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 1000;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
                opacity: 1;
            `;

            // Add keyframes if they don't exist
            if (!document.getElementById('branding-keyframes')) {
                const style = document.createElement('style');
                style.id = 'branding-keyframes';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes fadeOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(notification);
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 3000);
        }
    };

    const resetToDefaults = () => {
        setColors(defaultColors);
        applyColors(defaultColors);
        setHasUnsavedChanges(true);
    };

    return (
        <BrandingContext.Provider value={{
            colors,
            updateColor,
            saveColors,
            resetToDefaults,
            hasUnsavedChanges
        }}>
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