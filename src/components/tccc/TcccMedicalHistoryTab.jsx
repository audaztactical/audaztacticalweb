import { useMemo, useState } from 'react'
import { Archive, ChevronDown, ChevronUp } from 'lucide-react'

/** @param {unknown} v */
function toStr(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** @param {unknown} row */
function entrySortMs(row) {
  const u = row.updatedAt ?? row.createdAt ?? row.timestamp
  if (u && typeof u.toMillis === 'function') return u.toMillis()
  if (typeof u === 'string') {
    const t = Date.parse(u)
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}

/** @param {unknown} ts */
function formatTs(ts) {
  if (ts && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString('tr-TR')
  }
  const s = toStr(ts)
  if (!s) return '—'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('tr-TR')
}

/**
 * @param {{ cards: Record<string, unknown>[]; loading: boolean }} props
 */
export default function TcccMedicalHistoryTab({ cards, loading }) {
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))

  const sorted = useMemo(
    () => [...cards].sort((a, b) => entrySortMs(b) - entrySortMs(a)),
    [cards]
  )

  if (loading && sorted.length === 0) {
    return (
      <p className="py-12 text-center font-mono-technical text-[10px] uppercase text-slate-600">
        ARŞİV YÜKLENİYOR…
      </p>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-[#ffb400]/25 bg-black/40">
        <Archive className="size-12 text-[#ffb400]/30" aria-hidden />
        <p className="mt-3 font-mono-technical text-[10px] uppercase text-slate-600">
          KAYITLI YARALI KARTI YOK
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {sorted.map((row) => {
        const open = expandedId === row.id
        const march = row.march && typeof row.march === 'object' ? row.march : null
        return (
          <li
            key={row.id}
            className="rounded-xl border border-[#00FF41]/20 bg-black/50 font-mono-technical text-xs"
          >
            <button
              type="button"
              onClick={() => setExpandedId(open ? null : row.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-bold uppercase text-[#ffb400]">
                  {toStr(row.patientName || row.title) || 'YARALI'}
                </p>
                <p className="mt-0.5 text-[9px] text-slate-500">
                  {toStr(row.activeMarchStep)} · {toStr(row.evacPriority)} · {formatTs(row.timestamp ?? row.updatedAt)}
                </p>
              </div>
              {open ? (
                <ChevronUp className="size-4 shrink-0 text-slate-500" aria-hidden />
              ) : (
                <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden />
              )}
            </button>
            {open ? (
              <div className="border-t border-white/8 px-4 py-3 text-[10px] leading-relaxed text-slate-400">
                <p>
                  <span className="text-slate-600">MOI: </span>
                  {toStr(row.mechanismOfInjury) || '—'}
                </p>
                <p className="mt-2">
                  <span className="text-slate-600">Tedavi: </span>
                  {toStr(row.appliedTreatmentsNote) || '—'}
                </p>
                <p className="mt-2">
                  <span className="text-slate-600">Not: </span>
                  {toStr(row.operationNote) || '—'}
                </p>
                {march ? (
                  <pre className="mt-3 max-h-40 overflow-auto rounded border border-white/8 bg-black/60 p-2 text-[9px] text-[#00FF41]/80">
                    {JSON.stringify(march, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
