'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';

function parseNumber(raw: string): number {
  return parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
}

function formatDisplay(value: number, original: string, locale: 'en' | 'ar'): string {
  const suffix = original.replace(/[0-9,]/g, '');
  const numStr = value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  return numStr + suffix;
}

interface Props {
  value: string;
  duration?: number;
}

export default function AnimatedCounter({ value, duration = 2000 }: Props) {
  const { locale } = useLocale();
  const [display, setDisplay] = useState('0');
  const target = parseNumber(value);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setDisplay(locale === 'ar' ? value.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]) : value);
      return;
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setDisplay(formatDisplay(current, value, locale));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(locale === 'ar' ? value.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]) : value);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration, locale]);

  return <>{display}</>;
}
