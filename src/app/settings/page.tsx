'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useBranding } from '@/components/BrandingContext';
import { useAuth } from '@/lib/auth-context';
import MtcLogo, { MtcLogoIcon } from '@/components/MtcLogo';

interface ActivityItem {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
    user?: { id: string; name: string; email: string };
}

interface UserItem {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        assets: number;
        activities: number;
        projects: number;
    };
}

const rbacMatrix = [
    { permission: 'Ingest Media & Stems', admin: true, producer: true, editor: true, viewer: false },
    { permission: 'Edit Technical Metadata & Tags', admin: true, producer: true, editor: true, viewer: false },
    { permission: 'Approve / Reject Workflow Stages', admin: true, producer: true, editor: false, viewer: false },
    { permission: 'Publish to Broadcast Channels', admin: true, producer: true, editor: false, viewer: false },
    { permission: 'Create Production Workspaces', admin: true, producer: true, editor: false, viewer: false },
    { permission: 'Export High-Res Master Masters (ZIP)', admin: true, producer: true, editor: true, viewer: false },
    { permission: 'Stream 1080p Proxy Media', admin: true, producer: true, editor: true, viewer: true },
    { permission: 'Configure DRM & Watermark Profiles', admin: true, producer: false, editor: false, viewer: false },
    { permission: 'View Enterprise System Audit Logs', admin: true, producer: false, editor: false, viewer: false },
    { permission: 'Delete Assets & Rollback Versions', admin: true, producer: false, editor: false, viewer: false },
];

