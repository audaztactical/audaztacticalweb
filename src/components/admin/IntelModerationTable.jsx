import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, limit, orderBy, query } from 'firebase/firestore'
import { Globe, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react'
import { db, isFirebaseConfigured } from '../../lib/firebase'
import {
  formatIntelTimestamp,
  mapIntelFeedDoc,
  setIntelFeedHiddenFromFeed,
} from '../../lib/firestoreIntelFeed'
import { safeOnSnapshot } from '../../lib/firestoreSnapshot'
import {
  ADMIN_BADGE,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_GHOST,
  ADMIN_EMPTY_STATE,
  ADMIN_SUMMARY_BAR,
  ADMIN_TABLE,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_WRAP,
} from './adminUi'

/** @typedef {import('../../lib/firestoreIntelFeed').IntelFeedItem & { isAlert?: boolean; hiddenFromFeed?: boolean }} ModerationRow */

const FEED_LIMIT = 30

/**
 * @param {{ rows: ModerationRow[] }} props
 */
function IntelSummaryBar({ rows }) {
  const stats = useMemo(() => {
    const alerts = rows.filter((r) => r.isAlert).length
    const hidden = rows.filter((r) => r.hiddenFromFeed).length
    const sources = new Set(rows.map((r) => r.source).filter(Boolean)).size
    return { total: rows.length, alerts, hidden, sources }
  }, [rows])

  return (
    <div className={ADMIN_SUMMARY_BAR}>
      <span className="font-bold uppercase tracking-wider text-accent/90">Özet</span>
      <span className="text-app-text/50">·</span>
      <span className="text-app-text/80">
        Kayıt: <strong className="text-app-text">{stats.total}</strong>
      </span>
      <span className="text-app-text/50">·</span>
      <span className="text-red-300/90">
        İkaz: <strong>{stats.alerts}</strong>
      </span>
      <span className="text-app-text/50">·</span>
      <span className="text-sky-300/90">
        Kaynak: <strong>{stats.sources}</strong>
      </span>
      {stats.hidden > 0 ? (
        <>
          <span className="text-app-text/50">·</span>
          <span className="text-zinc-400">
            Gizli: <strong>{stats.hidden}</strong>
          </span>
        </>
      ) : null}
    </div>
  )
}

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
  const [visibilityBusyId, setVisibilityBusyId] = useState(/** @type {string | null} */ (null))

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
              hiddenFromFeed: raw?.hiddenFromFeed === true,
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
  const handleToggleVisibility = async (row) => {
    if (!db || visibilityBusyId) return
    const nextHidden = !row.hiddenFromFeed
    setVisibilityBusyId(row.id)
    try {
      await setIntelFeedHiddenFromFeed(row.id, nextHidden)
      onFeedback?.('ok', nextHidden ? 'Kayıt Küresel Haber Ağı\'ndan gizlendi.' : 'Kayıt yeniden yayına alındı.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Görünürlük güncellenemedi.'
      onFeedback?.('err', message)
    } finally {
      setVisibilityBusyId(null)
    }
  }

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

  if (error) {
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 font-mono-technical text-sm text-red-300">
        {error}
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 font-mono-technical text-sm text-app-text/55">
        <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
        İstihbarat akışı yükleniyor…
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className={ADMIN_EMPTY_STATE}>
        <Globe className="size-8 text-app-text/45" strokeWidth={1.25} aria-hidden />
        <p className="font-mono-technical text-sm font-bold uppercase tracking-wider text-app-text/55">
          Henüz istihbarat kaydı yok
        </p>
        <p className="max-w-sm text-xs text-app-text/45">
          news_feed koleksiyonunda kayıt bulunamadı — bot veya RSS akışı henüz veri yazmamış olabilir.
        </p>
      </div>
    )
  }

  return (
    <>
      <IntelSummaryBar rows={rows} />
      <div className={ADMIN_TABLE_WRAP}>
        <table className={`${ADMIN_TABLE} min-w-[720px]`}>
          <thead className={`${ADMIN_TABLE_HEAD} sticky top-0 z-[1]`}>
            <tr>
              <th className={ADMIN_TABLE_TH}>Tarih</th>
              <th className={ADMIN_TABLE_TH}>Kaynak</th>
              <th className={ADMIN_TABLE_TH}>Başlık</th>
              <th className={ADMIN_TABLE_TH}>Etiketler</th>
              <th className={`${ADMIN_TABLE_TH} text-right`}>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const title = row.trTitle || row.enTitle || '—'
              const busy = deletingId === row.id
              const visBusy = visibilityBusyId === row.id
              const hidden = row.hiddenFromFeed === true
              return (
                <tr
                  key={row.id}
                  className={[ADMIN_TABLE_ROW, hidden ? 'opacity-60' : ''].filter(Boolean).join(' ')}
                >
                  <td className={`${ADMIN_TABLE_TD} whitespace-nowrap font-mono-technical text-[11px] tabular-nums text-app-text/70`}>
                    {formatIntelTimestamp(row.timestamp)}
                  </td>
                  <td className={`${ADMIN_TABLE_TD} max-w-[140px] truncate text-xs text-app-text/70`} title={row.source}>
                    {row.source}
                  </td>
                  <td className={`${ADMIN_TABLE_TD} max-w-[280px]`}>
                    <p className="truncate font-bold text-app-text" title={title}>
                      {title}
                    </p>
                    {hidden ? (
                      <span className="mt-1 inline-block rounded border border-zinc-600/50 bg-zinc-900/50 px-1.5 py-0.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                        GİZLİ
                      </span>
                    ) : null}
                  </td>
                  <td className={ADMIN_TABLE_TD}>
                    <div className="flex flex-wrap gap-1">
                      {row.isAlert ? (
                        <span className={[ADMIN_BADGE, 'border-red-500/40 bg-red-950/40 text-red-400'].join(' ')}>
                          İKAZ
                        </span>
                      ) : null}
                      {(row.tags ?? []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className={[ADMIN_BADGE, 'border-accent/25 bg-accent/10 text-accent/90'].join(' ')}
                        >
                          {tag}
                        </span>
                      ))}
                      {!row.isAlert && !(row.tags ?? []).length ? (
                        <span className="text-[10px] text-app-text/45">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td className={`${ADMIN_TABLE_TD} text-right`}>
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void handleToggleVisibility(row)}
                        disabled={busy || visBusy}
                        title={hidden ? 'Yayına geri al' : 'Yayından kaldır'}
                        className={ADMIN_BTN_GHOST}
                      >
                        {visBusy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : hidden ? (
                          <Eye className="size-3.5" aria-hidden />
                        ) : (
                          <EyeOff className="size-3.5" aria-hidden />
                        )}
                        {hidden ? 'Yayına Geri Al' : 'Yayından Kaldır'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        disabled={busy || visBusy}
                        title="İmha et"
                        className={[ADMIN_BTN_DANGER, 'border-red-500/30 text-red-500 hover:border-red-400/50 hover:bg-red-950/30 hover:text-red-400'].join(' ')}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden />
                        )}
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
