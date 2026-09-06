'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
    onSuccess?: () => void;
}

interface QueuedFile {
    id: string;
    file: File;
    title: string;
    size: number;
    type: string;
    progress: number;
    status: 'queued' | 'uploading' | 'completed' | 'error';
    error?: string;
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function UploadModal({ isOpen, onClose, userId, onSuccess }: UploadModalProps) {
    const { user } = useAuth();
    const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
    const [batchTags, setBatchTags] = useState<string>('');
    const [isIngesting, setIsIngesting] = useState(false);
    const [overallProgress, setOverallProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch projects for target assignment
    useEffect(() => {
        if (isOpen) {
            fetch('/api/projects')
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) setProjects(data);
                })
                .catch(err => console.error('Failed to load projects for upload:', err));
        } else {
            setFileQueue([]);
            setOverallProgress(0);
            setIsIngesting(false);
            setBatchTags('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const addFilesToQueue = (files: FileList | File[]) => {
        const newQueue: QueuedFile[] = Array.from(files).map(file => ({
            id: Math.random().toString(36).substring(2, 9),
            file,
            title: file.name.replace(/\.[^/.]+$/, ''),
            size: file.size,
            type: file.type.startsWith('video/') ? 'video'
                : file.type.startsWith('image/') ? 'image'
                : file.type.startsWith('audio/') ? 'audio'
                : 'document',
            progress: 0,
            status: 'queued',
        }));

        setFileQueue(prev => [...prev, ...newQueue]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFilesToQueue(e.dataTransfer.files);
        }
    };

    const handleRemoveFile = (id: string) => {
        setFileQueue(prev => prev.filter(f => f.id !== id));
    };

    const handleStartBatchIngest = async () => {
        if (fileQueue.length === 0 || isIngesting) return;
        setIsIngesting(true);

        const totalFiles = fileQueue.length;
        let completedCount = 0;

        for (let i = 0; i < fileQueue.length; i++) {
            const item = fileQueue[i];
            if (item.status === 'completed') {
                completedCount++;
                continue;
            }

            // Mark as uploading
            setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 5, error: undefined } : f));

            const formData = new FormData();
            formData.append('file', item.file);
            formData.append('title', item.title.trim() || item.file.name);
            formData.append('creatorId', userId || user?.id || '');
            if (selectedProjectId) {
                formData.append('projectId', selectedProjectId);
            }
            if (batchTags.trim()) {
                formData.append('tags', batchTags.trim());
            }

            try {
                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', '/api/upload');

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable && event.total > 0) {
                            // 0% to 90% during client-to-server transfer
                            const percent = Math.min(90, Math.round((event.loaded / event.total) * 90));
                            setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, progress: percent } : f));
                        }
                    };

                    xhr.upload.onload = () => {
                        // File payload sent to server, waiting for Nextcloud ingestion
                        setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, progress: 95 } : f));
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'completed', progress: 100 } : f));
                            resolve();
                        } else {
                            let errorMsg = `Upload failed (${xhr.status})`;
                            try {
                                const parsed = JSON.parse(xhr.responseText);
                                if (parsed.error) errorMsg = parsed.error;
                            } catch {
                                if (xhr.status === 504) {
                                    errorMsg = 'Server gateway timed out (504)';
                                } else if (xhr.status === 413) {
                                    errorMsg = 'File exceeds upload size limit (413)';
                                } else if (xhr.statusText) {
                                    errorMsg = `${xhr.statusText} (${xhr.status})`;
                                }
                            }
                            reject(new Error(errorMsg));
                        }
                    };

                    xhr.onerror = () => {
                        reject(new Error('Network error during upload'));
                    };

                    xhr.ontimeout = () => {
                        reject(new Error('Upload timed out'));
                    };

                    xhr.send(formData);
                });

                completedCount++;
            } catch (err: any) {
                setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: err.message || 'Upload failed' } : f));
            }

            setOverallProgress(Math.round(((i + 1) / totalFiles) * 100));
        }

        setIsIngesting(false);

        if (completedCount === totalFiles && completedCount > 0) {
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 800);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 15, 17, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
        }}>
            <div style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '720px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 102, 66, 0.2)',
                overflow: 'hidden',
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(20, 28, 30, 0.6)',
                }}>
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                            Enterprise Media Ingestion
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Batch ingest broadcast media masters, graphics, and audio stems
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isIngesting}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '1.3rem',
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Dropzone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${isDragging ? 'var(--mtc-hunter-green)' : 'rgba(202, 222, 223, 0.25)'}`,
                            borderRadius: 'var(--radius-lg)',
                            padding: '30px 20px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: isDragging ? 'rgba(56, 102, 66, 0.12)' : 'rgba(20, 28, 30, 0.5)',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files) addFilesToQueue(e.target.files);
                            }}
                        />
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📥</div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                            Drag & drop multiple media files or click to browse
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Supports 4K ProRes/H.264, Broadcast WAV, Photoshop PSD, Illustrator AI, and PDF documents
                        </p>
                    </div>

                    {/* Target Ingestion Metadata Options */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                Target Production Project
                            </label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--mtc-cornsilk)',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                }}
                            >
                                <option value="">No Project Assigned</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                Global Ingestion Tags (comma separated)
                            </label>
                            <input
                                value={batchTags}
                                onChange={(e) => setBatchTags(e.target.value)}
                                placeholder="e.g. Master, Broadcast, 4K"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--mtc-cornsilk)',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                }}
                            />
                        </div>
                    </div>

                    {/* Queued Files List */}
                    {fileQueue.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                    Ingestion Queue ({fileQueue.length} files)
                                </span>
                                {!isIngesting && (
                                    <button
                                        onClick={() => setFileQueue([])}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.78rem', cursor: 'pointer' }}
                                    >
                                        Clear queue
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                                {fileQueue.map((item) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            padding: '10px 14px',
                                            backgroundColor: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                            <span style={{ fontSize: '1.2rem' }}>
                                                {item.type === 'video' ? '🎬' : item.type === 'image' ? '🖼️' : item.type === 'audio' ? '🎵' : '📄'}
                                            </span>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--mtc-cornsilk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.file.name}
                                                </div>
                                                <div style={{ 
                                                    fontSize: '0.72rem', 
                                                    color: item.status === 'error' ? '#F87171' : 'var(--text-muted)',
                                                    overflow: 'hidden', 
                                                    textOverflow: 'ellipsis', 
                                                    whiteSpace: 'nowrap' 
                                                }} title={item.error}>
                                                    {item.status === 'error' 
                                                        ? `✕ Error: ${item.error || 'Upload failed'}`
                                                        : item.status === 'uploading' && item.progress >= 90
                                                        ? '⚡ Storing in Nextcloud...'
                                                        : `${formatBytes(item.size)} • ${item.type}`}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status / Progress Indicator */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {item.status === 'queued' && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Queued</span>
                                            )}
                                            {item.status === 'uploading' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '80px', height: '6px', backgroundColor: 'rgba(202,222,223,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${item.progress}%`, height: '100%', backgroundColor: 'var(--mtc-hunter-green)', transition: 'width 0.2s' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '32px' }}>{item.progress}%</span>
                                                </div>
                                            )}
                                            {item.status === 'completed' && (
                                                <span style={{ fontSize: '0.75rem', color: '#A7F3D0', fontWeight: 600 }}>✓ Done</span>
                                            )}
                                            {item.status === 'error' && (
                                                <span style={{ fontSize: '0.75rem', color: '#FCA5A5', fontWeight: 600 }} title={item.error}>✕ Failed</span>
                                            )}

                                            {!isIngesting && (
                                                <button
                                                    onClick={() => handleRemoveFile(item.id)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.85rem' }}
                                                    title="Remove from queue"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Overall Progress Bar */}
                    {isIngesting && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                <span>Ingesting files to MTC storage...</span>
                                <span>{overallProgress}%</span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <div style={{ width: `${overallProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--mtc-hunter-green), #4e8c5c)', transition: 'width 0.2s' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    backgroundColor: 'rgba(20, 28, 30, 0.6)',
                }}>
                    <button
                        onClick={onClose}
                        disabled={isIngesting}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStartBatchIngest}
                        disabled={fileQueue.length === 0 || isIngesting}
                        className="btn btn-primary"
                        style={{ padding: '8px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {isIngesting 
                            ? 'Ingesting Assets...' 
                            : fileQueue.some(f => f.status === 'error') 
                            ? `Retry Failed Ingest (${fileQueue.filter(f => f.status !== 'completed').length})`
                            : `Start Ingest (${fileQueue.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
}
