import { Archive, Loader2, Trash2 } from 'lucide-react'

/**
 * Arşivle + tam sil aksiyonları (kanal veya DM satırı).
 * @param {{
 *   onArchive: () => void
 *   onDelete: () => void
 *   archiveBusy?: boolean
 *   deleteBusy?: boolean
 *   archiveLabel?: string
 *   deleteLabel?: string
 * }} props
 */
export default function MuhabereConversationActions({
  onArchive,
  onDelete,
  archiveBusy = false,
  deleteBusy = false,
  archiveLabel = 'Arşivle',
  deleteLabel = 'Sil',
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={archiveBusy || deleteBusy}
        onClick={onArchive}
        className="inline-flex size-8 items-center justify-center rounded-md border border-amber-500/50 bg-amber-950/60 text-amber-300 transition hover:border-amber-400 hover:bg-amber-900/70 hover:text-amber-200 disabled:opacity-40"
        aria-label={archiveLabel}
        title={archiveLabel}
      >
        {archiveBusy ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Archive className="size-3.5" strokeWidth={2.25} aria-hidden />
        )}
      </button>
      <button
        type="button"
        disabled={archiveBusy || deleteBusy}
        onClick={onDelete}
        className="inline-flex size-8 items-center justify-center rounded-md border border-red-500/45 bg-red-950/50 text-red-400 transition hover:border-red-400 hover:bg-red-900/60 hover:text-red-300 disabled:opacity-40"
        aria-label={deleteLabel}
        title={deleteLabel}
      >
        {deleteBusy ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-3.5" strokeWidth={2.25} aria-hidden />
        )}
      </button>
    </div>
  )
}
