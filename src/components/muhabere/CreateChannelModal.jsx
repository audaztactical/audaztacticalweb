import { useEffect, useState } from 'react'
import { Loader2, Radio, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createMuhabereChannel } from '../../lib/firestoreTaktikMuhabere'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereContact} MuhabereContact */

function defaultChannelName() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `TIM-${hh}${mm}`
}

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
  const { t } = useTranslation('messages')
  const [name, setName] = useState('')
  const [selected, setSelected] = useState(/** @type {Set<string>} */ (() => new Set()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (open) {
      setName(defaultChannelName())
      setSelected(new Set())
      setError(null)
      setBusy(false)
    } else {
      setName('')
      setSelected(new Set())
      setError(null)
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const trimmedName = name.trim()
  const sessionOk = Boolean(uid)

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
    const label = trimmedName || defaultChannelName()
    const memberUids = [...selected]
    const payload = { name: label, createdBy: uid, memberUids }

    console.log('[CreateChannelModal] Kanal oluşturuluyor:', payload)

    if (!uid) {
      const msg = t('errors.sessionNotFound')
      setError(msg)
      console.error('[CreateChannelModal] Validasyon:', msg)
      return
    }
    if (busy) return

    setBusy(true)
    setError(null)
    try {
      const channelId = await createMuhabereChannel({
        name: label,
        createdBy: uid,
        memberUids,
      })
      console.log('[CreateChannelModal] Kanal açıldı:', channelId)
      onCreated(channelId)
      onClose()
    } catch (err) {
      const code = /** @type {{ code?: string }} */ (err)?.code ?? ''
      const msg = err instanceof Error ? err.message : t('errors.channelCreateFailed')
      console.error('[CreateChannelModal] Kanal oluşturma hatası:', { code, err, payload })
      setError(msg)
      if (import.meta.env.DEV) {
        window.alert(`[Kanal hatası] ${code ? `${code}: ` : ''}${msg}`)
      }
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
          <h2 id="create-channel-title" className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
            {t('createChannel.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label={t('common.close')}
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-4 py-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {t('createChannel.nameLabel')}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('createChannel.namePlaceholder')}
              maxLength={48}
              required
              className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/30"
              autoFocus
            />
          </label>
          <p className="mt-1 text-[9px] text-zinc-600">
            {trimmedName
              ? t('createChannel.charCount', { count: trimmedName.length })
              : t('createChannel.defaultNameHint')}
          </p>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {t('createChannel.membersLabel')}{' '}
            <span className="font-normal text-zinc-600">{t('createChannel.membersOptional')}</span>
          </p>
          <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{t('createChannel.groupMembers')}</p>
            <ul className="mt-1.5 space-y-1">
              <li className="flex items-center gap-2 text-xs text-lime-400">
                <Radio className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{t('createChannel.youCreator')}</span>
              </li>
              {contacts
                .filter((c) => selected.has(c.uid))
                .map((c) => (
                  <li key={c.uid} className="flex items-center gap-2 text-xs text-zinc-300">
                    <Radio className="size-3 shrink-0 text-zinc-600" aria-hidden />
                    <span className="truncate">{c.callsign}</span>
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-[9px] text-zinc-600">
              {t('createChannel.totalMembers', { count: selected.size + 1 })}
            </p>
          </div>
          {contacts.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-600">{t('createChannel.rosterEmpty')}</p>
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

          {!sessionOk ? (
            <p className="mt-3 text-xs text-amber-400/90">{t('createChannel.sessionInvalid')}</p>
          ) : null}

          {error ? <p className="mt-3 text-xs text-red-400/90">{error}</p> : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-w-0 flex-1 truncate rounded-md border border-zinc-700 px-3 py-2 text-[10px] font-bold uppercase text-zinc-500 hover:bg-zinc-900 disabled:opacity-40"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={busy || !sessionOk}
              className={[
                'flex min-w-0 flex-1 items-center justify-center gap-1 truncate rounded-md border px-3 py-2 text-[10px] font-bold uppercase transition',
                busy || !sessionOk
                  ? 'cursor-not-allowed border-zinc-700 bg-zinc-900 text-zinc-600 opacity-50'
                  : 'border-lime-400/60 bg-lime-500/20 text-lime-300 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] hover:bg-lime-500/30',
              ].join(' ')}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : t('createChannel.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
