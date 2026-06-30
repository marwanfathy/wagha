'use client';

import React, { useRef, useState, useEffect } from 'react';

interface Props {
  src: string;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  once?: boolean;
}

export default function LazyBackground({ src, className, children, style, once = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          if (once) observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        ...(loaded ? { backgroundImage: `url(${src})` } : {}),
      }}
    >
      {children}
    </div>
  );
}
