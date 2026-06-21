import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Loader2, MessageSquare, X, ZoomIn } from 'lucide-react'
import { isFirebaseConfigured } from '../../lib/firebase'
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_VALUES,
  formatFeedbackTimestamp,
  subscribeFeedbackForAdmin,
  summarizeFeedbackRows,
  updateFeedbackStatus,
} from '../../lib/firestoreFeedback'
import {
  ADMIN_EMPTY_STATE,
  ADMIN_TABLE,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_WRAP,
} from './adminUi'

/** @typedef {import('../../lib/firestoreFeedback').UnifiedFeedbackRecord} UnifiedFeedbackRecord */
/** @typedef {import('../../lib/firestoreFeedback').FeedbackStatusValue} FeedbackStatusValue */

const TYPE_TONE = {
  complaint: 'border-orange-500/45 bg-orange-950/35 text-orange-300',
  suggestion: 'border-accent/40 bg-accent/10 text-accent',
  Hata: 'border-red-500/45 bg-red-950/35 text-red-300',
  Öneri: 'border-accent/40 bg-accent/10 text-accent',
  Bug: 'border-amber-500/45 bg-amber-950/35 text-amber-300',
}

const STATUS_TONE = {
  new: 'border-amber-500/40 bg-amber-950/25 text-amber-300',
  reviewed: 'border-sky-500/35 bg-sky-950/25 text-sky-300',
  resolved: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300',
  legacy: 'border-zinc-600/50 bg-zinc-900/50 text-zinc-400',
}

/**
 * @param {string} text
 * @param {number} max
 */
