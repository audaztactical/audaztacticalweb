import { Loader2 } from 'lucide-react'

export default function TacticalLoader() {
  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-zinc-950"
      role="status"
      aria-live="polite"
      aria-label="Sayfa yükleniyor"
    >
      <Loader2 className="size-8 animate-spin text-lime-500/70" strokeWidth={1.5} aria-hidden />
      <p className="animate-pulse font-mono text-sm tracking-[0.2em] text-lime-500">
        [ AUDAZ AĞI ] VERİ BAĞLANTISI KURULUYOR...
      </p>
    </div>
  )
}
