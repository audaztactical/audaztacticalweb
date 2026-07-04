import { useState } from 'react'
import { Loader2, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { joinGroupByPassword, normalizeGroupPassword } from '../../lib/firestoreGroups'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'

const inputClass =
  'w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-app-text outline-none transition-colors focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/25'

/**
 * @param {{ onJoined?: () => void; bare?: boolean }} props
 */
export default function GroupJoinPanel({ onJoined, bare = false }) {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSuccess(false)

    if (!user?.uid) {
      setMessage('Oturum gerekli')
      return
    }

    const code = normalizeGroupPassword(password)
    if (code.length < 4) {
      setMessage('Grup şifresi en az 4 karakter olmalı')
      return
    }

    setBusy(true)
    try {
      const result = await joinGroupByPassword(user.uid, code)
      if (result.alreadyMember) {
        setSuccess(true)
        setMessage(`• [BAŞARILI]: Zaten "${result.group.groupName}" grubundasınız.`)
      } else {
        setSuccess(true)
        setMessage('• [BAŞARILI]: Gruba başarıyla dahil oldunuz!')
      }
      setPassword('')
      onJoined?.()
    } catch (err) {
      emitFirebaseError(err)
      const code = err?.code ?? ''
      if (code === 'group-not-found') {
        setMessage('Grup şifresi geçersiz — eğitmeninizden kodu doğrulayın.')
      } else {
        setMessage(err instanceof Error ? err.message : 'Gruba katılım başarısız')
      }
    } finally {
      setBusy(false)
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="min-w-0 flex-1 space-y-1.5">
        <span className="font-mono text-[9px] font-bold uppercase text-app-text/55">Grup Şifresi</span>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(normalizeGroupPassword(e.target.value))}
          placeholder="ÖRN: ALPHA99"
          className={inputClass}
          autoComplete="off"
          required
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded border border-emerald-600/45 bg-emerald-950/40 px-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300 transition hover:border-emerald-500/70 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        KATIL
      </button>
    </form>
  )

  const feedback = message ? (
    <p
      className={[
        'mt-3 font-mono text-[10px] font-bold uppercase leading-relaxed',
        success ? 'text-emerald-400' : 'text-red-400',
      ].join(' ')}
    >
      {message}
    </p>
  ) : null

  if (bare) {
    return (
      <div>
        <p className="mb-3 font-mono-technical text-[9px] uppercase leading-relaxed text-app-text/55">
          Eğitmeninizden aldığınız grup şifresi ile taktik timinize katılın.
        </p>
        {form}
        {feedback}
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-emerald-900/35 bg-slate-950/80 p-4">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
        <Users className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        [ 🦅 TİME/GRUBA DAHİL OL ]
      </p>
      {form}
      {feedback}
    </section>
  )
}
