'use client';

import React from 'react';

const shimmer = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

const baseStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 8,
};

export function SkeletonBlock({ width, height, style }: { width?: number | string; height?: number | string; style?: React.CSSProperties }) {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ ...baseStyle, width: width ?? '100%', height: height ?? 20, ...style }} />
    </>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} width={i === lines - 1 ? '60%' : '100%'} height={14} />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 320 }: { height?: number }) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <SkeletonBlock height={height} style={{ borderRadius: 0 }} />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SkeletonBlock width="40%" height={12} />
        <SkeletonBlock width="80%" height={18} />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonBanner() {
  return (
    <div style={{ width: '100%', height: '100vh', minHeight: 500, position: 'relative' }}>
      <SkeletonBlock width="100%" height="100%" style={{ borderRadius: 0 }} />
      <div style={{ position: 'absolute', bottom: 60, left: 48, right: 48, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
        <SkeletonBlock width={80} height={14} />
        <SkeletonBlock width="90%" height={48} />
        <SkeletonBlock width="70%" height={16} />
      </div>
    </div>
  );
}
