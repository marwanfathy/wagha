'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { MEDIA_BASE_URL } from '@/lib/api';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import styles from './SuccessPage.module.css';

export default function BookingSuccessPage() {
  const { t } = useLocale();
  useEffect(() => {
    const audio = new Audio(`${MEDIA_BASE_URL}/uploads/audio/successfx.mp3`);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.iconCircle}>
        <CheckCircle size={40} color="#34d399" />
      </div>
      <h1 className={styles.title}>{t('success.title')}</h1>
      <p className={styles.description}>
        {t('success.message')}
      </p>
      <div className={styles.actions}>
        <Link href="/" className={styles.btnPrimary}>
          {t('success.backHome')}
        </Link>
        <Link href="/trips" className={styles.btnSecondary}>
          {t('success.exploreMore')}
        </Link>
      </div>
    </main>
  );
}
