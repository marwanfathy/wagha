'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Home, MapPin, DollarSign, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { authApi, mediaApi, listingsApi, ApiRequestError } from '@/lib/api';
import authStyles from '../styles/auth.module.css';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import styles from './HostPage.module.css';

export default function BecomeHost() {
  const router = useRouter();
  const { t } = useLocale();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    location: '',
    price: '',
    description: '',
    images: [] as string[],
  });

  useEffect(() => {
    authApi.me().then(setUser).catch(() => router.push('/login?redirect=/host'));
  }, [router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    try {
      setIsSubmitting(true);
      const { url } = await mediaApi.uploadProductImage(file);
      setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
    } catch {
      setError(t('host.uploadFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await listingsApi.create({
        title: formData.title,
        location: formData.location,
        description: formData.description,
        price: Number(formData.price),
        images: formData.images,
      });
      setStep(4);
      setTimeout(() => router.push('/'), 3000);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('host.submissionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <div className={styles.hostContainer}>
        <div className={styles.hostHeroSide}>
          <h1 className={styles.hostTitle}>{t('host.title')}</h1>
          <p className={styles.hostSubtitle}>{t('host.subtitle')}</p>
          <div className={styles.hostBenefitList}>
            <div className={styles.benefitItem}>
              <CheckCircle className="text-emerald-400" size={20} />
              <span>{t('host.earn')}</span>
            </div>
            <div className={styles.benefitItem}>
              <CheckCircle className="text-emerald-400" size={20} />
              <span>{t('host.insurance')}</span>
            </div>
          </div>
        </div>
        <div className={styles.hostFormSide}>
          <div className={`${authStyles.authCard} ${authStyles.authCardWide}`}>
            {error && <div className={authStyles.authBannerError}>{error}</div>}
            {step === 1 && (
              <div className={authStyles.animateFadeIn}>
                <h2 className={styles.stepTitle}>{t('host.basics')}</h2>
                <div className={authStyles.authFieldGroup}>
                  <label className={authStyles.authLabel}><Home size={14} className="inline mr-1"/> {t('host.propertyTitle')}</label>
                  <input className={authStyles.authInput} placeholder={t('host.placeholderTitle')}
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className={authStyles.authFieldGroup}>
                  <label className={authStyles.authLabel}><MapPin size={14} className="inline mr-1"/> {t('host.location')}</label>
                  <input className={authStyles.authInput} placeholder={t('host.placeholderLocation')}
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
                <button onClick={() => setStep(2)} className={`${authStyles.authSubmitBtn} mt-4`}>
                  {t('host.nextDescription')} <ArrowRight size={18} className="ml-2"/>
                </button>
              </div>
            )}
            {step === 2 && (
              <div className={authStyles.animateFadeIn}>
                <h2 className={styles.stepTitle}>{t('host.pricing')}</h2>
                <div className={authStyles.authFieldGroup}>
                  <label className={authStyles.authLabel}><DollarSign size={14} className="inline mr-1"/> {t('host.pricePerNight')}</label>
                  <input className={authStyles.authInput} type="number" placeholder={t('host.placeholderPrice')}
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className={authStyles.authFieldGroup}>
                  <label className={authStyles.authLabel}>{t('host.description')}</label>
                  <textarea className={authStyles.authInput} style={{ minHeight: 100 }} placeholder={t('host.placeholderDescription')}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className={`${authStyles.authGhostBtn} flex-1`}>{t('signup.back')}</button>
                    <button onClick={() => setStep(3)} className={`${authStyles.authSubmitBtn} flex-1`}>{t('host.nextPhotos')}</button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className={authStyles.animateFadeIn}>
                <h2 className={styles.stepTitle}>{t('host.showcase')}</h2>
                <div className={authStyles.idUploadGrid}>
                    <label className={`${authStyles.idUploadZone} cursor-pointer`}>
                        <input type="file" className={authStyles.idUploadInput} onChange={handleImageUpload} disabled={isSubmitting}/>
                        {isSubmitting ? <Loader2 className="animate-spin text-emerald-400"/> : <Upload size={24} className="text-emerald-400 opacity-60"/>}
                        <span className="text-xs mt-2">{t('host.uploadPhoto')}</span>
                    </label>
                    {formData.images.map((url, i) => (
                        <div key={i} className={authStyles.idUploadZone}>
                            <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    ))}
                </div>
                <button onClick={handleSubmit} className={`${authStyles.authSubmitBtn} mt-4`} disabled={isSubmitting || formData.images.length === 0}>
                  {isSubmitting ? t('host.publishing') : t('host.finish')}
                </button>
              </div>
            )}
            {step === 4 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle className="text-emerald-400" size={40} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>{t('host.congrats')}</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>{t('host.review')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
