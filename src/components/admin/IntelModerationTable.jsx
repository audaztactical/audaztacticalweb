import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, limit, orderBy, query } from 'firebase/firestore'
import { Loader2, ShieldAlert, Trash2 } from 'lucide-react'
import { db, isFirebaseConfigured } from '../../lib/firebase'
import { formatIntelTimestamp, mapIntelFeedDoc } from '../../lib/firestoreIntelFeed'
import { safeOnSnapshot } from '../../lib/firestoreSnapshot'

/** @typedef {import('../../lib/firestoreIntelFeed').IntelFeedItem & { isAlert?: boolean }} ModerationRow */

const FEED_LIMIT = 30

/**
 * @param {{
 *   onFeedback?: (type: 'ok' | 'err', text: string) => void
 * }} props
 */
export default function IntelModerationTable({ onFeedback }) {
  const [rows, setRows] = useState(/** @type {ModerationRow[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!isFirebaseConfigured() || !db) {
      setRows([])
      setLoading(false)
      setError('Firebase yapılandırılmadı.')
      return undefined
    }

    setLoading(true)
    setError('')

    const q = query(collection(db, 'news_feed'), orderBy('timestamp', 'desc'), limit(FEED_LIMIT))

    const unsub = safeOnSnapshot(
      q,
      (snap) => {
        const next = snap.docs
          .map((d) => {
            const mapped = mapIntelFeedDoc(d.data(), d.id)
            if (!mapped) return null
            const raw = d.data()
            return {
              ...mapped,
              isAlert: Boolean(raw?.isAlert),
            }
          })
          .filter(Boolean)
        setRows(next)
        setLoading(false)
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'İstihbarat akışı yüklenemedi.')
        setLoading(false)
      },
    )

    return unsub
  }, [])

  /**
   * @param {ModerationRow} row
   */
  const handleDelete = async (row) => {
    const confirmed = window.confirm(
      'Bu istihbarat verisini imha etmek istediğinize emin misiniz?',
    )
    if (!confirmed || !db) return

    setDeletingId(row.id)
    try {
      await deleteDoc(doc(db, 'news_feed', row.id))
      onFeedback?.('ok', 'İstihbarat kaydı imha edildi.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Silme işlemi başarısız.'
      onFeedback?.('err', message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 bg-black/30 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
            <div>
              <h2 className="font-display text-base font-bold uppercase tracking-wider text-accent">
                İstihbarat Moderasyonu
              </h2>
              <p className="mt-0.5 text-xs text-app-text/55">
                Son {FEED_LIMIT} kayıt — canlı akış. Yanlış pozitifleri doğrudan imha edin.
              </p>
            </div>
          </div>
          <span className="font-mono-technical text-[10px] uppercase tracking-wider text-app-text/55">
            {loading ? 'SENKRON…' : `${rows.length} KAYIT`}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        {error ? (
          <p className="p-5 font-mono-technical text-sm text-orange-300">{error}</p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-app-text/55">
            <Loader2 className="size-5 animate-spin text-accent" aria-hidden />
            <span className="font-mono-technical text-xs uppercase tracking-wider">Veri akışı kuruluyor…</span>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gray-800 bg-black/40">
              <tr className="font-mono-technical text-[10px] uppercase tracking-wider text-app-text/55">
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Kaynak</th>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Etiketler</th>
                <th className="px-4 py-3 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const title = row.trTitle || row.enTitle || '—'
                const busy = deletingId === row.id
                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-800 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono-technical text-[11px] tabular-nums text-app-text/70">
                      {formatIntelTimestamp(row.timestamp)}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-xs text-app-text/70" title={row.source}>
                      {row.source}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 font-medium text-app-text" title={title}>
                      {title}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.isAlert ? (
                          <span className="rounded border border-red-500/40 bg-red-950/40 px-1.5 py-0.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-red-400">
                            İKAZ
                          </span>
                        ) : null}
                        {(row.tags ?? []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded border border-accent/25 bg-accent/10 px-1.5 py-0.5 font-mono-technical text-[9px] uppercase tracking-wider text-accent/90"
                          >
                            {tag}
                          </span>
                        ))}
                        {!row.isAlert && !(row.tags ?? []).length ? (
                          <span className="text-[10px] text-app-text/45">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        disabled={busy}
                        title="İmha et"
                        className="inline-flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 font-mono-technical text-[10px] uppercase tracking-wider text-red-500 transition hover:border-red-400/50 hover:bg-red-950/30 hover:text-red-400 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden />
                        )}
                        Sil
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && !error && rows.length === 0 ? (
          <p className="p-6 text-center font-mono-technical text-xs uppercase tracking-wider text-app-text/55">
            news_feed koleksiyonunda kayıt yok.
          </p>
        ) : null}
      </div>
    </section>
  )
}
