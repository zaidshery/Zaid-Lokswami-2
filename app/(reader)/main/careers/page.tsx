'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { BriefcaseBusiness, Mail, MapPin, Rocket, Send, Users } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';
import { COMPANY_INFO } from '@/lib/constants/company';

type FormValues = {
  name: string;
  email: string;
  phone: string;
  role: string;
  experience: string;
  portfolioUrl: string;
  message: string;
  website: string;
};

type FormErrors = Partial<Record<'name' | 'email' | 'phone' | 'role' | 'portfolioUrl' | 'message', string>>;

type SubmitState = 'idle' | 'success' | 'error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+()\-\s0-9]{7,20}$/;

const COPY = {
  en: {
    tag: 'Careers',
    title: 'Build News Products That Reach Millions',
    subtitle:
      'Join Lokswami and help us build reliable digital journalism experiences for Hindi-first audiences.',
    openRoles: 'Open Roles',
    roleType: 'Full-time',
    perksTitle: 'Why Work With Us',
    perk1: 'Fast execution with a small and focused team.',
    perk2: 'Direct impact on audience growth and product quality.',
    perk3: 'Editorial + product collaboration in one workflow.',
    applyTitle: 'Apply Now',
    applyText: 'Fill this form to apply directly. Our team will review and contact you.',
    applyButton: 'Submit Application',
    submittingLabel: 'Submitting...',
    successFallback: 'Application submitted successfully.',
    errorFallback: 'Unable to submit application. Please try again.',
    nameLabel: 'Full Name',
    emailLabel: 'Email Address',
    phoneLabel: 'Phone Number (Optional)',
    roleLabel: 'Role',
    experienceLabel: 'Experience (Optional)',
    portfolioLabel: 'Portfolio/LinkedIn URL (Optional)',
    messageLabel: 'Message',
    selectRole: 'Select a role',
    nameError: 'Please enter your name (minimum 2 characters).',
    emailError: 'Please enter a valid email address.',
    phoneError: 'Please enter a valid phone number.',
    roleError: 'Please select a role.',
    portfolioError: 'Please enter a valid URL (http/https).',
    messageError: 'Please enter a message (minimum 10 characters).',
    location: 'Indore, Madhya Pradesh',
    source: 'main-careers',
  },
  hi: {
    tag: '\u0915\u0930\u093f\u092f\u0930',
    title: '\u0932\u094b\u0915\u0938\u094d\u0935\u093e\u092e\u0940 \u0915\u0947 \u0938\u093e\u0925 \u0921\u093f\u091c\u093f\u091f\u0932 \u091c\u0930\u094d\u0928\u0932\u093f\u091c\u094d\u092e \u092a\u094d\u0932\u0947\u091f\u092b\u0949\u0930\u094d\u092e \u092c\u0928\u093e\u090f\u0902',
    subtitle:
      '\u0939\u093f\u0902\u0926\u0940 \u092a\u093e\u0920\u0915\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f \u092c\u0947\u0939\u0924\u0930 \u0928\u094d\u092f\u0942\u091c \u0905\u0928\u0941\u092d\u0935 \u0924\u0948\u092f\u093e\u0930 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0939\u092e\u093e\u0930\u0940 \u091f\u0940\u092e \u091c\u0949\u0907\u0928 \u0915\u0930\u0947\u0902\u0964',
    openRoles: '\u0916\u0941\u0932\u0940 \u092d\u0930\u094d\u0924\u093f\u092f\u093e\u0902',
    roleType: '\u092b\u0941\u0932-\u091f\u093e\u0907\u092e',
    perksTitle: '\u0939\u092e\u093e\u0930\u0947 \u0938\u093e\u0925 \u0915\u094d\u092f\u094b\u0902',
    perk1: '\u092b\u094b\u0915\u0938\u094d\u0921 \u091f\u0940\u092e \u0915\u0947 \u0938\u093e\u0925 \u092b\u093e\u0938\u094d\u091f \u090f\u0915\u094d\u091c\u0940\u0915\u094d\u092f\u0942\u0936\u0928\u0964',
    perk2: '\u092a\u094d\u0930\u094b\u0921\u0915\u094d\u091f \u0914\u0930 \u0911\u0921\u093f\u092f\u0902\u0938 \u0917\u094d\u0930\u094b\u0925 \u092a\u0930 \u0938\u0940\u0927\u093e \u0905\u0938\u0930\u0964',
    perk3: '\u090f\u0921\u093f\u091f\u094b\u0930\u093f\u092f\u0932 \u0914\u0930 \u091f\u0947\u0915 \u091f\u0940\u092e \u0915\u093e \u0938\u094d\u092e\u0942\u0926 \u0915\u094b\u0932\u0948\u092c\u094b\u0930\u0947\u0936\u0928\u0964',
    applyTitle: '\u0905\u092d\u0940 \u0905\u092a\u094d\u0932\u093e\u0908 \u0915\u0930\u0947\u0902',
    applyText: '\u0906\u0935\u0947\u0926\u0928 \u0915\u0947 \u0932\u093f\u090f \u092f\u0939 \u092b\u0949\u0930\u094d\u092e \u092d\u0930\u0947\u0902\u0964 \u0939\u092e\u093e\u0930\u0940 \u091f\u0940\u092e \u0906\u092a\u0938\u0947 \u0938\u0902\u092a\u0930\u094d\u0915 \u0915\u0930\u0947\u0917\u0940\u0964',
    applyButton: '\u0906\u0935\u0947\u0926\u0928 \u092d\u0947\u091c\u0947\u0902',
    submittingLabel: '\u092d\u0947\u091c\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948...',
    successFallback: '\u0906\u0935\u0947\u0926\u0928 \u0938\u092b\u0932\u0924\u093e\u092a\u0942\u0930\u094d\u0935\u0915 \u092d\u0947\u091c\u093e \u0917\u092f\u093e\u0964',
    errorFallback: '\u0905\u092d\u0940 \u0906\u0935\u0947\u0926\u0928 \u0928\u0939\u0940\u0902 \u092d\u0947\u091c\u093e \u091c\u093e \u0938\u0915\u093e\u0964 \u0926\u094b\u092c\u093e\u0930\u093e \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902\u0964',
    nameLabel: '\u092a\u0942\u0930\u093e \u0928\u093e\u092e',
    emailLabel: '\u0908\u092e\u0947\u0932 \u092a\u0924\u093e',
    phoneLabel: '\u092b\u094b\u0928 \u0928\u0902\u092c\u0930 (\u0910\u091a\u094d\u091b\u093f\u0915)',
    roleLabel: '\u0930\u094b\u0932',
    experienceLabel: '\u0905\u0928\u0941\u092d\u0935 (\u0910\u091a\u094d\u091b\u093f\u0915)',
    portfolioLabel: '\u092a\u094b\u0930\u094d\u091f\u092b\u094b\u0932\u093f\u092f\u094b/LinkedIn URL (\u0910\u091a\u094d\u091b\u093f\u0915)',
    messageLabel: '\u0938\u0902\u0926\u0947\u0936',
    selectRole: '\u0930\u094b\u0932 \u091a\u0941\u0928\u0947\u0902',
    nameError: '\u0915\u0943\u092a\u092f\u093e \u0935\u0948\u0927 \u0928\u093e\u092e \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
    emailError: '\u0915\u0943\u092a\u092f\u093e \u0935\u0948\u0927 \u0908\u092e\u0947\u0932 \u092a\u0924\u093e \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
    phoneError: '\u0915\u0943\u092a\u092f\u093e \u0935\u0948\u0927 \u092b\u094b\u0928 \u0928\u0902\u092c\u0930 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
    roleError: '\u0915\u0943\u092a\u092f\u093e \u0930\u094b\u0932 \u091a\u0941\u0928\u0947\u0902\u0964',
    portfolioError: '\u0915\u0943\u092a\u092f\u093e \u0935\u0948\u0927 URL \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
    messageError: '\u0915\u0943\u092a\u092f\u093e \u0938\u0902\u0926\u0947\u0936 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902 (\u0915\u092e \u0938\u0947 \u0915\u092e 10 \u0905\u0915\u094d\u0937\u0930)\u0964',
    location: '\u0907\u0902\u0926\u094c\u0930, \u092e\u0927\u094d\u092f \u092a\u094d\u0930\u0926\u0947\u0936',
    source: 'main-careers',
  },
};

