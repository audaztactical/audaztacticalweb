import { useEffect, useState } from 'react'
import { Eye, Loader2, UserCheck, X } from 'lucide-react'
import {
  formatSystemAlertReceiptTime,
  subscribeSystemAlertReceipts,
  summarizeSystemAlertReceipts,
} from '../../lib/firestoreSystemAlertReceipts'

/**
 * @param {{
 *   open: boolean
 *   alertId: string
 *   title: string
 *   onClose: () => void
 * }} props
 */
export default function ManualAlertReceiptModal({ open, alertId, title, onClose }) {
  const [rows, setRows] = useState(/** @type {import('../../lib/firestoreSystemAlertReceipts').SystemAlertReceiptRecord[]} */ ([]))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !alertId) return undefined

    setLoading(true)
    const unsub = subscribeSystemAlertReceipts(
      alertId,
      (next) => {
        setRows(next)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [open, alertId])

  if (!open) return null

  const summary = summarizeSystemAlertReceipts(rows)

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-receipt-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl rounded-xl border border-white/15 bg-[#0a0b0d] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h3
              id="alert-receipt-title"
              className="font-display text-base font-bold uppercase tracking-wider text-accent"
            >
              Okuma durumu
            </h3>
            <p className="mt-1 text-sm text-app-text/70">{title}</p>
            <p className="mt-2 font-mono-technical text-[10px] text-app-text/45">
              {summary.seen} gördü · {summary.acked} onayladı
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-app-text/60 hover:border-white/25 hover:text-app-text"
            aria-label="Kapat"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[min(60vh,520px)] overflow-auto p-5">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-app-text/55">
              <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
              Okuma kayıtları yükleniyor…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-app-text/55">
              Bu yayın için henüz görüntüleme veya onay kaydı yok.
            </p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/55">
                <tr>
                  <th className="px-3 py-2">Operatör</th>
                  <th className="px-3 py-2">E-posta</th>
                  <th className="px-3 py-2">Görüldü</th>
                  <th className="px-3 py-2">Onaylandı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => {
                  const label = row.callsign || row.displayName || row.email || row.uid
                  return (
                    <tr key={row.id} className="text-app-text/85">
                      <td className="px-3 py-2.5 font-semibold">{label}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-app-text/55">
                        {row.email || '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.seenAt ? (
                          <span className="inline-flex items-center gap-1.5 text-sky-300/90">
                            <Eye className="size-3.5 shrink-0 opacity-70" aria-hidden />
                            {formatSystemAlertReceiptTime(row.seenAt)}
                          </span>
                        ) : (
                          <span className="text-app-text/35">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.acknowledgedAt ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
                            <UserCheck className="size-3.5 shrink-0 opacity-70" aria-hidden />
                            {formatSystemAlertReceiptTime(row.acknowledgedAt)}
                          </span>
                        ) : (
                          <span className="text-amber-400/70">Bekliyor</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
