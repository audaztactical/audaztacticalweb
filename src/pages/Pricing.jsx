import { useMemo, useState } from 'react'
import {
  Check,
  Crown,
  GraduationCap,
  Lock,
  Sparkles,
  Tags,
  X,
} from 'lucide-react'
import TacticalPanel from '../components/ui/TacticalPanel'
import { labelClass } from '../components/training/layout/trainingTerminalTokens'
import { isPremiumPaymentEnabled } from '../lib/registrationPolicy'

/** @typedef {'monthly' | 'yearly'} BillingCycle */

/** @typedef {{
 *   id: string
 *   tier: string
 *   subtitle: string
 *   monthlyPrice: number | null
 *   yearlyPrice: number | null
 *   yearlyDiscountPct: number
 *   popular?: boolean
 *   icon: import('lucide-react').LucideIcon
 *   includes: string[]
 *   locked?: string[]
 *   ctaLabel: string
 *   ctaVariant: 'neutral' | 'accent' | 'pro'
 *   requestAccess?: boolean
 * }} PricingPlan */

/** @type {PricingPlan[]} */
const PRICING_PLANS = [
  {
    id: 'member',
    tier: 'ÜCRETSİZ',
    subtitle: 'Operatör · temel taktik erişim',
    monthlyPrice: null,
    yearlyPrice: null,
    yearlyDiscountPct: 0,
    icon: Tags,
    includes: [
      'Profil, Taktik Muhabere, Brifing Odası (Forum)',
      'Küresel Haber Ağı + zorunlu İKAZ uyarıları',
      'Platform bildirimleri',
      'Görevlerim (sınırlı kayıt)',
      'Cephanelik temel görünüm + bakım alarmı',
      'TCCC temel protokol okuma',
      'Atış Terminali — toplam 10 kayıt (tek seferlik limit, aylık sıfırlanmaz)',
    ],
    locked: ['CQB / FOF / Eğitim / Range Sandbox terminalleri kilitli'],
    ctaLabel: 'Standart Erişim',
    ctaVariant: 'neutral',
    requestAccess: false,
  },
  {
    id: 'premium_member',
    tier: 'PREMİUM',
    subtitle: 'Operatör · tam terminal paketi',
    monthlyPrice: 199,
    yearlyPrice: 2000,
    yearlyDiscountPct: 16,
    popular: true,
    icon: Crown,
    includes: [
      'Tüm terminaller sınırsız (ATIŞ / CQB / FOF / VBSS / TCCC)',
      'Taktik Rapor PDF\'leri (ATIŞ / CQB / FOF / VBSS / TCCC)',
      'ORS gelişmiş analitik (MATRIX / RADAR / WAVE / TREND)',
      'Tam TCCC paketi (DD-1380, 9-Line, CASEVAC MIST, Medevac Simülatörü)',
      'Cephanelik derinlemesine + denetim kaydı',
      'Audaz Akademi',
      'Sınırsız Görevlerim (AAR Terminal)',
    ],
    ctaLabel: 'Erişim Talep Et',
    ctaVariant: 'accent',
    requestAccess: true,
  },
  {
    id: 'instructor',
    tier: 'PRO / EĞİTMEN',
    subtitle: 'Eğitmen · grup komuta paketi',
    monthlyPrice: 399,
    yearlyPrice: 4000,
    yearlyDiscountPct: 16,
    icon: GraduationCap,
    includes: [
      'Premium\'daki tüm özellikler',
      'Taktik grup oluşturma ve yönetimi',
      'Grup liderlik tablosu ve analitiği',
      'VBSS / TCCC grup değerlendirmeleri',
      'Davet kodu üretimi (operatör onboarding)',
    ],
    ctaLabel: 'Erişim Talep Et',
    ctaVariant: 'pro',
    requestAccess: true,
  },
]

/**
 * @param {number | null} amount
 */
function formatTry(amount) {
  if (amount == null) return '0 TL'
  return `${amount.toLocaleString('tr-TR')} TL`
}

/**
 * @param {PricingPlan} plan
 * @param {BillingCycle} billing
 */
function planPriceLabel(plan, billing) {
  if (plan.monthlyPrice == null) return { main: 'Ücretsiz', sub: 'Süresiz temel erişim' }
  if (billing === 'monthly') {
    return { main: formatTry(plan.monthlyPrice), sub: '/ ay · KDV dahil değildir' }
  }
  const perMonth = Math.round(plan.yearlyPrice / 12)
  return {
    main: formatTry(plan.yearlyPrice),
    sub: `/ yıl · ~${formatTry(perMonth)}/ay · Yıllık öde, 2 ay bedava gibi`,
  }
}

