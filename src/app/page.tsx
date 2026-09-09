'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import UploadModal from '@/components/UploadModal';
import { AssetPreviewModal, AssetDetail } from '@/components/AssetPreviewModal';
import { MtcLogoIcon } from '@/components/MtcLogo';

interface DashboardStats {
  totalAssets: number;
  activeProjects: number;
  inReviewAssets: number;
  publishedAssets: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentAssets: AssetDetail[];
  storage: {
    totalBytes: number;
    typeSizes: Record<string, number>;
    nextcloud: {
      connected: boolean;
      used?: number;
      available?: number | string;
      error?: string;
    };
  };
  recentActivities: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: string;
    createdAt: string;
    user?: { name: string };
  }>;
}

const statusColors: Record<string, string> = {
  DRAFT: 'var(--text-muted)',
  EDITING: 'var(--warning-color)',
  REVIEW: 'var(--mtc-cornsilk)',
  APPROVED: 'var(--mtc-hunter-green)',
  PUBLISHED: 'var(--mtc-platinum)',
};

const typeIcons: Record<string, string> = {
  video: '🎬',
  image: '🖼️',
  audio: '🎵',
  document: '📄',
};

function formatBytes(bytes: number | string | undefined | null): string {
  if (bytes === undefined || bytes === null || bytes === '') return '0 B';
  const num = typeof bytes === 'number' ? bytes : parseFloat(String(bytes));
  if (isNaN(num) || num <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);
  return parseFloat((num / Math.pow(k, safeIndex)).toFixed(1)) + ' ' + sizes[safeIndex];
}

