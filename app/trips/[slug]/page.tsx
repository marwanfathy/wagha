'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { publicApi, type Trip, mediaUrl } from '@/lib/api';
import { ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { SkeletonBanner, SkeletonText, SkeletonBlock } from '@/components/Skeleton';
import Navbar from '../../components/Navbar/Navbar';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import styles from './TripDetailPage.module.css';

export default function TripDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { t, formatNumber, locale } = useLocale();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await publicApi.refresh();
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!slug) return;
    publicApi.getTripBySlug(slug as string, locale)
      .then(setTrip)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, locale]);

  if (loading) {
    return (
      <main className={styles.main}>
        <Navbar />
        <SkeletonBanner />
        <div className={styles.content}>
          <div className={styles.overviewGrid} style={{ marginBottom: 60 }}>
            <div><SkeletonText lines={5} /></div>
            <SkeletonBlock height={180} />
          </div>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className={styles.main}>
        <Navbar />
        <div className={styles.notFound}>{t('trip.notFound')}</div>
      </main>
    );
  }

  const handleBooking = () => {
    if (isLoggedIn) {
      router.push(`/booking?trip=${trip.slug}`);
    } else {
      router.push(`/login?redirect=/booking?trip=${trip.slug}`);
    }
  };

  return (
    <main className={styles.main}>
      <Navbar />

      <div className={styles.hero} style={{ background: `url(${mediaUrl(trip.bannerImage)}) center/cover` }}>
        <div className={styles.heroGradient} />
        <div className={styles.heroContent}>
          {trip.label && <span className={styles.heroLabel} style={{ color: trip.primaryColor }}>{trip.label}</span>}
          <h1 className={styles.heroCountry} style={{ color: trip.textColor }}>{trip.country}</h1>
          <p className={styles.heroDescription} style={{ color: trip.textColor }}>{trip.description}</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.overviewGrid}>
          <div>
            <h2 className={styles.sectionTitle}>{t('trip.about')}</h2>
            <p className={styles.aboutText}>{trip.longDescription || trip.description}</p>
          </div>
          <div className={styles.priceCard}>
            <div className={styles.priceLabel}>{t('trip.price')}</div>
            <div className={styles.priceValue}>{formatNumber(trip.pricePerPerson)} <span className={styles.priceCurrency}>{trip.currency}</span></div>
            <div className={styles.priceMeta}>{t('trip.perPerson')} · {trip.location}</div>
            <button onClick={handleBooking} className={styles.bookBtn}>
              {isLoggedIn ? t('trip.reserve') : t('trip.signInToBook')}
              {isLoggedIn ? <ArrowRight size={18} /> : <Lock size={16} />}
            </button>
          </div>
        </div>

        {trip.steps && trip.steps.length > 0 && (
          <div className={styles.programSection}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 32 }}>{t('trip.journey')}</h2>
            <div className={styles.programGrid}>
              {trip.steps.map((step) => (
                <div key={step.id} className={styles.stepCard}>
                  <div className={styles.stepImage} style={{ background: `url(${mediaUrl(step.image)}) center/cover` }} />
                  <div className={styles.stepText}>
                    <span className={styles.stepDay}>{t('trip.day', { n: step.day })}</span>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepDescription}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {trip.includedFeatures && trip.includedFeatures.length > 0 && (
          <div className={styles.featuresSection}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 24 }}>{t('trip.whatsIncluded')}</h2>
            <div className={styles.featuresGrid}>
              {trip.includedFeatures.map((feature, i) => (
                <div key={i} className={styles.featureItem}>
                  <CheckCircle size={18} color="#34d399" />
                  <span className={styles.featureText}>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.statsRow}>
          <div>
            <div className={styles.statNumber}>{trip.statTravelers}</div>
            <div className={styles.statLabel}>{t('banner.happyTravelers')}</div>
          </div>
          <div>
            <div className={styles.statNumber}>{trip.statTours}</div>
            <div className={styles.statLabel}>{t('banner.customTours')}</div>
          </div>
          <div>
            <div className={styles.statNumber}>{trip.statStays}</div>
            <div className={styles.statLabel}>{t('banner.arrangedStays')}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