export default function SettingsPage() {
    const {
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
        uploadLogo,
        removeLogo,
        isLoadingBranding,
    } = useBranding();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [activeTab, setActiveTab] = useState<'brand' | 'users' | 'rbac' | 'watermark' | 'audit' | 'nextcloud' | 'notifications'>('brand');

    // Brand Identity form state
    const [formBrandName, setFormBrandName] = useState(brandName);
    const [formBrandShortName, setFormBrandShortName] = useState(brandShortName);
    const [formBrandTagline, setFormBrandTagline] = useState(brandTagline);
    const [formBrandDescription, setFormBrandDescription] = useState(brandDescription);
    const [brandSaving, setBrandSaving] = useState(false);
    const [brandFeedback, setBrandFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Sync form state when branding loads from server
    useEffect(() => {
        setFormBrandName(brandName);
        setFormBrandShortName(brandShortName);
        setFormBrandTagline(brandTagline);
        setFormBrandDescription(brandDescription);
    }, [brandName, brandShortName, brandTagline, brandDescription]);

    // Logo upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoRemoving, setLogoRemoving] = useState(false);
    const [logoFeedback, setLogoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // User Management state
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('ALL');
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'EDITOR' | 'PRODUCER' | 'VIEWER'>('EDITOR');
    const [userSaving, setUserSaving] = useState(false);
    const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Audit log state
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [auditSearch, setAuditSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');

    // Nextcloud Server State
    const [ncUrl, setNcUrl] = useState('https://nextcloud.mtc-network.space/');
    const [ncUsername, setNcUsername] = useState('');
    const [ncPassword, setNcPassword] = useState('');
    const [ncRootFolder, setNcRootFolder] = useState('/mtc-dam-uploads');
    const [ncStatus, setNcStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CHECKING'>('CHECKING');
    const [ncQuota, setNcQuota] = useState<{ used: number; available: number } | null>(null);
    const [ncWebdavUrl, setNcWebdavUrl] = useState('');
    const [ncHasPassword, setNcHasPassword] = useState(false);
    const [ncTesting, setNcTesting] = useState(false);
    const [ncSaving, setNcSaving] = useState(false);
    const [ncFeedback, setNcFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Nextcloud Auto-Discovery & Sync State
    const [ncSyncFolder, setNcSyncFolder] = useState('/');
    const [ncSyncRecursive, setNcSyncRecursive] = useState(true);
    const [ncSyncing, setNcSyncing] = useState(false);
    const [ncSyncResult, setNcSyncResult] = useState<{ type: 'success' | 'error'; message: string; details?: any } | null>(null);

    // Nextcloud Folder Explorer & Target Chooser State
    const [isFolderExplorerOpen, setIsFolderExplorerOpen] = useState(false);
    const [explorerPath, setExplorerPath] = useState('/');
    const [explorerLoading, setExplorerLoading] = useState(false);
    const [explorerData, setExplorerData] = useState<{
        isUsingNextcloud: boolean;
        serverUrl: string;
        currentPath: string;
        parentPath: string | null;
        breadcrumbs: Array<{ name: string; path: string }>;
        folders: Array<{ name: string; path: string; lastmod: string }>;
        files: Array<{
            name: string;
            path: string;
            size: number;
            sizeFormatted: string;
            type: string;
            mime: string;
            lastmod: string;
        }>;
        totalFolders: number;
        totalFiles: number;
    } | null>(null);
    const [explorerError, setExplorerError] = useState<string | null>(null);
    const [explorerSearch, setExplorerSearch] = useState('');
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);

    // Email / SMTP Notification State
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState('587');
    const [smtpSecure, setSmtpSecure] = useState(false);
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPassword, setSmtpPassword] = useState('');
    const [smtpFrom, setSmtpFrom] = useState('notifications@mtc-network.space');
    const [smtpFromName, setSmtpFromName] = useState('MTC Digital Asset Management');
    const [smtpStatus, setSmtpStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'UNCONFIGURED' | 'CHECKING'>('CHECKING');
    const [smtpHasPassword, setSmtpHasPassword] = useState(false);
    const [smtpSaving, setSmtpSaving] = useState(false);
    const [smtpTesting, setSmtpTesting] = useState(false);
    const [smtpFeedback, setSmtpFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [testRecipientEmail, setTestRecipientEmail] = useState('');
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [testEmailResult, setTestEmailResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Watermark Profile state
    const [watermarkName, setWatermarkName] = useState('MTC Internal Confidential Burn-in');
    const [watermarkTemplate, setWatermarkTemplate] = useState('CONFIDENTIAL — MTC BROADCAST PIPELINE — {USER}');
    const [watermarkSaved, setWatermarkSaved] = useState(false);

    const applyOfficialMtc = () => {
        updateColor('primary', '#386642');
        updateColor('secondary', '#CADEDF');
        updateColor('accent', '#FFEBCC');
        updateColor('danger', '#EF4444');
        updateColor('background', '#141C1E');
        updateColor('surface', '#1D2729');
        updateColor('text', '#FFEBCC');
        updateColor('textMuted', '#CADEDF');
        updateColor('border', 'rgba(202, 222, 223, 0.18)');
    };

    const handleFileSelect = (file: File) => {
        setLogoFeedback(null);
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setLogoFeedback({
                type: 'error',
                message: 'Invalid file type. Please upload a PNG, SVG, JPG, or WebP image.',
            });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setLogoFeedback({
                type: 'error',
                message: 'File size exceeds 5MB limit. Please upload a smaller image file.',
            });
            return;
        }

        setSelectedLogoFile(file);
        const objectUrl = URL.createObjectURL(file);
        setLogoPreviewUrl(objectUrl);
    };

    const handleUploadLogo = async () => {
        if (!selectedLogoFile) return;
        setLogoUploading(true);
        setLogoFeedback(null);
        try {
            const result = await uploadLogo(selectedLogoFile);
            if (result.success) {
                setLogoFeedback({
                    type: 'success',
                    message: 'Brand logo uploaded and published across all systems successfully!',
                });
                setSelectedLogoFile(null);
                setLogoPreviewUrl(null);
            } else {
                setLogoFeedback({
                    type: 'error',
                    message: result.error || 'Failed to upload logo',
                });
            }
        } catch (err: any) {
            setLogoFeedback({
                type: 'error',
                message: err?.message || 'Error uploading logo',
            });
        } finally {
            setLogoUploading(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (!confirm('Are you sure you want to revert to the default vector logo emblem?')) return;
        setLogoRemoving(true);
        setLogoFeedback(null);
        try {
            const result = await removeLogo();
            if (result.success) {
                setSelectedLogoFile(null);
                setLogoPreviewUrl(null);
                setLogoFeedback({
                    type: 'success',
                    message: 'Custom logo removed. Default MTC vector emblem restored.',
                });
            } else {
                setLogoFeedback({
                    type: 'error',
                    message: result.error || 'Failed to reset logo',
                });
            }
        } catch (err: any) {
            setLogoFeedback({
                type: 'error',
                message: err?.message || 'Error resetting logo',
            });
        } finally {
            setLogoRemoving(false);
        }
    };

    const handleSaveBrandIdentity = async (e: React.FormEvent) => {
        e.preventDefault();
        setBrandSaving(true);
        setBrandFeedback(null);
        try {
            // Update context state immediately
            updateBrandIdentity({
                brandName: formBrandName,
                brandShortName: formBrandShortName,
                brandTagline: formBrandTagline,
                brandDescription: formBrandDescription,
            });

            // Save to server
            const res = await fetch('/api/settings/branding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brandName: formBrandName,
                    brandShortName: formBrandShortName,
                    brandTagline: formBrandTagline,
                    brandDescription: formBrandDescription,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setBrandFeedback({
                    type: 'success',
                    message: 'Brand identity labels updated and persisted successfully!',
                });
            } else {
                setBrandFeedback({
                    type: 'error',
                    message: data.error || 'Failed to save brand identity',
                });
            }
        } catch (err: any) {
            setBrandFeedback({
                type: 'error',
                message: err?.message || 'Network error saving brand identity',
            });
        } finally {
            setBrandSaving(false);
        }
    };

    const handleResetIdentityDefaults = () => {
        setFormBrandName('Mountain Top Communications');
        setFormBrandShortName('MTC');
        setFormBrandTagline('Studio-Grade Digital Asset Management');
        setFormBrandDescription('The official content brain for Mountain Top Communications — delivering values-based, educational, and inspiring media across Ghana and West Africa.');
    };

    const fetchAuditLogs = async () => {
        try {
            setLoadingAudit(true);
            const res = await fetch('/api/activity?limit=100');
            if (res.ok) {
                const data = await res.json();
                setActivities(data.activities || []);
            }
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoadingAudit(false);
        }
    };

    const fetchNextcloudSettings = async () => {
        try {
            setNcStatus('CHECKING');
            const res = await fetch('/api/settings/nextcloud');
            if (res.ok) {
                const data = await res.json();
                if (data.url) setNcUrl(data.url);
                if (data.username) setNcUsername(data.username);
                if (data.rootFolder) setNcRootFolder(data.rootFolder);
                if (data.webdavUrl) setNcWebdavUrl(data.webdavUrl);
                setNcHasPassword(Boolean(data.hasPassword));
                setNcStatus(data.connectionStatus || 'DISCONNECTED');
                setNcQuota(data.quota || null);
            } else {
                setNcStatus('DISCONNECTED');
            }
        } catch {
            setNcStatus('DISCONNECTED');
        }
    };

    const handleTestNextcloud = async () => {
        setNcTesting(true);
        setNcFeedback(null);
        try {
            const res = await fetch('/api/settings/nextcloud/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: ncUrl,
                    username: ncUsername,
                    password: ncPassword || (ncHasPassword ? '••••••••' : ''),
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setNcStatus('CONNECTED');
                if (data.quota) setNcQuota(data.quota);
                setNcFeedback({ type: 'success', message: 'Connection successful! WebDAV verified and ready.' });
            } else {
                setNcStatus('DISCONNECTED');
                setNcFeedback({ type: 'error', message: data.error || 'Connection failed. Please check credentials.' });
            }
        } catch (err: any) {
            setNcStatus('DISCONNECTED');
            setNcFeedback({ type: 'error', message: err?.message || 'Network error while testing connection.' });
        } finally {
            setNcTesting(false);
        }
    };

    const handleSaveNextcloud = async (e: React.FormEvent) => {
        e.preventDefault();
        setNcSaving(true);
        setNcFeedback(null);
        try {
            const res = await fetch('/api/settings/nextcloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: ncUrl,
                    username: ncUsername,
                    password: ncPassword,
                    rootFolder: ncRootFolder,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setNcStatus(data.connectionStatus);
                if (data.quota) setNcQuota(data.quota);
                if (ncPassword) setNcHasPassword(true);
                setNcPassword('');
                setNcFeedback({ type: 'success', message: data.message || 'Nextcloud settings saved successfully!' });
            } else {
                setNcFeedback({ type: 'error', message: data.error || 'Failed to save Nextcloud settings.' });
            }
        } catch (err: any) {
            setNcFeedback({ type: 'error', message: err?.message || 'Failed to save settings.' });
        } finally {
            setNcSaving(false);
        }
    };

    const handleSyncNextcloud = async () => {
        setNcSyncing(true);
        setNcSyncResult(null);
        try {
            const res = await fetch('/api/settings/nextcloud/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folder: ncSyncFolder,
                    recursive: ncSyncRecursive,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setNcSyncResult({
                    type: 'success',
                    message: data.message,
                    details: data,
                });
            } else {
                setNcSyncResult({
                    type: 'error',
                    message: data.error || 'Sync failed. Ensure Nextcloud connection is valid.',
                });
            }
        } catch (err: any) {
            setNcSyncResult({
                type: 'error',
                message: err?.message || 'Network error during synchronization.',
            });
        } finally {
            setNcSyncing(false);
        }
    };

    const fetchFolders = async (targetPath: string = '/', action?: string, folderName?: string) => {
        setExplorerLoading(true);
        setExplorerError(null);
        try {
            const res = await fetch('/api/settings/nextcloud/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: targetPath,
                    url: ncUrl,
                    username: ncUsername,
                    password: ncPassword,
                    action,
                    newFolderName: folderName,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setExplorerData(data);
                setExplorerPath(data.currentPath);
                if (action === 'create-folder') {
                    setShowCreateFolder(false);
                    setNewFolderName('');
                }
            } else {
                setExplorerError(data.error || 'Failed to scan Nextcloud folders');
            }
        } catch (err: any) {
            setExplorerError(err?.message || 'Network error scanning folders');
        } finally {
            setExplorerLoading(false);
        }
    };

    const handleOpenExplorer = () => {
        setIsFolderExplorerOpen(true);
        setExplorerSearch('');
        fetchFolders(ncRootFolder || '/');
    };

    const handleSelectTargetFolder = (selectedPath: string) => {
        setNcRootFolder(selectedPath);
        setIsFolderExplorerOpen(false);
        setNcFeedback({
            type: 'success',
            message: `Target Storage Folder set to "${selectedPath}". Click "Save & Connect Server" to commit.`,
        });
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setCreatingFolder(true);
        try {
            await fetchFolders(explorerPath, 'create-folder', newFolderName.trim());
        } finally {
            setCreatingFolder(false);
        }
    };

    const applySmtpPreset = (preset: 'gmail' | 'resend' | 'sendgrid' | 'brevo' | 'office365' | 'custom') => {
        switch (preset) {
            case 'gmail':
                setSmtpHost('smtp.gmail.com');
                setSmtpPort('587');
                setSmtpSecure(false);
                setSmtpFeedback({
                    type: 'success',
                    message: 'Applied Gmail preset. Note: Google requires a 16-character App Password generated from your Google Account → Security → 2-Step Verification → App Passwords.',
                });
                break;
            case 'resend':
                setSmtpHost('smtp.resend.com');
                setSmtpPort('587');
                setSmtpSecure(false);
                setSmtpUser('resend');
                setSmtpFeedback({
                    type: 'success',
                    message: 'Applied Resend preset. Use "resend" as username and your Resend API Key (re_...) as password.',
                });
                break;
            case 'sendgrid':
                setSmtpHost('smtp.sendgrid.net');
                setSmtpPort('587');
                setSmtpSecure(false);
                setSmtpUser('apikey');
                setSmtpFeedback({
                    type: 'success',
                    message: 'Applied SendGrid preset. Use "apikey" as username and your SendGrid API Key (SG...) as password.',
                });
                break;
            case 'brevo':
                setSmtpHost('smtp-relay.brevo.com');
                setSmtpPort('587');
                setSmtpSecure(false);
                setSmtpFeedback({
                    type: 'success',
                    message: 'Applied Brevo (Sendinblue) preset. Use your Brevo login email as username and SMTP master key as password.',
                });
                break;
            case 'office365':
                setSmtpHost('smtp.office365.com');
                setSmtpPort('587');
                setSmtpSecure(false);
                setSmtpFeedback({
                    type: 'success',
                    message: 'Applied Microsoft 365 preset. Ensure SMTP AUTH is enabled for your Microsoft 365 mailbox.',
                });
                break;
            case 'custom':
                setSmtpHost('mail.mtc-network.space');
                setSmtpPort('587');
                setSmtpSecure(false);
                setSmtpFeedback({
                    type: 'success',
                    message: 'Custom SMTP configured for your domain mail relay.',
                });
                break;
        }
    };

    const fetchSmtpSettings = async () => {
        try {
            setSmtpStatus('CHECKING');
            const res = await fetch('/api/settings/smtp');
            if (res.ok) {
                const data = await res.json();
                if (data.host) setSmtpHost(data.host);
                if (data.port) setSmtpPort(String(data.port));
                setSmtpSecure(Boolean(data.secure));
                if (data.user) setSmtpUser(data.user);
                if (data.from) setSmtpFrom(data.from);
                if (data.fromName) setSmtpFromName(data.fromName);
                setSmtpHasPassword(Boolean(data.hasPassword));
                setSmtpStatus(data.connectionStatus || 'UNCONFIGURED');
                if (data.error && data.connectionStatus === 'DISCONNECTED') {
                    setSmtpFeedback({ type: 'error', message: `SMTP Warning: ${data.error}` });
                }
            } else {
                setSmtpStatus('UNCONFIGURED');
            }
        } catch {
            setSmtpStatus('UNCONFIGURED');
        }
    };

    const handleSaveSmtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSmtpSaving(true);
        setSmtpFeedback(null);
        try {
            const res = await fetch('/api/settings/smtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host: smtpHost,
                    port: smtpPort,
                    secure: smtpSecure,
                    user: smtpUser,
                    password: smtpPassword,
                    from: smtpFrom,
                    fromName: smtpFromName,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSmtpStatus(data.connectionStatus || 'CONNECTED');
                setSmtpFeedback({
                    type: data.connectionStatus === 'CONNECTED' ? 'success' : 'error',
                    message: data.message || 'SMTP settings saved.',
                });
                if (smtpPassword) {
                    setSmtpHasPassword(true);
                    setSmtpPassword('');
                }
                fetchSmtpSettings();
            } else {
                setSmtpStatus('DISCONNECTED');
                setSmtpFeedback({ type: 'error', message: data.error || 'Failed to save SMTP configuration' });
            }
        } catch (err: any) {
            setSmtpStatus('DISCONNECTED');
            setSmtpFeedback({ type: 'error', message: err?.message || 'Network error saving SMTP configuration' });
        } finally {
            setSmtpSaving(false);
        }
    };

    const handleSendTestEmail = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const fallback = user?.email && !user.email.endsWith('@mtc.com') ? user.email : '';
        const target = testRecipientEmail.trim() || fallback;
        if (!target) {
            setTestEmailResult({ type: 'error', message: 'Please enter your destination email address (e.g. your personal Gmail or work inbox) in the box above.' });
            return;
        }

        setSmtpTesting(true);
        setTestEmailResult(null);
        try {
            const res = await fetch('/api/settings/smtp/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientEmail: target,
                    host: smtpHost,
                    port: smtpPort,
                    secure: smtpSecure,
                    user: smtpUser,
                    password: smtpPassword,
                    from: smtpFrom,
                    fromName: smtpFromName,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTestEmailResult({ type: 'success', message: data.message });
            } else {
                setTestEmailResult({ type: 'error', message: data.error || 'Failed to deliver test email.' });
            }
        } catch (err: any) {
            setTestEmailResult({ type: 'error', message: err?.message || 'Network error testing email delivery.' });
        } finally {
            setSmtpTesting(false);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserSaving(true);
        setUserFeedback(null);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newUserName,
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole,
                }),
            });
            const data = await res.json();
            if (res.ok && data.user) {
                setUserFeedback({ type: 'success', message: `User ${data.user.email} created successfully!` });
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserRole('EDITOR');
                setIsCreateUserModalOpen(false);
                fetchUsers();
                fetchAuditLogs();
            } else {
                setUserFeedback({ type: 'error', message: data.error || 'Failed to create user account.' });
            }
        } catch (err: any) {
            setUserFeedback({ type: 'error', message: err?.message || 'Network error creating user.' });
        } finally {
            setUserSaving(false);
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        setActionLoadingId(userId);
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            const data = await res.json();
            if (res.ok) {
                fetchUsers();
                fetchAuditLogs();
            } else {
                alert(data.error || 'Failed to update user role');
            }
        } catch (err: any) {
            alert(err?.message || 'Error updating user');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) return;
        setActionLoadingId(userId);
        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                fetchUsers();
                fetchAuditLogs();
            } else {
                alert(data.error || 'Failed to delete user');
            }
        } catch (err: any) {
            alert(err?.message || 'Error deleting user');
        } finally {
            setActionLoadingId(null);
        }
    };

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'audit') {
            fetchAuditLogs();
        } else if (activeTab === 'nextcloud') {
            fetchNextcloudSettings();
        } else if (activeTab === 'notifications') {
            fetchSmtpSettings();
        }
    }, [activeTab]);

    const filteredUsers = users.filter(u => {
        const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
        const matchesSearch = !userSearch ||
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase());
        return matchesRole && matchesSearch;
    });

    const roleBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
        ADMIN: { bg: 'rgba(239, 68, 68, 0.15)', text: '#FCA5A5', border: 'rgba(239, 68, 68, 0.3)' },
        PRODUCER: { bg: 'rgba(56, 102, 66, 0.25)', text: '#A7F3D0', border: 'rgba(56, 102, 66, 0.4)' },
        EDITOR: { bg: 'rgba(230, 167, 76, 0.2)', text: '#FFD180', border: 'rgba(230, 167, 76, 0.4)' },
        VIEWER: { bg: 'rgba(202, 222, 223, 0.12)', text: '#CADEDF', border: 'rgba(202, 222, 223, 0.2)' },
    };

    const filteredActivities = activities.filter(a => {
        const matchesAction = actionFilter === 'ALL' || a.action === actionFilter;
        const matchesSearch = !auditSearch ||
            a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
            a.entityType.toLowerCase().includes(auditSearch.toLowerCase()) ||
            (a.user?.name && a.user.name.toLowerCase().includes(auditSearch.toLowerCase())) ||
            (a.details && a.details.toLowerCase().includes(auditSearch.toLowerCase()));
        return matchesAction && matchesSearch;
    });

    return (
        <Sidebar>
            <Header title="Settings & Governance" subtitle="System configuration, enterprise RBAC, and MTC brand identity" />

            <div className="content-area" style={{ maxWidth: '1080px' }}>
                {/* Settings Navigation Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '24px',
                    gap: '6px',
                    overflowX: 'auto',
                }}>
                    {[
                        { key: 'brand', label: 'Brand & Visual Identity', icon: '🎨' },
                        { key: 'users', label: 'Users & Access', icon: '👥' },
                        { key: 'nextcloud', label: 'Cloud Storage & Nextcloud', icon: '☁️' },
                        { key: 'notifications', label: 'Email & Notifications', icon: '✉️' },
                        { key: 'rbac', label: 'Role-Based Access Control (RBAC)', icon: '🛡️' },
                        { key: 'watermark', label: 'DRM & Watermark Profiles', icon: '🔒' },
                        { key: 'audit', label: 'Enterprise System Audit Log', icon: '📋' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab.key ? '2px solid var(--mtc-hunter-green)' : '2px solid transparent',
                                color: activeTab === tab.key ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                fontWeight: activeTab === tab.key ? 600 : 500,
                                fontSize: '0.88rem',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                            }}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* TAB 1: BRAND IDENTITY & LOGO */}
                {activeTab === 'brand' && (
                    <>
                        {!isAdmin && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                backgroundColor: 'rgba(202, 222, 223, 0.08)',
                                border: '1px solid rgba(202, 222, 223, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.84rem',
                                color: 'var(--mtc-cornsilk)',
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                                <div>
                                    <strong>Read-Only Access:</strong> Brand identity labeling and logo upload require Administrator privileges. You can inspect the current brand settings below.
                                </div>
                            </div>
                        )}

                        {/* SECTION 1: LOGO UPLOAD & MANAGEMENT */}
                        <section className="card" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '1.3rem' }}>🖼️</span>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)' }}>
                                            Brand Logo & Visual Emblem
                                        </h3>
                                    </div>
                                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '640px' }}>
                                        Upload an official brand logo for your organization (PNG, SVG, JPG, WebP up to 5MB). The custom logo is deployed dynamically across the sidebar navigation, login portal, platform header, and proxy watermarks.
                                    </p>
                                </div>

                                {/* Current Logo Status Badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {brandLogoUrl ? (
                                        <span style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: 'rgba(56, 102, 66, 0.25)',
                                            border: '1px solid var(--mtc-hunter-green)',
                                            color: '#A7F3D0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                                            Custom Brand Logo Active
                                        </span>
                                    ) : (
                                        <span style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: 'rgba(202, 222, 223, 0.12)',
                                            border: '1px solid rgba(202, 222, 223, 0.25)',
                                            color: 'var(--mtc-platinum)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6EE7B7', display: 'inline-block' }} />
                                            Default Vector Emblem Active
                                        </span>
                                    )}
                                </div>
                            </div>

                            {logoFeedback && (
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    marginBottom: '16px',
                                    fontSize: '0.84rem',
                                    backgroundColor: logoFeedback.type === 'success' ? 'rgba(56, 102, 66, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid ' + (logoFeedback.type === 'success' ? 'var(--mtc-hunter-green)' : 'rgba(239, 68, 68, 0.4)'),
                                    color: logoFeedback.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                                }}>
                                    {logoFeedback.message}
                                </div>
                            )}

                            {/* Two-column layout: Preview & Dropzone */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '24px', alignItems: 'stretch' }}>
                                {/* Left: Active / Staged Logo Display Box */}
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: 'var(--bg-color)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
                                            {selectedLogoFile ? 'Pending Upload Preview' : brandLogoUrl ? 'Active Published Logo' : 'Default System Vector Emblem'}
                                        </div>

                                        <div style={{
                                            minHeight: '140px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '16px',
                                            backgroundColor: '#111718',
                                            borderRadius: '8px',
                                            border: '1px dashed rgba(202, 222, 223, 0.2)',
                                            backgroundImage: 'radial-gradient(rgba(202, 222, 223, 0.08) 1px, transparent 1px)',
                                            backgroundSize: '12px 12px',
                                            overflow: 'hidden',
                                        }}>
                                            {logoPreviewUrl ? (
                                                <img
                                                    src={logoPreviewUrl}
                                                    alt="Staged Logo Preview"
                                                    style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }}
                                                />
                                            ) : brandLogoUrl ? (
                                                <img
                                                    src={brandLogoUrl}
                                                    alt="Brand Logo"
                                                    style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                    <MtcLogo variant="horizontal" size="md" theme="cornsilk" />
                                                </div>
                                            )}
                                        </div>

                                        {selectedLogoFile && (
                                            <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#FFD180' }}>
                                                Selected: <strong>{selectedLogoFile.name}</strong> ({(selectedLogoFile.size / 1024).toFixed(1)} KB)
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {selectedLogoFile ? (
                                            <>
                                                <button
                                                    onClick={handleUploadLogo}
                                                    disabled={logoUploading || !isAdmin}
                                                    className="btn btn-primary"
                                                    style={{ flex: 1, fontSize: '0.82rem', padding: '8px 12px' }}
                                                >
                                                    {logoUploading ? 'Uploading...' : 'Confirm & Save Logo'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedLogoFile(null);
                                                        setLogoPreviewUrl(null);
                                                    }}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            brandLogoUrl && (
                                                <button
                                                    onClick={handleRemoveLogo}
                                                    disabled={logoRemoving || !isAdmin}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                                        color: '#FCA5A5',
                                                        borderRadius: 'var(--radius-md)',
                                                        padding: '8px 12px',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        width: '100%',
                                                    }}
                                                >
                                                    {logoRemoving ? 'Resetting...' : 'Revert to Default Vector Logo'}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Right: Drag & Drop Ingest Target */}
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        if (isAdmin) setIsDragOver(true);
                                    }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragOver(false);
                                        if (!isAdmin) return;
                                        if (e.dataTransfer.files?.[0]) {
                                            handleFileSelect(e.dataTransfer.files[0]);
                                        }
                                    }}
                                    onClick={() => {
                                        if (isAdmin && fileInputRef.current) {
                                            fileInputRef.current.click();
                                        }
                                    }}
                                    style={{
                                        border: isDragOver
                                            ? '2px dashed var(--mtc-hunter-green)'
                                            : '2px dashed rgba(202, 222, 223, 0.25)',
                                        backgroundColor: isDragOver
                                            ? 'rgba(56, 102, 66, 0.12)'
                                            : 'rgba(29, 39, 41, 0.4)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '32px 24px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        cursor: isAdmin ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                                        style={{ display: 'none' }}
                                        disabled={!isAdmin}
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleFileSelect(e.target.files[0]);
                                            }
                                        }}
                                    />

                                    <div style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(56, 102, 66, 0.25)',
                                        border: '1px solid rgba(56, 102, 66, 0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        marginBottom: '14px',
                                    }}>
                                        ☁️
                                    </div>

                                    <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                        {isAdmin ? 'Choose a file or drag & drop here' : 'Administrator role required to upload'}
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5, marginBottom: '16px' }}>
                                        Supports <strong>PNG, SVG, JPG, WebP</strong> up to <strong>5MB</strong>.
                                        <br />
                                        <span style={{ fontSize: '0.74rem', opacity: 0.85 }}>
                                            Tip: High-resolution SVGs or transparent PNGs (e.g. 400×120px) provide razor-sharp clarity on studio monitors.
                                        </span>
                                    </p>

                                    {isAdmin && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.82rem', padding: '6px 16px' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            Browse Local Files
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* SECTION 2: BRAND IDENTITY LABELS */}
                        <section className="card" style={{ marginBottom: '24px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '1.3rem' }}>🏷️</span>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)' }}>
                                        Brand Identity Labels & Nomenclature
                                    </h3>
                                </div>
                                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '680px' }}>
                                    Configure the organization name, badge acronym, and public mission statements. These values are automatically applied across headers, sidebar badges, legal watermarks, and login authentication.
                                </p>
                            </div>

                            {brandFeedback && (
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    marginBottom: '16px',
                                    fontSize: '0.84rem',
                                    backgroundColor: brandFeedback.type === 'success' ? 'rgba(56, 102, 66, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid ' + (brandFeedback.type === 'success' ? 'var(--mtc-hunter-green)' : 'rgba(239, 68, 68, 0.4)'),
                                    color: brandFeedback.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                                }}>
                                    {brandFeedback.message}
                                </div>
                            )}

                            <form onSubmit={handleSaveBrandIdentity}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                                    {/* Organization Name */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            Organization / Brand Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formBrandName}
                                            disabled={!isAdmin}
                                            onChange={(e) => setFormBrandName(e.target.value)}
                                            placeholder="e.g. Mountain Top Communications"
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                color: 'var(--mtc-cornsilk)',
                                                fontSize: '0.86rem',
                                                outline: 'none',
                                            }}
                                        />
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                            Full legal or enterprise name displayed on headings, reports, and navigation.
                                        </span>
                                    </div>

                                    {/* Acronym / Badge */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            Badge / Short Code (Acronym)
                                        </label>
                                        <input
                                            type="text"
                                            value={formBrandShortName}
                                            maxLength={10}
                                            disabled={!isAdmin}
                                            onChange={(e) => setFormBrandShortName(e.target.value)}
                                            placeholder="e.g. MTC"
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                color: 'var(--mtc-cornsilk)',
                                                fontSize: '0.86rem',
                                                outline: 'none',
                                                letterSpacing: '0.08em',
                                                fontWeight: 700,
                                            }}
                                        />
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                            2 to 6 uppercase letters used in collapsed badges, proxy watermarks, and file stamps.
                                        </span>
                                    </div>
                                </div>

                                {/* Tagline */}
                                <div style={{ marginBottom: '18px' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                        Brand Tagline & Mission Headline
                                    </label>
                                    <input
                                        type="text"
                                        value={formBrandTagline}
                                        disabled={!isAdmin}
                                        onChange={(e) => setFormBrandTagline(e.target.value)}
                                        placeholder="e.g. Studio-Grade Digital Asset Management"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            color: 'var(--mtc-cornsilk)',
                                            fontSize: '0.86rem',
                                            outline: 'none',
                                        }}
                                    />
                                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                        Prominently featured on the login portal, metadata exports, and platform headings.
                                    </span>
                                </div>

                                {/* Description / Mission */}
                                <div style={{ marginBottom: '22px' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                        Mission Statement & Public Description
                                    </label>
                                    <textarea
                                        value={formBrandDescription}
                                        rows={3}
                                        disabled={!isAdmin}
                                        onChange={(e) => setFormBrandDescription(e.target.value)}
                                        placeholder="Describe your organization's mission and purpose..."
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            color: 'var(--mtc-cornsilk)',
                                            fontSize: '0.86rem',
                                            outline: 'none',
                                            resize: 'vertical',
                                            lineHeight: 1.5,
                                        }}
                                    />
                                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                        Used on authentication screens and platform information modals.
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                {isAdmin && (
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <button
                                            type="submit"
                                            disabled={brandSaving}
                                            className="btn btn-primary"
                                            style={{ fontSize: '0.86rem', padding: '9px 20px' }}
                                        >
                                            {brandSaving ? 'Saving Changes...' : 'Save Brand Identity Labels'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResetIdentityDefaults}
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.82rem', padding: '9px 16px' }}
                                        >
                                            Reset Form to MTC Defaults
                                        </button>
                                    </div>
                                )}
                            </form>
                        </section>

                        {/* SECTION 3: LIVE SYSTEM PREVIEWS */}
                        <section className="card" style={{ marginBottom: '24px' }}>
                            <div style={{ marginBottom: '18px' }}>
                                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                                    👁️ Real-Time Surface Previews
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    Preview how your brand identity and logo appear across key user touchpoints:
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                {/* Surface 1: Sidebar Header */}
                                <div style={{
                                    padding: '18px',
                                    backgroundColor: 'var(--bg-color)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                                        Sidebar Navigation
                                    </div>
                                    <div style={{
                                        padding: '12px 14px',
                                        backgroundColor: 'var(--mtc-oxford-blue)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(202, 222, 223, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                    }}>
                                        <MtcLogo variant="horizontal" size="sm" theme="cornsilk" />
                                    </div>
                                    <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        Shows custom logo and dynamic organization name.
                                    </div>
                                </div>

                                {/* Surface 2: Login Portal Mock */}
                                <div style={{
                                    padding: '18px',
                                    backgroundColor: 'var(--bg-color)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                                        Login Portal Hero
                                    </div>
                                    <div style={{
                                        padding: '14px',
                                        backgroundColor: '#141C1E',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(202, 222, 223, 0.15)',
                                    }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <MtcLogo variant="horizontal" size="sm" theme="cornsilk" />
                                        </div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '4px', fontFamily: 'var(--font-brand)' }}>
                                            {formBrandTagline || brandTagline}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--mtc-platinum)', opacity: 0.8, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {formBrandDescription || brandDescription}
                                        </div>
                                    </div>
                                </div>

                                {/* Surface 3: Broadcast Proxy Watermark */}
                                <div style={{
                                    padding: '18px',
                                    backgroundColor: 'var(--bg-color)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                                        Video Proxy Watermark
                                    </div>
                                    <div style={{
                                        position: 'relative',
                                        height: '92px',
                                        backgroundColor: '#0a0f10',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(202, 222, 223, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                    }}>
                                        <span style={{ fontSize: '1.6rem', opacity: 0.2 }}>▶</span>
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            left: '10px',
                                            fontSize: '0.64rem',
                                            color: '#FFEBCC',
                                            backgroundColor: 'rgba(0, 0, 0, 0.65)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            letterSpacing: '0.05em',
                                            fontFamily: 'monospace',
                                        }}>
                                            CONFIDENTIAL — {formBrandShortName || brandShortName} BROADCAST PIPELINE
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        Burn-in security watermark with dynamic acronym.
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 4: Official Brand Guidelines Reference Card */}
                        <section className="card" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <MtcLogoIcon size={28} bgColor="#386642" peakColor="#FFEBCC" />
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)' }}>
                                            Mountain Top Communications Brand Identity
                                        </h3>
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '650px' }}>
                                        Grounded in Christian values and servant leadership. Voice of hope and healing. Archetype: 60% Caregiver & 40% Innocent.
                                    </p>
                                </div>
                                <button
                                    onClick={applyOfficialMtc}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                                >
                                    Apply Official MTC Palette
                                </button>
                            </div>

                            {/* Color Swatch Overview */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                                <div style={{
                                    padding: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#386642',
                                    color: '#FFEBCC',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '90px',
                                }}>
                                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Primary</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-brand)' }}>Hunter Green</div>
                                        <code style={{ fontSize: '0.78rem', opacity: 0.9 }}>#386642</code>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#FFEBCC',
                                    color: '#1D2729',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '90px',
                                }}>
                                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Primary</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-brand)' }}>Cornsilk</div>
                                        <code style={{ fontSize: '0.78rem', opacity: 0.9 }}>#FFEBCC</code>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#CADEDF',
                                    color: '#1D2729',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '90px',
                                }}>
                                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Secondary</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-brand)' }}>Platinum</div>
                                        <code style={{ fontSize: '0.78rem', opacity: 0.9 }}>#CADEDF</code>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#1D2729',
                                    color: '#FFEBCC',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '90px',
                                    border: '1px solid rgba(202, 222, 223, 0.2)',
                                }}>
                                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Secondary</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-brand)' }}>Oxford Blue</div>
                                        <code style={{ fontSize: '0.78rem', opacity: 0.9 }}>#1D2729</code>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 5: Logo System Showcase */}
                        <section className="card" style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-brand)' }}>
                                Official Vector Logo Variants
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <div style={{ padding: '24px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <MtcLogo variant="horizontal" size="md" theme="cornsilk" />
                                    <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Horizontal Wordmark (Cornsilk)</div>
                                </div>
                                <div style={{ padding: '24px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <MtcLogo variant="horizontal" size="md" theme="green" />
                                    <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Horizontal Wordmark (Hunter Green)</div>
                                </div>
                                <div style={{ padding: '24px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <MtcLogo variant="icon" size="md" theme="green" />
                                    <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Peak & Cross Icon Mark</div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 6: Export Presets */}
                        <section className="card">
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-brand)' }}>📤 Distribution Presets</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                {[
                                    { platform: 'TV Broadcast', format: '16:9 · 1080i', icon: '📺' },
                                    { platform: 'YouTube', format: '16:9 · 1080p', icon: '▶️' },
                                    { platform: 'Instagram Reels', format: '9:16 · 1080p', icon: '📸' },
                                    { platform: 'TikTok', format: '9:16 · 1080p', icon: '🎵' },
                                    { platform: 'Facebook', format: '1:1 · 720p', icon: '📘' },
                                    { platform: 'Website', format: '16:9 · 4K', icon: '🌐' },
                                ].map((preset) => (
                                    <div key={preset.platform} style={{
                                        padding: '14px',
                                        backgroundColor: 'var(--bg-color)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{preset.icon}</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--mtc-cornsilk)' }}>{preset.platform}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{preset.format}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {/* TAB: USERS & ACCESS MANAGEMENT */}
                {activeTab === 'users' && (
                    <section className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', fontFamily: 'var(--font-brand)' }}>
                                    User Accounts & Access Control
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Manage enterprise administrator, editor, and producer accounts across the MTC production network.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={fetchUsers}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                >
                                    ↻ Refresh
                                </button>
                                <button
                                    onClick={() => {
                                        setUserFeedback(null);
                                        setIsCreateUserModalOpen(true);
                                    }}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <span>+</span> Add New User
                                </button>
                            </div>
                        </div>

                        {userFeedback && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '6px',
                                marginBottom: '16px',
                                fontSize: '0.84rem',
                                backgroundColor: userFeedback.type === 'success' ? 'rgba(56, 102, 66, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid ' + (userFeedback.type === 'success' ? 'var(--mtc-hunter-green)' : 'rgba(239, 68, 68, 0.4)'),
                                color: userFeedback.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                            }}>
                                {userFeedback.message}
                            </div>
                        )}

                        {/* Search & Role Filters */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
                            <input
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                placeholder="Search users by name or email..."
                                style={{
                                    flex: 1,
                                    maxWidth: '360px',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--mtc-cornsilk)',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                }}
                            />

                            <div style={{ display: 'flex', gap: '6px' }}>
                                {['ALL', 'ADMIN', 'EDITOR', 'PRODUCER', 'VIEWER'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setUserRoleFilter(r)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.74rem',
                                            fontWeight: 600,
                                            border: '1px solid ' + (userRoleFilter === r ? 'var(--mtc-hunter-green)' : 'var(--border-color)'),
                                            backgroundColor: userRoleFilter === r ? 'rgba(56, 102, 66, 0.3)' : 'transparent',
                                            color: userRoleFilter === r ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Users Table */}
                        {loadingUsers ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                Loading user accounts...
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(20, 28, 30, 0.6)', textAlign: 'left' }}>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>User</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Role</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Created</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>Assets</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>Activities</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
                                                    No user accounts found matching your filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map(u => {
                                                const badge = roleBadgeColors[u.role] || roleBadgeColors.VIEWER;
                                                return (
                                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: badge.bg,
                                                                    color: badge.text,
                                                                    border: `1px solid ${badge.border}`,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.8rem',
                                                                }}>
                                                                    {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>{u.name}</div>
                                                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <select
                                                                value={u.role}
                                                                disabled={actionLoadingId === u.id}
                                                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    backgroundColor: badge.bg,
                                                                    color: badge.text,
                                                                    border: `1px solid ${badge.border}`,
                                                                    cursor: 'pointer',
                                                                    outline: 'none',
                                                                }}
                                                            >
                                                                <option value="ADMIN" style={{ background: '#1D2729', color: '#FCA5A5' }}>ADMIN</option>
                                                                <option value="EDITOR" style={{ background: '#1D2729', color: '#FFD180' }}>EDITOR</option>
                                                                <option value="PRODUCER" style={{ background: '#1D2729', color: '#A7F3D0' }}>PRODUCER</option>
                                                                <option value="VIEWER" style={{ background: '#1D2729', color: '#CADEDF' }}>VIEWER</option>
                                                            </select>
                                                        </td>
                                                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                                            {new Date(u.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--mtc-cornsilk)' }}>
                                                            {u._count?.assets ?? 0}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveTab('audit');
                                                                    setAuditSearch(u.email);
                                                                }}
                                                                style={{
                                                                    background: 'rgba(202, 222, 223, 0.08)',
                                                                    border: '1px solid var(--border-color)',
                                                                    color: 'var(--mtc-cornsilk)',
                                                                    borderRadius: '4px',
                                                                    padding: '2px 8px',
                                                                    fontSize: '0.74rem',
                                                                    cursor: 'pointer',
                                                                }}
                                                                title="View audit trail for this user"
                                                            >
                                                                {u._count?.activities ?? 0} logs ↗
                                                            </button>
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id, u.email)}
                                                                disabled={actionLoadingId === u.id}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                    color: '#FCA5A5',
                                                                    borderRadius: '4px',
                                                                    padding: '4px 8px',
                                                                    fontSize: '0.72rem',
                                                                    cursor: 'pointer',
                                                                    opacity: actionLoadingId === u.id ? 0.5 : 1,
                                                                }}
                                                                title="Delete user account"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Modal: Create User */}
                        {isCreateUserModalOpen && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000,
                                backdropFilter: 'blur(4px)',
                            }}>
                                <div style={{
                                    backgroundColor: 'var(--surface-color)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    width: '100%',
                                    maxWidth: '460px',
                                    padding: '24px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                        <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', fontFamily: 'var(--font-brand)', margin: 0 }}>
                                            Create Account
                                        </h4>
                                        <button
                                            onClick={() => setIsCreateUserModalOpen(false)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-muted)',
                                                fontSize: '1.2rem',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                                                Full Name
                                            </label>
                                            <input
                                                required
                                                value={newUserName}
                                                onChange={(e) => setNewUserName(e.target.value)}
                                                placeholder="e.g. Sarah Jenkins"
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

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                                                Email Address
                                            </label>
                                            <input
                                                required
                                                type="email"
                                                value={newUserEmail}
                                                onChange={(e) => setNewUserEmail(e.target.value)}
                                                placeholder="e.g. editor@mtc.com"
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

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                                                Initial Password (min 8 characters)
                                            </label>
                                            <input
                                                required
                                                type="password"
                                                value={newUserPassword}
                                                onChange={(e) => setNewUserPassword(e.target.value)}
                                                placeholder="Secure password"
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

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                                                System Role
                                            </label>
                                            <select
                                                value={newUserRole}
                                                onChange={(e) => setNewUserRole(e.target.value as any)}
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
                                                <option value="ADMIN">ADMIN — Full system governance, deletion, DRM, audit logs</option>
                                                <option value="EDITOR">EDITOR — Ingest media, edit tags, proxies, export masters</option>
                                                <option value="PRODUCER">PRODUCER — Ingest, workflow approve, publish, workspaces</option>
                                                <option value="VIEWER">VIEWER — Stream 1080p proxies, read-only preview</option>
                                            </select>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setIsCreateUserModalOpen(false)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={userSaving}
                                                className="btn btn-primary"
                                                style={{ fontSize: '0.82rem', padding: '6px 16px' }}
                                            >
                                                {userSaving ? 'Creating...' : 'Create Account'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* TAB 2: ROLE-BASED ACCESS CONTROL (RBAC) */}
                {activeTab === 'rbac' && (
                    <section className="card">
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', fontFamily: 'var(--font-brand)' }}>
                                Enterprise Role-Based Access Control (RBAC)
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Permissions granted per user role across media ingestion, review workflows, broadcast publishing, and system audit logs.
                            </p>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(20, 28, 30, 0.6)' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)' }}>Governance Capability</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#FCA5A5' }}>ADMIN</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#A7F3D0' }}>PRODUCER</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#FFD180' }}>EDITOR</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#CADEDF' }}>VIEWER</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rbacMatrix.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '12px 16px', color: 'var(--mtc-cornsilk)', fontWeight: 500 }}>
                                                {item.permission}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {item.admin ? '✅' : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {item.producer ? '✅' : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {item.editor ? '✅' : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {item.viewer ? '✅' : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* TAB 3: WATERMARK & DRM PROFILES */}
                {activeTab === 'watermark' && (
                    <section className="card" style={{ maxWidth: '700px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', fontFamily: 'var(--font-brand)' }}>
                                Security Watermarking & DRM Compliance
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Protect pre-release masters and confidential media with automated visual burn-in overlays.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    Watermark Profile Name
                                </label>
                                <input
                                    value={watermarkName}
                                    onChange={(e) => setWatermarkName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    Burn-in Overlay Text Template
                                </label>
                                <input
                                    value={watermarkTemplate}
                                    onChange={(e) => setWatermarkTemplate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--mtc-cornsilk)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                    Supported tokens: <code>{'{USER}'}</code>, <code>{'{DATE}'}</code>, <code>{'{IP}'}</code>
                                </span>
                            </div>

                            {/* Live Simulation Preview */}
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    Burn-in Visual Preview
                                </label>
                                <div style={{
                                    height: '140px',
                                    backgroundColor: '#000',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <span style={{ fontSize: '2rem', opacity: 0.2 }}>🎬 4K Master Video</span>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '12px',
                                        right: '16px',
                                        color: 'rgba(255, 235, 204, 0.7)',
                                        fontFamily: 'monospace',
                                        fontSize: '0.78rem',
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        letterSpacing: '0.05em',
                                    }}>
                                        {watermarkTemplate.replace('{USER}', 'admin@mtc.com')}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                <button
                                    onClick={() => {
                                        setWatermarkSaved(true);
                                        setTimeout(() => setWatermarkSaved(false), 3000);
                                    }}
                                    className="btn btn-primary"
                                    style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                                >
                                    {watermarkSaved ? 'Profile Saved ✓' : 'Save Watermark Profile'}
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* TAB 4: ENTERPRISE SYSTEM AUDIT LOG */}
                {activeTab === 'audit' && (
                    <section className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', fontFamily: 'var(--font-brand)' }}>
                                    Enterprise System Audit Trail
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Immutable audit trail tracking all asset ingests, downloads, status approvals, and shares.
                                </p>
                            </div>
                            <button onClick={fetchAuditLogs} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                ↻ Refresh Logs
                            </button>
                        </div>

                        {/* Search & Action Filters */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                            <input
                                value={auditSearch}
                                onChange={(e) => setAuditSearch(e.target.value)}
                                placeholder="Search audit trail by user, action, or note..."
                                style={{
                                    flex: 1,
                                    maxWidth: '360px',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--mtc-cornsilk)',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                }}
                            />

                            <div style={{ display: 'flex', gap: '6px' }}>
                                {['ALL', 'UPLOAD', 'APPROVE', 'UPDATE', 'VIEW', 'DOWNLOAD'].map(act => (
                                    <button
                                        key={act}
                                        onClick={() => setActionFilter(act)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.74rem',
                                            fontWeight: 600,
                                            border: '1px solid ' + (actionFilter === act ? 'var(--mtc-hunter-green)' : 'var(--border-color)'),
                                            backgroundColor: actionFilter === act ? 'rgba(56, 102, 66, 0.3)' : 'transparent',
                                            color: actionFilter === act ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {act}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Audit Table */}
                        {loadingAudit ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                Querying enterprise activity log...
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(20, 28, 30, 0.6)', textAlign: 'left' }}>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Timestamp</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Action</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Entity</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Actor</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>IP Address</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>Details / Note</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredActivities.map((log) => {
                                            let parsedDetails = '';
                                            try {
                                                if (log.details) {
                                                    const d = JSON.parse(log.details);
                                                    parsedDetails = d.note || d.fileName || d.operation || JSON.stringify(d);
                                                }
                                            } catch {
                                                parsedDetails = log.details || '';
                                            }

                                            return (
                                                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            backgroundColor: log.action === 'APPROVE' ? 'rgba(56, 102, 66, 0.35)'
                                                                : log.action === 'UPLOAD' ? 'rgba(230, 167, 76, 0.25)'
                                                                : log.action === 'DOWNLOAD' ? 'rgba(56, 102, 66, 0.2)'
                                                                : 'rgba(202, 222, 223, 0.1)',
                                                            color: log.action === 'APPROVE' ? '#A7F3D0'
                                                                : log.action === 'UPLOAD' ? '#FFD180'
                                                                : 'var(--mtc-cornsilk)',
                                                        }}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                                                        {log.entityType}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--mtc-cornsilk)', fontWeight: 500 }}>
                                                        {log.user?.name || 'System Admin'}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                                        {log.ipAddress || '127.0.0.1'}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {parsedDetails || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {filteredActivities.length === 0 && !loadingAudit && (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                                No activity logs match current search/filter.
                            </div>
                        )}
                    </section>
                )}

                {/* TAB 5: NEXTCLOUD STORAGE INTEGRATION & LINKING GUIDE */}
                {activeTab === 'nextcloud' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Live Status & Quota Banner */}
                        <section className="card" style={{
                            background: 'linear-gradient(135deg, rgba(29, 39, 41, 0.95), rgba(20, 28, 30, 0.95))',
                            border: ncStatus === 'CONNECTED' ? '1px solid rgba(56, 102, 66, 0.5)' : '1px solid var(--border-color)',
                            boxShadow: ncStatus === 'CONNECTED' ? '0 8px 32px rgba(56, 102, 66, 0.15)' : 'none',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        backgroundColor: ncStatus === 'CONNECTED' ? 'rgba(56, 102, 66, 0.25)' : 'rgba(230, 167, 76, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.4rem',
                                    }}>
                                        ☁️
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtc-cornsilk)' }}>
                                                Nextcloud WebDAV Server
                                            </h3>
                                            <span style={{
                                                padding: '3px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.04em',
                                                textTransform: 'uppercase',
                                                backgroundColor: ncStatus === 'CONNECTED' ? 'rgba(56, 102, 66, 0.35)' : 'rgba(239, 68, 68, 0.2)',
                                                color: ncStatus === 'CONNECTED' ? '#A7F3D0' : '#FCA5A5',
                                                border: ncStatus === 'CONNECTED' ? '1px solid rgba(167, 243, 208, 0.3)' : '1px solid rgba(252, 165, 165, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    backgroundColor: ncStatus === 'CONNECTED' ? '#34D399' : '#EF4444',
                                                    display: 'inline-block',
                                                    boxShadow: ncStatus === 'CONNECTED' ? '0 0 8px #34D399' : 'none',
                                                }} />
                                                {ncStatus === 'CHECKING' ? 'Checking...' : ncStatus}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            Target Server: <code style={{ color: 'var(--mtc-cornsilk)' }}>{ncUrl || 'https://nextcloud.mtc-network.space/'}</code>
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={handleTestNextcloud}
                                        disabled={ncTesting}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {ncTesting ? '⏳ Testing...' : '⚡ Test Connection'}
                                    </button>
                                    <a
                                        href="https://nextcloud.mtc-network.space/settings/user/security"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                                    >
                                        🔗 Nextcloud Security Page
                                    </a>
                                </div>
                            </div>

                            {/* Storage Quota Gauge (if available) */}
                            {ncQuota && ncQuota.available > 0 && (
                                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Nextcloud Storage Quota</span>
                                        <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                                            {(ncQuota.used / (1024 * 1024 * 1024)).toFixed(2)} GB used of {((ncQuota.used + ncQuota.available) / (1024 * 1024 * 1024)).toFixed(2)} GB
                                        </span>
                                    </div>
                                    <div style={{ height: '8px', backgroundColor: 'rgba(20, 28, 30, 0.8)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${Math.min(100, (ncQuota.used / (ncQuota.used + ncQuota.available)) * 100)}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, var(--mtc-hunter-green), #4ADE80)',
                                            borderRadius: '4px',
                                            transition: 'width 0.4s ease',
                                        }} />
                                    </div>
                                </div>
                            )}

                            {ncStatus === 'DISCONNECTED' && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(230, 167, 76, 0.12)',
                                    border: '1px solid rgba(230, 167, 76, 0.25)',
                                    fontSize: '0.82rem',
                                    color: '#FFD180',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>⚠️</span>
                                    <span>
                                        Nextcloud is currently not connected. The platform is operating in <strong>Local Storage Fallback</strong> mode. All asset uploads and streaming continue to function smoothly.
                                    </span>
                                </div>
                            )}
                        </section>

                        {/* Feedback Banner */}
                        {ncFeedback && (
                            <div style={{
                                padding: '12px 18px',
                                borderRadius: '8px',
                                backgroundColor: ncFeedback.type === 'success' ? 'rgba(56, 102, 66, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                                border: ncFeedback.type === 'success' ? '1px solid rgba(167, 243, 208, 0.4)' : '1px solid rgba(252, 165, 165, 0.4)',
                                color: ncFeedback.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                            }}>
                                <span>{ncFeedback.type === 'success' ? '✅' : '❌'}</span>
                                <span style={{ flex: 1 }}>{ncFeedback.message}</span>
                                <button
                                    onClick={() => setNcFeedback(null)}
                                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* Configuration Form & Server Settings */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
                            <section className="card">
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚙️</span>
                                    <span>WebDAV Credentials & Connection Parameters</span>
                                </h4>

                                <form onSubmit={handleSaveNextcloud} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            Nextcloud Server URL
                                        </label>
                                        <input
                                            type="url"
                                            value={ncUrl}
                                            onChange={e => setNcUrl(e.target.value)}
                                            required
                                            placeholder="https://nextcloud.mtc-network.space/"
                                            className="form-control"
                                            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                        />
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                            Resolved WebDAV endpoint: <code style={{ color: 'var(--mtc-cornsilk)' }}>{ncWebdavUrl || `${ncUrl.replace(/\/+$/, '')}/remote.php/webdav/`}</code>
                                        </span>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            Nextcloud WebDAV Username
                                        </label>
                                        <input
                                            type="text"
                                            value={ncUsername}
                                            onChange={e => setNcUsername(e.target.value)}
                                            required
                                            placeholder="e.g. admin or your Nextcloud username"
                                            className="form-control"
                                            style={{ width: '100%' }}
                                        />
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                            The account name associated with the App Password on Nextcloud.
                                        </span>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                                App Password / Token {ncHasPassword && <span style={{ color: '#A7F3D0', fontWeight: 400 }}>(configured)</span>}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{ background: 'none', border: 'none', color: 'var(--mtc-cornsilk)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                {showPassword ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={ncPassword}
                                            onChange={e => setNcPassword(e.target.value)}
                                            placeholder={ncHasPassword ? '•••••••••••••••• (leave blank to keep current)' : 'Enter generated Nextcloud App Token'}
                                            className="form-control"
                                            style={{ width: '100%', fontFamily: showPassword ? 'monospace' : 'inherit' }}
                                        />
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                            💡 Recommended: Generate a dedicated App Password from Nextcloud Settings → Security rather than your main password.
                                        </span>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                                Target Storage Folder in Nextcloud
                                            </label>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                color: '#A7F3D0',
                                                backgroundColor: 'rgba(56, 102, 66, 0.25)',
                                                border: '1px solid rgba(56, 102, 66, 0.5)',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontFamily: 'monospace',
                                            }}>
                                                Active: {ncRootFolder || '/'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                value={ncRootFolder}
                                                onChange={e => setNcRootFolder(e.target.value)}
                                                placeholder="/mtc-dam-uploads"
                                                className="form-control"
                                                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleOpenExplorer}
                                                className="btn btn-primary"
                                                style={{
                                                    fontSize: '0.82rem',
                                                    padding: '8px 14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    whiteSpace: 'nowrap',
                                                    backgroundColor: 'var(--mtc-hunter-green)',
                                                    border: '1px solid rgba(255, 235, 204, 0.25)',
                                                }}
                                                title="Scan remote Nextcloud server, see existing files, and choose target folder"
                                            >
                                                <span>📂</span>
                                                <span>Scan & Choose Folder</span>
                                            </button>
                                        </div>
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '6px', display: 'block' }}>
                                            Click <strong>Scan & Choose Folder</strong> to scan the remote server, view existing files and directories, and select or create the target storage folder.
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                        <button
                                            type="submit"
                                            disabled={ncSaving}
                                            className="btn btn-primary"
                                            style={{ flex: 1, padding: '10px 18px', fontSize: '0.88rem' }}
                                        >
                                            {ncSaving ? 'Saving Configuration...' : '💾 Save & Connect Server'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleTestNextcloud}
                                            disabled={ncTesting}
                                            className="btn btn-secondary"
                                            style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                                        >
                                            {ncTesting ? 'Testing...' : '⚡ Test'}
                                        </button>
                                    </div>
                                </form>
                            </section>

                            {/* Step-by-Step Linking Guide Panel */}
                            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>📖</span>
                                    <span>How to Link DAM to Nextcloud</span>
                                </h4>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(20, 28, 30, 0.6)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <div style={{ fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                                            1. Open Security Settings
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.78rem' }}>
                                            Log in at <a href="https://nextcloud.mtc-network.space/" target="_blank" rel="noopener noreferrer" style={{ color: '#A7F3D0' }}>nextcloud.mtc-network.space</a>. Click your user avatar in the top right → <strong>Personal Settings</strong> → <strong>Security</strong>.
                                        </p>
                                    </div>

                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(20, 28, 30, 0.6)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <div style={{ fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                                            2. Generate App Password
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.78rem' }}>
                                            Scroll down to <strong>"Devices & credentials"</strong>. In the <em>App name</em> input, type: <code style={{ color: 'var(--mtc-cornsilk)' }}>MTC DAM Studio</code>, then click <strong>Create new app password</strong>.
                                        </p>
                                    </div>

                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(20, 28, 30, 0.6)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <div style={{ fontWeight: 700, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                                            3. Paste & Connect
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.78rem' }}>
                                            Nextcloud will display a <strong>Username</strong> and a multi-word <strong>Password / Token</strong>. Copy them into this form and click <strong>Save & Connect Server</strong>!
                                        </p>
                                    </div>

                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(56, 102, 66, 0.15)',
                                        border: '1px solid rgba(56, 102, 66, 0.3)',
                                        color: '#CADEDF',
                                        fontSize: '0.76rem',
                                    }}>
                                        🔒 <strong>Security Note:</strong> App Passwords can be revoked at any time from your Nextcloud dashboard without altering your personal account login.
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Auto-Discovery & File Synchronization Panel */}
                        <section className="card" style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <span>🔄</span>
                                        <span>Auto-Discovery & File Synchronization</span>
                                    </h4>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, maxWidth: '680px' }}>
                                        Scan your Nextcloud server (and local storage folders) to automatically ingest existing videos, photos, audio stems, and documents into the DAM catalog without re-uploading.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSyncNextcloud}
                                    disabled={ncSyncing}
                                    className="btn btn-primary"
                                    style={{ padding: '10px 20px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    {ncSyncing ? '⏳ Scanning & Indexing...' : '🔄 Scan & Sync Nextcloud Files'}
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '16px', alignItems: 'center' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '4px' }}>
                                        Nextcloud Folder Path to Scan
                                    </label>
                                    <input
                                        type="text"
                                        value={ncSyncFolder}
                                        onChange={e => setNcSyncFolder(e.target.value)}
                                        placeholder="/ (or e.g. /Photos, /Videos, /mtc-dam-uploads)"
                                        className="form-control"
                                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                    />
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                        Enter <code>/</code> to scan all folders on your Nextcloud account, or specify a specific subfolder.
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
                                    <input
                                        type="checkbox"
                                        id="ncSyncRecursive"
                                        checked={ncSyncRecursive}
                                        onChange={e => setNcSyncRecursive(e.target.checked)}
                                        style={{ accentColor: 'var(--mtc-hunter-green)', width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="ncSyncRecursive" style={{ fontSize: '0.82rem', color: 'var(--mtc-cornsilk)', cursor: 'pointer' }}>
                                        Include subfolders
                                    </label>
                                </div>
                            </div>

                            {ncSyncResult && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: ncSyncResult.type === 'success' ? 'rgba(56, 102, 66, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                                    border: ncSyncResult.type === 'success' ? '1px solid rgba(167, 243, 208, 0.4)' : '1px solid rgba(252, 165, 165, 0.4)',
                                    color: ncSyncResult.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <span>{ncSyncResult.message}</span>
                                    <button
                                        onClick={() => setNcSyncResult(null)}
                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* TAB 7: EMAIL & SYSTEM NOTIFICATIONS */}
                {activeTab === 'notifications' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {!isAdmin && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(202, 222, 223, 0.08)',
                                border: '1px solid rgba(202, 222, 223, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.84rem',
                                color: 'var(--mtc-cornsilk)',
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                                <div>
                                    <strong>Read-Only Access:</strong> SMTP Mail Relay and notification dispatch policies require Administrator privileges.
                                </div>
                            </div>
                        )}

                        {/* SECTION 1: OVERVIEW & STATUS BANNER */}
                        <section className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '1.4rem' }}>✉️</span>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)' }}>
                                            Automated Email & System Notifications
                                        </h3>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '680px', margin: 0, lineHeight: 1.5 }}>
                                        Connect your email delivery provider (Gmail, Resend, SendGrid, Brevo, or custom SMTP server) to send branded notifications for asset uploads, external share downloads, 24h expiration warnings, and workflow approval stages.
                                    </p>
                                </div>

                                {/* Status Badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {smtpStatus === 'CONNECTED' ? (
                                        <span style={{
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            backgroundColor: 'rgba(56, 102, 66, 0.25)',
                                            border: '1px solid var(--mtc-hunter-green)',
                                            color: '#A7F3D0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                                            Mail Server Connected & Ready
                                        </span>
                                    ) : smtpStatus === 'CHECKING' ? (
                                        <span style={{
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            backgroundColor: 'rgba(202, 222, 223, 0.1)',
                                            border: '1px solid rgba(202, 222, 223, 0.2)',
                                            color: 'var(--mtc-cornsilk)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <span className="spinner-border spinner-border-sm" style={{ width: '10px', height: '10px', borderWidth: '2px', borderColor: 'var(--mtc-cornsilk)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                            Checking SMTP Server...
                                        </span>
                                    ) : smtpStatus === 'DISCONNECTED' ? (
                                        <span style={{
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: '#FCA5A5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                                            Auth / Connection Error
                                        </span>
                                    ) : (
                                        <span style={{
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            backgroundColor: 'rgba(202, 222, 223, 0.08)',
                                            border: '1px solid rgba(202, 222, 223, 0.15)',
                                            color: 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9CA3AF' }} />
                                            SMTP Not Configured
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* PRESET QUICK-CHOOSERS */}
                            {isAdmin && (
                                <div style={{
                                    backgroundColor: 'rgba(10, 15, 16, 0.4)',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    border: '1px solid rgba(202, 222, 223, 0.1)',
                                    marginBottom: '20px',
                                }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>⚡</span>
                                        <span>One-Click Provider Presets (Auto-fills recommended Host & Port):</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {[
                                            { id: 'gmail', label: 'Gmail / Google Workspace', icon: '🔴' },
                                            { id: 'resend', label: 'Resend', icon: '🖤' },
                                            { id: 'sendgrid', label: 'SendGrid', icon: '🔵' },
                                            { id: 'brevo', label: 'Brevo (Sendinblue)', icon: '🟢' },
                                            { id: 'office365', label: 'Microsoft 365 / Outlook', icon: '🔷' },
                                            { id: 'custom', label: 'Domain SMTP Relay', icon: '⚙️' },
                                        ].map(preset => (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => applySmtpPreset(preset.id as any)}
                                                className="btn btn-secondary"
                                                style={{
                                                    fontSize: '0.78rem',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(202, 222, 223, 0.18)',
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                }}
                                            >
                                                <span>{preset.icon}</span>
                                                <span>{preset.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SMTP CONFIGURATION FORM */}
                            <form onSubmit={handleSaveSmtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                    {/* SMTP HOST */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            SMTP Server Host <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={smtpHost}
                                            onChange={e => setSmtpHost(e.target.value)}
                                            placeholder="e.g. smtp.gmail.com or smtp.resend.com"
                                            disabled={!isAdmin || smtpSaving}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                backgroundColor: '#141C1E',
                                                border: '1px solid rgba(202, 222, 223, 0.2)',
                                                color: 'var(--mtc-cornsilk)',
                                                fontSize: '0.88rem',
                                                fontFamily: 'monospace',
                                            }}
                                        />
                                    </div>

                                    {/* SMTP PORT & SECURITY */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                                Port
                                            </label>
                                            <input
                                                type="text"
                                                value={smtpPort}
                                                onChange={e => setSmtpPort(e.target.value)}
                                                placeholder="587"
                                                disabled={!isAdmin || smtpSaving}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#141C1E',
                                                    border: '1px solid rgba(202, 222, 223, 0.2)',
                                                    color: 'var(--mtc-cornsilk)',
                                                    fontSize: '0.88rem',
                                                    fontFamily: 'monospace',
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                                Encryption
                                            </label>
                                            <select
                                                value={smtpSecure ? 'true' : 'false'}
                                                onChange={e => setSmtpSecure(e.target.value === 'true')}
                                                disabled={!isAdmin || smtpSaving}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#141C1E',
                                                    border: '1px solid rgba(202, 222, 223, 0.2)',
                                                    color: 'var(--mtc-cornsilk)',
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                <option value="false">STARTTLS / TLS (Port 587)</option>
                                                <option value="true">Direct SSL (Port 465)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                    {/* SMTP USER */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            SMTP Username / Account
                                        </label>
                                        <input
                                            type="text"
                                            value={smtpUser}
                                            onChange={e => setSmtpUser(e.target.value)}
                                            placeholder="e.g. notifications@mtc-network.space or apikey"
                                            disabled={!isAdmin || smtpSaving}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                backgroundColor: '#141C1E',
                                                border: '1px solid rgba(202, 222, 223, 0.2)',
                                                color: 'var(--mtc-cornsilk)',
                                                fontSize: '0.88rem',
                                            }}
                                        />
                                    </div>

                                    {/* SMTP PASSWORD */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                                Password / App Token {smtpHasPassword && <span style={{ color: '#10B981', fontSize: '0.75rem' }}>(Configured)</span>}
                                            </label>
                                            {smtpHasPassword && (
                                                <span
                                                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                                    style={{ fontSize: '0.75rem', color: 'var(--mtc-hunter-green)', cursor: 'pointer' }}
                                                >
                                                    {showSmtpPassword ? 'Hide' : 'Change password'}
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type={showSmtpPassword || !smtpHasPassword ? 'text' : 'password'}
                                            value={smtpPassword}
                                            onChange={e => setSmtpPassword(e.target.value)}
                                            placeholder={smtpHasPassword ? '•••••••••••••••• (Leave blank to keep saved)' : 'Enter SMTP password or API token'}
                                            disabled={!isAdmin || smtpSaving}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                backgroundColor: '#141C1E',
                                                border: '1px solid rgba(202, 222, 223, 0.2)',
                                                color: 'var(--mtc-cornsilk)',
                                                fontSize: '0.88rem',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                    {/* SENDER EMAIL */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            Sender From Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={smtpFrom}
                                            onChange={e => setSmtpFrom(e.target.value)}
                                            placeholder="notifications@mtc-network.space"
                                            disabled={!isAdmin || smtpSaving}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                backgroundColor: '#141C1E',
                                                border: '1px solid rgba(202, 222, 223, 0.2)',
                                                color: 'var(--mtc-cornsilk)',
                                                fontSize: '0.88rem',
                                            }}
                                        />
                                    </div>

                                    {/* SENDER DISPLAY NAME */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', marginBottom: '6px' }}>
                                            Sender Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={smtpFromName}
                                            onChange={e => setSmtpFromName(e.target.value)}
                                            placeholder="Mountain Top Communications DAM"
                                            disabled={!isAdmin || smtpSaving}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                backgroundColor: '#141C1E',
                                                border: '1px solid rgba(202, 222, 223, 0.2)',
                                                color: 'var(--mtc-cornsilk)',
                                                fontSize: '0.88rem',
                                            }}
                                        />
                                    </div>
                                </div>

                                {smtpFeedback && (
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        backgroundColor: smtpFeedback.type === 'success' ? 'rgba(56, 102, 66, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                        border: `1px solid ${smtpFeedback.type === 'success' ? 'var(--mtc-hunter-green)' : 'rgba(239, 68, 68, 0.3)'}`,
                                        color: smtpFeedback.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                                        fontSize: '0.84rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <span>{smtpFeedback.message}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSmtpFeedback(null)}
                                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}

                                {isAdmin && (
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        <button
                                            type="submit"
                                            disabled={smtpSaving}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '10px 20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <span>💾</span>
                                            <span>{smtpSaving ? 'Saving & Verifying...' : 'Save & Verify SMTP Connection'}</span>
                                        </button>
                                    </div>
                                )}
                            </form>
                        </section>

                        {/* SECTION 2: LIVE TEST EMAIL DISPATCHER */}
                        <section className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.2rem' }}>🚀</span>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)' }}>
                                    Live Test Email Dispatcher
                                </h3>
                            </div>
                            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                Send an authentic test email to confirm your mail server can successfully deliver messages to actual inboxes.
                            </p>

                            <form onSubmit={handleSendTestEmail} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ flex: '1', minWidth: '260px' }}>
                                    <input
                                        type="email"
                                        value={testRecipientEmail}
                                        onChange={e => setTestRecipientEmail(e.target.value)}
                                        placeholder={user?.email && !user.email.endsWith('@mtc.com') ? `Default: ${user.email}` : 'Enter your recipient email (e.g. name@gmail.com)...'}
                                        disabled={smtpTesting}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            backgroundColor: '#141C1E',
                                            border: '1px solid rgba(202, 222, 223, 0.2)',
                                            color: 'var(--mtc-cornsilk)',
                                            fontSize: '0.88rem',
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={smtpTesting}
                                    className="btn btn-secondary"
                                    style={{
                                        padding: '10px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <span>{smtpTesting ? '⏳' : '📨'}</span>
                                    <span>{smtpTesting ? 'Sending Test...' : 'Send Live Test Email'}</span>
                                </button>
                            </form>

                            {testEmailResult && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: testEmailResult.type === 'success' ? 'rgba(56, 102, 66, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                    border: `1px solid ${testEmailResult.type === 'success' ? 'var(--mtc-hunter-green)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    color: testEmailResult.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                                    fontSize: '0.84rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <span>{testEmailResult.message}</span>
                                    <button
                                        type="button"
                                        onClick={() => setTestEmailResult(null)}
                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* SECTION 3: AUTOMATED EVENT NOTIFICATION POLICIES */}
                        <section className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.2rem' }}>🔔</span>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)' }}>
                                    Active System Event Notification Triggers
                                </h3>
                            </div>
                            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                                The following automated email dispatch rules are integrated into the MTC DAM pipeline:
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                                {[
                                    {
                                        title: 'Asset Upload Completed',
                                        icon: '📥',
                                        desc: 'Sends notification when high-res video or photo stems finish transcoding and proxy ingestion.',
                                        status: 'Enabled',
                                    },
                                    {
                                        title: 'External Share Accessed',
                                        icon: '👁️',
                                        desc: 'Notifies asset creators and account managers whenever an external client views or downloads a shared link.',
                                        status: 'Enabled',
                                    },
                                    {
                                        title: 'Share Expiry Warning',
                                        icon: '⏳',
                                        desc: 'Dispatches automated reminder emails 24 hours before a client download link is set to expire.',
                                        status: 'Enabled',
                                    },
                                    {
                                        title: 'Workflow Approval Needed',
                                        icon: '🚦',
                                        desc: 'Alerts assigned producers and editors with a direct review link when an asset is submitted for broadcast sign-off.',
                                        status: 'Enabled',
                                    },
                                    {
                                        title: 'Workflow Sign-Off Granted',
                                        icon: '✅',
                                        desc: 'Sends instant confirmation to the creator once an asset is approved for distribution.',
                                        status: 'Enabled',
                                    },
                                ].map((event, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '10px',
                                            backgroundColor: '#141C1E',
                                            border: '1px solid rgba(202, 222, 223, 0.12)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '1.1rem' }}>{event.icon}</span>
                                                    <strong style={{ fontSize: '0.88rem', color: 'var(--mtc-cornsilk)' }}>{event.title}</strong>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    backgroundColor: 'rgba(56, 102, 66, 0.25)',
                                                    color: '#A7F3D0',
                                                    border: '1px solid var(--mtc-hunter-green)',
                                                }}>
                                                    {event.status}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                                                {event.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {/* MODAL: NEXTCLOUD FOLDER EXPLORER & TARGET CHOOSER */}
                {isFolderExplorerOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(10, 15, 16, 0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}>
                        <div style={{
                            backgroundColor: '#1D2729',
                            borderRadius: '16px',
                            border: '1px solid rgba(202, 222, 223, 0.25)',
                            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
                            width: '100%',
                            maxWidth: '920px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                padding: '18px 24px',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: 'rgba(20, 28, 30, 0.85)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '10px',
                                        backgroundColor: 'rgba(56, 102, 66, 0.25)',
                                        border: '1px solid rgba(56, 102, 66, 0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                    }}>
                                        📁
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', fontFamily: 'var(--font-brand)' }}>
                                            Nextcloud Storage Folder Explorer
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            Scan remote directories, see existing media files, and choose your destination storage target.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsFolderExplorerOpen(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        fontSize: '1.4rem',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        lineHeight: 1,
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Breadcrumbs & Navigation Bar */}
                            <div style={{
                                padding: '10px 20px',
                                backgroundColor: '#161F21',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '8px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    {explorerData?.parentPath !== null && explorerData?.parentPath !== undefined && (
                                        <button
                                            onClick={() => fetchFolders(explorerData.parentPath!)}
                                            disabled={explorerLoading}
                                            style={{
                                                background: 'rgba(202, 222, 223, 0.1)',
                                                border: '1px solid rgba(202, 222, 223, 0.2)',
                                                color: 'var(--mtc-cornsilk)',
                                                borderRadius: '6px',
                                                padding: '4px 10px',
                                                fontSize: '0.76rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                            title="Go up to parent folder"
                                        >
                                            <span>⬆</span> Up
                                        </button>
                                    )}

                                    {/* Breadcrumbs trail */}
                                    {(explorerData?.breadcrumbs || [{ name: 'Root (/)', path: '/' }]).map((crumb, idx, arr) => (
                                        <div key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button
                                                onClick={() => fetchFolders(crumb.path)}
                                                disabled={explorerLoading}
                                                style={{
                                                    background: idx === arr.length - 1 ? 'rgba(56, 102, 66, 0.35)' : 'transparent',
                                                    border: idx === arr.length - 1 ? '1px solid var(--mtc-hunter-green)' : '1px solid transparent',
                                                    color: idx === arr.length - 1 ? 'var(--mtc-cornsilk)' : 'var(--text-muted)',
                                                    borderRadius: '6px',
                                                    padding: '4px 8px',
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer',
                                                    fontWeight: idx === arr.length - 1 ? 700 : 500,
                                                    fontFamily: 'monospace',
                                                }}
                                            >
                                                {crumb.name}
                                            </button>
                                            {idx < arr.length - 1 && <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>/</span>}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => setShowCreateFolder(!showCreateFolder)}
                                        style={{
                                            background: 'rgba(56, 102, 66, 0.25)',
                                            border: '1px solid rgba(56, 102, 66, 0.5)',
                                            color: '#A7F3D0',
                                            borderRadius: '6px',
                                            padding: '5px 10px',
                                            fontSize: '0.76rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 600,
                                        }}
                                    >
                                        <span>+</span> New Folder
                                    </button>
                                    <button
                                        onClick={() => fetchFolders(explorerPath)}
                                        disabled={explorerLoading}
                                        style={{
                                            background: 'rgba(202, 222, 223, 0.08)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--mtc-cornsilk)',
                                            borderRadius: '6px',
                                            padding: '5px 10px',
                                            fontSize: '0.76rem',
                                            cursor: 'pointer',
                                        }}
                                        title="Rescan current directory"
                                    >
                                        {explorerLoading ? 'Scanning...' : '↻ Rescan'}
                                    </button>
                                </div>
                            </div>

                            {/* Inline New Folder Form */}
                            {showCreateFolder && (
                                <form
                                    onSubmit={handleCreateFolder}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: 'rgba(56, 102, 66, 0.15)',
                                        borderBottom: '1px solid rgba(56, 102, 66, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                    }}
                                >
                                    <span style={{ fontSize: '0.8rem', color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                                        Create Folder in <code style={{ color: '#A7F3D0' }}>{explorerPath}</code>:
                                    </span>
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="folder-name"
                                        autoFocus
                                        style={{
                                            flex: 1,
                                            maxWidth: '260px',
                                            padding: '6px 10px',
                                            backgroundColor: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            color: 'var(--mtc-cornsilk)',
                                            fontSize: '0.8rem',
                                            outline: 'none',
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={creatingFolder || !newFolderName.trim()}
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.76rem', padding: '6px 14px' }}
                                    >
                                        {creatingFolder ? 'Creating...' : 'Create Folder'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateFolder(false);
                                            setNewFolderName('');
                                        }}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.76rem', padding: '6px 10px' }}
                                    >
                                        Cancel
                                    </button>
                                </form>
                            )}

                            {/* Filter Search Input */}
                            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#141C1E' }}>
                                <input
                                    type="text"
                                    value={explorerSearch}
                                    onChange={(e) => setExplorerSearch(e.target.value)}
                                    placeholder="Search folders and files in current view..."
                                    style={{
                                        width: '100%',
                                        padding: '6px 12px',
                                        backgroundColor: 'rgba(29, 39, 41, 0.6)',
                                        border: '1px solid rgba(202, 222, 223, 0.15)',
                                        borderRadius: '6px',
                                        color: 'var(--mtc-cornsilk)',
                                        fontSize: '0.8rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Main Explorer Content Area */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', minHeight: '340px' }}>
                                {explorerLoading ? (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '60px 20px',
                                        color: 'var(--text-muted)',
                                    }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            border: '3px solid rgba(202, 222, 223, 0.2)',
                                            borderTopColor: 'var(--mtc-hunter-green)',
                                            animation: 'spin 0.8s linear infinite',
                                            marginBottom: '16px',
                                        }} />
                                        <div style={{ fontSize: '0.9rem', color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                                            Scanning Nextcloud Storage...
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Querying <code style={{ color: '#A7F3D0' }}>{explorerPath}</code> via WebDAV
                                        </div>
                                    </div>
                                ) : explorerError ? (
                                    <div style={{
                                        padding: '24px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                        color: '#FCA5A5',
                                        textAlign: 'center',
                                    }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⚠️</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '6px' }}>
                                            Scan Error
                                        </div>
                                        <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem' }}>
                                            {explorerError}
                                        </p>
                                        <button
                                            onClick={() => fetchFolders('/')}
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                                        >
                                            Return to Root (/)
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.2fr)', gap: '20px' }}>
                                        {/* LEFT COLUMN: FOLDERS */}
                                        <div style={{
                                            backgroundColor: 'rgba(20, 28, 30, 0.5)',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-color)',
                                            padding: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '12px',
                                                borderBottom: '1px solid var(--border-color)',
                                                paddingBottom: '8px',
                                            }}>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    📁 Subfolders ({explorerData?.folders?.filter(f => !explorerSearch || f.name.toLowerCase().includes(explorerSearch.toLowerCase())).length ?? 0})
                                                </span>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    Click to open or select
                                                </span>
                                            </div>

                                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '360px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {(() => {
                                                    const folderList = (explorerData?.folders || []).filter(f =>
                                                        !explorerSearch || f.name.toLowerCase().includes(explorerSearch.toLowerCase())
                                                    );
                                                    if (folderList.length === 0) {
                                                        return (
                                                            <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                                {explorerSearch ? 'No folders match search.' : 'No subfolders in this directory.'}
                                                            </div>
                                                        );
                                                    }
                                                    return folderList.map(folder => (
                                                        <div
                                                            key={folder.path}
                                                            style={{
                                                                padding: '8px 10px',
                                                                borderRadius: '6px',
                                                                backgroundColor: ncRootFolder === folder.path ? 'rgba(56, 102, 66, 0.25)' : 'rgba(29, 39, 41, 0.6)',
                                                                border: ncRootFolder === folder.path ? '1px solid var(--mtc-hunter-green)' : '1px solid rgba(202, 222, 223, 0.12)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: '8px',
                                                                transition: 'all 0.15s',
                                                            }}
                                                        >
                                                            <div
                                                                onClick={() => fetchFolders(folder.path)}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                                                                title={`Open ${folder.name}`}
                                                            >
                                                                <span style={{ fontSize: '1.1rem' }}>📁</span>
                                                                <span style={{
                                                                    fontSize: '0.84rem',
                                                                    color: 'var(--mtc-cornsilk)',
                                                                    fontWeight: 600,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}>
                                                                    {folder.name}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                <button
                                                                    onClick={() => fetchFolders(folder.path)}
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: '1px solid var(--border-color)',
                                                                        color: 'var(--text-muted)',
                                                                        borderRadius: '4px',
                                                                        padding: '3px 8px',
                                                                        fontSize: '0.72rem',
                                                                        cursor: 'pointer',
                                                                    }}
                                                                    title="Open folder"
                                                                >
                                                                    Open ➔
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSelectTargetFolder(folder.path)}
                                                                    className="btn btn-primary"
                                                                    style={{
                                                                        fontSize: '0.72rem',
                                                                        padding: '3px 8px',
                                                                        backgroundColor: 'var(--mtc-hunter-green)',
                                                                    }}
                                                                    title="Choose this folder as target storage"
                                                                >
                                                                    🎯 Select
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: FILES IN CURRENT FOLDER ("SEE THE FILES") */}
                                        <div style={{
                                            backgroundColor: 'rgba(20, 28, 30, 0.5)',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-color)',
                                            padding: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '12px',
                                                borderBottom: '1px solid var(--border-color)',
                                                paddingBottom: '8px',
                                            }}>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mtc-cornsilk)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    📄 Files in this Folder ({explorerData?.files?.filter(f => !explorerSearch || f.name.toLowerCase().includes(explorerSearch.toLowerCase())).length ?? 0})
                                                </span>
                                                <span style={{ fontSize: '0.72rem', color: '#A7F3D0', fontFamily: 'monospace' }}>
                                                    {explorerPath}
                                                </span>
                                            </div>

                                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '360px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {(() => {
                                                    const fileList = (explorerData?.files || []).filter(f =>
                                                        !explorerSearch || f.name.toLowerCase().includes(explorerSearch.toLowerCase())
                                                    );
                                                    if (fileList.length === 0) {
                                                        return (
                                                            <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                                {explorerSearch ? 'No files match search.' : 'No files found in this directory.'}
                                                            </div>
                                                        );
                                                    }
                                                    return fileList.map(file => {
                                                        const typeIcon = file.type === 'video' ? '🎬'
                                                            : file.type === 'image' ? '🖼️'
                                                            : file.type === 'audio' ? '🎵'
                                                            : file.type === 'document' ? '📄'
                                                            : '📦';
                                                        return (
                                                            <div
                                                                key={file.path}
                                                                style={{
                                                                    padding: '8px 10px',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: 'rgba(29, 39, 41, 0.6)',
                                                                    border: '1px solid rgba(202, 222, 223, 0.12)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '10px',
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                                    <span style={{ fontSize: '1rem' }}>{typeIcon}</span>
                                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        <div style={{
                                                                            fontSize: '0.82rem',
                                                                            color: 'var(--mtc-cornsilk)',
                                                                            fontWeight: 500,
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                        }}>
                                                                            {file.name}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                            {file.sizeFormatted} · {new Date(file.lastmod).toLocaleDateString()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span style={{
                                                                    fontSize: '0.68rem',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: 'rgba(202, 222, 223, 0.1)',
                                                                    color: 'var(--text-muted)',
                                                                    textTransform: 'uppercase',
                                                                    fontWeight: 600,
                                                                    flexShrink: 0,
                                                                }}>
                                                                    {file.type}
                                                                </span>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid var(--border-color)',
                                backgroundColor: 'rgba(20, 28, 30, 0.9)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Target Directory:</span>
                                    <code style={{
                                        color: 'var(--mtc-cornsilk)',
                                        backgroundColor: 'rgba(56, 102, 66, 0.25)',
                                        border: '1px solid var(--mtc-hunter-green)',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                    }}>
                                        {explorerPath}
                                    </code>
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectTargetFolder(explorerPath)}
                                        className="btn btn-primary"
                                        style={{
                                            fontSize: '0.84rem',
                                            padding: '8px 18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            backgroundColor: 'var(--mtc-hunter-green)',
                                        }}
                                    >
                                        <span>🎯</span>
                                        <span>Choose "{explorerPath}" as Target</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsFolderExplorerOpen(false)}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.84rem', padding: '8px 16px' }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}
