import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw, Trash2, Video } from 'lucide-react'
import { callTriggerVideoNewsIngest } from '../../lib/cloudFunctions'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import {
  addYoutubeChannel,
  deleteYoutubeChannel,
  fetchYoutubeChannels,
  seedDefaultYoutubeChannelsIfEmpty,
} from '../../lib/firestoreYoutubeChannels'

/** @typedef {import('../../lib/firestoreYoutubeChannels').YoutubeChannelRecord} YoutubeChannelRecord */

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
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 bg-black/30 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Video className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
            <div>
              <h2 className="font-display text-base font-bold uppercase tracking-wider text-accent">
                YouTube kanalları
              </h2>
              <p className="mt-0.5 text-xs text-app-text/55">
                Liste Firestore&apos;da; videolar RSS ile saatlik botta veya manuel çekimle video_news&apos;e yazılır.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={ingestBusy || loading}
            onClick={() => void pullVideos()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wider text-app-text/80 hover:border-accent/40 hover:text-accent disabled:opacity-50"
          >
            {ingestBusy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
            Videoları şimdi çek
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5">
        <form onSubmit={handleAdd} className="rounded-lg border border-white/10 bg-black/30 p-4">
          <p className="mb-3 font-mono-technical text-[10px] font-bold uppercase tracking-widest text-accent/90">
            Yeni kanal ekle
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-app-text/55">
                Görünen ad (filtre)
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Örn. TASK & PURPOSE"
                className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-app-text"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-app-text/55">
                @handle, kanal URL veya UC… kimliği
              </label>
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="https://www.youtube.com/@ProjectGecko"
                className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-app-text"
              />
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-app-text/50">
            Görünen ad istediğiniz metin (ör. <span className="text-app-text/70">Project Gecko</span>).
            İkinci alana @handle URL, <span className="font-mono text-[10px]">@ProjectGecko</span>,
            <span className="font-mono text-[10px]">youtube.com/channel/UC…</span> veya doğrudan
            <span className="font-mono text-[10px]"> UC…</span> kimliği yazabilirsiniz.
          </p>
          <button
            type="submit"
            disabled={busy || !channelName.trim() || !channelInput.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/15 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-accent hover:bg-accent/25 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            Kanal ekle
          </button>
        </form>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-app-text/55">
            <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
            Kanallar yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-app-text/55">
            Henüz kanal yok — yukarıdan ekleyin veya sayfa varsayılan listeyi yükleyecek.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-black/40 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/55">
                <tr>
                  <th className="px-3 py-2.5">Kanal adı</th>
                  <th className="px-3 py-2.5">Channel ID</th>
                  <th className="px-3 py-2.5">RSS</th>
                  <th className="px-3 py-2.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => (
                  <tr key={row.id} className="text-app-text/85">
                    <td className="px-3 py-2.5 font-semibold">{row.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-app-text/60">{row.channelId}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2.5 font-mono text-[10px] text-app-text/45">
                      {row.feedUrl}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={deletingId === row.id}
                        onClick={() => void handleDelete(row)}
                        className="inline-flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-950/40 disabled:opacity-40"
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
