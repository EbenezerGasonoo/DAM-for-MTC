'use client';

import React from 'react';
import { useBranding } from '@/components/BrandingContext';

interface MtcLogoProps {
  variant?: 'icon' | 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  theme?: 'cornsilk' | 'green' | 'oxford' | 'white';
  style?: React.CSSProperties;
  customLogoUrl?: string | null;
  customBrandName?: string;
  customShortName?: string;
}

export function MtcLogoIcon({
  size = 36,
  bgColor = '#1D2729',
  peakColor = '#FFEBCC',
  className = '',
}: {
  size?: number;
  bgColor?: string;
  peakColor?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {/* Rounded Square Emblem Base */}
      <rect width="120" height="120" rx="26" fill={bgColor} />

      {/* Stylized Mountain Peaks with Faith Cross symbolism (MTC Brand Spec) */}
      <g fill={peakColor}>
        {/* Left Mountain Peak */}
        <path
          d="M22 96 L48 38 C49 35 52 35 53 38 L54 41 L35 96 Z"
          fillRule="evenodd"
        />

        {/* Center Peak forming subtle Cross on right shoulder */}
        <path
          d="M40 96 L67 24 C68.5 21 72.5 21 74 24 L79 38 L95 38 C97 38 98 40 97 42 L80 47 L80 96 Z"
          fillRule="evenodd"
        />

        {/* Right Mountain Crest with detached modern peak slice */}
        <path
          d="M87 96 L98 62 C99 59 101 59 102 61 L106 72 L106 96 Z"
          fillRule="evenodd"
        />
        <path
          d="M98 22 C103 24 107 28 107 34 L107 46 C105 44 101 39 98 33 Z"
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
}

export default function MtcLogo({
  variant = 'horizontal',
  size = 'md',
  className = '',
  theme = 'cornsilk',
  style,
  customLogoUrl,
  customBrandName,
  customShortName,
}: MtcLogoProps) {
  // Safe context hook access with fallback
  let contextBranding: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    contextBranding = useBranding();
  } catch {
    // Graceful fallback if rendered outside provider
  }

  const effectiveLogoUrl = customLogoUrl !== undefined ? customLogoUrl : contextBranding?.brandLogoUrl;
  const effectiveBrandName = customBrandName || contextBranding?.brandName || 'Mountain Top Communications';
  const effectiveShortName = customShortName || contextBranding?.brandShortName || 'MTC';

  // Dimensions
  const iconSizes = {
    sm: 28,
    md: 38,
    lg: 52,
    xl: 72,
  };

  const iconPx = iconSizes[size] || 38;

  // Colors based on theme
  let bgColor = '#1D2729';
  let peakColor = '#FFEBCC';
  let textColor = '#FFEBCC';
  let subTextColor = '#CADEDF';

  if (theme === 'green') {
    bgColor = '#386642';
    peakColor = '#FFEBCC';
    textColor = '#FFEBCC';
    subTextColor = '#CADEDF';
  } else if (theme === 'oxford') {
    bgColor = '#FFEBCC';
    peakColor = '#1D2729';
    textColor = '#1D2729';
    subTextColor = '#386642';
  } else if (theme === 'white') {
    bgColor = 'rgba(255, 255, 255, 0.12)';
    peakColor = '#FFFFFF';
    textColor = '#FFFFFF';
    subTextColor = 'rgba(255, 255, 255, 0.7)';
  }

  // Render emblem: either custom uploaded logo or default vector mark
  const renderEmblem = (targetSize: number) => {
    if (effectiveLogoUrl) {
      return (
        <div
          style={{
            width: `${targetSize}px`,
            height: `${targetSize}px`,
            borderRadius: `${Math.round(targetSize * 0.22)}px`,
            backgroundColor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: `${Math.round(targetSize * 0.1)}px`,
            border: '1px solid rgba(202, 222, 223, 0.15)',
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={effectiveLogoUrl}
            alt={effectiveBrandName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      );
    }

    return <MtcLogoIcon size={targetSize} bgColor={bgColor} peakColor={peakColor} />;
  };

  if (variant === 'icon') {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
        {renderEmblem(iconPx)}
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: size === 'sm' ? '8px' : '14px',
          ...style,
        }}
      >
        {renderEmblem(iconPx * 1.5)}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: 800,
              fontSize: size === 'sm' ? '1rem' : size === 'lg' ? '1.8rem' : '1.4rem',
              letterSpacing: '0.04em',
              lineHeight: 1.1,
              color: textColor,
            }}
          >
            {effectiveBrandName.toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: 500,
              fontSize: size === 'sm' ? '0.65rem' : size === 'lg' ? '1rem' : '0.82rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: subTextColor,
              marginTop: '4px',
            }}
          >
            DIGITAL ASSET MANAGEMENT
          </span>
        </div>
      </div>
    );
  }

  // Default: horizontal lockup
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '10px' : size === 'lg' ? '16px' : '12px',
        ...style,
      }}
    >
      {renderEmblem(iconPx)}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: 800,
              fontSize: size === 'sm' ? '1.1rem' : size === 'lg' ? '1.75rem' : '1.35rem',
              letterSpacing: '0.04em',
              color: textColor,
            }}
          >
            {effectiveShortName}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: 600,
              fontSize: size === 'sm' ? '0.72rem' : size === 'lg' ? '0.95rem' : '0.8rem',
              color: 'var(--mtc-hunter-green)',
              backgroundColor: 'rgba(56, 102, 66, 0.22)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(56, 102, 66, 0.35)',
            }}
          >
            DAM
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-brand)',
            fontWeight: 500,
            fontSize: size === 'sm' ? '0.48rem' : size === 'lg' ? '0.72rem' : '0.62rem',
            letterSpacing: size === 'sm' ? '0.06em' : '0.12em',
            textTransform: 'uppercase',
            color: subTextColor,
            marginTop: '3px',
            whiteSpace: 'nowrap',
          }}
        >
          {effectiveBrandName}
        </span>
      </div>
    </div>
  );
}
