'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import styles from './LanguageSwitch.module.css';

export default function LanguageSwitch() {
  const { locale, setLocale } = useLocale();

  const toggle = () => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  };

  return (
    <button
      onClick={toggle}
      className={styles.switch}
      aria-label={locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}
    >
      <span className={`${styles.option} ${locale === 'en' ? styles.active : ''}`}>EN</span>
      <span className={styles.divider}>|</span>
      <span className={`${styles.option} ${locale === 'ar' ? styles.active : ''}`}>AR</span>
    </button>
  );
}
