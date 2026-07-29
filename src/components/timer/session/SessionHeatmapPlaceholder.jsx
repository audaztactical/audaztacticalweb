import { useTranslation } from 'react-i18next'
import { Map } from 'lucide-react'

/** Heatmap placeholder — veri bağlanınca doldurulacak. */
export default function SessionHeatmapPlaceholder() {
  const { t } = useTranslation('timer')

  return (
    <div className="relative flex min-h-[11rem] flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-700 bg-slate-950/60 px-4 py-6 text-center">
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(250,204,21,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.5) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden
      />
      <Map className="relative size-6 text-zinc-600" strokeWidth={1.25} aria-hidden />
      <p className="relative mt-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#facc15]/90 sm:text-sm">
        {t('dryFire.sessionDash.heatmapTitle')}
      </p>
      <p className="relative mt-1.5 max-w-xs font-mono text-sm leading-relaxed text-zinc-400">
        {t('dryFire.sessionDash.heatmapHint')}
      </p>
    </div>
  )
}
