import { useTranslation } from 'react-i18next'
import { Ruler } from 'lucide-react'

/**
 * Hedef kâğıdı ölçü lejantı — yalnızca tam ekran sol toolbar içinde.
 *
 * @param {{
 *   rings: {
 *     id: string
 *     label: string
 *     diameterCm: number
 *     screenDiameterCm?: number
 *     moa?: number
 *   }[]
 *   distanceM: number
 *   faceScreenCm?: number
 *   pinned?: boolean
 *   hideChrome?: boolean
 *   accentClass?: string
 *   mutedClass?: string
 *   chipClass?: string
 * }} props
 */
export default function DryFireRingLegend({
  rings,
  distanceM,
  faceScreenCm,
  pinned = true,
  hideChrome = false,
  accentClass = 'text-[#facc15]',
  mutedClass = 'text-zinc-500',
  chipClass = 'border-zinc-700/50 bg-[#0a0a0b]/90',
}) {
  const { t } = useTranslation('timer')

  const body = (
    <>
      {!hideChrome ? (
        <div className="mb-2.5 space-y-1">
          <p
            className={[
              'inline-flex items-center gap-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em]',
              accentClass,
            ].join(' ')}
          >
            <Ruler className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
            {t('dryFire.rings.legendTitle')}
          </p>
          <p
            className={[
              'font-mono-technical text-[8px] uppercase tracking-[0.14em]',
              mutedClass,
            ].join(' ')}
          >
            {t('dryFire.rings.atDistance', { dist: distanceM })}
          </p>
        </div>
      ) : (
        <p
          className={[
            'mb-2 font-mono-technical text-[8px] uppercase tracking-[0.14em]',
            mutedClass,
          ].join(' ')}
        >
          {t('dryFire.rings.atDistance', { dist: distanceM })}
        </p>
      )}

      <ul className="flex flex-col gap-1.5">
        {rings.map((ring) => {
          const liveCm =
            ring.screenDiameterCm != null && Number.isFinite(ring.screenDiameterCm)
              ? ring.screenDiameterCm
              : ring.diameterCm
          return (
            <li
              key={ring.id}
              className={[
                'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-0.5 rounded-sm border px-2 py-1.5',
                chipClass,
              ].join(' ')}
            >
              <span
                className={[
                  'truncate font-mono-technical text-[8px] font-bold uppercase tracking-[0.12em]',
                  accentClass,
                ].join(' ')}
              >
                {t('dryFire.rings.ringLabel', { label: ring.label })}
              </span>
              <span className="whitespace-nowrap text-right font-mono-technical text-[11px] font-bold tabular-nums text-app-text">
                {liveCm.toFixed(1)}
                <span className={['ml-0.5 text-[8px] font-normal', mutedClass].join(' ')}>
                  {t('dryFire.rings.cm')}
                </span>
              </span>
              <span
                className={[
                  'col-span-2 font-mono-technical text-[7px] leading-snug tracking-[0.06em]',
                  mutedClass,
                ].join(' ')}
              >
                {t('dryFire.rings.paperRef', { cm: ring.diameterCm })}
                {ring.moa != null ? ` · ${ring.moa} MOA` : ''}
              </span>
            </li>
          )
        })}
      </ul>

      <p
        className={[
          'mt-2.5 font-mono-technical text-[7px] leading-relaxed tracking-[0.04em]',
          mutedClass,
        ].join(' ')}
      >
        {t('dryFire.rings.hintLive', { dist: distanceM })}
        {faceScreenCm != null ? (
          <span className="mt-1 block opacity-90">
            {t('dryFire.rings.screenFace', { cm: faceScreenCm })}
          </span>
        ) : null}
      </p>
    </>
  )

  if (hideChrome) {
    return (
      <div data-dry-ring-legend aria-live="polite">
        {body}
      </div>
    )
  }

  return (
    <div
      className={[
        'rounded-sm border border-[#facc15]/35 bg-zinc-950/80',
        pinned ? 'relative z-10 shrink-0' : '',
        'px-2.5 py-2.5',
      ].join(' ')}
      data-dry-ring-legend
      aria-live="polite"
    >
      {body}
    </div>
  )
}
