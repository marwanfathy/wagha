'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { publicApi, setAccessToken, ApiRequestError } from '@/lib/api';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import styles from '../styles/auth.module.css';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setIsSubmitting(true);
    try {
      const result = await publicApi.login({ identifier: username, password });
      setAccessToken(result.accessToken);
      router.push(searchParams.get('redirect') || '/');
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : t('login.errorGeneric');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <main style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      <Navbar />

      <div className={styles.authPage}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>{t('login.title')}</h1>
          <p className={styles.authSubtitle}>{t('login.subtitle')}</p>

          {error && <div className={styles.authBannerError}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.authFieldGroup}>
              <label className={styles.authLabel} htmlFor="username">{t('login.username')}</label>
              <input
                id="username"
                className={styles.authInput}
                type="text"
                placeholder={t('login.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className={styles.authFieldGroup}>
              <label className={styles.authLabel} htmlFor="password">{t('login.password')}</label>
              <div className={styles.passwordWrap}>
                <input
                  id="password"
                  className={`${styles.authInput} ${styles.authInputPw}`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.pwToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button className={styles.authSubmitBtn} type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className={styles.loaderSpinner} style={{ height: 18, width: 18, margin: 0 }} /> : t('login.submit')}
            </button>
          </form>

          <p className={styles.authFooterText}>
            {t('login.noAccount')}{' '}
            <Link href="/signup" className={styles.authFooterLink}>{t('login.signUpLink')}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
