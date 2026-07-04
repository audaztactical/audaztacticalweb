/**
 * Sağ panel — sohbet seçilmediğinde boş durum.
 * @param {{ hasContacts?: boolean }} props
 */
export default function MuhabereEmptyState({ hasContacts = true }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 50% 42%, rgb(245 158 11 / 0.08) 0%, transparent 70%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative">
          <div className="absolute inset-0 scale-150 rounded-full bg-amber-500/10 blur-2xl" aria-hidden />
          <img
            src="/logo.png"
            alt="Audaz Tactical"
            className="relative h-24 w-auto object-contain opacity-30 sm:h-32"
            decoding="async"
          />
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-600">
            COM-01 · STANDBY
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            {hasContacts ? 'Kanal seç · Operatörleri izle' : 'Bir sohbet seçin'}
          </p>
        </div>
      </div>
    </div>
  )
}