function formatActivity(action: string, entityType: string): string {
  const act = (action || '').toUpperCase();
  const ent = (entityType || '').toLowerCase();
  switch (act) {
    case 'VIEW': return `viewed ${ent}`;
    case 'CREATE': return `created ${ent}`;
    case 'UPDATE': return `updated ${ent}`;
    case 'DELETE': return `deleted ${ent}`;
    case 'EXPORT': return `exported ${ent}`;
    case 'TRANSCRIBE': return `transcribed ${ent}`;
    case 'APPROVE': return `approved ${ent}`;
    case 'REJECT': return `rejected ${ent}`;
    case 'LOGIN': return `logged in`;
    default: {
      const past = act.endsWith('E') ? `${act.toLowerCase()}d` : `${act.toLowerCase()}ed`;
      return `${past} ${ent}`;
    }
  }
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSync = async () => {
    setIsSyncing(true);
    setSyncToast(null);
    try {
      const res = await fetch('/api/settings/nextcloud/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: '/', recursive: true })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSyncToast(json.message);
        await fetchDashboardData();
      } else {
        setSyncToast(json.error || 'Failed to sync Nextcloud files.');
      }
    } catch {
      setSyncToast('Network error during sync.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 6000);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = data?.stats || {
    totalAssets: 0,
    activeProjects: 0,
    inReviewAssets: 0,
    publishedAssets: 0,
  };

  const statCards = [
    { label: 'Total Assets', value: stats.totalAssets.toLocaleString(), change: stats.totalAssets > 0 ? 'Live in DB' : 'Empty', color: 'var(--mtc-cornsilk)' },
    { label: 'Active Projects', value: stats.activeProjects.toLocaleString(), change: 'Pipelines', color: 'var(--mtc-hunter-green)' },
    { label: 'In Review', value: stats.inReviewAssets.toLocaleString(), change: 'Pending approval', color: 'var(--warning-color)' },
    { label: 'Approved / Ready', value: stats.publishedAssets.toLocaleString(), change: 'Broadcast ready', color: 'var(--mtc-platinum)' },
  ];

  const recentAssets = data?.recentAssets || [];
  const storage = data?.storage;
  const isNcConnected = storage?.nextcloud?.connected;

  return (
    <Sidebar>
      <Header
        title="Dashboard"
        subtitle="Mountain Top Communications Production Pipeline"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleQuickSync}
              disabled={isSyncing}
              style={{ fontSize: '0.82rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Scan Nextcloud and local storage folders to discover and import media files"
            >
              {isSyncing ? '⏳ Syncing...' : '🔄 Sync Nextcloud'}
            </button>
            <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)} style={{ fontSize: '0.82rem', padding: '7px 14px' }}>
              + Upload Asset
            </button>
          </div>
        }
      />

      <div className="content-area">
        {syncToast && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: syncToast.includes('Failed') || syncToast.includes('error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 102, 66, 0.25)',
            border: syncToast.includes('Failed') || syncToast.includes('error') ? '1px solid rgba(252, 165, 165, 0.4)' : '1px solid rgba(167, 243, 208, 0.4)',
            color: syncToast.includes('Failed') || syncToast.includes('error') ? '#FCA5A5' : '#A7F3D0',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}>
            <span>{syncToast}</span>
            <button onClick={() => setSyncToast(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        {/* Welcome Hero Banner */}
        <section style={{
          marginBottom: '32px',
          padding: '24px 28px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(56, 102, 66, 0.22) 0%, rgba(29, 39, 41, 0.9) 100%)',
          border: '1px solid rgba(202, 222, 223, 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(56, 102, 66, 0.3)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 600,
              fontFamily: 'var(--font-brand)',
              color: 'var(--mtc-cornsilk)',
              marginBottom: '10px',
              border: '1px solid rgba(255, 235, 204, 0.25)',
            }}>
              <span>✦</span> Mountain Top Communications Studio
            </div>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '6px',
              color: 'var(--mtc-cornsilk)',
            }}>
              Welcome to MTC DAM
            </h2>
            <p style={{
              color: 'var(--mtc-platinum)',
              fontSize: '0.9rem',
              maxWidth: '680px',
              lineHeight: 1.5,
            }}>
              Central content brain for broadcasting and digital strategies — delivering inspiring, educational, and culturally relevant content that promotes universal gospel values.
            </p>
          </div>
          <div style={{ display: 'flex', flexShrink: 0 }}>
            <MtcLogoIcon size={64} bgColor="#1D2729" peakColor="#FFEBCC" />
          </div>
        </section>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {statCards.map((stat) => (
            <div className="card" key={stat.label} style={{ padding: '20px', backgroundColor: 'var(--panel-bg)' }}>
              <div style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-brand)',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                marginBottom: '12px',
              }}>
                {stat.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '1.9rem', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--mtc-cornsilk)' }}>
                  {loading ? '...' : stat.value}
                </span>
                <span style={{ fontSize: '0.82rem', color: stat.color, fontWeight: 600, fontFamily: 'var(--font-brand)' }}>
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Recent Assets */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '0.82rem',
                fontFamily: 'var(--font-brand)',
                color: 'var(--mtc-cornsilk)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
                margin: 0,
              }}>
                Recent Studio Assets
              </h3>
              <Link href="/assets" style={{ fontSize: '0.78rem', color: 'var(--mtc-cornsilk)', textDecoration: 'none', opacity: 0.8 }}>
                View All Assets →
              </Link>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading live assets...
              </div>
            ) : recentAssets.length === 0 ? (
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: 'rgba(20, 28, 30, 0.5)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-color)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
                <h4 style={{ fontSize: '1rem', color: 'var(--mtc-cornsilk)', fontWeight: 600, marginBottom: '6px' }}>
                  No Assets Uploaded Yet
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                  Your workspace is clean. Upload media files (video, image, audio, stems) to store them directly in your Nextcloud storage!
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)} style={{ fontSize: '0.84rem' }}>
                    + Upload Your First Asset
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleQuickSync}
                    disabled={isSyncing}
                    style={{ fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isSyncing ? '⏳ Syncing Nextcloud...' : '🔄 Scan Nextcloud for Files'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {recentAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--panel-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{ fontSize: '1.3rem' }}>{typeIcons[asset.type] || '📄'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-brand)',
                        color: 'var(--mtc-cornsilk)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {asset.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatBytes(asset.size)} · {timeAgo(asset.createdAt)} · {asset.creator?.name || 'Studio'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-brand)',
                      letterSpacing: '0.04em',
                      color: statusColors[asset.status] || 'var(--text-muted)',
                      backgroundColor: 'rgba(29, 39, 41, 0.9)',
                      border: `1px solid ${statusColors[asset.status] || 'rgba(255,255,255,0.2)'}40`,
                      padding: '3px 10px',
                      borderRadius: '12px',
                    }}>
                      {asset.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Storage Allocation */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-brand)',
                  color: 'var(--mtc-cornsilk)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  margin: 0,
                }}>
                  Storage Allocation
                </h3>
                <Link href="/settings" style={{ fontSize: '0.72rem', color: isNcConnected ? '#A7F3D0' : 'var(--text-dim)', textDecoration: 'none' }}>
                  {isNcConnected ? '☁️ Nextcloud' : '💾 Local Fallback'}
                </Link>
              </div>

              <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 600 }}>
                  {formatBytes(storage?.totalBytes || 0)} Media Assets
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {isNcConnected
                    ? (storage?.nextcloud?.available === 'unlimited' || typeof storage?.nextcloud?.available !== 'number'
                        ? 'Unlimited Quota'
                        : `${formatBytes((storage.nextcloud.used || 0) + storage.nextcloud.available)} Quota`)
                    : 'Local Fallback'}
                </span>
              </div>

              <div style={{ width: '100%', height: '9px', backgroundColor: 'rgba(202, 222, 223, 0.1)', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--mtc-hunter-green), #4ADE80)',
                  borderRadius: '6px',
                }}></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Videos:</span> {formatBytes(storage?.typeSizes?.video || 0)}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Images:</span> {formatBytes(storage?.typeSizes?.image || 0)}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Audio:</span> {formatBytes(storage?.typeSizes?.audio || 0)}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Docs:</span> {formatBytes(storage?.typeSizes?.document || 0)}</div>
              </div>

              {isNcConnected && storage?.nextcloud?.used !== undefined && (
                <div style={{
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(202, 222, 223, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.74rem',
                  color: 'var(--text-dim)'
                }}>
                  <span>Nextcloud Storage Pool:</span>
                  <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 500 }}>
                    {formatBytes(storage.nextcloud.used)} used on TrueNAS
                  </span>
                </div>
              )}
            </div>

            {/* Pipeline Activity */}
            <div className="card">
              <h3 style={{
                fontSize: '0.82rem',
                fontFamily: 'var(--font-brand)',
                color: 'var(--mtc-cornsilk)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
                marginBottom: '16px',
              }}>
                Pipeline Activity
              </h3>
              {data?.recentActivities && data.recentActivities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.recentActivities.map((act) => (
                    <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--mtc-cornsilk)' }}>
                        <strong>{act.user?.name || 'User'}</strong> {formatActivity(act.action, act.entityType)}
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>{timeAgo(act.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', padding: '16px 0' }}>
                  No pipeline activity recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />

      <AssetPreviewModal
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        asset={selectedAsset}
        onAssetUpdated={() => {
          fetchDashboardData();
        }}
      />
    </Sidebar>
  );
}
