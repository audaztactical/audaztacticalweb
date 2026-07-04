import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { updateMuhabereChannelName } from '../../lib/firestoreTaktikMuhabere'

/**
 * @param {{
 *   open: boolean
 *   channelId: string
 *   channelName: string
 *   uid: string
 *   onClose: () => void
 *   onUpdated: (name: string) => void
 * }} props
 */
export default function EditChannelModal({ open, channelId, channelName, uid, onClose, onUpdated }) {
  const [name, setName] = useState(channelName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (open) {
      setName(channelName)
      setBusy(false)
      setError(null)
    }
  }, [open, channelName])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const label = name.trim()
    if (!label || busy) return

    setBusy(true)
    setError(null)
    try {
      await updateMuhabereChannelName(channelId, uid, label)
      onUpdated(label)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kanal güncellenemedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 font-mono backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md border border-amber-500/35 bg-[#0a0b0d] shadow-2xl"
        role="dialog"
        aria-labelledby="edit-channel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 id="edit-channel-title" className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            Kanalı düzenle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Kapat"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-4 py-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Kanal adı
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
              required
              className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/25"
              autoFocus
            />
          </label>

          {error ? <p className="mt-3 text-xs text-red-400/90">{error}</p> : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-md border border-zinc-700 px-3 py-2 text-[10px] font-bold uppercase text-zinc-500 hover:bg-zinc-900 disabled:opacity-40"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="flex flex-1 items-center justify-center gap-1 rounded-md border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-[10px] font-bold uppercase text-amber-300 hover:bg-amber-900/50 disabled:opacity-40"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
