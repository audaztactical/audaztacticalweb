import { AlertTriangle } from 'lucide-react'
import { useTcccAlerts } from '../../context/TcccAlertContext'

/**
 * @param {{ className?: string }} props
 */
export default function TcccExpiryAlertBanner({ className = '' }) {
  const { hasCriticalExpiry, criticalCount } = useTcccAlerts()

  if (!hasCriticalExpiry) return null

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-950/55 via-red-950/40 to-amber-950/55 px-4 py-3 shadow-[0_0_32px_-6px_rgba(251,146,60,0.45)] animate-pulse',
        className,
      ].join(' ')}
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" strokeWidth={2} aria-hidden />
      <div className="min-w-0">
        <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300">
          IFAK SON KULLANIM UYARISI · CRITICAL_EXPIRED
        </p>
        <p className="mt-1 font-mono-technical text-[11px] leading-relaxed text-amber-100/90">
          {criticalCount} kalem ≤30 gün veya geçmiş SKT. IFAK sekmesinden envanteri yenileyin; tahliye öncesi
          mühimmat tıbbi kontrolü zorunlu.
        </p>
      </div>
    </div>
  )
}
