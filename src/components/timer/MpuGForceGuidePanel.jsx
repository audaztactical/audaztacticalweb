import { useTranslation } from 'react-i18next'

/**
 * @typedef {import('../../lib/timerCalibrationSettings').MpuGForceRange} MpuGForceRange
 */

/**
 * @typedef {{
 *   range: MpuGForceRange
 *   tone: 'precision' | 'balanced' | 'impact'
 *   badgeKey: string
 *   bodyKey: string
 * }} GForceGuideItem
 */

/** @type {GForceGuideItem[]} */
export const MPU_G_FORCE_GUIDE = [
  {
    range: '±2G',
    tone: 'precision',
    badgeKey: 'calibration.mpu.guide.precision.badge',
    bodyKey: 'calibration.mpu.guide.precision.body',
  },
  {
    range: '±4G',
    tone: 'balanced',
    badgeKey: 'calibration.mpu.guide.balanced.badge',
    bodyKey: 'calibration.mpu.guide.balanced.body',
  },
  {
    range: '±8G',
    tone: 'balanced',
    badgeKey: 'calibration.mpu.guide.balanced.badge',
    bodyKey: 'calibration.mpu.guide.balanced.body',
  },
  {
    range: '±16G',
    tone: 'impact',
    badgeKey: 'calibration.mpu.guide.impact.badge',
    bodyKey: 'calibration.mpu.guide.impact.body',
  },
]

/** @type {Record<GForceGuideItem['tone'], { border: string, borderActive: string, bg: string, bgActive: string, glow: string, text: string, chip: string }>} */
const TONE_STYLES = {
  precision: {
    border: 'border-cyan-500/25',
    borderActive: 'border-emerald-400/70',
    bg: 'bg-cyan-950/20',
    bgActive: 'bg-emerald-500/[0.12]',
    glow: 'shadow-[0_0_18px_-4px_rgba(52,211,153,0.55)]',
    text: 'text-emerald-300',
    chip: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200',
  },
  balanced: {
    border: 'border-[#facc15]/20',
    borderActive: 'border-[#facc15]/75',
    bg: 'bg-[rgba(250,204,21,0.04)]',
    bgActive: 'bg-[rgba(250,204,21,0.12)]',
    glow: 'shadow-[0_0_18px_-4px_rgba(250,204,21,0.5)]',
    text: 'text-[#facc15]',
    chip: 'border-[#facc15]/45 bg-[rgba(250,204,21,0.15)] text-[#facc15]',
  },
  impact: {
    border: 'border-orange-500/25',
    borderActive: 'border-red-400/70',
    bg: 'bg-orange-950/25',
    bgActive: 'bg-red-500/[0.12]',
    glow: 'shadow-[0_0_18px_-4px_rgba(248,113,113,0.55)]',
    text: 'text-orange-300',
    chip: 'border-orange-400/45 bg-orange-500/15 text-orange-200',
  },
}

/**
 * G-Force aralık rehberi — dropdown seçimiyle senkron aktif kart.
 * @param {{
 *   activeRange: MpuGForceRange
 *   onSelectRange: (range: MpuGForceRange) => void
 * }} props
 */
export default function MpuGForceGuidePanel({ activeRange, onSelectRange }) {
  const { t } = useTranslation('timer')

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 rounded-sm border border-zinc-600/55 bg-[#0a0a0b]/90 p-3 sm:p-4">
      <span className="pointer-events-none absolute left-1.5 top-1.5 h-2.5 w-2.5 border-l border-t border-[#facc15]/45" />
      <span className="pointer-events-none absolute right-1.5 top-1.5 h-2.5 w-2.5 border-r border-t border-[#facc15]/45" />
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-2.5 w-2.5 border-b border-l border-[#facc15]/45" />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-2.5 w-2.5 border-b border-r border-[#facc15]/45" />

      <div className="relative z-[1]">
        <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.3em] text-[#facc15]/75">
          {t('calibration.mpu.guide.kicker')}
        </p>
        <h4 className="mt-1 font-display text-sm font-bold uppercase tracking-[0.16em] text-app-text">
          {t('calibration.mpu.guide.title')}
        </h4>
        <p className="mt-1 font-mono-technical text-[9px] leading-relaxed text-app-text/50">
          {t('calibration.mpu.guide.subtitle')}
        </p>
      </div>

      <ul className="relative z-[1] flex flex-1 flex-col gap-2.5" role="listbox" aria-label={t('calibration.mpu.guide.title')}>
        {MPU_G_FORCE_GUIDE.map((item) => {
          const active = item.range === activeRange
          const tone = TONE_STYLES[item.tone]
          return (
            <li key={item.range}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelectRange(item.range)}
                className={[
                  'group relative w-full overflow-hidden rounded-sm border px-3 py-2.5 text-left transition duration-300',
                  'touch-manipulation active:scale-[0.99]',
                  active ? `${tone.borderActive} ${tone.bgActive} ${tone.glow}` : `${tone.border} ${tone.bg} hover:brightness-110`,
                ].join(' ')}
              >
                <span className="pointer-events-none absolute left-1 top-1 h-1.5 w-1.5 border-l border-t border-white/25" />
                <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 border-r border-t border-white/25" />

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      'inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono-technical text-[10px] font-bold tabular-nums tracking-[0.12em]',
                      tone.chip,
                      active ? 'opacity-100' : 'opacity-80',
                    ].join(' ')}
                  >
                    {item.range}
                  </span>
                  <span className={`font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] ${tone.text}`}>
                    {t(item.badgeKey)}
                  </span>
                  {active ? (
                    <span className="ml-auto font-mono-technical text-[7px] font-bold uppercase tracking-[0.28em] text-app-text/70">
                      {t('calibration.mpu.guide.active')}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 font-mono-technical text-[9px] leading-relaxed text-app-text/60 sm:text-[10px]">
                  {t(item.bodyKey)}
                </p>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
