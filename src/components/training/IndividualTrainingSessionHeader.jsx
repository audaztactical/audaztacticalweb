import { User } from 'lucide-react'

/** Bireysel sektörlerde gösterilir — grup eğitimi verisi içermez. */
export default function IndividualTrainingSessionHeader() {
  return (
    <div className="rounded-lg border border-[#ffb400]/25 bg-[#0a0a0a]/90 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2.5">
        <User className="size-3.5 shrink-0 text-[#ffb400]/80" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0">
          <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.32em] text-[#ffb400]/80">
            [ BİREYSEL KAYIT MODU ]
          </p>
          <p className="mt-0.5 font-mono-technical text-[9px] uppercase text-slate-500">
            Kayıtlar yalnızca size aittir · canlı grup eğitimi için Grup Eğitimi sektörünü açın
          </p>
        </div>
      </div>
    </div>
  )
}
