'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import UploadModal from '@/components/UploadModal';
import { MtcLogoIcon } from '@/components/MtcLogo';

const statCards = [
  { label: 'Total Assets', value: '1,247', change: '+12%', color: 'var(--mtc-cornsilk)' },
  { label: 'Active Projects', value: '8', change: '+2', color: 'var(--mtc-hunter-green)' },
  { label: 'In Review', value: '23', change: '-5', color: 'var(--warning-color)' },
  { label: 'Published', value: '892', change: '+34', color: 'var(--mtc-platinum)' },
];

const recentAssets = [
  { name: 'Sunday_Service_Main_Camera.mp4', type: 'video', size: '2.4 GB', time: '2 hours ago', status: 'DRAFT' },
  { name: 'Youth_Retreat_Banner.psd', type: 'image', size: '145 MB', time: '5 hours ago', status: 'REVIEW' },
  { name: 'Podcast_Episode_42.wav', type: 'audio', size: '890 MB', time: '1 day ago', status: 'APPROVED' },
  { name: 'Social_Reel_March.mp4', type: 'video', size: '320 MB', time: '1 day ago', status: 'EDITING' },
  { name: 'Mountain_Top_Logo_Vector.svg', type: 'image', size: '2.1 MB', time: '3 days ago', status: 'PUBLISHED' },
];

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

export default function DashboardPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <Sidebar>
      <Header
        title="Dashboard"
        subtitle="Mountain Top Communications Production Pipeline"
        actions={
          <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
            + Upload Asset
          </button>
        }
      />

      <div className="content-area">
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
                  {stat.value}
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
            <h3 style={{
              fontSize: '0.82rem',
              fontFamily: 'var(--font-brand)',
              color: 'var(--mtc-cornsilk)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              marginBottom: '20px',
            }}>
              Recent Studio Assets
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {recentAssets.map((asset) => (
                <div
                  key={asset.name}
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
                      {asset.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {asset.size} · {asset.time}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-brand)',
                    letterSpacing: '0.04em',
                    color: statusColors[asset.status],
                    backgroundColor: 'rgba(29, 39, 41, 0.9)',
                    border: `1px solid ${statusColors[asset.status]}40`,
                    padding: '3px 10px',
                    borderRadius: '12px',
                  }}>
                    {asset.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Storage */}
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
                Storage Allocation
              </h3>
              <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--mtc-cornsilk)', fontWeight: 500 }}>2.4 TB used</span>
                <span style={{ color: 'var(--text-muted)' }}>10 TB Total</span>
              </div>
              <div style={{ width: '100%', height: '9px', backgroundColor: 'rgba(202, 222, 223, 0.1)', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{
                  width: '24%',
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--mtc-hunter-green), var(--mtc-cornsilk))',
                  borderRadius: '6px',
                }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Videos:</span> 1.8 TB</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Images:</span> 320 GB</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Audio:</span> 180 GB</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Docs:</span> 100 GB</div>
              </div>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { action: 'John approved', asset: 'Easter_Promo.mp4', time: '10m ago' },
                  { action: 'Sarah uploaded', asset: 'MTC_Brand_v3.ai', time: '1h ago' },
                  { action: 'Mike commented', asset: 'Podcast_Ep42.wav', time: '2h ago' },
                ].map((activity, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', paddingBottom: '12px', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--mtc-hunter-green)', marginTop: '6px', flexShrink: 0 }}></div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>{activity.action}</span>{' '}
                      <span style={{ color: 'var(--mtc-platinum)' }}>{activity.asset}</span>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} userId="demo-user-id" />
    </Sidebar>
  );
}
