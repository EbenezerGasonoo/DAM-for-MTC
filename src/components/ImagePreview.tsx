'use client';

import { useState } from 'react';

interface ImagePreviewProps {
    src: string;
    title: string;
    images?: Array<{ src: string; title: string }>;
}

export function ImagePreview({ src, title, images = [] }: ImagePreviewProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(1);

    const allImages = images.length > 0 ? images : [{ src, title }];
    const currentImage = allImages[currentIndex];

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="space-y-4">
            {/* Main Image */}
            <div className="bg-gray-100 rounded-lg overflow-hidden relative h-96 flex items-center justify-center">
                <div
                    className="overflow-auto w-full h-full flex items-center justify-center"
                    style={{ transform: `scale(${zoomLevel})` }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={currentImage.src}
                        alt={currentImage.title}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex gap-2">
                    <button
                        onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm"
                    >
                        -
                    </button>
                    <span className="px-4 py-2 text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
                    <button
                        onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm"
                    >
                        +
                    </button>
                </div>

                <h3 className="font-semibold text-sm">{currentImage.title}</h3>

                {allImages.length > 1 && (
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrevious}
                            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm"
                        >
                            ← Prev
                        </button>
                        <span className="px-4 py-2 text-sm font-medium">
                            {currentIndex + 1} / {allImages.length}
                        </span>
                        <button
                            onClick={handleNext}
                            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {allImages.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                idx === currentIndex ? 'border-blue-500' : 'border-gray-300'
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.src} alt={img.title} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
