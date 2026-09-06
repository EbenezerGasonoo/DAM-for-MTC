import React from 'react';

interface AfrihausPatternProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  opacity?: number;
}

export default function AfrihausPattern({
  className = '',
  style,
  width = 160,
  height = '100%',
  opacity = 1,
}: AfrihausPatternProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1D2729',
        borderLeft: '2px solid rgba(255, 235, 204, 0.15)',
        opacity,
        ...style,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 160 520"
        preserveAspectRatio="xMidYMin slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Definitions for colors */}
        <defs>
          <clipPath id="archClip">
            <rect x="0" y="0" width="160" height="520" />
          </clipPath>
        </defs>

        {/* Top Chevron / Triangle Geometric Border */}
        <g fill="#CADEDF">
          <polygon points="0,0 16,20 32,0" />
          <polygon points="32,0 48,20 64,0" />
          <polygon points="64,0 80,20 96,0" />
          <polygon points="96,0 112,20 128,0" />
          <polygon points="128,0 144,20 160,0" />
        </g>
        <line x1="0" y1="24" x2="160" y2="24" stroke="#CADEDF" strokeWidth="2" />

        {/* --- ROW 1 (Y: 34 - 90) --- */}
        {/* Hunter Green Semicircle (flat bottom) */}
        <path d="M10,74 A30,30 0 0,1 70,74 Z" fill="#386642" />
        {/* Platinum Circle */}
        <circle cx="120" cy="54" r="24" fill="#CADEDF" />

        {/* --- ROW 2 (Y: 90 - 150) --- */}
        {/* Cornsilk Semicircle (flat top) */}
        <path d="M10,96 A30,30 0 0,0 70,96 Z" fill="#FFEBCC" />
        {/* Hunter Green Semicircle (flat top) */}
        <path d="M90,96 A30,30 0 0,0 150,96 Z" fill="#386642" />

        {/* --- ROW 3 (Y: 150 - 210) --- */}
        {/* White / Cornsilk Upward Triangle */}
        <polygon points="40,152 14,206 66,206" fill="#FFFFFF" />
        {/* Cornsilk Circle */}
        <circle cx="120" cy="180" r="24" fill="#FFEBCC" />

        {/* --- ROW 4 (Y: 210 - 270) --- */}
        {/* Cornsilk Semicircle (flat bottom) */}
        <path d="M10,240 A30,30 0 0,1 70,240 Z" fill="#FFEBCC" />
        {/* Platinum Semicircle */}
        <path d="M90,240 A30,30 0 0,1 150,240 Z" fill="#CADEDF" />

        {/* --- ROW 5 (Y: 270 - 330) --- */}
        {/* Hunter Green Semicircle (flat top) */}
        <path d="M10,274 A30,30 0 0,0 70,274 Z" fill="#386642" />
        {/* Hunter Green Semicircle (flat top) */}
        <path d="M90,274 A30,30 0 0,0 150,274 Z" fill="#386642" />

        {/* --- ROW 6 (Y: 330 - 390) --- */}
        {/* White Triangle */}
        <polygon points="40,332 14,386 66,386" fill="#FFFFFF" />
        {/* Platinum Circle */}
        <circle cx="120" cy="360" r="24" fill="#CADEDF" />

        {/* --- ROW 7 (Y: 390 - 450) --- */}
        {/* Hunter Green Circle */}
        <circle cx="40" cy="420" r="24" fill="#386642" />
        {/* Hunter Green Semicircle (flat bottom) */}
        <path d="M90,444 A30,30 0 0,1 150,444 Z" fill="#386642" />

        {/* --- ROW 8 (Y: 450 - 490) --- */}
        {/* Cornsilk Semicircle (flat top) */}
        <path d="M10,454 A30,30 0 0,0 70,454 Z" fill="#FFEBCC" />
        {/* Cornsilk Semicircle (flat top) */}
        <path d="M90,454 A30,30 0 0,0 150,454 Z" fill="#FFEBCC" />

        {/* Bottom Chevron / Triangle Geometric Border */}
        <line x1="0" y1="496" x2="160" y2="496" stroke="#CADEDF" strokeWidth="2" />
        <g fill="#CADEDF">
          <polygon points="0,520 16,500 32,520" />
          <polygon points="32,520 48,500 64,520" />
          <polygon points="64,520 80,500 96,520" />
          <polygon points="96,520 112,500 128,520" />
          <polygon points="128,520 144,500 160,520" />
        </g>
      </svg>
    </div>
  );
}
