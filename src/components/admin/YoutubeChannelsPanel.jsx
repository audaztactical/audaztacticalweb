import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, RefreshCw, Trash2, Video } from 'lucide-react'
import { callTriggerVideoNewsIngest } from '../../lib/cloudFunctions'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import {
  addYoutubeChannel,
  deleteYoutubeChannel,
  fetchYoutubeChannels,
  seedDefaultYoutubeChannelsIfEmpty,
} from '../../lib/firestoreYoutubeChannels'
import {
  ADMIN_BADGE,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_PRIMARY,
  ADMIN_EMPTY_STATE,
  ADMIN_FORM_CARD,
  ADMIN_FORM_CARD_HEADER,
  ADMIN_PANEL_LIST_HEADER,
  ADMIN_SUMMARY_BAR,
  ADMIN_TABLE,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_WRAP,
  ENABLED_TONE,
} from './adminUi'

/** @typedef {import('../../lib/firestoreYoutubeChannels').YoutubeChannelRecord} YoutubeChannelRecord */

const inputClass =
  'w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-app-text placeholder:text-app-text/45 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20'

/**
 * @param {{ rows: YoutubeChannelRecord[] }} props
 */
function ChannelsSummaryBar({ rows }) {
  const stats = useMemo(() => {
    const enabled = rows.filter((r) => r.enabled !== false).length
    return { total: rows.length, enabled, disabled: rows.length - enabled }
  }, [rows])

  return (
    <div className={ADMIN_SUMMARY_BAR}>
      <span className="font-bold uppercase tracking-wider text-accent/90">Özet</span>
      <span className="text-app-text/50">·</span>
      <span className="text-app-text/80">
        Kanal: <strong className="text-app-text">{stats.total}</strong>
      </span>
      <span className="text-app-text/50">·</span>
      <span className="text-emerald-300/90">
        Aktif: <strong>{stats.enabled}</strong>
      </span>
      {stats.disabled > 0 ? (
        <>
          <span className="text-app-text/50">·</span>
          <span className="text-zinc-400">
            Pasif: <strong>{stats.disabled}</strong>
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
export default function YoutubeChannelsPanel({ onFeedback }) {
  const [rows, setRows] = useState(/** @type {YoutubeChannelRecord[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [ingestBusy, setIngestBusy] = useState(false)
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))
  const [channelName, setChannelName] = useState('')
  const [channelInput, setChannelInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const seeded = await seedDefaultYoutubeChannelsIfEmpty()
      if (seeded > 0) {
        onFeedback?.('ok', `${seeded} varsayılan kanal listeye eklendi.`)
      }
      setRows(await fetchYoutubeChannels())
    } catch (err) {
      emitFirebaseError(err)
      onFeedback?.('err', err instanceof Error ? err.message : 'Kanallar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [onFeedback])

  useEffect(() => {
    void load()
  }, [load])

  const pullVideos = async () => {
    setIngestBusy(true)
    try {
      const result = await callTriggerVideoNewsIngest()
      const written = Number(result?.written ?? 0)
      const skipped = Number(result?.skipped ?? 0)
      if (written > 0) {
        onFeedback?.('ok', `${written} yeni video video_news koleksiyonuna eklendi.`)
      } else if (skipped > 0) {
        onFeedback?.('ok', 'Tarama tamamlandı; yeni video yok (mevcut kayıtlar zaten var).')
      } else {
        onFeedback?.('ok', 'Tarama tamamlandı; RSS kaynaklarından video bulunamadı.')
      }
    } catch (err) {
      emitFirebaseError(err)
      onFeedback?.(
        'err',
        err instanceof Error ? err.message : 'Video çekme başarısız. Functions deploy edildi mi?',
      )
    } finally {
      setIngestBusy(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const name = channelName.trim()
    const input = channelInput.trim()
    if (!name || !input) return

    setBusy(true)
    try {
      await addYoutubeChannel({ name, channelInput: input })
      setChannelName('')
      setChannelInput('')
      setRows(await fetchYoutubeChannels())
      try {
        const result = await callTriggerVideoNewsIngest()
        const written = Number(result?.written ?? 0)
        onFeedback?.(
          'ok',
          written > 0
            ? `Kanal eklendi; ${written} video çekildi. Küresel Haber Ağında görünür.`
            : 'Kanal eklendi. Videolar çekildi (yeni kayıt yoksa zaten mevcut olabilir).',
        )
      } catch {
        onFeedback?.(
          'ok',
          'Kanal eklendi. Videoları hemen çekmek için «Videoları şimdi çek» düğmesini kullanın.',
        )
      }
    } catch (err) {
      emitFirebaseError(err)
      onFeedback?.('err', err instanceof Error ? err.message : 'Kanal eklenemedi.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (row) => {
    setDeletingId(row.id)
    try {
      await deleteYoutubeChannel(row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      onFeedback?.('ok', `${row.name} listeden kaldırıldı.`)
    } catch (err) {
      emitFirebaseError(err)
      onFeedback?.('err', err instanceof Error ? err.message : 'Kanal silinemedi.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={ingestBusy || loading}
          onClick={() => void pullVideos()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wider text-app-text/80 transition hover:border-accent/40 hover:text-accent disabled:opacity-50"
        >
          {ingestBusy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Videoları şimdi çek
        </button>
      </div>

      <form onSubmit={handleAdd} className={ADMIN_FORM_CARD}>
        <div className={ADMIN_FORM_CARD_HEADER}>
          <Plus className="size-4 text-accent" strokeWidth={1.5} aria-hidden />
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-widest text-accent">
            Yeni kanal ekle
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent/80">
              Görünen ad (filtre)
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Örn. TASK & PURPOSE"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent/80">
              @handle, kanal URL veya UC… kimliği
            </label>
            <input
              type="text"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="https://www.youtube.com/@ProjectGecko"
              className={inputClass}
            />
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] leading-relaxed text-app-text/50">
          Görünen ad istediğiniz metin (ör. <span className="text-app-text/70">Project Gecko</span>).
          İkinci alana @handle URL, <span className="font-mono text-[10px]">@ProjectGecko</span>,
          <span className="font-mono text-[10px]"> youtube.com/channel/UC…</span> veya doğrudan
          <span className="font-mono text-[10px]"> UC…</span> kimliği yazabilirsiniz.
        </p>
        <button
          type="submit"
          disabled={busy || !channelName.trim() || !channelInput.trim()}
          className={`${ADMIN_BTN_PRIMARY} mt-4`}
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Kanal ekle
        </button>
      </form>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center gap-2 font-mono-technical text-sm text-app-text/55">
          <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          Kanallar yükleniyor…
        </div>
      ) : rows.length === 0 ? (
        <div className={ADMIN_EMPTY_STATE}>
          <Video className="size-8 text-app-text/40" strokeWidth={1.25} aria-hidden />
          <p className="font-mono-technical text-sm text-app-text/55">
            Henüz kanal yok — yukarıdan ekleyin veya sayfa varsayılan listeyi yükleyecek.
          </p>
        </div>
      ) : (
        <>
          <ChannelsSummaryBar rows={rows} />
          <div className={ADMIN_TABLE_WRAP}>
            <div className={ADMIN_PANEL_LIST_HEADER}>Kayıtlı kanallar</div>
            <table className={`${ADMIN_TABLE} min-w-[640px]`}>
              <thead className={`${ADMIN_TABLE_HEAD} sticky top-0 z-[1]`}>
                <tr>
                  <th className={ADMIN_TABLE_TH}>Kanal adı</th>
                  <th className={ADMIN_TABLE_TH}>Durum</th>
                  <th className={ADMIN_TABLE_TH}>Channel ID</th>
                  <th className={ADMIN_TABLE_TH}>RSS</th>
                  <th className={`${ADMIN_TABLE_TH} text-right`}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isEnabled = row.enabled !== false
                  return (
                    <tr key={row.id} className={ADMIN_TABLE_ROW}>
                      <td className={`${ADMIN_TABLE_TD} font-bold text-app-text`}>{row.name}</td>
                      <td className={ADMIN_TABLE_TD}>
                        <span
                          className={[
                            ADMIN_BADGE,
                            isEnabled ? ENABLED_TONE.on : ENABLED_TONE.off,
                          ].join(' ')}
                        >
                          {isEnabled ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className={`${ADMIN_TABLE_TD} font-mono text-xs text-app-text/60`}>{row.channelId}</td>
                      <td className={`${ADMIN_TABLE_TD} max-w-[12rem] truncate font-mono text-[10px] text-app-text/45`} title={row.feedUrl}>
                        {row.feedUrl}
                      </td>
                      <td className={`${ADMIN_TABLE_TD} text-right`}>
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => void handleDelete(row)}
                          className={ADMIN_BTN_DANGER}
                        >
                          {deletingId === row.id ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="size-3" aria-hidden />
                          )}
                          Sil
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