/** @param {PricingPlan['ctaVariant']} variant */
function ctaButtonClass(variant) {
  if (variant === 'accent') {
    return 'border-accent/50 bg-accent/15 text-accent hover:border-accent/70 hover:bg-accent/22 shadow-[0_0_20px_-6px_rgba(255,180,0,0.35)]'
  }
  if (variant === 'pro') {
    return 'border-sky-500/45 bg-sky-950/35 text-sky-300 hover:border-sky-400/60 hover:bg-sky-950/50'
  }
  return 'border-white/15 bg-white/[0.04] text-app-text/70 hover:border-white/25 hover:bg-white/[0.07]'
}

/**
 * @param {{
 *   open: boolean
 *   plan: PricingPlan | null
 *   onClose: () => void
 * }} props
 */
function PricingAccessModal({ open, plan, onClose }) {
  if (!open || !plan) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-access-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <TacticalPanel className="border-accent/25 bg-[#0c0c0e]/98 p-0 shadow-2xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/90">
              [ ERİŞİM_TALEBİ ]
            </p>
            <h2 id="pricing-access-title" className="font-display mt-1 text-lg font-bold tracking-wide text-app-text">
              {plan.tier}
            </h2>
          </div>
          <div className="space-y-4 px-4 py-4">
            <p className="font-mono-technical text-xs leading-relaxed text-app-text/80">
              Ödeme sistemi yakında aktif olacaktır. Bu süreçte {plan.tier} erişimi için yöneticiyle
              iletişime geçebilir veya Ayarlar → Erişim Kodu bölümünden davet kodunuzu kullanabilirsiniz.
            </p>
            <p className="rounded border border-amber-500/30 bg-amber-950/20 px-3 py-2 font-mono-technical text-[10px] uppercase leading-relaxed text-amber-200/90">
              Gerçek ödeme akışı henüz bağlanmadı — bu sayfa yalnızca plan önizlemesidir.
            </p>
            <div className="flex justify-end border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-accent/45 bg-accent/12 px-4 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent/18"
              >
                Anladım
              </button>
            </div>
          </div>
        </TacticalPanel>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   plan: PricingPlan
 *   billing: BillingCycle
 *   onRequestAccess: (plan: PricingPlan) => void
 * }} props
 */
