"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { publicApi, type Trip, mediaUrl } from '@/lib/api';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import styles from './SinaiJourney.module.css';

interface Props {
  tripSlug?: string;
}

export default function SinaiJourney({ tripSlug }: Props) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [trip, setTrip] = useState<Trip | null>(null);
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
    const slug = tripSlug;
    if (!slug) {
      publicApi.getBannerSlides(locale)
        .then(slides => {
          if (slides.length > 0) {
            return publicApi.getTripBySlug(slides[0].slug, locale);
          }
          return null;
        })
        .then(t => { if (t) setTrip(t); })
        .catch(() => {});
      return;
    }
    publicApi.getTripBySlug(slug, locale)
      .then(setTrip)
      .catch(() => {});
  }, [tripSlug, locale]);

  const steps = trip?.steps || [];
  const features = trip?.includedFeatures || [];
  const price = trip?.pricePerPerson ?? 0;
  const currency = trip?.currency ?? 'EGP';
  const tripSlugValue = trip?.slug ?? tripSlug ?? '';

  const handleBooking = () => {
    if (!tripSlugValue) return;
    if (isLoggedIn) {
      router.push(`/booking?trip=${tripSlugValue}`);
    } else {
      router.push(`/login?redirect=/booking?trip=${tripSlugValue}`);
    }
  };

  return (
    <div className={styles.mainContainer}>
      <section className={styles.hero}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <span className={styles.heroLabel}>{trip?.label || t('trip.privateExpedition')}</span>
          <h1 className={styles.heroTitle}>{trip?.country || 'SINAI'}<span className={styles.heroDot}>.</span></h1>
        </motion.div>
      </section>

      {steps.length > 0 ? steps.map((step, index) => (
        <div key={step.id} className={styles.stepSection}>
          <div className={styles.imageSide}>
            <motion.div
              className={styles.imageWrapper}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <img src={mediaUrl(step.image)} alt={step.title} className={styles.stepImage} loading="lazy" decoding="async" />
            </motion.div>
          </div>
          <div className={styles.textSide}>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className={styles.dayNumber}>{step.day}</span>
              <h2 className={styles.stepTitle}>{step.title}</h2>
              <p className={styles.stepDescription}>{step.description}</p>
            </motion.div>
          </div>
        </div>
      )) : (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          {t('trip.loading')}
        </div>
      )}

      <section className={styles.finalSection}>
        <div className={styles.summaryContent}>
          <h2 className={styles.summaryTitle}>{t('trip.programTitle')}</h2>
          <div className={styles.grid}>
            <div>
              <ul className={styles.itineraryList}>
                {features.map((feature, i) => (
                  <li key={i} className={styles.itineraryItem}>
                    <CheckCircle size={20} color={trip?.accentColor || '#0066cc'} /> {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.ctaCard}>
              <div className={styles.price}>{price.toLocaleString()} {currency}</div>
              <button className={styles.bookButton} onClick={handleBooking}>
                {isLoggedIn ? t('trip.reserve') : t('trip.signInToBook')}
                {isLoggedIn ? <ArrowRight size={20} /> : <Lock size={18} />}
              </button>
              <p style={{ color: '#86868b', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' }}>
                {t('trip.allInclusiveNote')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
