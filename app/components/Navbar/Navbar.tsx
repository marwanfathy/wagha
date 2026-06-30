'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus, LogOut, User } from 'lucide-react';
import { setAccessToken, publicApi, authApi, type AuthUser } from '@/lib/api';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from '../LanguageSwitch/LanguageSwitch';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const { t } = useLocale();

  useEffect(() => {
    (async () => {
      try {
        const { user, accessToken } = await publicApi.refresh();
        setAccessToken(accessToken);
        setUser(user);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push('/');
    }
  };

  return (
    <header className={styles.brandHeader}>
      <Link href="/" className={styles.brandLogo}>
        Wagha<span>.</span>
      </Link>

      <div className={styles.authActionsGroup}>
        <LanguageSwitch />

        {user ? (
          <div className={styles.userProfileGroup}>
            <span className={styles.userGreeting}>{t('nav.hi', { name: user.username })}</span>

            <div className={styles.userAvatarWrapper}>
              {user.profilePic ? (
                <img src={user.profilePic} alt={t('nav.profileAlt')} className={styles.userAvatarImg} />
              ) : (
                <div className={styles.userAvatarPlaceholder}>
                  <User size={16} />
                </div>
              )}
            </div>

            <button onClick={handleLogout} className={styles.btnLogoutIcon} title={t('nav.logout')}>
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <>
            <Link href="/login" className={styles.authBtnLogin}>
              <LogIn style={{ height: '16px', width: '16px', marginRight: '4px', opacity: 0.8 }} />
              <span>{t('nav.login')}</span>
            </Link>
            <Link href="/signup" className={styles.authBtnSignup}>
              <UserPlus style={{ height: '16px', width: '16px', marginRight: '4px' }} />
              <span>{t('nav.signup')}</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
