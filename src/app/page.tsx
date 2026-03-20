'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import UploadModal from '@/components/UploadModal';

const statCards = [
  { label: 'Total Assets', value: '1,247', change: '+12%', color: 'var(--accent-color)' },
  { label: 'Active Projects', value: '8', change: '+2', color: 'var(--success-color)' },
  { label: 'In Review', value: '23', change: '-5', color: 'var(--warning-color)' },
  { label: 'Published', value: '892', change: '+34', color: '#06b6d4' },
];

const recentAssets = [
  { name: 'Sunday_Service_Main_Camera.mp4', type: 'video', size: '2.4 GB', time: '2 hours ago', status: 'DRAFT' },
  { name: 'Youth_Retreat_Banner.psd', type: 'image', size: '145 MB', time: '5 hours ago', status: 'REVIEW' },
  { name: 'Podcast_Episode_42.wav', type: 'audio', size: '890 MB', time: '1 day ago', status: 'APPROVED' },
  { name: 'Social_Reel_March.mp4', type: 'video', size: '320 MB', time: '1 day ago', status: 'EDITING' },
  { name: 'Church_Logo_Vector.svg', type: 'image', size: '2.1 MB', time: '3 days ago', status: 'PUBLISHED' },
];

const statusColors: Record<string, string> = {
  DRAFT: 'var(--text-muted)',
  EDITING: 'var(--warning-color)',
  REVIEW: 'var(--accent-color)',
  APPROVED: 'var(--success-color)',
  PUBLISHED: '#06b6d4',
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
        subtitle="Overview of your media production pipeline"
        actions={
          <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
            + Upload Asset
          </button>
        }
      />

      <div className="content-area">
        {/* Welcome */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Welcome back
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Central content brain for the entire media lifecycle — Ingest → Organize → Review → Publish
          </p>
        </section>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {statCards.map((stat) => (
            <div className="card" key={stat.label} style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>{stat.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stat.value}</span>
                <span style={{ fontSize: '0.8rem', color: stat.color, fontWeight: 500 }}>{stat.change}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Recent Assets */}
          <div className="card">
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>Recent Assets</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {recentAssets.map((asset) => (
                <div key={asset.name} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--panel-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontSize: '1.3rem' }}>{typeIcons[asset.type] || '📄'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.size} · {asset.time}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: statusColors[asset.status], backgroundColor: `${statusColors[asset.status]}15`, padding: '3px 10px', borderRadius: '12px' }}>
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
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Nextcloud Storage</h3>
              <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>2.4 TB used</span>
                <span style={{ color: 'var(--text-muted)' }}>10 TB</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ width: '24%', height: '100%', background: 'linear-gradient(90deg, var(--accent-color), #ec4899)', borderRadius: '4px' }}></div>
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
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Pipeline Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { action: 'John approved', asset: 'Easter_Promo.mp4', time: '10m ago' },
                  { action: 'Sarah uploaded', asset: 'Logo_Final_v3.ai', time: '1h ago' },
                  { action: 'Mike commented', asset: 'Podcast_Ep42.wav', time: '2h ago' },
                ].map((activity, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', paddingBottom: '12px', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', marginTop: '6px', flexShrink: 0 }}></div>
                    <div>
                      <span style={{ fontWeight: 500 }}>{activity.action}</span>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>{activity.asset}</span>
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