function truncate(text, max = 100) {
  const t = String(text ?? '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/**
 * @param {{ rows: UnifiedFeedbackRecord[] }} props
 */
function FeedbackSummaryBar({ rows }) {
  const stats = useMemo(() => summarizeFeedbackRows(rows), [rows])

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-accent/20 bg-black/40 px-4 py-3 font-mono-technical text-[11px]">
      <span className="font-bold uppercase tracking-wider text-accent/90">Özet</span>
      <span className="text-app-text/50">·</span>
      <span className="text-app-text/80">
        Toplam: <strong className="text-app-text">{stats.total}</strong>
      </span>
      <span className="text-app-text/50">·</span>
      <span className="text-orange-300/90">
        Şikayet: <strong>{stats.complaints}</strong>
      </span>
      <span className="text-app-text/50">·</span>
      <span className="text-accent/90">
        Öneri: <strong>{stats.suggestions}</strong>
      </span>
      <span className="text-app-text/50">·</span>
      <span className="text-amber-300/90">
        Yeni: <strong>{stats.fresh}</strong>
      </span>
    </div>
  )
}

/**
 * @param {{ row: UnifiedFeedbackRecord | null; onClose: () => void }} props
 */
function FeedbackDetailModal({ row, onClose }) {
  if (!row) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-accent/30 bg-zinc-950 shadow-[0_0_40px_-8px_rgba(132,204,22,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-black/50 px-5 py-4">
          <div>
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-widest text-accent/80">
              Geri bildirim detayı
            </p>
            <h3 id="feedback-detail-title" className="mt-1 font-display text-lg font-bold text-app-text">
              {row.subject || row.typeLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-app-text/60 transition hover:border-white/25 hover:text-app-text"
            aria-label="Kapat"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <span
              className={[
                'inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                TYPE_TONE[row.typeKey] ?? 'border-zinc-600 text-zinc-400',
              ].join(' ')}
            >
              {row.typeLabel}
            </span>
            <span className="font-mono-technical text-[10px] text-app-text/50">
              {formatFeedbackTimestamp(row.createdAt)}
            </span>
          </div>
          {row.subject ? (
            <div>
              <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent/70">
                Konu
              </p>
              <p className="mt-1 text-app-text">{row.subject}</p>
            </div>
          ) : null}
          <div>
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent/70">
              Mesaj
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-app-text/90">{row.message || '—'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <p className="font-bold text-app-text">{row.operatorName}</p>
            <p className="mt-0.5 font-mono-technical text-[10px] text-app-text/55">
              {row.userEmail || row.userId.slice(0, 12)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{ url: string | null; onClose: () => void }} props
 */
function ImageLightbox({ url, onClose }) {
  if (!url) return null

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Görsel önizleme"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg border border-white/20 bg-black/60 p-2 text-app-text/80 hover:text-app-text"
        aria-label="Kapat"
      >
        <X className="size-5" aria-hidden />
      </button>
      <img
        src={url}
        alt="Geri bildirim ekran görüntüsü"
        className="max-h-[90vh] max-w-full rounded-lg border border-white/15 object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

/**
 * @param {{
 *   onFeedback?: (type: 'ok' | 'err', text: string) => void
 * }} props
 */
export default function FeedbackModerationTable({ onFeedback }) {
  const [rows, setRows] = useState(/** @type {UnifiedFeedbackRecord[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailRow, setDetailRow] = useState(/** @type {UnifiedFeedbackRecord | null} */ (null))
  const [lightboxUrl, setLightboxUrl] = useState(/** @type {string | null} */ (null))
  const [statusBusyId, setStatusBusyId] = useState(/** @type {string | null} */ (null))

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

  /**
   * @param {UnifiedFeedbackRecord} row
   * @param {FeedbackStatusValue} nextStatus
   */
  const handleStatusChange = async (row, nextStatus) => {
    if (row.status === nextStatus) return
    setStatusBusyId(row.id)
    try {
      await updateFeedbackStatus(row.id, nextStatus)
      onFeedback?.('ok', 'Durum güncellendi.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Durum güncellenemedi.'
      onFeedback?.('err', message)
    } finally {
      setStatusBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 font-mono-technical text-sm text-app-text/55">
        <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
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
      <div className={ADMIN_EMPTY_STATE}>
        <MessageSquare className="size-8 text-app-text/45" strokeWidth={1.25} aria-hidden />
        <p className="font-mono-technical text-sm font-bold uppercase tracking-wider text-app-text/55">
          Henüz geri bildirim yok
        </p>
        <p className="max-w-sm text-xs text-app-text/45">
          Operatörler Şikayet &amp; Öneri formundan veya Ayarlar ekranından kayıt gönderdiğinde burada listelenir.
        </p>
      </div>
    )
  }

  return (
    <>
      <FeedbackSummaryBar rows={rows} />

      <div className={ADMIN_TABLE_WRAP}>
        <table className={`${ADMIN_TABLE} font-mono-technical text-xs`}>
          <thead className={ADMIN_TABLE_HEAD}>
            <tr>
              <th className={ADMIN_TABLE_TH}>Tarih</th>
              <th className={ADMIN_TABLE_TH}>Tür</th>
              <th className={ADMIN_TABLE_TH}>Durum</th>
              <th className={ADMIN_TABLE_TH}>Operatör</th>
              <th className={`${ADMIN_TABLE_TH} min-w-[200px]`}>Açıklama</th>
              <th className={ADMIN_TABLE_TH}>Ekran</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              return (
                <tr key={row.id} className={ADMIN_TABLE_ROW}>
                  <td className={`${ADMIN_TABLE_TD} whitespace-nowrap tabular-nums text-app-text/70`}>
                    {formatFeedbackTimestamp(row.createdAt)}
                  </td>
                  <td className={ADMIN_TABLE_TD}>
                    <span
                      className={[
                        'inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        TYPE_TONE[row.typeKey] ?? 'border-zinc-600 text-zinc-400',
                      ].join(' ')}
                    >
                      {row.typeLabel}
                    </span>
                  </td>
                  <td className={ADMIN_TABLE_TD}>
                    <select
                      value={
                        FEEDBACK_STATUS_VALUES.includes(/** @type {FeedbackStatusValue} */ (row.status))
                          ? row.status
                          : 'new'
                      }
                      disabled={statusBusyId === row.id}
                      onChange={(e) =>
                        void handleStatusChange(row, /** @type {FeedbackStatusValue} */ (e.target.value))
                      }
                      className={[
                        'w-full min-w-[7rem] cursor-pointer rounded border bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider outline-none',
                        'focus:border-accent/50 focus:ring-1 focus:ring-accent/30 disabled:opacity-50',
                        STATUS_TONE[
                          FEEDBACK_STATUS_VALUES.includes(/** @type {FeedbackStatusValue} */ (row.status))
                            ? row.status
                            : 'legacy'
                        ] ?? STATUS_TONE.legacy,
                      ].join(' ')}
                      aria-label={`Durum — ${row.operatorName}`}
                    >
                      {FEEDBACK_STATUS_VALUES.map((value) => (
                        <option key={value} value={value} className="bg-zinc-950 text-app-text">
                          {FEEDBACK_STATUS_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={ADMIN_TABLE_TD}>
                    <p className="font-bold text-app-text">{row.operatorName}</p>
                    {row.callsign && row.schema === 'operator' && row.operatorName !== row.callsign ? (
                      <p className="mt-0.5 text-[10px] text-accent/70">{row.callsign}</p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] text-app-text/55">
                      {row.userEmail || `${row.userId.slice(0, 8)}…`}
                    </p>
                  </td>
                  <td className={`${ADMIN_TABLE_TD} max-w-xs`}>
                    <button
                      type="button"
                      onClick={() => setDetailRow(row)}
                      className="group w-full text-left"
                    >
                      {row.subject ? (
                        <p className="mb-1 truncate font-display text-[11px] font-bold uppercase tracking-wide text-accent/90">
                          {row.subject}
                        </p>
                      ) : null}
                      <p className="text-app-text/85 group-hover:text-accent/90">{truncate(row.message, 90)}</p>
                      <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-accent/60 group-hover:text-accent">
                        Detay
                        <ChevronRight className="size-3" aria-hidden />
                      </span>
                    </button>
                  </td>
                  <td className={ADMIN_TABLE_TD}>
                    {row.imageUrls.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {row.imageUrls.slice(0, 3).map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setLightboxUrl(url)}
                            className="group relative size-11 overflow-hidden rounded border border-white/15 bg-black/40 transition hover:border-accent/40"
                            title="Büyüt"
                          >
                            <img src={url} alt="" className="size-full object-cover" />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                              <ZoomIn className="size-3.5 text-accent" aria-hidden />
                            </span>
                          </button>
                        ))}
                        {row.imageUrls.length > 3 ? (
                          <span className="self-center text-[10px] text-app-text/50">+{row.imageUrls.length - 3}</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-app-text/45">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <FeedbackDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </>
  )
}
