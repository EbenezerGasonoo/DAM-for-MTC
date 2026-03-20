'use client';

import React, { useState, useRef } from 'react';

export default function UploadModal({ isOpen, onClose, userId }: { isOpen: boolean; onClose: () => void; userId: string }) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setProgress(10);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title || file.name);
        // Hardcode a default creatorId for the demo
        formData.append('creatorId', userId || 'demo-user-id');

        try {
            const interval = setInterval(() => {
                setProgress(p => Math.min(p + 5, 90));
            }, 200);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);
            setProgress(100);

            if (!res.ok) {
                throw new Error('Upload failed');
            }

            setTimeout(() => {
                setIsUploading(false);
                setFile(null);
                setTitle('');
                setProgress(0);
                onClose();
            }, 500);

        } catch (err) {
            console.error(err);
            setIsUploading(false);
            alert('Upload failed. Check console.');
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div className="card" style={{ width: '500px', backgroundColor: 'var(--panel-bg)' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Upload Asset</h2>

                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: '2px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '40px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: file ? 'var(--panel-hover)' : 'transparent',
                        transition: 'all 0.2s',
                        marginBottom: '16px'
                    }}
                >
                    {file ? (
                        <div>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📄</div>
                            <div style={{ fontWeight: 500 }}>{file.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📥</div>
                            <div>Drag & Drop your media file here</div>
                            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click to browse</div>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                </div>

                {file && (
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Asset Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={file.name}
                            style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', outline: 'none' }}
                        />
                    </div>
                )}

                {isUploading && (
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                            <span>Uploading to Nextcloud...</span>
                            <span>{progress}%</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent-color)', transition: 'width 0.2s' }}></div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn" onClick={onClose} disabled={isUploading}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading ? 'Processing...' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}
