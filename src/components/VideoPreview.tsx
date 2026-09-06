'use client';

import { useRef, useState } from 'react';

interface VideoPreviewProps {
    src: string;
    title: string;
    onComment?: (timestamp: number, text: string) => void;
}

export function VideoPreview({ src, title, onComment }: VideoPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [commentText, setCommentText] = useState('');

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleAddComment = () => {
        if (commentText.trim() && onComment) {
            onComment(currentTime, commentText);
            setCommentText('');
        }
    };

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins
            .toString()
            .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4">
            <div className="bg-black rounded-lg overflow-hidden">
                <video
                    ref={videoRef}
                    src={src}
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="w-full"
                />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{title}</h3>
                    <span className="text-sm text-gray-600">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>

                {onComment && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={`Add comment at ${formatTime(currentTime)}...`}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleAddComment}
                                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                            >
                                Comment
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
