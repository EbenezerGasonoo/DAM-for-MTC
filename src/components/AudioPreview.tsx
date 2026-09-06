'use client';

import { useRef, useState } from 'react';

interface AudioPreviewProps {
    src: string;
    title: string;
}

export function AudioPreview({ src, title }: AudioPreviewProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4">
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />

            <div className="p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-lg mb-4">{title}</h3>

                {/* Player Controls */}
                <div className="space-y-4">
                    <div className="flex items-center justify-center">
                        <button
                            onClick={handlePlayPause}
                            className="w-16 h-16 rounded-full bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center text-2xl font-bold"
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            value={currentTime}
                            onChange={(e) => {
                                if (audioRef.current) {
                                    audioRef.current.currentTime = parseFloat(e.target.value);
                                    setCurrentTime(parseFloat(e.target.value));
                                }
                            }}
                            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm">🔊</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            defaultValue="1"
                            onChange={(e) => {
                                if (audioRef.current) {
                                    audioRef.current.volume = parseFloat(e.target.value);
                                }
                            }}
                            className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
