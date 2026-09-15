'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/lib/auth-context';

export type ReportType = 'BUG' | 'ASSET_ISSUE' | 'PROJECT_STATUS' | 'ACCESS_REQUEST' | 'FEEDBACK' | 'OTHER';
export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

interface ReportItem {
    id: string;
    title: string;
    description: string;
    type: ReportType;
    priority: ReportPriority;
    status: ReportStatus;
    resolution?: string | null;
    resolvedAt?: string | null;
    submittedById: string;
    submittedBy: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    assetId?: string | null;
    asset?: {
        id: string;
        title: string;
        type: string;
    } | null;
    projectId?: string | null;
    project?: {
        id: string;
        name: string;
    } | null;
    systemInfo?: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ReportStats {
    total: number;
    open: number;
    inReview: number;
    resolved: number;
    closed: number;
    urgentPending: number;
    byType: Record<string, number>;
}

const TYPE_CONFIG: Record<ReportType, { label: string; icon: string; bg: string; color: string; desc: string }> = {
    BUG: { label: 'Bug / Technical Issue', icon: '🐛', bg: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', desc: 'System glitch, upload failure, or playback issue' },
    ASSET_ISSUE: { label: 'Asset / Content Issue', icon: '📁', bg: 'rgba(245, 158, 11, 0.15)', color: '#FCD34D', desc: 'Corrupt media, copyright claim, or missing metadata' },
    PROJECT_STATUS: { label: 'Production Status', icon: '📊', bg: 'rgba(59, 130, 246, 0.15)', color: '#93C5FD', desc: 'Milestone delivery, handoff report, or review cycle' },
    ACCESS_REQUEST: { label: 'Access Request', icon: '🔑', bg: 'rgba(6, 182, 212, 0.15)', color: '#67E8F9', desc: 'Permission upgrade, folder access, or client share' },
    FEEDBACK: { label: 'Feature / Feedback', icon: '💡', bg: 'rgba(56, 102, 66, 0.25)', color: '#FFEBCC', desc: 'Feature request or general operational improvement' },
    OTHER: { label: 'General / Other', icon: '📝', bg: 'rgba(202, 222, 223, 0.15)', color: '#CADEDF', desc: 'Any other inquiries or administrative notes' },
};

const PRIORITY_CONFIG: Record<ReportPriority, { label: string; color: string; bg: string; border: string }> = {
    CRITICAL: { label: 'Critical', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.18)', border: '#EF4444' },
    HIGH: { label: 'High', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.18)', border: '#F59E0B' },
    MEDIUM: { label: 'Medium', color: '#386642', bg: 'rgba(56, 102, 66, 0.3)', border: '#386642' },
    LOW: { label: 'Low', color: '#CADEDF', bg: 'rgba(202, 222, 223, 0.12)', border: 'rgba(202, 222, 223, 0.25)' },
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; bg: string; icon: string }> = {
    OPEN: { label: 'Open', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', icon: '⚠️' },
    IN_REVIEW: { label: 'In Review', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', icon: '⏳' },
    RESOLVED: { label: 'Resolved', color: '#386642', bg: 'rgba(56, 102, 66, 0.25)', icon: '✅' },
    CLOSED: { label: 'Closed', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.15)', icon: '📁' },
};

export default function ReportsPage() {
    const { user } = useAuth();
    const [, startTransition] = useTransition();

    // Data states
    const [reports, setReports] = useState<ReportItem[]>([]);
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [myReportsOnly, setMyReportsOnly] = useState(false);

    // Modals
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [activeReport, setActiveReport] = useState<ReportItem | null>(null);

    // Submit form state
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [formType, setFormType] = useState<ReportType>('BUG');
    const [formPriority, setFormPriority] = useState<ReportPriority>('MEDIUM');
    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formProjectId, setFormProjectId] = useState('');
    const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

    // Admin resolution state
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [resolutionNote, setResolutionNote] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<ReportStatus>('IN_REVIEW');

    const isPrivileged = user && ['ADMIN', 'PRODUCER', 'EDITOR'].includes(user.role);

    // Load reports and stats
    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'ALL') params.append('status', statusFilter);
            if (typeFilter !== 'ALL') params.append('type', typeFilter);
            if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
            if (myReportsOnly) params.append('myReports', 'true');
            if (search.trim()) params.append('search', search.trim());

            const res = await fetch(`/api/reports?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports || []);
            }
        } catch (err) {
            console.error('Failed to load reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const params = new URLSearchParams();
            if (myReportsOnly) params.append('myReports', 'true');
            const res = await fetch(`/api/reports/stats?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setProjects(data.map((p) => ({ id: p.id, name: p.name })));
                }
            }
        } catch {
            // Ignore error
        }
    };

    useEffect(() => {
        fetchReports();
        fetchStats();
    }, [statusFilter, typeFilter, priorityFilter, myReportsOnly, search]);

    useEffect(() => {
        fetchProjects();
    }, []);

    // Open detail drawer
    const handleOpenDetail = (report: ReportItem) => {
        setActiveReport(report);
        setSelectedStatus(report.status);
        setResolutionNote(report.resolution || '');
    };

    // Submit new report
    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (!formTitle.trim()) {
            setSubmitError('Please enter a report title');
            return;
        }
        if (!formDesc.trim()) {
            setSubmitError('Please provide a description of the issue or report');
            return;
        }

        try {
            setSubmitting(true);

            let systemInfo = null;
            if (includeDiagnostics && typeof window !== 'undefined') {
                systemInfo = {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    viewport: `${window.innerWidth}x${window.innerHeight}`,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                };
            }

            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formTitle.trim(),
                    description: formDesc.trim(),
                    type: formType,
                    priority: formPriority,
                    projectId: formProjectId || null,
                    systemInfo,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to submit report');
            }

            setSubmitSuccess(true);
            setTimeout(() => {
                setShowSubmitModal(false);
                setSubmitSuccess(false);
                setFormTitle('');
                setFormDesc('');
                setFormProjectId('');
                fetchReports();
                fetchStats();
            }, 1000);
        } catch (err: any) {
            setSubmitError(err?.message || 'Error submitting report');
        } finally {
            setSubmitting(false);
        }
    };

    // Admin update status and resolution
    const handleUpdateReportStatus = async () => {
        if (!activeReport) return;
        try {
            setUpdatingStatus(true);
            const res = await fetch(`/api/reports/${activeReport.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: selectedStatus,
                    resolution: resolutionNote,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setActiveReport(data.report);
                startTransition(() => {
                    fetchReports();
                    fetchStats();
                });
            }
        } catch (err) {
            console.error('Failed to update report status:', err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Delete report
    const handleDeleteReport = async (reportId: string) => {
        if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/reports/${reportId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setActiveReport(null);
                fetchReports();
                fetchStats();
            }
        } catch (err) {
            console.error('Failed to delete report:', err);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <Sidebar>
            <Header
                title="Reports & Issue Tracking"
                subtitle="Submit, monitor, and resolve system issues, production status, and asset reports"
                actions={
                    <button
                        onClick={() => {
                            setSubmitError('');
                            setSubmitSuccess(false);
                            setShowSubmitModal(true);
                        }}
                        style={{
                            background: 'linear-gradient(135deg, var(--mtc-hunter-green) 0%, #294D31 100%)',
                            color: 'var(--mtc-cornsilk)',
                            border: '1px solid rgba(255, 235, 204, 0.3)',
                            padding: '9px 18px',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            fontFamily: 'var(--font-brand)',
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(56, 102, 66, 0.45)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.35)';
                        }}
                    >
                        <span style={{ fontSize: '1.1rem' }}>+</span>
                        <span>Submit New Report</span>
                    </button>
                }
            />

            <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Top Metrics Cards */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--panel-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '18px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                Total Reports
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', marginTop: '4px' }}>
                                {stats ? stats.total : '—'}
                            </div>
                        </div>
                        <div style={{ fontSize: '2rem', opacity: 0.8 }}>📋</div>
                    </div>

                    <div
                        style={{
                            backgroundColor: 'var(--panel-bg)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '18px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                Action Required
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#F59E0B', marginTop: '4px' }}>
                                {stats ? stats.open : '—'}
                            </div>
                        </div>
                        <div style={{ fontSize: '2rem', opacity: 0.8 }}>⚠️</div>
                    </div>

                    <div
                        style={{
                            backgroundColor: 'var(--panel-bg)',
                            border: '1px solid rgba(96, 165, 250, 0.3)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '18px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                In Review
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#60A5FA', marginTop: '4px' }}>
                                {stats ? stats.inReview : '—'}
                            </div>
                        </div>
                        <div style={{ fontSize: '2rem', opacity: 0.8 }}>⏳</div>
                    </div>

                    <div
                        style={{
                            backgroundColor: 'var(--panel-bg)',
                            border: '1px solid rgba(56, 102, 66, 0.4)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '18px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#A7F3D0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                Resolved
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#34D399', marginTop: '4px' }}>
                                {stats ? stats.resolved : '—'}
                            </div>
                        </div>
                        <div style={{ fontSize: '2rem', opacity: 0.8 }}>✅</div>
                    </div>

                    {stats && stats.urgentPending > 0 && (
                        <div
                            style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '18px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#FCA5A5', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                    High / Critical
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#EF4444', marginTop: '4px' }}>
                                    {stats.urgentPending}
                                </div>
                            </div>
                            <div style={{ fontSize: '2rem', opacity: 0.9 }}>🚨</div>
                        </div>
                    )}
                </div>

                {/* Filter and Search Bar */}
                <div
                    style={{
                        backgroundColor: 'var(--panel-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 20px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '16px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    {/* Search Input */}
                    <div style={{ flex: '1 1 260px', minWidth: '220px', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search by title, description, or notes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 14px 10px 36px',
                                color: 'var(--mtc-cornsilk)',
                                fontSize: '0.88rem',
                                outline: 'none',
                                fontFamily: 'var(--font-body)',
                            }}
                        />
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.9rem' }}>
                            🔍
                        </span>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        {/* Type filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            style={{
                                backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                padding: '8px 12px',
                                color: 'var(--mtc-cornsilk)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            <option value="ALL">All Types</option>
                            <option value="BUG">🐛 Bug / Issue</option>
                            <option value="ASSET_ISSUE">📁 Asset Issue</option>
                            <option value="PROJECT_STATUS">📊 Production Status</option>
                            <option value="ACCESS_REQUEST">🔑 Access Request</option>
                            <option value="FEEDBACK">💡 Feedback</option>
                            <option value="OTHER">📝 Other</option>
                        </select>

                        {/* Status filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                padding: '8px 12px',
                                color: 'var(--mtc-cornsilk)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="OPEN">⚠️ Open</option>
                            <option value="IN_REVIEW">⏳ In Review</option>
                            <option value="RESOLVED">✅ Resolved</option>
                            <option value="CLOSED">📁 Closed</option>
                        </select>

                        {/* Priority filter */}
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            style={{
                                backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                padding: '8px 12px',
                                color: 'var(--mtc-cornsilk)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            <option value="ALL">All Priorities</option>
                            <option value="CRITICAL">🔴 Critical</option>
                            <option value="HIGH">🟠 High</option>
                            <option value="MEDIUM">🟢 Medium</option>
                            <option value="LOW">⚪ Low</option>
                        </select>

                        {/* My Reports Toggle for Privileged Users */}
                        {isPrivileged && (
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: myReportsOnly ? 'var(--accent-light)' : 'transparent',
                                    border: myReportsOnly ? '1px solid var(--mtc-hunter-green)' : '1px solid transparent',
                                    userSelect: 'none',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={myReportsOnly}
                                    onChange={(e) => setMyReportsOnly(e.target.checked)}
                                    style={{ cursor: 'pointer', accentColor: 'var(--mtc-hunter-green)' }}
                                />
                                <span>My Submissions Only</span>
                            </label>
                        )}
                    </div>
                </div>

                {/* Reports List */}
                {loading ? (
                    <div
                        style={{
                            padding: '60px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            color: 'var(--text-dim)',
                        }}
                    >
                        <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⏳</div>
                        <div>Loading reports...</div>
                    </div>
                ) : reports.length === 0 ? (
                    <div
                        style={{
                            backgroundColor: 'var(--panel-bg)',
                            border: '1px dashed var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '60px 24px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px',
                        }}
                    >
                        <div style={{ fontSize: '3rem', opacity: 0.6 }}>📋</div>
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--mtc-cornsilk)' }}>No Reports Found</h3>
                        <p style={{ color: 'var(--text-dim)', maxWidth: '440px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            {search || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                                ? 'No reports matched your active filter criteria. Try clearing some filters.'
                                : 'There are no submitted reports yet. Use the "Submit New Report" button to log an issue or status update.'}
                        </p>
                        <button
                            onClick={() => {
                                setSubmitError('');
                                setShowSubmitModal(true);
                            }}
                            style={{
                                marginTop: '8px',
                                background: 'var(--accent-light)',
                                color: 'var(--mtc-cornsilk)',
                                border: '1px solid var(--mtc-hunter-green)',
                                padding: '8px 18px',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                            }}
                        >
                            + Submit First Report
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {reports.map((report) => {
                            const typeCfg = TYPE_CONFIG[report.type] || TYPE_CONFIG.OTHER;
                            const prioCfg = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.MEDIUM;
                            const statCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.OPEN;

                            return (
                                <div
                                    key={report.id}
                                    onClick={() => handleOpenDetail(report)}
                                    style={{
                                        backgroundColor: 'var(--panel-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--mtc-hunter-green)';
                                        e.currentTarget.style.backgroundColor = 'var(--panel-hover)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                        e.currentTarget.style.backgroundColor = 'var(--panel-bg)';
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    {/* Left Accent Bar for Critical/High */}
                                    {report.priority === 'CRITICAL' && (
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: '#EF4444' }} />
                                    )}
                                    {report.priority === 'HIGH' && (
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: '#F59E0B' }} />
                                    )}

                                    {/* Header Row: Badges & Timestamp */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                                            {/* Type Badge */}
                                            <span
                                                style={{
                                                    backgroundColor: typeCfg.bg,
                                                    color: typeCfg.color,
                                                    padding: '3px 10px',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                }}
                                            >
                                                <span>{typeCfg.icon}</span>
                                                <span>{typeCfg.label}</span>
                                            </span>

                                            {/* Priority Pill */}
                                            <span
                                                style={{
                                                    backgroundColor: prioCfg.bg,
                                                    color: prioCfg.color,
                                                    border: `1px solid ${prioCfg.border}`,
                                                    padding: '2px 8px',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 600,
                                                    letterSpacing: '0.04em',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {prioCfg.label}
                                            </span>

                                            {/* Status Badge */}
                                            <span
                                                style={{
                                                    backgroundColor: statCfg.bg,
                                                    color: statCfg.color,
                                                    padding: '3px 10px',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                }}
                                            >
                                                <span>{statCfg.icon}</span>
                                                <span>{statCfg.label}</span>
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>🕒</span>
                                            <span>{formatDate(report.createdAt)}</span>
                                        </div>
                                    </div>

                                    {/* Title & Description */}
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', color: 'var(--mtc-cornsilk)', fontWeight: 600, marginBottom: '6px' }}>
                                            {report.title}
                                        </h3>
                                        <p
                                            style={{
                                                fontSize: '0.88rem',
                                                color: 'var(--text-muted)',
                                                lineHeight: 1.5,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {report.description}
                                        </p>
                                    </div>

                                    {/* Resolution Preview if Resolved */}
                                    {report.resolution && (
                                        <div
                                            style={{
                                                backgroundColor: 'rgba(56, 102, 66, 0.15)',
                                                borderLeft: '3px solid var(--mtc-hunter-green)',
                                                padding: '8px 12px',
                                                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                                                fontSize: '0.82rem',
                                                color: 'var(--mtc-cornsilk)',
                                            }}
                                        >
                                            <span style={{ fontWeight: 600, color: '#A7F3D0', marginRight: '6px' }}>Resolution:</span>
                                            <span>{report.resolution}</span>
                                        </div>
                                    )}

                                    {/* Footer: Submitter & Relations */}
                                    <div
                                        style={{
                                            borderTop: '1px solid var(--border-subtle)',
                                            paddingTop: '10px',
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '0.8rem',
                                            gap: '10px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--mtc-hunter-green)',
                                                    color: 'var(--mtc-cornsilk)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {report.submittedBy.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 500 }}>
                                                {report.submittedBy.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.68rem',
                                                    color: 'var(--text-dim)',
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: 'rgba(202, 222, 223, 0.08)',
                                                }}
                                            >
                                                {report.submittedBy.role}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {report.project && (
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        color: '#93C5FD',
                                                        fontSize: '0.78rem',
                                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    <span>▣</span>
                                                    <span>{report.project.name}</span>
                                                </span>
                                            )}

                                            {report.asset && (
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        color: '#FCD34D',
                                                        fontSize: '0.78rem',
                                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    <span>◰</span>
                                                    <span>{report.asset.title}</span>
                                                </span>
                                            )}

                                            <span style={{ color: 'var(--mtc-hunter-green)', fontWeight: 600, fontSize: '0.8rem' }}>
                                                View Details →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* SUBMIT REPORT MODAL */}
            {/* ========================================================= */}
            {showSubmitModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(10, 15, 17, 0.75)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px',
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowSubmitModal(false);
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--mtc-oxford-blue)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            width: '100%',
                            maxWidth: '640px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '28px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', color: 'var(--mtc-cornsilk)', fontWeight: 700 }}>
                                    Submit New Report
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                    Log an issue, technical error, production milestone, or operational request
                                </p>
                            </div>
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {submitError && (
                            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                                {submitError}
                            </div>
                        )}

                        {submitSuccess && (
                            <div style={{ backgroundColor: 'rgba(56, 102, 66, 0.25)', border: '1px solid var(--mtc-hunter-green)', color: '#A7F3D0', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                                ✅ Report successfully submitted! Refreshing dashboard...
                            </div>
                        )}

                        <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Type Selector Tabs */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '8px' }}>
                                    Report Category *
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                                    {(Object.keys(TYPE_CONFIG) as ReportType[]).map((typeKey) => {
                                        const cfg = TYPE_CONFIG[typeKey];
                                        const isSelected = formType === typeKey;
                                        return (
                                            <button
                                                type="button"
                                                key={typeKey}
                                                onClick={() => setFormType(typeKey)}
                                                style={{
                                                    backgroundColor: isSelected ? 'var(--accent-light)' : 'rgba(20, 28, 30, 0.6)',
                                                    border: isSelected ? '1.5px solid var(--mtc-hunter-green)' : '1px solid var(--border-color)',
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: '10px 12px',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '3px',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: isSelected ? 'var(--mtc-cornsilk)' : 'var(--text-muted)' }}>
                                                    <span>{cfg.icon}</span>
                                                    <span>{cfg.label.split('/')[0]}</span>
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                                                    {cfg.desc}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Priority Selector */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '8px' }}>
                                    Priority Level
                                </label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as ReportPriority[]).map((prio) => {
                                        const cfg = PRIORITY_CONFIG[prio];
                                        const isSelected = formPriority === prio;
                                        return (
                                            <button
                                                type="button"
                                                key={prio}
                                                onClick={() => setFormPriority(prio)}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '80px',
                                                    backgroundColor: isSelected ? cfg.bg : 'rgba(20, 28, 30, 0.6)',
                                                    border: isSelected ? `1.5px solid ${cfg.border}` : '1px solid var(--border-color)',
                                                    color: isSelected ? cfg.color : 'var(--text-dim)',
                                                    padding: '8px 12px',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Title Field */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                    Report Title *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 4K Proxy Transcode Failed on Drone Roll 3"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '10px 14px',
                                        color: 'var(--mtc-cornsilk)',
                                        fontSize: '0.88rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Description Field */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                    Detailed Description & Steps to Reproduce *
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Describe what occurred, any error messages encountered, or the specific outcome needed..."
                                    value={formDesc}
                                    onChange={(e) => setFormDesc(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '10px 14px',
                                        color: 'var(--mtc-cornsilk)',
                                        fontSize: '0.88rem',
                                        outline: 'none',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            {/* Optional Project Association */}
                            {projects.length > 0 && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                        Link to Project (Optional)
                                    </label>
                                    <select
                                        value={formProjectId}
                                        onChange={(e) => setFormProjectId(e.target.value)}
                                        style={{
                                            width: '100%',
                                            backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '10px 14px',
                                            color: 'var(--mtc-cornsilk)',
                                            fontSize: '0.88rem',
                                            outline: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value="">-- No specific project --</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Diagnostics toggle */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={includeDiagnostics}
                                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                                    style={{ accentColor: 'var(--mtc-hunter-green)', cursor: 'pointer' }}
                                />
                                <span>Include browser and display diagnostics (recommended for technical bug resolution)</span>
                            </label>

                            {/* Submit CTA */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowSubmitModal(false)}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-muted)',
                                        padding: '9px 18px',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        background: 'linear-gradient(135deg, var(--mtc-hunter-green) 0%, #294D31 100%)',
                                        color: 'var(--mtc-cornsilk)',
                                        border: '1px solid rgba(255, 235, 204, 0.3)',
                                        padding: '9px 22px',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.88rem',
                                        fontWeight: 600,
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        opacity: submitting ? 0.7 : 1,
                                    }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* REPORT DETAIL DRAWER / MODAL */}
            {/* ========================================================= */}
            {activeReport && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(10, 15, 17, 0.75)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px',
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setActiveReport(null);
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--mtc-oxford-blue)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            width: '100%',
                            maxWidth: '720px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '28px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '22px',
                        }}
                    >
                        {/* Drawer Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span
                                        style={{
                                            backgroundColor: TYPE_CONFIG[activeReport.type]?.bg,
                                            color: TYPE_CONFIG[activeReport.type]?.color,
                                            padding: '3px 10px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {TYPE_CONFIG[activeReport.type]?.icon} {TYPE_CONFIG[activeReport.type]?.label}
                                    </span>
                                    <span
                                        style={{
                                            backgroundColor: PRIORITY_CONFIG[activeReport.priority]?.bg,
                                            color: PRIORITY_CONFIG[activeReport.priority]?.color,
                                            padding: '2px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {PRIORITY_CONFIG[activeReport.priority]?.label}
                                    </span>
                                    <span
                                        style={{
                                            backgroundColor: STATUS_CONFIG[activeReport.status]?.bg,
                                            color: STATUS_CONFIG[activeReport.status]?.color,
                                            padding: '3px 10px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {STATUS_CONFIG[activeReport.status]?.icon} {STATUS_CONFIG[activeReport.status]?.label}
                                    </span>
                                </div>
                                <h2 style={{ fontSize: '1.3rem', color: 'var(--mtc-cornsilk)', fontWeight: 700, lineHeight: 1.3 }}>
                                    {activeReport.title}
                                </h2>
                            </div>
                            <button
                                onClick={() => setActiveReport(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Submitter & Metadata Row */}
                        <div
                            style={{
                                backgroundColor: 'rgba(20, 28, 30, 0.6)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 16px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                gap: '12px',
                                fontSize: '0.82rem',
                            }}
                        >
                            <div>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Submitted By</div>
                                <div style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600, marginTop: '2px' }}>
                                    {activeReport.submittedBy.name} ({activeReport.submittedBy.role})
                                </div>
                            </div>
                            <div>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Submission Date</div>
                                <div style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600, marginTop: '2px' }}>
                                    {new Date(activeReport.createdAt).toLocaleString()}
                                </div>
                            </div>
                            {activeReport.project && (
                                <div>
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Linked Project</div>
                                    <div style={{ color: '#93C5FD', fontWeight: 600, marginTop: '2px' }}>
                                        {activeReport.project.name}
                                    </div>
                                </div>
                            )}
                            {activeReport.asset && (
                                <div>
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Linked Asset</div>
                                    <div style={{ color: '#FCD34D', fontWeight: 600, marginTop: '2px' }}>
                                        {activeReport.asset.title}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Full Description */}
                        <div>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                Report Description
                            </h4>
                            <div
                                style={{
                                    backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '14px 18px',
                                    color: 'var(--mtc-cornsilk)',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {activeReport.description}
                            </div>
                        </div>

                        {/* Resolution Display if available */}
                        {activeReport.resolution && (
                            <div
                                style={{
                                    backgroundColor: 'rgba(56, 102, 66, 0.15)',
                                    border: '1px solid var(--mtc-hunter-green)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '14px 18px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#A7F3D0', fontWeight: 600, fontSize: '0.85rem' }}>
                                        ✅ Resolution Notes
                                    </span>
                                    {activeReport.resolvedAt && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                            Resolved {new Date(activeReport.resolvedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div style={{ color: 'var(--mtc-cornsilk)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                                    {activeReport.resolution}
                                </div>
                            </div>
                        )}

                        {/* Diagnostics Info Accordion */}
                        {activeReport.systemInfo && (
                            <details
                                style={{
                                    backgroundColor: 'rgba(20, 28, 30, 0.5)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 14px',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-dim)',
                                }}
                            >
                                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
                                    Technical Diagnostics & Environment Details
                                </summary>
                                <pre
                                    style={{
                                        marginTop: '10px',
                                        backgroundColor: '#101517',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        overflowX: 'auto',
                                        fontSize: '0.75rem',
                                        color: '#A7F3D0',
                                    }}
                                >
                                    {(() => {
                                        try {
                                            return JSON.stringify(JSON.parse(activeReport.systemInfo), null, 2);
                                        } catch {
                                            return activeReport.systemInfo;
                                        }
                                    })()}
                                </pre>
                            </details>
                        )}

                        {/* Admin Resolution & Status Action Panel */}
                        {isPrivileged && (
                            <div
                                style={{
                                    backgroundColor: 'rgba(29, 39, 41, 0.95)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '16px 18px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
                                }}
                            >
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                    🛠️ Staff Review & Status Action
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                                            Update Status
                                        </label>
                                        <select
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value as ReportStatus)}
                                            style={{
                                                width: '100%',
                                                backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '8px 12px',
                                                color: 'var(--mtc-cornsilk)',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            <option value="OPEN">⚠️ Open</option>
                                            <option value="IN_REVIEW">⏳ In Review</option>
                                            <option value="RESOLVED">✅ Resolved</option>
                                            <option value="CLOSED">📁 Closed</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                                            Resolution Notes (shared with submitter)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Proxy re-transcoded, issue resolved."
                                            value={resolutionNote}
                                            onChange={(e) => setResolutionNote(e.target.value)}
                                            style={{
                                                width: '100%',
                                                backgroundColor: 'rgba(20, 28, 30, 0.8)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '8px 12px',
                                                color: 'var(--mtc-cornsilk)',
                                                fontSize: '0.85rem',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button
                                        onClick={handleUpdateReportStatus}
                                        disabled={updatingStatus}
                                        style={{
                                            background: 'var(--mtc-hunter-green)',
                                            color: 'var(--mtc-cornsilk)',
                                            border: '1px solid rgba(255, 235, 204, 0.3)',
                                            padding: '8px 16px',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: updatingStatus ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {updatingStatus ? 'Saving...' : 'Update Status & Notes'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Footer / Delete Option */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                            {(user?.role === 'ADMIN' || (activeReport.submittedById === user?.id && activeReport.status === 'OPEN')) ? (
                                <button
                                    onClick={() => handleDeleteReport(activeReport.id)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#F87171',
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <span>🗑️</span>
                                    <span>Delete Report</span>
                                </button>
                            ) : <div />}

                            <button
                                onClick={() => setActiveReport(null)}
                                style={{
                                    backgroundColor: 'rgba(202, 222, 223, 0.1)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--mtc-cornsilk)',
                                    padding: '8px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Sidebar>
    );
}
