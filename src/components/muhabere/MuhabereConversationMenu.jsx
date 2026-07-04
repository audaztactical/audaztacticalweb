import { useEffect, useRef, useState } from 'react'
import { Loader2, MoreVertical } from 'lucide-react'

/**
 * Kişi/kanal satırı — 3 nokta aksiyon menüsü.
 * @param {{
 *   variant: 'dm' | 'channel'
 *   isOwner?: boolean
 *   archiveBusy?: boolean
 *   deleteBusy?: boolean
 *   leaveBusy?: boolean
 *   blockBusy?: boolean
 *   editBusy?: boolean
 *   destroyBusy?: boolean
 *   onArchive: () => void
 *   onDelete: () => void
 *   onLeave?: () => void
 *   onBlock?: () => void
 *   onEdit?: () => void
 *   onDestroyChannel?: () => void
 *   menuLabel?: string
 * }} props
 */
export default function MuhabereConversationMenu({
  variant,
  isOwner = false,
  archiveBusy = false,
  deleteBusy = false,
  leaveBusy = false,
  blockBusy = false,
  editBusy = false,
  destroyBusy = false,
  onArchive,
  onDelete,
  onLeave,
  onBlock,
  onEdit,
  onDestroyChannel,
  menuLabel = 'Sohbet seçenekleri',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const busy = archiveBusy || deleteBusy || leaveBusy || blockBusy || editBusy || destroyBusy

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const run = (/** @type {() => void} */ fn) => {
    setOpen(false)
    fn()
  }

  /** @type {{ key: string, label: string, onClick: () => void, tone?: 'danger' | 'default', loading?: boolean }[]} */
  const items =
    variant === 'dm'
      ? [
          { key: 'archive', label: 'Sohbeti Arşivle', onClick: onArchive, loading: archiveBusy },
          { key: 'delete', label: 'Sohbeti Sil', onClick: onDelete, tone: 'danger', loading: deleteBusy },
          ...(onBlock
            ? [{ key: 'block', label: 'Kullanıcıyı Engelle', onClick: onBlock, tone: 'danger', loading: blockBusy }]
            : []),
        ]
      : [
          { key: 'archive', label: 'Kanalı Arşivle', onClick: onArchive, loading: archiveBusy },
          {
            key: 'leave',
            label: 'Kanaldan Ayrıl',
            onClick: onLeave ?? onDelete,
            tone: 'danger',
            loading: leaveBusy || deleteBusy,
          },
          ...(isOwner && onEdit
            ? [{ key: 'edit', label: 'Kanalı Düzenle', onClick: onEdit, loading: editBusy }]
            : []),
          ...(isOwner && onDestroyChannel
            ? [
                {
                  key: 'destroy',
                  label: 'Kanalı Sil',
                  onClick: onDestroyChannel,
                  tone: 'danger',
                  loading: destroyBusy,
                },
              ]
            : []),
        ]

  return (
    <div ref={rootRef} className="relative shrink-0 self-center">
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={[
          'inline-flex size-8 items-center justify-center rounded-md border transition disabled:opacity-40',
          open
            ? 'border-amber-500/50 bg-amber-950/40 text-amber-300'
            : 'border-zinc-700/80 bg-zinc-900/80 text-zinc-500 hover:border-amber-500/35 hover:bg-zinc-800 hover:text-amber-300',
        ].join(' ')}
        aria-label={menuLabel}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="size-4" strokeWidth={2.25} aria-hidden />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[11.5rem] overflow-hidden rounded-md border border-zinc-700 bg-[#0a0b0d] py-1 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.9)]"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={busy || item.loading}
              onClick={() => run(item.onClick)}
              className={[
                'flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-40',
                item.tone === 'danger'
                  ? 'text-red-400 hover:bg-red-950/40'
                  : 'text-zinc-300 hover:bg-amber-500/10 hover:text-amber-200',
              ].join(' ')}
            >
              {item.loading ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
