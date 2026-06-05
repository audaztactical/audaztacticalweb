import { useEffect, useState } from 'react'
import TacticalPanel from '../ui/TacticalPanel'
import {
  ATTACHMENT_PRESETS,
  OPERATIONAL_STATUSES,
  buildWeaponMaintenanceLog,
  buildWeaponSpecs,
  getAttachmentLink,
  getOperationalStatus,
  getTechnicalDescription,
  getTacticalCategory,
  invStr,
  isWeaponCategory,
  stokKodu,
} from '../../lib/inventoryIlws'

const colScroll = 'op-detay-col-scroll min-h-0 overflow-y-auto overscroll-y-contain'
const selectClass =
  'dossier-blood-select w-full rounded border border-[#00FF41]/30 bg-[#0A0A0A] py-2 pl-2 pr-1 font-mono-technical text-sm text-white outline-none'

/**
 * @param {{
 *   row: Record<string, unknown> | null
 *   onClose: () => void
 *   onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>
 * }} props
 */
export default function IlwsInspectionTerminal({ row, onClose, onPatch }) {
  const [status, setStatus] = useState('AKTİF')
  const [attachment, setAttachment] = useState('YOK')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!row) return undefined
    setStatus(getOperationalStatus(row))
    setAttachment(getAttachmentLink(row))
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [row, onClose])

  if (!row) return null

  const id = String(row.id)
  const weapon = isWeaponCategory(row)
  const specs = buildWeaponSpecs(row)
  const maintLogs = buildWeaponMaintenanceLog(row)

  const persistField = async (patch) => {
    setBusy(true)
    try {
      await onPatch(id, patch)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-label="Kapat" onClick={onClose} />
      <TacticalPanel
        className="relative z-[1] w-full max-w-5xl overflow-hidden border-[#004DFF]/25 bg-[#0A0A0A]/98 p-0 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ilws-inspect-title"
      >
        <div className="flex max-h-[85vh] flex-col overflow-hidden">
          <div className="relative shrink-0 border-b border-white/10 bg-[#080808] px-4 py-3 pr-[7.5rem] sm:pr-28">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded border border-white/20 px-2 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-slate-400 transition hover:border-white/35 hover:text-white sm:right-4"
            >
              [ X_KAPAT ]
            </button>
            <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.32em] text-[#ffb400]/80">
              SİLAH İNCELEME TERMİNALİ
            </p>
            <p id="ilws-inspect-title" className="mt-0.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
              STOK_KODU: {stokKodu(id)} · {invStr(row.name)}
            </p>
          </div>

          <div className="grid min-h-0 max-h-[calc(85vh-4.5rem)] grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:h-[calc(85vh-4.5rem)]">
            <section className="flex min-h-0 max-h-[min(42vh,calc(85vh-4.5rem))] flex-col border-b border-white/10 md:max-h-full md:h-full md:border-b-0">
              <div className="shrink-0 border-b border-white/[0.06] px-3 py-2">
                <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/90">
                  TEKNİK_SPESİFİKASYON
                </p>
              </div>
              <div className={`${colScroll} max-h-[calc(85vh-8rem)] flex-1 px-3 py-3 md:max-h-none`}>
                <ul className="space-y-2 font-mono text-[11px] text-slate-300">
                  {specs.map((s) => (
                    <li key={s.key} className="flex gap-2 break-words border-b border-white/[0.06] pb-2">
                      <span className="shrink-0 text-slate-600">{s.key}:</span>
                      <span className="text-[#00FF41]/90">{s.value}</span>
                    </li>
                  ))}
                </ul>
                {!weapon ? (
                  <p className="mt-3 font-mono-technical text-[10px] text-slate-500">{getTechnicalDescription(row)}</p>
                ) : null}
                <p className="mb-2 mt-5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
                  SİLAH_BAKIM_GÜNLÜĞÜ
                </p>
                <ul className="space-y-2 font-mono text-[10px] leading-relaxed text-[#00FF41]">
                  {maintLogs.map((log, i) => (
                    <li key={`${log.date}-${i}`} className="break-words">
                      <span className="text-[#00FF41]/55">[{log.date}]</span> {log.text} · DURUM: {log.status}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <div className="hidden bg-white/10 md:block" aria-hidden />

            <section className={`${colScroll} min-h-0 min-w-0 max-h-[min(48vh,calc(85vh-4.5rem))] px-4 py-4 md:max-h-[calc(85vh-4.5rem)] md:h-full`}>
              <p className="mb-4 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#ffb400]/75">
                SİSTEM_KONTROLÜ
              </p>

              <label className="block">
                <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">DURUM</span>
                <select
                  className={`${selectClass} mt-1`}
                  value={status}
                  disabled={busy}
                  onChange={async (e) => {
                    const v = e.target.value
                    setStatus(v)
                    await persistField({ operationalStatus: v })
                  }}
                >
                  {OPERATIONAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  EKLENTİ_BAĞLA
                </span>
                <select
                  className={`${selectClass} mt-1`}
                  value={attachment}
                  disabled={busy}
                  onChange={async (e) => {
                    const v = e.target.value
                    setAttachment(v)
                    await persistField({ attachmentLink: v })
                  }}
                >
                  {ATTACHMENT_PRESETS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-5 rounded border border-white/[0.08] bg-black/45 p-3">
                <p className="font-mono-technical text-[8px] uppercase tracking-wider text-slate-600">KATEGORİ_KODU</p>
                <p className="mt-1 font-mono text-sm text-slate-200">{getTacticalCategory(row)}</p>
              </div>

              <div className="mt-4 min-h-[6rem] min-w-0 rounded border border-white/[0.08] bg-black/45 px-3 py-3">
                <p className="mb-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">
                  DEBRİFİNG / NOT
                </p>
                <pre className="max-w-full whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-300">
                  {getTechnicalDescription(row)}
                </pre>
              </div>
            </section>
          </div>
        </div>
      </TacticalPanel>
    </div>
  )
}
