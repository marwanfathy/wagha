'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

type Locale = 'en' | 'ar';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  formatNumber: (n: number | string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const COOKIE_NAME = 'wagha_locale';
const DEFAULT_LOCALE: Locale = 'en';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ARABIC_DIGITS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};

function toArabicDigits(str: string): string {
  return str.replace(/[0-9]/g, (d) => ARABIC_DIGITS[d]);
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${365 * 86400};SameSite=Lax`;
}

async function fetchTranslations(locale: Locale): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_BASE}/api/public/translations?locale=${locale}`, {
      credentials: 'include',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const loadingRef = useRef<Locale | null>(null);

  useEffect(() => {
    const cookie = getCookie(COOKIE_NAME);
    const initial: Locale = cookie === 'ar' ? 'ar' : 'en';
    setLocaleState(initial);
    loadingRef.current = initial;
    fetchTranslations(initial).then((msgs) => {
      setMessages(msgs);
      setMounted(true);
      document.documentElement.lang = initial;
      document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr';
    });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setCookie(COOKIE_NAME, l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    if (loadingRef.current !== l) {
      loadingRef.current = l;
      fetchTranslations(l).then(setMessages);
    }
  }, []);

  const t: LocaleContextValue['t'] = useCallback((key, params) => {
    let str = messages[key];
    if (str === undefined) str = key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        const val = locale === 'ar' ? toArabicDigits(String(v)) : String(v);
        str = str.replace(`{${k}}`, val);
      }
    }
    if (locale === 'ar') str = toArabicDigits(str);
    return str;
  }, [messages, locale]);

  const formatNumber: LocaleContextValue['formatNumber'] = useCallback((n) => {
    const s = String(n);
    return locale === 'ar' ? toArabicDigits(s) : s;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, dir: locale === 'ar' ? 'rtl' : 'ltr', formatNumber }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}