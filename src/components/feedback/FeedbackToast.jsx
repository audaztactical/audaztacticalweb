import { useFeedbackPanelOptional } from '../../context/FeedbackPanelContext'

/** Başarı bildirimi — kısa süreli HUD toast */
export default function FeedbackToast() {
  const ctx = useFeedbackPanelOptional()
  if (!ctx?.toast) return null

  return (
    <div
      className="feedback-toast-anchor pointer-events-none fixed left-1/2 z-[90] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <p className="pointer-events-auto rounded-md border border-accent/45 bg-zinc-950/95 px-4 py-2.5 text-center font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] text-accent shadow-lg">
        {ctx.toast}
      </p>
    </div>
  )
}
