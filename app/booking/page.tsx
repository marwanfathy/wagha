"use client";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Smartphone, CreditCard, Upload,
  X, Loader2, ChevronLeft, Wallet, Check
} from 'lucide-react';

import {
  authApi,
  bookingsApi,
  publicApi,
  mediaApi,
  paymentsApi,
  ApiRequestError,
  type Trip
} from '@/lib/api';
import { SkeletonBanner, SkeletonBlock, SkeletonText } from '@/components/Skeleton';
import { useLocale } from '@/lib/i18n/LocaleProvider';

import styles from './BookingPage.module.css';

interface PaymentSettings {
  instapayHandle: string;
  ewalletNumber: string;
  currency: string;
}

export default function BookingPageWrapper() {
  return (
    <Suspense fallback={
      <div className={styles.loadingPage}>
        <Loader2 size={28} className={styles.spinner} style={{ color: '#34D399' }} />
      </div>
    }>
      <BookingPage />
    </Suspense>
  );
}

function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, formatNumber, locale } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [guests, setGuests] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'instapay' | 'ewallet'>('instapay');
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('full');

  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripSlug = searchParams.get('trip') || 'sinai-expedition-2024';

  const checkIn = trip?.defaultCheckIn ?? null;
  const checkOut = trip?.defaultCheckOut ?? null;
  const pricePerPerson = trip?.pricePerPerson ?? 0;
  const currency = paymentSettings?.currency || trip?.currency || 'EGP';
  const totalTripPrice = guests * pricePerPerson;
  const amountToPayNow = paymentOption === 'deposit' ? totalTripPrice / 2 : totalTripPrice;

  function fmtDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  }

  function nightsBetween(d1: string | null | undefined, d2: string | null | undefined): number {
    if (!d1 || !d2) return 0;
    const a = new Date(d1), b = new Date(d2);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  const stepsComplete = 1 + 1 + 1 + (receiptUrl ? 1 : 0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [profile, tripData, settings] = await Promise.all([
          authApi.me(),
          publicApi.getTripBySlug(tripSlug, locale),
          publicApi.getSettings(),
        ]);
        if (!cancelled) {
          setUser(profile);
          setTrip(tripData);
          setPaymentSettings(settings.payment);
        }
      } catch (err) {
        if (!cancelled) router.push('/login?redirect=/booking');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [router, tripSlug, locale]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptPreview(URL.createObjectURL(file));
    setIsUploading(true);
    setError(null);

    try {
      const { ticket } = await publicApi.requestIdVerificationTicket();
      const result = await mediaApi.uploadProductImage(file, ticket);
      setReceiptUrl(result.url);
    } catch {
      setError(t('booking.uploadFailed'));
      setReceiptPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!receiptUrl) {
      setError(t('booking.uploadRequired'));
      return;
    }
    if (!trip) {
      setError(t('booking.notLoaded'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const booking: any = await bookingsApi.create({
        tripId: trip.id,
        checkIn: checkIn ?? trip.defaultCheckIn ?? new Date().toISOString().split('T')[0],
        checkOut: checkOut ?? trip.defaultCheckOut ?? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        guests,
      });

      if (!booking?.id) {
        throw new ApiRequestError("Booking was created but no ID was returned.", 500);
      }

      await paymentsApi.submitProof({
        bookingId: booking.id,
        screenshotUrl: receiptUrl,
        transactionNumber: `TRX_${Date.now()}`,
        amountFoundInPic: amountToPayNow,
        transferDateTime: new Date().toISOString(),
        method: paymentMethod === 'instapay' ? 'INSTAPAY' : 'EWALLET',
      });

      router.push('/booking/success');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(t('booking.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.page}>
          <div className={styles.card}>
            <div style={{ padding: 40 }}>
              <SkeletonBlock height={24} width={200} style={{ marginBottom: 32 }} />
              <SkeletonText lines={3} />
              <div style={{ height: 20 }} />
              <SkeletonBlock height={48} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.page}>
        <div className={styles.card}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <ChevronLeft size={16} /> {t('booking.back')}
          </button>

          <div className={styles.railWrap}>
            <div className={styles.railLabelRow}>
              <span className={styles.railTitle}>{trip?.title || t('booking.defaultTitle')}</span>
              <span className={styles.railFraction}>{t('booking.stepProgress', { n: stepsComplete, total: 4 })}</span>
            </div>
            <div className={styles.railTrack}>
              <div className={styles.railFill} style={{ width: `${(stepsComplete / 4) * 100}%` }} />
              {[t('booking.dates'), t('booking.plan'), t('booking.method'), t('booking.proof')].map((label, i) => (
                <div
                  key={i}
                  className={styles.railStop}
                  style={{
                    left: `${(i / 3) * 100}%`,
                    background: i < stepsComplete ? '#34D399' : '#2A2A2A',
                    borderColor: i < stepsComplete ? '#34D399' : 'rgba(255,255,255,0.18)',
                  }}
                >
                  {i < stepsComplete && <Check size={10} strokeWidth={3} color="#0A0A0A" />}
                </div>
              ))}
            </div>
            <div className={styles.railLabels}>
              <span>{t('booking.dates')}</span>
              <span>{t('booking.plan')}</span>
              <span>{t('booking.method')}</span>
              <span>{t('booking.proof')}</span>
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.grid}>
            <div className={styles.colForm}>
              <div className={styles.profileRow}>
                <div className={styles.avatar}>
                  <span className={styles.avatarInitial}>{user?.username?.[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className={styles.profileName}>{user?.fullName}</p>
                  <p className={styles.profilePhone}>{user?.phoneNumber}</p>
                </div>
              </div>

              <section className={styles.section}>
                <p className={styles.sectionLabel}>{t('booking.travelDates')}</p>
                <div className={styles.dateRow}>
                  <div className={styles.dateBlock}>
                    <span className={styles.dateCaption}>{t('booking.checkIn')}</span>
                    <span className={styles.dateValue}>{fmtDate(checkIn)}</span>
                  </div>
                  <div className={styles.dateDivider} />
                  <div className={styles.dateBlock}>
                    <span className={styles.dateCaption}>{t('booking.checkOut')}</span>
                    <span className={styles.dateValue}>{fmtDate(checkOut)}</span>
                  </div>
                  <div className={styles.nightsChip}>{t('booking.nights', { n: nightsBetween(checkIn, checkOut) })}</div>
                </div>
              </section>

              <section className={styles.section}>
                <p className={styles.sectionLabel}>{t('booking.guests')}</p>
                <div className={styles.guestRow}>
                  <button
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className={styles.stepperBtn}
                    aria-label={t('booking.decreaseGuests')}
                  >−</button>
                  <span className={styles.guestCount}>{formatNumber(guests)}</span>
                  <button
                    onClick={() => setGuests(guests + 1)}
                    className={styles.stepperBtn}
                    aria-label={t('booking.increaseGuests')}
                  >+</button>
                  <span className={styles.guestHint}>{guests === 1 ? t('booking.traveler') : t('booking.travelers')}</span>
                </div>
              </section>

              <section className={styles.section}>
                <p className={styles.sectionLabel}>{t('booking.paymentPlan')}</p>
                <div className={styles.choiceRow}>
                  <button
                    onClick={() => setPaymentOption('full')}
                    className={`${styles.choiceCard} ${paymentOption === 'full' ? styles.choiceCardActive : ''}`}
                  >
                    <span className={`${styles.choiceIconWrap} ${paymentOption === 'full' ? styles.choiceIconWrapActive : ''}`}>
                      <Check size={14} strokeWidth={3} color={paymentOption === 'full' ? '#0A0A0A' : 'rgba(255,255,255,0.3)'} />
                    </span>
                    <span className={styles.choiceTextWrap}>
                      <span className={styles.choiceTitle}>{t('booking.fullPrice')}</span>
                      <span className={styles.choiceSub}>{t('booking.payFull')}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setPaymentOption('deposit')}
                    className={`${styles.choiceCard} ${paymentOption === 'deposit' ? styles.choiceCardActive : ''}`}
                  >
                    <span className={`${styles.choiceIconWrap} ${paymentOption === 'deposit' ? styles.choiceIconWrapActive : ''}`}>
                      <Wallet size={14} color={paymentOption === 'deposit' ? '#0A0A0A' : 'rgba(255,255,255,0.3)'} />
                    </span>
                    <span className={styles.choiceTextWrap}>
                      <span className={styles.choiceTitle}>{t('booking.deposit')}</span>
                      <span className={styles.choiceSub}>{t('booking.payDeposit')}</span>
                    </span>
                  </button>
                </div>
              </section>

              <section className={styles.section}>
                <p className={styles.sectionLabel}>{t('booking.paymentMethod')}</p>
                <div className={styles.choiceRow}>
                  <button
                    onClick={() => setPaymentMethod('instapay')}
                    className={`${styles.methodCard} ${paymentMethod === 'instapay' ? styles.choiceCardActive : ''}`}
                  >
                    <Smartphone size={16} color={paymentMethod === 'instapay' ? '#34D399' : 'rgba(255,255,255,0.5)'} />
                    <span className={styles.methodLabel}>{t('booking.instapay')}</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('ewallet')}
                    className={`${styles.methodCard} ${paymentMethod === 'ewallet' ? styles.choiceCardActive : ''}`}
                  >
                    <CreditCard size={16} color={paymentMethod === 'ewallet' ? '#34D399' : 'rgba(255,255,255,0.5)'} />
                    <span className={styles.methodLabel}>{t('booking.ewallet')}</span>
                  </button>
                </div>
              </section>
            </div>

            <div className={styles.colPay}>
              <div className={styles.transferCard}>
                <p className={styles.transferLabel}>{t('booking.transferExactly')}</p>
                <h2 className={styles.transferAmount}>
                  {amountToPayNow.toLocaleString()} <span className={styles.transferCurrency}>{currency}</span>
                </h2>
                <div className={styles.transferDivider} />
                <p className={styles.transferTarget}>
                  {t('booking.to')}{' '}
                  <span className={styles.transferTargetValue}>
                    {paymentMethod === 'instapay' ? (paymentSettings?.instapayHandle || 'wagha.exp@instapay') : (paymentSettings?.ewalletNumber || '01012345678')}
                  </span>
                </p>
              </div>

              <div
                className={`${styles.uploadZone} ${receiptPreview ? styles.uploadZoneFilled : ''}`}
                onClick={() => !receiptPreview && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                {isUploading && (
                  <div className={styles.uploadOverlay}>
                    <Loader2 size={22} className={styles.spinner} style={{ color: '#34D399' }} />
                  </div>
                )}
                {receiptPreview ? (
                  <>
                    <img src={receiptPreview} className={styles.uploadPreviewImg} alt={t('booking.receiptPreviewAlt')} />
                    <button
                      className={styles.uploadRemoveBtn}
                      onClick={(e) => { e.stopPropagation(); setReceiptPreview(null); setReceiptUrl(null); }}
                      aria-label={t('booking.removeScreenshot')}
                    ><X size={14} /></button>
                  </>
                ) : (
                  <div className={styles.uploadEmptyState}>
                    <Upload size={24} color="rgba(255,255,255,0.4)" />
                    <p className={styles.uploadTitle}>{t('booking.uploadReceipt')}</p>
                    <p className={styles.uploadHint}>{t('booking.screenshotHint')}</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} accept="image/*" />
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{formatNumber(guests)} {guests === 1 ? t('booking.summaryGuest') : t('booking.summaryGuests')} × {formatNumber(pricePerPerson)}</span>
                  <span className={styles.summaryValue}>{formatNumber(totalTripPrice)} {currency}</span>
                </div>
                {paymentOption === 'deposit' && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabelMuted}>{t('booking.depositSummary')}</span>
                    <span className={styles.summaryValueMuted}>−{(totalTripPrice / 2).toLocaleString()} {currency}</span>
                  </div>
                )}
                <div className={styles.summaryTotalRow}>
                  <span className={styles.summaryTotalLabel}>{t('booking.dueNow')}</span>
                  <span className={styles.summaryTotalValue}>{amountToPayNow.toLocaleString()} {currency}</span>
                </div>
                <button
                  disabled={isSubmitting || !receiptUrl}
                  onClick={handleFinalSubmit}
                  className={`${styles.submitBtn} ${isSubmitting || !receiptUrl ? styles.submitBtnDisabled : ''}`}
                >
                  {isSubmitting ? <Loader2 size={18} className={styles.spinner} /> : t('booking.complete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
