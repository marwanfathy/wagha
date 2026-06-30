'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Upload, X } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { publicApi, mediaApi, setAccessToken, ApiRequestError } from '@/lib/api';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import styles from '../styles/auth.module.css';

const TOTAL_STEPS = 3;

const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

interface FormState {
  username: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  dateOfBirth: string;
  nationalIdNumber: string;
}

const initialForm: FormState = {
  username: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  phoneNumber: '',
  email: '',
  dateOfBirth: '',
  nationalIdNumber: '',
};

function calculateAge(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** One of the two ID-photo dropzones, with drag/click upload + live preview. */
function IdPhotoDropzone({
  label,
  previewUrl,
  isUploading,
  error,
  onSelectFile,
  onRemove,
}: {
  label: string;
  previewUrl: string | null;
  isUploading: boolean;
  error?: string;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onSelectFile(file);
  };

  return (
    <div>
      <div
        className={`${styles.idUploadZone} ${previewUrl ? styles.idUploadZoneFilled : ''} ${error ? styles.idUploadZoneError : ''}`}
        onClick={() => !previewUrl && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        {isUploading && (
          <div className={styles.idUploadUploadingOverlay}>
            <Loader2 className={styles.loaderSpinner} style={{ height: 24, width: 24, margin: 0 }} />
          </div>
        )}

        {previewUrl ? (
          <>
            <img src={previewUrl} alt={`${label} preview`} className={styles.idUploadPreview} />
            <button
              type="button"
              className={styles.idUploadRemoveBtn}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={`Remove ${label}`}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <Upload className={styles.idUploadIcon} size={22} />
            <span className={styles.idUploadLabel}>{t('signup.clickOrDrag', { label: label.toLowerCase() })}</span>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={styles.idUploadInput}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <p className={styles.idUploadCaption} style={{ color: error ? '#f87171' : 'rgba(255,255,255,0.6)' }}>
        {error || label}
      </p>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { t } = useLocale();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ID photos: local preview + the uploaded URL once the media server returns one.
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [frontUploading, setFrontUploading] = useState(false);
  const [backUploading, setBackUploading] = useState(false);
  const [idErrors, setIdErrors] = useState<{ front?: string; back?: string }>({});

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  function validateStep1(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (form.username.length < 3 || form.username.length > 30 || !USERNAME_REGEX.test(form.username)) {
      errors.username = 'Username must be 3-30 characters: letters, numbers, dots, underscores only.';
    }
    if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (!/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      errors.password = 'Password needs an uppercase letter, lowercase letter, and a number.';
    }
    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep2(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (form.fullName.trim().length < 2) {
      errors.fullName = 'Enter your full name.';
    }
    if (!PHONE_REGEX.test(form.phoneNumber)) {
      errors.phoneNumber = 'Enter a valid phone number, e.g. +201234567890.';
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      errors.email = 'Enter a valid email or leave it blank.';
    }
    if (!form.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.';
    } else if (calculateAge(form.dateOfBirth) < 18) {
      errors.dateOfBirth = 'You must be at least 18 years old to register.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep3(): boolean {
    const errors: { front?: string; back?: string } = {};
    if (form.nationalIdNumber.trim().length < 5) {
      setFieldErrors((prev) => ({ ...prev, nationalIdNumber: 'Enter your national ID number.' }));
    }
    if (!frontUrl) errors.front = 'Front photo is required.';
    if (!backUrl) errors.back = 'Back photo is required.';
    setIdErrors(errors);
    return form.nationalIdNumber.trim().length >= 5 && !errors.front && !errors.back;
  }

  const handleNext = () => {
    setBanner(null);
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    setBanner(null);
    setStep((s) => Math.max(1, s - 1));
  };

  async function uploadIdPhoto(file: File, side: 'front' | 'back') {
    const setUploading = side === 'front' ? setFrontUploading : setBackUploading;
    const setPreview = side === 'front' ? setFrontPreview : setBackPreview;
    const setUrl = side === 'front' ? setFrontUrl : setBackUrl;

    setIdErrors((prev) => ({ ...prev, [side]: undefined }));
    setPreview(URL.createObjectURL(file)); // instant local preview while it uploads
    setUploading(true);

    try {
      const { ticket } = await publicApi.requestIdVerificationTicket();
      const result = await mediaApi.uploadIdPhoto(file, ticket);
      setUrl(result.url);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Upload failed, try again.';
      setIdErrors((prev) => ({ ...prev, [side]: message }));
      setPreview(null);
      setUrl(null);
    } finally {
      setUploading(false);
    }
  }

  function removeIdPhoto(side: 'front' | 'back') {
    (side === 'front' ? setFrontPreview : setBackPreview)(null);
    (side === 'front' ? setFrontUrl : setBackUrl)(null);
  }

  async function handleSubmit() {
    setBanner(null);
    if (!validateStep3()) return;

    setIsSubmitting(true);
    try {
      const result = await publicApi.register({
        username: form.username.trim(),
        phoneNumber: form.phoneNumber.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        nationalIdNumber: form.nationalIdNumber.trim(),
        nationalIdPicFront: frontUrl as string,
        nationalIdPicBack: backUrl as string,
        dateOfBirth: form.dateOfBirth,
        role: 'CUSTOMER',
      });
      setAccessToken(result.accessToken);
      router.push('/');
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Could not create your account. Try again.';
      setBanner(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      <Navbar />

      <div className={styles.authPage}>
        <div className={`${styles.authCard} ${step === 3 ? styles.authCardWide : ''}`}>
          <div className={styles.authStepIndicator}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`${styles.authStepDot} ${
                  i + 1 === step ? styles.authStepDotActive : i + 1 < step ? styles.authStepDotDone : ''
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className={styles.authTitle}>{t('signup.title')}</h1>
              <p className={styles.authSubtitle}>{t('signup.step1')}</p>

              <div className={styles.authFieldGroup}>
                <label className={styles.authLabel} htmlFor="username">{t('signup.username')}</label>
                <input
                  id="username"
                  className={`${styles.authInput} ${fieldErrors.username ? styles.authInputError : ''}`}
                  type="text"
                  placeholder="yourusername"
                  value={form.username}
                  onChange={(e) => updateField('username', e.target.value)}
                  autoComplete="username"
                />
                {fieldErrors.username && <span className={styles.authErrorText}>{fieldErrors.username}</span>}
              </div>

              <div className={styles.authFieldGroup}>
                <label className={styles.authLabel} htmlFor="password">{t('signup.password')}</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="password"
                    className={`${styles.authInput} ${styles.authInputPw} ${fieldErrors.password ? styles.authInputError : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('signup.passwordPlaceholder')}
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    autoComplete="new-password"
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
                {fieldErrors.password && <span className={styles.authErrorText}>{fieldErrors.password}</span>}
              </div>

              <div className={styles.authFieldGroup}>
                <label className={styles.authLabel} htmlFor="confirmPassword">{t('signup.confirmPassword')}</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="confirmPassword"
                    className={`${styles.authInput} ${styles.authInputPw} ${fieldErrors.confirmPassword ? styles.authInputError : ''}`}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('signup.confirmPasswordPlaceholder')}
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.pwToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <span className={styles.authErrorText}>{fieldErrors.confirmPassword}</span>}
              </div>

              <div className={styles.authStepActions}>
                <button className={styles.authSubmitBtn} type="button" onClick={handleNext}>{t('signup.continue')}</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className={styles.authTitle}>{t('signup.tellUs')}</h1>
              <p className={styles.authSubtitle}>{t('signup.step2')}</p>

              <div className={styles.authFieldGroup}>
                <label className={styles.authLabel} htmlFor="fullName">{t('signup.fullName')}</label>
                <input
                  id="fullName"
                  className={`${styles.authInput} ${fieldErrors.fullName ? styles.authInputError : ''}`}
                  type="text"
                  dir="auto"
                  placeholder={t('signup.placeholderFullName')}
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  autoComplete="name"
                />
                {fieldErrors.fullName && <span className={styles.authErrorText}>{fieldErrors.fullName}</span>}
              </div>

              <div className={styles.authRowTwo}>
                <div className={styles.authFieldGroup}>
                  <label className={styles.authLabel} htmlFor="phoneNumber">{t('signup.phoneNumber')}</label>
                  <input
                    id="phoneNumber"
                    className={`${styles.authInput} ${fieldErrors.phoneNumber ? styles.authInputError : ''}`}
                    type="tel"
                    placeholder="+201234567890"
                    value={form.phoneNumber}
                    onChange={(e) => updateField('phoneNumber', e.target.value)}
                    autoComplete="tel"
                  />
                  {fieldErrors.phoneNumber && <span className={styles.authErrorText}>{fieldErrors.phoneNumber}</span>}
                </div>

                <div className={styles.authFieldGroup}>
                  <label className={styles.authLabel} htmlFor="dateOfBirth">{t('signup.dateOfBirth')}</label>
                  <input
                    id="dateOfBirth"
                    className={`${styles.authInput} ${fieldErrors.dateOfBirth ? styles.authInputError : ''}`}
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                  {fieldErrors.dateOfBirth && <span className={styles.authErrorText}>{fieldErrors.dateOfBirth}</span>}
                </div>
              </div>

              <div className={styles.authFieldGroup}>
                <label className={styles.authLabel} htmlFor="email">{t('signup.emailOptional')}</label>
                <input
                  id="email"
                  className={`${styles.authInput} ${fieldErrors.email ? styles.authInputError : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  autoComplete="email"
                />
                {fieldErrors.email && <span className={styles.authErrorText}>{fieldErrors.email}</span>}
              </div>

              <div className={styles.authStepActions}>
                <button className={styles.authGhostBtn} type="button" onClick={handleBack}>{t('signup.back')}</button>
                <button className={styles.authSubmitBtn} type="button" onClick={handleNext}>{t('signup.continue')}</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className={styles.authTitle}>{t('signup.verifyId')}</h1>
              <p className={styles.authSubtitle}>{t('signup.step3')}</p>

              {banner && <div className={styles.authBannerError}>{banner}</div>}

              <div className={styles.authFieldGroup}>
                <label className={styles.authLabel} htmlFor="nationalIdNumber">{t('signup.nationalId')}</label>
                <input
                  id="nationalIdNumber"
                  className={`${styles.authInput} ${fieldErrors.nationalIdNumber ? styles.authInputError : ''}`}
                  type="text"
                  placeholder="e.g. 29801011234567"
                  value={form.nationalIdNumber}
                  onChange={(e) => updateField('nationalIdNumber', e.target.value)}
                />
                {fieldErrors.nationalIdNumber && (
                  <span className={styles.authErrorText}>{fieldErrors.nationalIdNumber}</span>
                )}
              </div>

              <div className={styles.idUploadGrid}>
                <IdPhotoDropzone
                  label={t('signup.frontId')}
                  previewUrl={frontPreview}
                  isUploading={frontUploading}
                  error={idErrors.front}
                  onSelectFile={(file) => uploadIdPhoto(file, 'front')}
                  onRemove={() => removeIdPhoto('front')}
                />
                <IdPhotoDropzone
                  label={t('signup.backId')}
                  previewUrl={backPreview}
                  isUploading={backUploading}
                  error={idErrors.back}
                  onSelectFile={(file) => uploadIdPhoto(file, 'back')}
                  onRemove={() => removeIdPhoto('back')}
                />
              </div>

              <div className={styles.authStepActions}>
                <button className={styles.authGhostBtn} type="button" onClick={handleBack} disabled={isSubmitting}>
                  {t('signup.back')}
                </button>
                <button
                  className={styles.authSubmitBtn}
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || frontUploading || backUploading}
                >
                  {isSubmitting ? (
                    <Loader2 className={styles.loaderSpinner} style={{ height: 18, width: 18, margin: 0 }} />
                  ) : (
                    t('signup.createAccount')
                  )}
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <p className={styles.authFooterText}>
              {t('signup.hasAccount')}{' '}
              <Link href="/login" className={styles.authFooterLink}>Log in</Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}