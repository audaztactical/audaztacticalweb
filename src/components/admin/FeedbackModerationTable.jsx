import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, MessageSquare } from 'lucide-react'
import { isFirebaseConfigured } from '../../lib/firebase'
import {
  formatFeedbackTimestamp,
  subscribeFeedbackForAdmin,
} from '../../lib/firestoreFeedback'

/** @typedef {import('../../lib/firestoreFeedback').FeedbackRecord} FeedbackRecord */

const TYPE_TONE = {
  Hata: 'border-red-500/40 bg-red-950/30 text-red-300',
  Öneri: 'border-accent/35 bg-accent/10 text-accent',
  Bug: 'border-amber-500/40 bg-amber-950/30 text-amber-300',
}

/**
 * @param {string} text
 * @param {number} max
 */
function truncate(text, max = 120) {
  const t = String(text ?? '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/**
 * @param {{
 *   onFeedback?: (type: 'ok' | 'err', text: string) => void
 * }} props
 */
export default function FeedbackModerationTable({ onFeedback }) {
  const [rows, setRows] = useState(/** @type {FeedbackRecord[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setRows([])
      setLoading(false)
      setError('Firebase yapılandırılmadı.')
      return undefined
    }

    setLoading(true)
    setError('')

    const unsub = subscribeFeedbackForAdmin(
      (next) => {
        setRows(next)
        setLoading(false)
      },
      (err) => {
        const message = err instanceof Error ? err.message : 'Geri bildirimler yüklenemedi.'
        setError(message)
        setLoading(false)
        onFeedback?.('err', message)
      },
    )

    return unsub
  }, [onFeedback])

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 font-mono-technical text-sm text-app-text/55">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Geri bildirimler yükleniyor…
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 font-mono-technical text-sm text-red-300">
        {error}
      </p>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center">
        <MessageSquare className="size-8 text-app-text/45" strokeWidth={1.25} aria-hidden />
        <p className="font-mono-technical text-sm text-app-text/55">Henüz geri bildirim yok.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-full border-collapse font-mono-technical text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-black/40 text-[10px] uppercase tracking-wider text-accent/90">
            <th className="px-4 py-3 font-bold">Tarih</th>
            <th className="px-4 py-3 font-bold">Tür</th>
            <th className="px-4 py-3 font-bold">Operatör</th>
            <th className="px-4 py-3 font-bold">Açıklama</th>
            <th className="px-4 py-3 font-bold">Ekran</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.02]">
              <td className="whitespace-nowrap px-4 py-3 text-app-text/70">
                {formatFeedbackTimestamp(row.createdAt)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={[
                    'inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    TYPE_TONE[row.issueType] ?? 'border-slate-600 text-app-text/70',
                  ].join(' ')}
                >
                  {row.issueType}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="font-bold text-app-text">{row.callsign || '—'}</p>
                <p className="mt-0.5 text-[10px] text-app-text/55">{row.userEmail || row.userId.slice(0, 8)}</p>
              </td>
              <td className="max-w-md px-4 py-3 text-app-text/90">
                <p title={row.description}>{truncate(row.description, 160)}</p>
              </td>
              <td className="px-4 py-3">
                {row.screenshotURL ? (
                  <a
                    href={row.screenshotURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent hover:text-accent/80"
                  >
                    Görüntüle
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : (
                  <span className="text-app-text/45">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
