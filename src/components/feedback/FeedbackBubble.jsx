import { MessageSquarePlus, X } from 'lucide-react'
import { useFeedbackPanelOptional } from '../../context/FeedbackPanelContext'

/**
 * Sağ alt köşe — şikayet & öneri tetikleyici (oturum/cihazda kapatılabilir).
 */
export default function FeedbackBubble() {
  const ctx = useFeedbackPanelOptional()
  if (!ctx?.bubbleVisible) return null

  const { openPanel, dismissBubble } = ctx

  return (
    <div className="feedback-floating-bubble pointer-events-none fixed z-[45] flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={dismissBubble}
        className="pointer-events-auto inline-flex size-6 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/90 text-zinc-500 shadow-lg transition hover:border-zinc-600 hover:text-zinc-300"
        aria-label="Geri bildirim balonunu gizle"
        title="Bu cihazda gizle — menüden tekrar açabilirsiniz"
      >
        <X className="size-3" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={openPanel}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-accent/45 bg-zinc-950/95 px-3.5 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] text-accent shadow-[0_0_20px_-6px_color-mix(in_srgb,var(--accent-color)_45%,transparent)]] transition hover:border-accent/70 hover:bg-accent/10"
        aria-label="Şikayet ve öneri gönder"
      >
        <MessageSquarePlus className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Geri Bildirim</span>
      </button>
    </div>
  )
}