const OPEN_ROLES = [
  { titleEn: 'News Reporter (Hindi)', titleHi: '\u0928\u094d\u092f\u0942\u091c \u0930\u093f\u092a\u094b\u0930\u094d\u091f\u0930 (\u0939\u093f\u0902\u0926\u0940)', deptEn: 'Editorial', deptHi: '\u090f\u0921\u093f\u091f\u094b\u0930\u093f\u092f\u0932' },
  { titleEn: 'Video Producer', titleHi: '\u0935\u0940\u0921\u093f\u092f\u094b \u092a\u094d\u0930\u094a\u0921\u094d\u092f\u0942\u0938\u0930', deptEn: 'Video', deptHi: '\u0935\u0940\u0921\u093f\u092f\u094b' },
  { titleEn: 'Frontend Developer', titleHi: '\u092b\u094d\u0930\u0902\u091f\u090f\u0902\u0921 \u0921\u0947\u0935\u0932\u092a\u0930', deptEn: 'Technology', deptHi: '\u091f\u0947\u0915\u094d\u0928\u094b\u0932\u0949\u091c\u0940' },
];

const INITIAL_FORM: FormValues = {
  name: '',
  email: '',
  phone: '',
  role: '',
  experience: '',
  portfolioUrl: '',
  message: '',
  website: '',
};

function isValidUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function CareersPage() {
  const { language } = useAppStore();
  const t = COPY[language];

  const [form, setForm] = useState<FormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const roleOptions = useMemo(
    () => OPEN_ROLES.map((role) => (language === 'hi' ? role.titleHi : role.titleEn)),
    [language]
  );

  const inputClassName =
    'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-red-400 dark:focus:ring-red-500/20';

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (form.name.trim().length < 2) nextErrors.name = t.nameError;
    if (!EMAIL_REGEX.test(form.email.trim())) nextErrors.email = t.emailError;
    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) nextErrors.phone = t.phoneError;
    if (!form.role.trim()) nextErrors.role = t.roleError;
    if (!isValidUrl(form.portfolioUrl)) nextErrors.portfolioUrl = t.portfolioError;
    if (form.message.trim().length < 10) nextErrors.message = t.messageError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitState('idle');
    setSubmitMessage('');

    try {
      const response = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          source: t.source,
        }),
      });

      const data = await response.json().catch(() => ({} as { success?: boolean; message?: string; error?: string }));
      if (!response.ok || !data.success) {
        setSubmitState('error');
        setSubmitMessage(data.error || t.errorFallback);
        return;
      }

      setForm(INITIAL_FORM);
      setErrors({});
      setSubmitState('success');
      setSubmitMessage(data.message || t.successFallback);
    } catch {
      setSubmitState('error');
      setSubmitMessage(t.errorFallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="cnp-surface p-5 sm:p-6">
        <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 dark:text-red-300">
          {t.tag}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">{t.title}</h1>
        <p className="mt-2 max-w-4xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">{t.subtitle}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <div className="cnp-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">{t.openRoles}</h2>
            <div className="mt-4 space-y-3">
              {OPEN_ROLES.map((role) => (
                <div key={role.titleEn} className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {language === 'hi' ? role.titleHi : role.titleEn}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {language === 'hi' ? role.deptHi : role.deptEn}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                      {t.roleType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cnp-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">{t.perksTitle}</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2"><Rocket className="mt-0.5 h-4 w-4 text-orange-500" /><span>{t.perk1}</span></li>
              <li className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 text-orange-500" /><span>{t.perk2}</span></li>
              <li className="flex items-start gap-2"><BriefcaseBusiness className="mt-0.5 h-4 w-4 text-orange-500" /><span>{t.perk3}</span></li>
            </ul>
          </div>
        </div>

        <aside className="cnp-surface p-5 sm:p-6 xl:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">{t.applyTitle}</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t.applyText}</p>

          <form className="mt-4 space-y-3" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="career-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.nameLabel}</label>
              <input id="career-name" value={form.name} onChange={(e) => updateField('name', e.target.value)} className={inputClassName} autoComplete="name" required />
              {errors.name ? <p className="mt-1 text-xs text-red-500">{errors.name}</p> : null}
            </div>

            <div>
              <label htmlFor="career-email" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.emailLabel}</label>
              <input id="career-email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className={inputClassName} autoComplete="email" required />
              {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email}</p> : null}
            </div>

            <div>
              <label htmlFor="career-phone" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.phoneLabel}</label>
              <input id="career-phone" type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className={inputClassName} autoComplete="tel" />
              {errors.phone ? <p className="mt-1 text-xs text-red-500">{errors.phone}</p> : null}
            </div>

            <div>
              <label htmlFor="career-role" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.roleLabel}</label>
              <select id="career-role" value={form.role} onChange={(e) => updateField('role', e.target.value)} className={inputClassName} required>
                <option value="">{t.selectRole}</option>
                {roleOptions.map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
              {errors.role ? <p className="mt-1 text-xs text-red-500">{errors.role}</p> : null}
            </div>

            <div>
              <label htmlFor="career-experience" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.experienceLabel}</label>
              <input id="career-experience" value={form.experience} onChange={(e) => updateField('experience', e.target.value)} className={inputClassName} />
            </div>

            <div>
              <label htmlFor="career-portfolio" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.portfolioLabel}</label>
              <input id="career-portfolio" type="url" value={form.portfolioUrl} onChange={(e) => updateField('portfolioUrl', e.target.value)} className={inputClassName} placeholder="https://" />
              {errors.portfolioUrl ? <p className="mt-1 text-xs text-red-500">{errors.portfolioUrl}</p> : null}
            </div>

            <div>
              <label htmlFor="career-message" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.messageLabel}</label>
              <textarea id="career-message" value={form.message} onChange={(e) => updateField('message', e.target.value)} className={`${inputClassName} min-h-[120px] resize-y`} required />
              {errors.message ? <p className="mt-1 text-xs text-red-500">{errors.message}</p> : null}
            </div>

            <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="career-website">Website</label>
              <input id="career-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => updateField('website', e.target.value)} />
            </div>

            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70">
              <Send className="h-4 w-4" />
              {isSubmitting ? t.submittingLabel : t.applyButton}
            </button>
          </form>

          {submitState !== 'idle' ? (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${submitState === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'border-red-500/40 bg-red-500/10 text-red-500 dark:text-red-300'}`}>
              {submitMessage}
            </div>
          ) : null}

          <div className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <a href={`mailto:${COMPANY_INFO.contact.email}`} className="inline-flex items-center gap-2 hover:text-orange-600 dark:hover:text-orange-400">
              <Mail className="h-4 w-4 text-orange-500" />
              {COMPANY_INFO.contact.email}
            </a>
            <p className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              {t.location}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
