import { useEffect, useState } from 'react'
import { Loader2, Radio, X } from 'lucide-react'
import { createMuhabereChannel } from '../../lib/firestoreTaktikMuhabere'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereContact} MuhabereContact */

/**
 * @param {{
 *   open: boolean
 *   uid: string
 *   contacts: MuhabereContact[]
 *   onClose: () => void
 *   onCreated: (channelId: string) => void
 * }} props
 */
export default function CreateChannelModal({ open, uid, contacts, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState(/** @type {Set<string>} */ (() => new Set()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!open) {
      setName('')
      setSelected(new Set())
      setError(null)
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const toggleMember = (/** @type {string} */ memberUid) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(memberUid)) next.delete(memberUid)
      else next.add(memberUid)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !uid || busy) return

    setBusy(true)
    setError(null)
    try {
      const channelId = await createMuhabereChannel({
        name: trimmed,
        createdBy: uid,
        memberUids: [...selected],
      })
      onCreated(channelId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kanal oluşturulamadı.')
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
        className="w-full max-w-md rounded-md border border-lime-500/40 bg-zinc-950 shadow-2xl"
        role="dialog"
        aria-labelledby="create-channel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 id="create-channel-title" className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
            Yeni tim kanalı
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
              placeholder="// Örn: ALFA TIM"
              maxLength={48}
              className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-lime-500/20"
              autoFocus
            />
          </label>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Rehberden üyeler
          </p>
          {contacts.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-600">Tim rehberi boş — önce operatör ekleyin.</p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900/50 p-2">
              {contacts.map((c) => {
                const checked = selected.has(c.uid)
                return (
                  <li key={c.uid}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-800/80">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(c.uid)}
                        className="size-3.5 accent-lime-500"
                      />
                      <Radio className="size-3 shrink-0 text-zinc-600" aria-hidden />
                      <span className="truncate text-xs text-zinc-300">{c.callsign}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          {error ? <p className="mt-3 text-xs text-red-400/90">{error}</p> : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-zinc-700 px-3 py-2 text-[10px] font-bold uppercase text-zinc-500 hover:bg-zinc-900"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!name.trim() || busy}
              className="flex flex-1 items-center justify-center gap-1 rounded-md border border-lime-500/40 bg-lime-950/40 px-3 py-2 text-[10px] font-bold uppercase text-lime-400 hover:bg-lime-900/50 disabled:opacity-40"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : 'Kanal aç'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
