import { useEffect, useState } from 'react'
import { Clock, Download, Eye, FileText, Loader2, ScrollText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import {
  downloadManualAlertBroadcastCsv,
  fetchAllManualAlertBroadcasts,
} from '../../lib/manualAlertBroadcastExport'
import { generateManualAlertBroadcastReportPdf } from '../../lib/manualAlertBroadcastReportPdf'
import {
  formatManualAlertBroadcastTime,
  migrateNewsFeedManualAlertsToArchive,
  purgeNonAdminBroadcastArchive,
  subscribeManualAlertBroadcasts,
} from '../../lib/firestoreManualAlertBroadcasts'
import ManualAlertReceiptModal from './ManualAlertReceiptModal'

const MIGRATION_FLAG = 'audaz_emergency_archive_migrated_v2'

/** @typedef {import('../../lib/firestoreManualAlertBroadcasts').ManualAlertBroadcastRecord} ManualAlertBroadcastRecord */

export default function ManualAlertBroadcastLog() {
  const { showAdminPanel } = useAuth()
  const [rows, setRows] = useState(/** @type {ManualAlertBroadcastRecord[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(/** @type {'pdf' | 'csv' | null} */ (null))
  const [receiptModal, setReceiptModal] = useState(/** @type {{ alertId: string; title: string } | null} */ (null))

  useEffect(() => {
    let cancelled = false

    if (showAdminPanel) {
      void (async () => {
        try {
          await purgeNonAdminBroadcastArchive()
          if (typeof window !== 'undefined' && !localStorage.getItem(MIGRATION_FLAG)) {
            const result = await migrateNewsFeedManualAlertsToArchive()
            if (result.removed > 0 || result.migrated > 0) {
              localStorage.setItem(MIGRATION_FLAG, '1')
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.warn('[ManualAlertBroadcastLog] arşiv bakımı', err)
        }
      })()
    }

    const unsub = subscribeManualAlertBroadcasts(
      (next) => {
        if (cancelled) return
        setRows(next)
        setLoading(false)
      },
      (err) => {
        if (cancelled) return
        emitFirebaseError(err)
        setLoading(false)
      },
      150,
    )

    const loadingTimeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 12000)

    return () => {
      cancelled = true
      window.clearTimeout(loadingTimeout)
      unsub()
    }
  }, [showAdminPanel])

  const handleExport = async (format) => {
    setExporting(format)
    try {
      const allRows = await fetchAllManualAlertBroadcasts()
      if (allRows.length === 0) {
        emitFirebaseError(new Error('Dışa aktarılacak kayıt yok.'))
        return
      }
      if (format === 'pdf') {
        await generateManualAlertBroadcastReportPdf(allRows)
      } else {
        downloadManualAlertBroadcastCsv(allRows)
      }
    } catch (err) {
      emitFirebaseError(err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 bg-black/30 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ScrollText className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
            <div>
              <h2 className="font-display text-base font-bold uppercase tracking-wider text-accent">
                İkaz yayın günlüğü
              </h2>
            <p className="mt-0.5 text-xs text-app-text/55">
              Yalnızca komuta merkezi (admin) manuel ikaz yayınları. Otomatik RSS haber ikazları burada değil.
            </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || exporting !== null}
              onClick={() => void handleExport('pdf')}
              className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent/20 disabled:opacity-50"
            >
              {exporting === 'pdf' ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <FileText className="size-3.5" aria-hidden />
              )}
              PDF rapor
            </button>
            <button
              type="button"
              disabled={loading || exporting !== null}
              onClick={() => void handleExport('csv')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wider text-app-text/80 hover:border-white/35 disabled:opacity-50"
            >
              {exporting === 'csv' ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="size-3.5" aria-hidden />
              )}
              CSV (tüm liste)
            </button>
          </div>
        </div>
      </div>

      <div className="p-5">
        {!loading && rows.length > 0 ? (
          <p className="mb-3 font-mono-technical text-[10px] text-app-text/45">
            Tabloda son {rows.length} kayıt gösteriliyor — rapor indirme tüm listeyi içerir.
          </p>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-app-text/55">
            <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
            Günlük yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-app-text/55">
            Henüz kayıtlı manuel ikaz yayını yok.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-black/40 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/55">
                <tr>
                  <th className="px-3 py-2.5">Yayın zamanı</th>
                  <th className="px-3 py-2.5">Başlık</th>
                  <th className="px-3 py-2.5">İçerik</th>
                  <th className="px-3 py-2.5">Yayınlayan</th>
                  <th className="px-3 py-2.5">Push</th>
                  <th className="px-3 py-2.5">Okuma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => (
                  <tr key={row.id} className="text-app-text/85 align-top">
                    <td className="px-3 py-2.5 font-mono text-xs text-accent/90 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5 shrink-0 opacity-60" aria-hidden />
                        {formatManualAlertBroadcastTime(row.publishedAt, row.publishedAtMs)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[10rem] font-semibold">{row.title}</td>
                    <td className="px-3 py-2.5 max-w-md whitespace-pre-wrap font-mono-technical text-xs text-app-text/75">
                      {row.message}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-app-text/55">
                      {row.publishedByEmail || row.publishedByUid || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider">
                      {row.fcmSent ? (
                        <span className="text-emerald-400">Gönderildi</span>
                      ) : (
                        <span className="text-app-text/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptModal({
                            alertId: row.systemAlertId || row.id,
                            title: row.title,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-app-text/75 hover:border-accent/40 hover:text-accent"
                      >
                        <Eye className="size-3.5" aria-hidden />
                        Kim gördü / okudu
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ManualAlertReceiptModal
        open={Boolean(receiptModal)}
        alertId={receiptModal?.alertId ?? ''}
        title={receiptModal?.title ?? ''}
        onClose={() => setReceiptModal(null)}
      />
    </section>
  )
}
