'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { publicApi, type Trip, mediaUrl } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { SkeletonBanner } from '@/components/Skeleton';
import AnimatedCounter from '@/components/AnimatedCounter';
import styles from './banner-lan.module.css';

const TRANSITION_MS = 700;
const RETRY_BASE_MS = 3000;
const RETRY_MAX_MS = 30000;

interface Props {
  onSlideChange?: (slug: string) => void;
}

export default function Banner({ onSlideChange }: Props) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [slides, setSlides] = useState<Trip[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const retryCountRef = useRef(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Fetch slide data on mount with backoff retries
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function attemptLoad() {
      try {
        const data = await publicApi.getBannerSlides(locale);
        if (cancelled) return;
        setSlides(data ?? []);
        if (data && data.length > 0) onSlideChange?.(data[0].slug);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load banner slides.', err);
        if (cancelled) return;
        const delay = Math.min(RETRY_BASE_MS * Math.pow(2, retryCountRef.current), RETRY_MAX_MS);
        retryCountRef.current += 1;
        retryTimer = setTimeout(attemptLoad, delay);
      }
    }

    attemptLoad();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [onSlideChange, locale]);

  const goToSlide = (targetIdx: number) => {
    if (slides.length < 2 || isTransitioning || targetIdx === currentIdx) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIdx(targetIdx);
      onSlideChange?.(slides[targetIdx].slug);
      setIsTransitioning(false);
    }, TRANSITION_MS);
  };

  const goToNextSlide = () => {
    const next = (currentIdx + 1) % slides.length;
    goToSlide(next);
  };

  if (isLoading) {
    return <SkeletonBanner />;
  }

  if (slides.length === 0) {
    return (
      <div className={`${styles.bannerViewport} ${styles.bannerViewportEmpty}`}>
        <p className={styles.slideDescription}>{t('banner.noSlides')}</p>
      </div>
    );
  }

  const activeSlide = slides[currentIdx];

  return (
    <div ref={bannerRef} className={styles.bannerViewport}>
      <div
        className={`${styles.heroBgLayer} ${isTransitioning ? styles.heroBgTransitioning : styles.heroBgActive}`}
        style={{ backgroundImage: `url(${mediaUrl(activeSlide.bannerImage)})` }}
      />
      <div className={styles.vignetteOverlayRadial} />
      <div className={styles.vignetteOverlayLinear} />

      <div className={styles.heroTitleContainer}>
        <h1 className={`${styles.heroTitleText} ${isTransitioning ? styles.heroTitleTransitioning : styles.heroTitleActive}`}>
          {activeSlide.country}
        </h1>
      </div>

      <div className={styles.bottomPanelGrid}>
        <div className={styles.detailsColumn}>
          <div className={styles.metricsRow}>
            <div>
              <div className={styles.metricNumber}>
                <AnimatedCounter value={activeSlide.statTravelers} />
              </div>
              <div className={styles.metricLabel}>{t('banner.happyTravelers')}</div>
            </div>
            <div>
              <div className={styles.metricNumber}>
                <AnimatedCounter value={activeSlide.statTours} />
              </div>
              <div className={styles.metricLabel}>{t('banner.customTours')}</div>
            </div>
            <div>
              <div className={styles.metricNumber}>
                <AnimatedCounter value={activeSlide.statStays} />
              </div>
              <div className={styles.metricLabel}>{t('banner.arrangedStays')}</div>
            </div>
          </div>
          
          <div className={styles.actionRow}>
            <div className={styles.interactiveGroup}>
              <div className={styles.ctaButtonGroup}>
                <button className={styles.btnBookNow} onClick={() => router.push(`/booking?trip=${activeSlide.slug}`)}>
                  {t('banner.bookNow')}
                </button>
                <div className={styles.arrowCircleBtn} onClick={() => router.push(`/trips/${activeSlide.slug}`)}>
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>

              <div onClick={goToNextSlide} className={styles.glassSliderCard}>
                <div className={styles.sliderFooter}>
                  <span className={styles.sliderIndexCounter}>
                    {t('banner.slideCounter', { current: currentIdx + 1, total: slides.length })}
                  </span>
                  <div className={styles.progressDotsRow}>
                    {slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        type="button"
                        aria-label={t('banner.goToSlide', { n: idx + 1 })}
                        disabled={isTransitioning}
                        className={`${styles.progressDot} ${
                          idx === currentIdx ? styles.progressDotActive : styles.progressDotInactive
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToSlide(idx);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className={styles.slideDescription}>{activeSlide.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}