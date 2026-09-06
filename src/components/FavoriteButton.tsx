'use client';

import { useState, useEffect } from 'react';

interface FavoriteButtonProps {
    assetId: string;
    initialFavorited?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export default function FavoriteButton({
    assetId,
    initialFavorited = false,
    size = 'md',
    className = ''
}: FavoriteButtonProps) {
    const [isFavorited, setIsFavorited] = useState(initialFavorited);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsFavorited(initialFavorited);
    }, [initialFavorited]);

    const toggleFavorite = async () => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const method = isFavorited ? 'DELETE' : 'POST';
            const response = await fetch(`/api/favorites${isFavorited ? `/${assetId}` : ''}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: isFavorited ? undefined : JSON.stringify({ assetId }),
            });

            if (response.ok) {
                setIsFavorited(!isFavorited);

                // Show notification
                const notification = document.createElement('div');
                notification.textContent = isFavorited
                    ? 'Removed from favorites'
                    : 'Added to favorites';
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
                    animation: slideIn 0.3s ease;
                `;
                document.body.appendChild(notification);
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 2000);
            } else {
                console.error('Failed to toggle favorite');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    };

    const iconSizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    return (
        <button
            onClick={toggleFavorite}
            disabled={isLoading}
            className={`
                ${sizeClasses[size]}
                flex items-center justify-center
                rounded-full transition-all duration-200
                hover:scale-110 active:scale-95
                ${isFavorited
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            <svg
                className={`${iconSizeClasses[size]} ${isFavorited ? 'fill-current' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        </button>
    );
}