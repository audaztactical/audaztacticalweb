/**
 * "Şu an" vs "Lansman sonrası" — kod davranışı ile plan vaadini ASLA karıştırmaz.
 *
 * @param {{
 *   now: string
 *   launch: string
 *   className?: string
 * }} props
 */
export default function GuideStatusCallout({ now, launch, className = '' }) {
  return (
    <div
      className={[
        'grid gap-3 rounded-lg border border-amber-500/30 bg-black/40 sm:grid-cols-2',
        className,
      ].join(' ')}
      role="note"
      aria-label="Durum bilgisi"
    >
      <div className="border-b border-amber-500/15 p-4 sm:border-b-0 sm:border-r">
        <p className="mb-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-400/90">
          [ ŞU AN — KOD ]
        </p>
        <p className="font-mono-technical text-xs leading-relaxed text-app-text/85">{now}</p>
      </div>
      <div className="p-4">
        <p className="mb-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-amber-400/90">
          [ LANSMAN SONRASI — PLAN ]
        </p>
        <p className="font-mono-technical text-xs leading-relaxed text-app-text/70">{launch}</p>
      </div>
    </div>
  )
}

/**
 * Ön koşul veya kısa uyarı kutusu (durum callout değil).
 *
 * @param {{ children: import('react').ReactNode, label?: string, className?: string }} props
 */
export function GuidePrerequisiteCallout({ children, label = '[ ÖN KOŞUL ]', className = '' }) {
  return (
    <div
      className={[
        'rounded-lg border border-amber-500/40 bg-amber-950/25 px-3 py-2.5 font-mono-technical text-xs leading-relaxed text-amber-100/90',
        className,
      ].join(' ')}
    >
      <span className="font-bold text-amber-400/95">{label}</span> {children}
    </div>
  )
}
