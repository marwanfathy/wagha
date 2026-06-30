'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicApi, type Trip, mediaUrl } from '@/lib/api';
import { SkeletonCard } from '@/components/Skeleton';
import Navbar from '../components/Navbar/Navbar';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import styles from './TripsPage.module.css';

export default function TripsPage() {
  const { t, formatNumber, locale } = useLocale();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.listTrips(locale)
      .then(setTrips)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [locale]);

  const imageUrl = (trip: Trip) => mediaUrl(trip.bannerImage);

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={styles.wrapper}>
        <h1 className={styles.pageTitle}>{t('trips.title')}</h1>
        <p className={styles.pageSubtitle}>{t('trips.subtitle')}</p>
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : trips.length === 0 ? (
          <p className={styles.emptyText}>{t('trips.empty')}</p>
        ) : (
          <div className={styles.grid}>
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.slug}`}
                className={styles.card}
              >
                <div className={styles.cardImageWrap} style={{ background: `url(${imageUrl(trip)}) center/cover` }}>
                  <div className={styles.cardCountryBadge} style={{ color: trip.primaryColor }}>
                    {trip.country}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{trip.title}</h3>
                  <p className={styles.cardDescription}>{trip.description}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardPrice}>{formatNumber(trip.pricePerPerson)} {trip.currency}</span>
                    <span className={styles.cardLocation}>{trip.location}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
