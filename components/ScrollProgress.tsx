'use client';

import React, { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(scrollTop / docHeight, 1));
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pct = Math.round(progress * 100);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
        opacity: progress > 0 ? 1 : 0.4,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        style={{
          width: 3,
          height: 48,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.12)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: `${pct}%`,
            background: '#fff',
            borderRadius: 99,
            transition: 'height 0.1s linear',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.4)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 0.05,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}