function PricingPlanCard({ plan, billing, onRequestAccess }) {
  const Icon = plan.icon
  const price = planPriceLabel(plan, billing)
  const isPopular = Boolean(plan.popular)

  return (
    <div className="relative h-full">
      {isPopular ? (
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        >
          <span className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent px-3 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_22px_-2px_var(--accent-color)] ring-1 ring-black/15">
            <Sparkles className="size-3 text-black" strokeWidth={2} aria-hidden />
            En Popüler
          </span>
        </div>
      ) : null}

      <TacticalPanel
        className={[
          'flex h-full flex-col p-0 transition-shadow',
          isPopular
            ? 'border-accent/45 bg-accent/[0.06] shadow-[0_0_40px_-12px_rgba(255,180,0,0.45)] ring-1 ring-accent/25'
            : 'border-white/10 bg-black/35',
        ].join(' ')}
      >
      <div className="flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-5 sm:pb-5 sm:pt-7">
        <div className="mb-4 flex items-start gap-3">
          <span
            className={[
              'flex size-10 shrink-0 items-center justify-center rounded border',
              isPopular ? 'border-accent/40 bg-accent/10 text-accent' : 'border-white/15 bg-white/[0.04] text-app-text/60',
            ].join(' ')}
          >
            <Icon className="size-5" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.24em] text-app-text/50">
              {plan.subtitle}
            </p>
            <h3 className="font-display text-xl font-bold tracking-wide text-app-text">{plan.tier}</h3>
          </div>
        </div>

        <div className="mb-1 min-h-[4.5rem]">
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight text-app-text">{price.main}</p>
          <p className="mt-1 font-mono-technical text-[10px] leading-snug text-app-text/50">{price.sub}</p>
          {billing === 'yearly' && plan.yearlyDiscountPct > 0 ? (
            <span className="mt-2 inline-block rounded border border-emerald-500/40 bg-emerald-950/30 px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-emerald-300">
              ≈ %{plan.yearlyDiscountPct} yıllık indirim
            </span>
          ) : null}
        </div>

        <ul className="mt-4 flex flex-1 flex-col gap-2 border-t border-white/10 pt-4">
          {plan.includes.map((feature) => (
            <li key={feature} className="flex gap-2 text-left">
              <Check className="mt-0.5 size-3.5 shrink-0 text-accent" strokeWidth={2.5} aria-hidden />
              <span className="font-mono-technical text-[10px] leading-snug text-app-text/80">{feature}</span>
            </li>
          ))}
          {(plan.locked ?? []).map((feature) => (
            <li key={feature} className="flex gap-2 text-left opacity-75">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-app-text/40" strokeWidth={2} aria-hidden />
              <span className="font-mono-technical text-[10px] leading-snug text-app-text/45">{feature}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={!plan.requestAccess}
          onClick={() => plan.requestAccess && onRequestAccess(plan)}
          className={[
            'mt-5 w-full rounded border px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] transition disabled:cursor-default',
            ctaButtonClass(plan.ctaVariant),
          ].join(' ')}
        >
          {plan.ctaLabel}
        </button>
      </div>
      </TacticalPanel>
    </div>
  )
}

export default function Pricing() {
  const [billing, setBilling] = useState(/** @type {BillingCycle} */ ('monthly'))
  const [accessPlan, setAccessPlan] = useState(/** @type {PricingPlan | null} */ (null))
  const paymentEnabled = isPremiumPaymentEnabled()

  const banner = useMemo(() => {
    if (!paymentEnabled) {
      return {
        tone: 'amber',
        title: 'BETA_DÖNEMİ',
        body: 'Beta döneminde tüm özellikler ücretsiz aktiftir — bu sayfa gelecek fiyatlandırmayı önizlemek içindir.',
      }
    }
    return {
      tone: 'sky',
      title: 'ÖNİZLEME_MODU',
      body: 'Fiyatlar bilgilendirme amaçlıdır. Ödeme altyapısı henüz bağlanmadı; satın alma işlemi yapılamaz.',
    }
  }, [paymentEnabled])

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 md:py-8">
      <header className="space-y-3 border-b border-white/10 pb-5">
        <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.35em] text-accent">
          [ ÜYELİK_PROTOKOLÜ ]
        </p>
        <h1 className="font-display text-2xl font-bold tracking-[0.1em] text-app-text sm:text-3xl">Fiyatlandırma</h1>
        <p className="max-w-2xl font-mono-technical text-xs leading-relaxed text-app-text/55">
          Taktik operasyon platformu — operatör, premium ve eğitmen planları. Terminal erişim seviyeleri ve modül
          kapsamı.
        </p>
      </header>

      <div
        className={[
          'rounded-lg border px-4 py-3',
          banner.tone === 'amber'
            ? 'border-amber-500/35 bg-amber-950/25'
            : 'border-sky-500/30 bg-sky-950/20',
        ].join(' ')}
        role="status"
      >
        <p
          className={[
            'font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em]',
            banner.tone === 'amber' ? 'text-amber-400' : 'text-sky-400',
          ].join(' ')}
        >
          [ {banner.title} ]
        </p>
        <p className="mt-1 font-mono-technical text-[11px] leading-relaxed text-app-text/80">{banner.body}</p>
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <span className={labelClass}>Fatura dönemi</span>
        <div
          className="inline-flex rounded-lg border border-white/15 bg-black/40 p-1"
          role="group"
          aria-label="Aylık veya yıllık fiyatlandırma"
        >
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            aria-pressed={billing === 'monthly'}
            className={[
              'rounded-md px-4 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider transition',
              billing === 'monthly' ? 'bg-accent/20 text-accent' : 'text-app-text/50 hover:text-app-text/75',
            ].join(' ')}
          >
            Aylık
          </button>
          <button
            type="button"
            onClick={() => setBilling('yearly')}
            aria-pressed={billing === 'yearly'}
            className={[
              'relative rounded-md px-4 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider transition',
              billing === 'yearly' ? 'bg-accent/20 text-accent' : 'text-app-text/50 hover:text-app-text/75',
            ].join(' ')}
          >
            Yıllık
            <span className="ml-1.5 hidden rounded border border-emerald-500/40 bg-emerald-950/40 px-1 py-px text-[7px] text-emerald-300 sm:inline">
              ~%16
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 overflow-visible pt-5 lg:grid-cols-3 lg:gap-5 lg:items-stretch">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={plan.popular ? 'relative overflow-visible lg:z-10 lg:scale-[1.02]' : 'relative overflow-visible'}
          >
            <PricingPlanCard plan={plan} billing={billing} onRequestAccess={setAccessPlan} />
          </div>
        ))}
      </div>

      <TacticalPanel className="border-white/10 bg-black/30 p-4 sm:p-5">
        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-app-text/45">
          [ NOTLAR ]
        </p>
        <ul className="mt-3 space-y-2">
          <li className="flex gap-2 font-mono-technical text-[10px] text-app-text/60">
            <X className="mt-0.5 size-3 shrink-0 text-app-text/35" aria-hidden />
            Ücretsiz plandaki 10 atış kaydı limiti aylık sıfırlanmaz; toplam ömür boyu kotadır.
          </li>
          <li className="flex gap-2 font-mono-technical text-[10px] text-app-text/60">
            <X className="mt-0.5 size-3 shrink-0 text-app-text/35" aria-hidden />
            Eğitmen (Pro) planı mevcut erişim kodu / davet sisteminden bağımsız tanıtım amaçlıdır.
          </li>
        </ul>
      </TacticalPanel>

      <PricingAccessModal open={Boolean(accessPlan)} plan={accessPlan} onClose={() => setAccessPlan(null)} />
    </div>
  )
}
