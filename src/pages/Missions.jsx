import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteField, Timestamp } from 'firebase/firestore'
import {
  Calendar,
  CheckCircle,
  Clock,
  Crosshair,
  LayoutGrid,
  Pencil,
  Plus,
  Shield,
  Target,
  X,
} from 'lucide-react'
import HudFluffDecor from '../components/dashboard/HudFluffDecor'
import TacticalPanel from '../components/ui/TacticalPanel'
import { MissionGridSkeleton } from '../components/ui/DataSkeleton'
import { useAuth } from '../context/AuthContext'
import { useAudazData } from '../hooks/useAudazData'

/** @param {unknown} v */
function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** @param {string} id */
function opKodu(id) {
  const raw = (id || 'XXXXX').replace(/-/g, '').slice(0, 5).toUpperCase()
  return `OP-${raw}`
}

const MISSION_TYPES = [
  { value: 'cqb', label: 'CQB' },
  { value: 'milsim', label: 'MİLSİM' },
  { value: 'sabotaj', label: 'SABOTAJ' },
  { value: 'real', label: 'Gerçek Görev' },
]

const OUTCOMES = [
  { value: 'success', label: 'Başarılı', tag: 'GÖREV_BAŞARILI', rgb: '#00FF41' },
  { value: 'partial', label: 'Kısmi', tag: 'KISMİ_BAŞARI', rgb: '#f59e0b' },
  { value: 'failure', label: 'Başarısız', tag: 'GÖREV_BAŞARISIZ', rgb: '#FF0000' },
  { value: 'planning', label: 'Planlama', tag: 'PLANLAMA', rgb: '#004DFF' },
]

/** @param {Record<string, unknown>} row */
function getMissionType(row) {
  const t = String(row.missionType || '').toLowerCase()
  if (['cqb', 'milsim', 'sabotaj', 'real'].includes(t)) return t
  return 'milsim'
}

/** @param {Record<string, unknown>} row */
function getOutcome(row) {
  const o = String(row.aarOutcome || '').toLowerCase()
  if (['success', 'partial', 'failure', 'planning'].includes(o)) return o
  const st = String(row.status || '').toLowerCase()
  if (st.includes('tamam') || st.includes('complete') || st.includes('done')) return 'success'
  if (st.includes('kısmi') || st.includes('partial')) return 'partial'
  if (st.includes('fail') || st.includes('iptal') || st.includes('başarısız')) return 'failure'
  if (st === 'active' || !st) return 'planning'
  return 'planning'
}

/** @param {Record<string, unknown>} row */
function getDebriefing(row) {
  const d = str(row.debriefingNotes).trim()
  if (d) return d
  return str(row.description).trim() || '—'
}

/** Firestore Timestamp | Date | unknown → ms */
function tsMillis(v) {
  if (v == null) return 0
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'object' && v !== null && typeof v.toMillis === 'function') {
    try {
      return v.toMillis()
    } catch {
      return 0
    }
  }
  return 0
}

/** Filtre / süre başlangıcı: startedAt → createdAt */
function getOperationStartMs(row) {
  const s = tsMillis(row.startedAt)
  if (s > 0) return s
  return tsMillis(row.createdAt)
}

/** @param {Record<string, unknown>} row — startedAt/endedAt; boşsa createdAt; ikisi de yoksa — */
function formatToplamSure(row) {
  const c = tsMillis(row.createdAt)
  const sa = tsMillis(row.startedAt)
  const ea = tsMillis(row.endedAt)
  if (sa <= 0 && ea <= 0) return '—'
  let start = sa > 0 ? sa : c
  let end = ea > 0 ? ea : c
  if (sa > 0 && ea <= 0) {
    const u = tsMillis(row.updatedAt)
    end = Math.max(u > 0 ? u : c, start)
  }
  const diff = end - start
  if (!Number.isFinite(diff) || diff <= 0) return '—'
  const totalHours = diff / 3600000
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24)
    const hours = Math.floor(totalHours % 24)
    return `${days}g ${hours}s`
  }
  const hours = Math.floor(totalHours)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}s ${minutes}dk`
}

/** datetime-local value (yerel) */
function toDatetimeLocalValue(v) {
  if (!v) return ''
  const ms = tsMillis(v)
  if (!ms) return ''
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** @param {string} ymd YYYY-MM-DD */
function parseLocalDayStart(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

/** @param {string} ymd */
function parseLocalDayEnd(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}

/** @param {Record<string, unknown>} row @param {string} from @param {string} to */
function rowInStartedDateRange(row, from, to) {
  const ms = getOperationStartMs(row)
  if (!ms) return false
  const lo = from ? parseLocalDayStart(from) : null
  const hi = to ? parseLocalDayEnd(to) : null
  if (lo != null && ms < lo) return false
  if (hi != null && ms > hi) return false
  return true
}

/** @param {unknown} hits @param {unknown} casualties */
function computeMEffectiveness(hits, casualties) {
  const h = Math.max(0, Math.floor(Number(hits) || 0))
  const c = Math.max(0, Math.floor(Number(casualties) || 0))
  if (h === 0 && c === 0) return '—'
  const factor = h / Math.max(0.5, c + 0.5)
  return (Math.round(factor * 10) / 10).toFixed(1)
}

function outcomeMeta(code) {
  return OUTCOMES.find((o) => o.value === code) ?? OUTCOMES[3]
}

function typeLabel(code) {
  return MISSION_TYPES.find((t) => t.value === code)?.label ?? code.toUpperCase()
}

/** @param {number} ms */
function formatDisplayDatetime(ms) {
  if (!ms || !Number.isFinite(ms)) return '—'
  try {
    return new Date(ms).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

/** Panel üst şeridi: sonuç etiketi @param {Record<string, unknown>} row */
function detailOutcomeStrip(row) {
  const oc = getOutcome(row)
  const meta = outcomeMeta(oc)
  const st = str(row.status).toLowerCase()
  if (oc === 'failure' || st.includes('iptal')) {
    return { tag: 'KRİTİK - GÖREV İPTAL', rgb: '#FF0000' }
  }
  if (oc === 'success') return { tag: 'GÖREV_BAŞARILI', rgb: meta.rgb }
  if (oc === 'partial') return { tag: 'KRİTİK - KISMİ_DURUM', rgb: meta.rgb }
  return { tag: meta.tag, rgb: meta.rgb }
}

/** Zaman çizelgesi: görünen başlangıç/bitiş ms @param {Record<string, unknown>} row */
function getTimelineStartMs(row) {
  const sa = tsMillis(row.startedAt)
  if (sa > 0) return sa
  return tsMillis(row.createdAt)
}

function getTimelineEndMs(row) {
  const ea = tsMillis(row.endedAt)
  if (ea > 0) return ea
  const sa = tsMillis(row.startedAt)
  if (sa > 0) {
    const u = tsMillis(row.updatedAt)
    return Math.max(u > 0 ? u : tsMillis(row.createdAt), sa)
  }
  return tsMillis(row.updatedAt) || tsMillis(row.createdAt)
}

/** @param {number} ms */
function formatLogClock(ms) {
  if (!ms || !Number.isFinite(ms)) return '00:00:00'
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** @typedef {{ clock: string, tag: string, msg: string }} AuditLine */

/** @param {Record<string, unknown>} row @returns {AuditLine[]} */
function buildOperationAuditTrail(row) {
  const t0 = getTimelineStartMs(row)
  const t1 = getTimelineEndMs(row)
  const span = Math.max(t1 - t0, 120000)
  const mEff = computeMEffectiveness(row.hitsCount, row.casualtiesCount)
  const mt = typeLabel(getMissionType(row))
  const region = str(row.terrainRegion).trim() || 'TANIMLANMADI'
  const oc = detailOutcomeStrip(row).tag

  /** @param {number} offsetMs @param {string} tag @param {string} msg */
  const line = (offsetMs, tag, msg) => ({
    clock: formatLogClock(t0 + offsetMs),
    tag,
    msg,
  })

  return [
    line(0, 'SYS', 'Dinamik Operasyon execution başlatıldı.'),
    line(1000, 'İSTAH', 'Görev verileri Firestore üzerinden çekildi.'),
    line(Math.floor(span * 0.12), 'SYS', `Harekat kodu atandı: ${opKodu(row.id)}.`),
    line(Math.floor(span * 0.28), 'ZAMAN', 'Operasyon zaman aralığı doğrulandı.'),
    line(Math.floor(span * 0.42), 'ARAZİ', `Bölge etiketi: ${region}.`),
    line(Math.floor(span * 0.55), 'KONSEPT', `Operasyon türü: ${mt}.`),
    line(Math.floor(span * 0.68), 'MHM', `Vuruş/zayiat matrisi yüklendi · H:${Math.floor(Number(row.hitsCount) || 0)} Z:${Math.floor(Number(row.casualtiesCount) || 0)}.`),
    line(Math.max(span - 60000, Math.floor(span * 0.82)), 'MHM', `Muharebe etkinlik skoru hesaplandı · M=${mEff}.`),
    line(Math.max(span - 30000, Math.floor(span * 0.92)), 'SONUÇ', `AAR durumu: ${oc}.`),
    line(span, 'SYS', 'Operasyon kaydı konsola aktarıldı.'),
  ]
}

const inputClass =
  'w-full border-0 border-b border-white/20 bg-transparent py-2 font-mono-technical text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-600 focus:border-[#00FF41]/55'
const selectClass = 'dossier-blood-select w-full rounded border border-[#00FF41]/30 py-2 pl-2 pr-1 font-mono-technical text-sm text-white outline-none'
const dateInputClass =
  'min-w-0 flex-1 border-0 border-b border-white/20 bg-transparent py-1 font-mono-technical text-[11px] text-slate-100 outline-none ring-0 focus:border-[#00FF41]/55 [color-scheme:dark]'

/** Split konsol sütun kaydırması — bağımsız dikey scroll */
const opDetayColScroll = 'op-detay-col-scroll min-h-0 overflow-y-auto overscroll-y-contain'

/** @param {{ active: boolean, onClick: () => void, icon: import('react').ReactNode, code: string }} p */
function FilterChip({ active, onClick, icon, code }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition ${
        active
          ? 'border-[#ffb400]/55 bg-[#ffb400]/15 text-[#ffb400]'
          : 'border-white/10 bg-black/30 text-slate-500 hover:border-white/20 hover:text-slate-300'
      }`}
    >
      <span className="opacity-90">{icon}</span>
      {code}
    </button>
  )
}

/**
 * @param {{
 *   open: boolean
 *   mode: 'create' | 'edit'
 *   initial: Record<string, unknown> | null
 *   onClose: () => void
 *   onSubmit: (payload: Record<string, unknown>) => Promise<void>
 *   busy: boolean
 * }} props
 */
function AarRecordModal({ open, mode, initial, onClose, onSubmit, busy }) {
  const [title, setTitle] = useState('')
  const [debrief, setDebrief] = useState('')
  const [missionType, setMissionType] = useState('milsim')
  const [aarOutcome, setAarOutcome] = useState('planning')
  const [hits, setHits] = useState('0')
  const [casualties, setCasualties] = useState('0')
  const [region, setRegion] = useState('')
  const [startedLocal, setStartedLocal] = useState('')
  const [endedLocal, setEndedLocal] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    setErr('')
    if (mode === 'edit' && initial) {
      setTitle(str(initial.title))
      setDebrief(str(initial.debriefingNotes) || str(initial.description))
      setMissionType(getMissionType(initial))
      setAarOutcome(getOutcome(initial))
      setHits(String(initial.hitsCount ?? 0))
      setCasualties(String(initial.casualtiesCount ?? 0))
      setRegion(str(initial.terrainRegion))
      setStartedLocal(toDatetimeLocalValue(initial.startedAt))
      setEndedLocal(toDatetimeLocalValue(initial.endedAt))
    } else {
      setTitle('')
      setDebrief('')
      setMissionType('milsim')
      setAarOutcome('planning')
      setHits('0')
      setCasualties('0')
      setRegion('')
      setStartedLocal('')
      setEndedLocal('')
    }
  }, [open, mode, initial])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      setErr('OP_ADI zorunlu.')
      return
    }
    const parseDt = (s) => {
      const d = new Date(String(s).trim())
      return Number.isNaN(d.getTime()) ? null : d.getTime()
    }
    const sm = startedLocal.trim() ? parseDt(startedLocal) : null
    const em = endedLocal.trim() ? parseDt(endedLocal) : null
    if (sm != null && em != null && em < sm) {
      setErr('[ HATA: GEÇERSİZ_ZAMAN_ARALIĞI ]')
      return
    }
    setErr('')
    /** @type {Record<string, unknown>} */
    const payload = {
      title: t,
      debriefingNotes: debrief.trim(),
      description: debrief.trim(),
      missionType,
      aarOutcome,
      hitsCount: Math.max(0, Math.floor(Number(hits) || 0)),
      casualtiesCount: Math.max(0, Math.floor(Number(casualties) || 0)),
      terrainRegion: region.trim(),
      visibility: 'private',
    }
    if (sm != null) payload.startedAt = Timestamp.fromDate(new Date(sm))
    else if (mode === 'edit') payload.startedAt = deleteField()
    if (em != null) payload.endedAt = Timestamp.fromDate(new Date(em))
    else if (mode === 'edit') payload.endedAt = deleteField()
    await onSubmit(payload)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aar-modal-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Kapat" onClick={onClose} />
      <TacticalPanel className="relative z-[1] w-full max-w-lg border-[#004DFF]/25 bg-[#0c0c0e]/98 p-0 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#080808] px-3 py-2 sm:px-4">
          <p id="aar-modal-title" className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-[#ffb400]/90">
            {mode === 'edit' ? 'AAR_DÜZENLE · KAYIT_TERMINALİ' : 'YENİ_AAR · KAYIT_TERMINALİ'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/15 p-1 text-slate-400 hover:text-white"
            aria-label="Kapat"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">OP_ADI</span>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ÖRN: GECE_SIZMA_07" />
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">DEBRİFİNG_NOTLARI</span>
            <textarea
              className={`${inputClass} min-h-[4.5rem] resize-y border border-white/10 bg-black/30 px-2 py-2`}
              value={debrief}
              onChange={(e) => setDebrief(e.target.value)}
              placeholder="Kısa operasyon özeti…"
              rows={3}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">GÖREV_TÜRÜ</span>
              <select className={`${selectClass} mt-1`} value={missionType} onChange={(e) => setMissionType(e.target.value)}>
                {MISSION_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">GÖREV_SONUCU</span>
              <select className={`${selectClass} mt-1`} value={aarOutcome} onChange={(e) => setAarOutcome(e.target.value)}>
                {OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">VURMA_SAYISI</span>
              <input className={inputClass} inputMode="numeric" value={hits} onChange={(e) => setHits(e.target.value)} />
            </label>
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">ZAYİAT_SAYISI</span>
              <input className={inputClass} inputMode="numeric" value={casualties} onChange={(e) => setCasualties(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">ARAZİ_BÖLGESİ</span>
            <input className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="ÖRN: KUZey_ORMAN_IZ" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">BAŞLANGIÇ_TARİHİ (startedAt)</span>
              <input
                type="datetime-local"
                className={`${inputClass} mt-0.5 rounded border border-white/10 bg-black/25 px-2`}
                value={startedLocal}
                onChange={(e) => setStartedLocal(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">BİTİŞ_TARİHİ (endedAt)</span>
              <input
                type="datetime-local"
                className={`${inputClass} mt-0.5 rounded border border-white/10 bg-black/25 px-2`}
                value={endedLocal}
                min={startedLocal || undefined}
                onChange={(e) => setEndedLocal(e.target.value)}
              />
            </label>
          </div>
          {err ? <p className="font-mono-technical text-[10px] text-red-400/95">{err}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/15 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:bg-white/5"
            >
              İPTAL
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded border border-[#ffb400]/45 bg-[#ffb400]/12 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#ffb400] disabled:opacity-50"
            >
              {busy ? '…' : mode === 'edit' ? 'GÜNCELLE' : 'KAYDET'}
            </button>
          </div>
        </form>
      </TacticalPanel>
    </div>
  )
}

/**
 * MÜŞTEREK HAREKAT KONSOLU — ortalanmış iki bölmeli operasyon terminali
 * @param {{
 *   row: Record<string, unknown> | null
 *   onClose: () => void
 *   onEdit: (row: Record<string, unknown>) => void
 * }} props
 */
function OpDetayKonsolu({ row, onClose, onEdit }) {
  const auditLines = useMemo(() => (row ? buildOperationAuditTrail(row) : []), [row])

  useEffect(() => {
    if (!row) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [row, onClose])

  if (!row) return null

  const strip = detailOutcomeStrip(row)
  const mt = getMissionType(row)
  const hits = Math.max(0, Math.floor(Number(row.hitsCount) || 0))
  const cas = Math.max(0, Math.floor(Number(row.casualtiesCount) || 0))
  const mEff = computeMEffectiveness(row.hitsCount, row.casualtiesCount)
  const tStart = getTimelineStartMs(row)
  const tEnd = getTimelineEndMs(row)
  const debrief = getDebriefing(row)

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        aria-label="Paneli kapat"
        onClick={onClose}
      />
      <TacticalPanel
        className="relative z-[1] w-full max-w-5xl overflow-hidden border-[#004DFF]/25 bg-[#0A0A0A]/98 p-0 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="op-detay-title"
      >
        <div className="flex max-h-[90vh] flex-col overflow-hidden">
        <div className="relative shrink-0 border-b border-white/10 bg-[#080808] px-4 py-3 pr-[7.5rem] sm:pr-28">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded border border-white/20 px-2 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-slate-400 transition hover:border-white/35 hover:text-white sm:right-4"
          >
            [ X_KAPAT ]
          </button>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.32em] text-[#ffb400]/80">
                MÜŞTEREK HAREKAT KONSOLU
              </p>
              <p id="op-detay-title" className="font-mono-technical text-[10px] font-bold uppercase leading-tight tracking-[0.12em] text-slate-300">
                [ HAREKAT_KODU: {opKodu(row.id)} ]
              </p>
              <p className="font-display text-lg font-bold tracking-wide text-white">{str(row.title) || '—'}</p>
            </div>
            <span
              className="mt-1 shrink-0 rounded border px-2 py-1 font-mono-technical text-[8px] font-bold uppercase leading-tight tracking-wide"
              style={{ borderColor: `${strip.rgb}88`, color: strip.rgb, boxShadow: `0 0 14px ${strip.rgb}40` }}
            >
              {strip.tag}
            </span>
          </div>
        </div>

        <div className="grid min-h-0 max-h-[calc(90vh-5.25rem)] grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,0.95fr)_1px_minmax(0,1.35fr)] md:h-[calc(90vh-5.25rem)]">
          <section className="flex min-h-0 min-w-0 max-h-[min(42vh,calc(90vh-5.25rem))] flex-col border-b border-white/10 bg-black/50 md:max-h-full md:h-full md:border-b-0">
            <div className="shrink-0 border-b border-white/[0.06] px-3 py-2">
              <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/90">
                DİNAMİK OPERASYON KAYDI
              </p>
              <p className="mt-0.5 font-mono-technical text-[7px] uppercase tracking-wider text-slate-600">Operation Audit Trail</p>
            </div>
            <div className={`${opDetayColScroll} min-h-0 flex-1 px-3 py-3`}>
              <ul className="space-y-2 font-mono text-[10px] leading-relaxed text-[#00FF41]">
                {auditLines.map((entry, i) => (
                  <li key={`${entry.clock}-${entry.tag}-${i}`} className="break-words">
                    <span className="text-[#00FF41]/55">[{entry.clock}]</span>{' '}
                    <span className="text-[#00FF41]/75">[{entry.tag}]</span>{' '}
                    <span>{entry.msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="hidden bg-white/10 md:block" aria-hidden />

          <section className={`${opDetayColScroll} min-h-0 min-w-0 max-h-[min(48vh,calc(90vh-5.25rem))] px-4 py-4 md:max-h-[calc(90vh-5.25rem)] md:h-full`}>
            <p className="mb-3 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#ffb400]/75">
              OPERASYONEL ANALİTİK
            </p>
            <p className="mb-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">ZAMAN_ÇİZELGESİ</p>
          <div className="grid min-w-0 grid-cols-1 gap-3 border border-white/[0.08] bg-black/40 p-3 sm:grid-cols-3">
            <div className="flex min-w-0 items-start gap-2">
              <Calendar className="mt-0.5 size-4 shrink-0 text-slate-500" strokeWidth={1.25} aria-hidden />
              <div className="min-w-0">
                <p className="font-mono-technical text-[7px] font-bold uppercase tracking-wider text-slate-600">BAŞLANGIÇ</p>
                <p className="break-words font-mono text-[11px] leading-tight text-slate-200">{formatDisplayDatetime(tStart)}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <Calendar className="mt-0.5 size-4 shrink-0 text-slate-500" strokeWidth={1.25} aria-hidden />
              <div className="min-w-0">
                <p className="font-mono-technical text-[7px] font-bold uppercase tracking-wider text-slate-600">BİTİŞ</p>
                <p className="break-words font-mono text-[11px] leading-tight text-slate-200">{formatDisplayDatetime(tEnd)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-slate-500" strokeWidth={1.25} aria-hidden />
              <div className="min-w-0">
                <p className="font-mono-technical text-[7px] font-bold uppercase tracking-wider text-slate-600">TOPLAM_SÜRE</p>
                <p className="font-mono text-[11px] leading-tight text-[#00FF41]/90">{formatToplamSure(row)}</p>
              </div>
            </div>
          </div>

          <p className="mb-2 mt-5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">MUHAREBE_ANALİTİĞİ</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-white/10 bg-black/50 px-3 py-3">
              <p className="font-mono-technical text-[7px] font-bold uppercase tracking-wider text-slate-600">VURMA_SAYISI (HITS)</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">{hits}</p>
            </div>
            <div className="rounded border border-white/10 bg-black/50 px-3 py-3">
              <p className="font-mono-technical text-[7px] font-bold uppercase tracking-wider text-slate-600">ZAYİAT_DURUMU (CASUALTIES)</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">{cas}</p>
            </div>
          </div>
          <div className="mt-4 rounded border border-[#00FF41]/25 bg-[#00FF41]/5 px-4 py-4 text-center">
            <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">MUHAREBE_ETKİNLİĞİ (M_ETKİNLİK)</p>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-[#00FF41] drop-shadow-[0_0_18px_rgba(0,255,65,0.45)]">
              {mEff}
            </p>
          </div>

          <p className="mb-2 mt-5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">ARAZİ_VE_KONSEPT</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded border border-white/15 bg-white/[0.04] px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wide text-slate-400">
              ARAZİ: {str(row.terrainRegion).trim() || '—'}
            </span>
            <span className="rounded border border-[#004DFF]/35 bg-[#004DFF]/10 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wide text-[#7ab4ff]">
              OPERASYON_TÜRÜ: {typeLabel(mt)}
            </span>
          </div>

          <p className="mb-2 mt-5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">DEBRİFİNG_GÜNLÜĞÜ</p>
          <div className="min-h-[6rem] min-w-0 rounded border border-white/[0.08] bg-black/45 px-3 py-3">
            <pre className="max-w-full whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-300">
              {debrief}
            </pre>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="w-full rounded border border-[#ffb400]/45 bg-[#ffb400]/10 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffb400] transition hover:bg-[#ffb400]/18"
            >
              [ GÖREVİ_DÜZENLE ]
            </button>
          </div>
          </section>
        </div>
        </div>
      </TacticalPanel>
    </div>
  )
}

/** @param {Record<string, unknown>} row */
function AarCard({ row, onEdit, onOpenDetail }) {
  const oc = getOutcome(row)
  const meta = outcomeMeta(oc)
  const mt = getMissionType(row)
  const mEff = computeMEffectiveness(row.hitsCount, row.casualtiesCount)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(row)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetail(row)
        }
      }}
      className="relative flex cursor-pointer flex-col gap-2 rounded-lg border border-white/10 bg-black/35 p-3 pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/18 hover:bg-black/40"
    >
      <div className="flex items-start justify-between gap-2 pr-7">
        <span className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{opKodu(row.id)}</span>
        <div className="flex shrink-0 items-start gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(row)
            }}
            className="rounded border border-white/10 p-0.5 text-slate-500 hover:border-[#ffb400]/35 hover:text-[#ffb400]"
            aria-label="Düzenle"
          >
            <Pencil className="size-3" strokeWidth={1.5} />
          </button>
          <span
            className="max-w-[10rem] rounded border px-1.5 py-0.5 text-center font-mono-technical text-[7px] font-bold uppercase leading-tight tracking-wide"
            style={{ borderColor: `${meta.rgb}66`, color: meta.rgb, boxShadow: `0 0 10px ${meta.rgb}33` }}
          >
            [ {meta.tag} ]
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-base font-bold leading-tight tracking-wide text-white sm:text-lg">{str(row.title) || '—'}</h2>
        <p className="mt-1 line-clamp-3 font-mono-technical text-[10px] leading-snug text-slate-500">{getDebriefing(row)}</p>
      </div>
      <div className="flex flex-col gap-1 border-t border-white/[0.08] pt-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono-technical text-[8px] uppercase tracking-wide text-slate-600">
          <span>
            TÜR: <span className="text-slate-300">{typeLabel(mt)}</span>
          </span>
          <span>
            BÖLGE: <span className="text-slate-300">{str(row.terrainRegion) || '—'}</span>
          </span>
          <span>
            M_ETKİNLİK: <span className="tabular-nums text-[#00FF41]/90">{mEff}</span>
          </span>
        </div>
        <p className="font-mono text-[8px] uppercase tracking-wide text-slate-600">
          SÜRE: <span className="text-[9px] normal-case tracking-normal text-slate-300">{formatToplamSure(row)}</span>
        </p>
      </div>
    </article>
  )
}

export default function Missions() {
  const { user } = useAuth()
  const { items, loading, ready, listenError, addItem, updateItem } = useAudazData('missions')
  const [strip, setStrip] = useState(/** @type {'all' | 'milsim' | 'cqb' | 'success'} */ ('all'))
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState(/** @type {'create' | 'edit'} */ ('create'))
  const [editRow, setEditRow] = useState(/** @type {Record<string, unknown> | null} */ (null))
  const [saveBusy, setSaveBusy] = useState(false)
  const [detailRow, setDetailRow] = useState(/** @type {Record<string, unknown> | null} */ (null))

  const filterDateInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo)

  const filtered = useMemo(() => {
    const useDate = !filterDateInvalid && (Boolean(dateFrom) || Boolean(dateTo))
    return items.filter((row) => {
      let ok = true
      if (strip === 'milsim') ok = getMissionType(row) === 'milsim'
      else if (strip === 'cqb') ok = getMissionType(row) === 'cqb'
      else if (strip === 'success') ok = getOutcome(row) === 'success'
      else if (strip !== 'all') ok = true
      if (!ok) return false
      if (useDate) return rowInStartedDateRange(row, dateFrom, dateTo)
      return true
    })
  }, [items, strip, dateFrom, dateTo, filterDateInvalid])

  const detailLiveRow = useMemo(() => {
    if (!detailRow?.id) return null
    return items.find((r) => r.id === detailRow.id) ?? detailRow
  }, [items, detailRow])

  const openCreate = useCallback(() => {
    setEditRow(null)
    setModalMode('create')
    setModalOpen(true)
  }, [])

  const openDetail = useCallback((row) => {
    setDetailRow(row)
  }, [])

  const closeDetail = useCallback(() => {
    setDetailRow(null)
  }, [])

  const openEditFromDetail = useCallback(
    (row) => {
      setDetailRow(null)
      setEditRow(row)
      setModalMode('edit')
      setModalOpen(true)
    },
    []
  )

  const openEdit = useCallback((row) => {
    setEditRow(row)
    setModalMode('edit')
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    if (saveBusy) return
    setModalOpen(false)
    setEditRow(null)
  }, [saveBusy])

  const handleSubmit = useCallback(
    async (payload) => {
      if (!user?.uid) return
      setSaveBusy(true)
      try {
        if (modalMode === 'edit' && editRow?.id) {
          await updateItem(String(editRow.id), payload)
        } else {
          await addItem(payload)
        }
        setModalOpen(false)
        setEditRow(null)
      } catch {
        /* FirebaseErrorContext */
      } finally {
        setSaveBusy(false)
      }
    },
    [addItem, updateItem, user?.uid, modalMode, editRow]
  )

  return (
    <div className="missions-aar-shell relative mx-auto max-w-[1480px] px-3 py-5 pt-12 sm:px-4 sm:pt-14 md:px-6">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <HudFluffDecor />
      </div>

      <div className="relative z-[2] space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ffb400]/85">[ OPERASYON_GÜNLÜĞÜ ]</p>
            <h1 className="font-display mt-1 text-lg font-bold tracking-[0.1em] text-white sm:text-xl">AAR TERMINAL</h1>
            <p className="mt-0.5 max-w-xl font-mono-technical text-[9px] leading-snug text-slate-500">
              Airsoft / CQB / milsim ve gerçek operasyon kayıtları · görev sonu raporu (AAR)
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded border border-[#ffb400]/45 bg-[#ffb400]/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#ffb400] shadow-[0_0_14px_-4px_rgba(255,180,0,0.35)] hover:bg-[#ffb400]/18"
          >
            <Plus className="size-3.5" strokeWidth={2} aria-hidden />+ YENİ_RAPOR_GİR
          </button>
        </div>

        <TacticalPanel className="border-[#004DFF]/20 bg-[#0c0c0e]/96 p-0 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-[#080808] px-3 py-2 sm:px-4">
            <span className="mr-1 font-mono-technical text-[8px] uppercase tracking-widest text-slate-600">FİLTRE</span>
            <FilterChip
              active={strip === 'all'}
              onClick={() => setStrip('all')}
              icon={<LayoutGrid className="size-3.5" strokeWidth={1.5} />}
              code="TÜR: TÜMÜ"
            />
            <FilterChip
              active={strip === 'milsim'}
              onClick={() => setStrip('milsim')}
              icon={<Shield className="size-3.5" strokeWidth={1.5} />}
              code="TÜR: MİLSİM"
            />
            <FilterChip
              active={strip === 'cqb'}
              onClick={() => setStrip('cqb')}
              icon={<Crosshair className="size-3.5" strokeWidth={1.5} />}
              code="TÜR: CQB"
            />
            <FilterChip
              active={strip === 'success'}
              onClick={() => setStrip('success')}
              icon={<CheckCircle className="size-3.5" strokeWidth={1.5} />}
              code="SONUÇ: BAŞARILI"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3 border-b border-white/10 bg-[#060606] px-3 py-2 sm:px-4">
            <label className="flex min-w-[8.5rem] flex-1 items-end gap-2 sm:min-w-0 sm:max-w-[11rem]">
              <span className="shrink-0 pb-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-slate-600">BAŞ_TAR:</span>
              <input type="date" className={dateInputClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="flex min-w-[8.5rem] flex-1 items-end gap-2 sm:min-w-0 sm:max-w-[11rem]">
              <span className="shrink-0 pb-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-slate-600">BİT_TAR:</span>
              <input type="date" className={dateInputClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
            <button
              type="button"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
              className="shrink-0 rounded border border-white/15 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-slate-500 hover:border-[#ffb400]/35 hover:text-[#ffb400]"
            >
              [ TEMİZLE ]
            </button>
            {filterDateInvalid ? (
              <p className="w-full font-mono-technical text-[10px] text-red-400/95 sm:ml-auto sm:w-auto">[ HATA: GEÇERSİZ_ZAMAN_ARALIĞI ]</p>
            ) : null}
          </div>

          <div className="p-3 sm:p-4">
            {listenError ? (
              <p className="mb-2 font-mono-technical text-[10px] text-amber-400/90">VERİ_KANALI_UYARISI · YENİDEN_DENE</p>
            ) : null}
            {!ready ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <span className="size-8 animate-spin rounded-full border-2 border-[#ffb400] border-t-transparent" aria-hidden />
              </div>
            ) : loading ? (
              <MissionGridSkeleton n={4} />
            ) : filtered.length === 0 ? (
              <div className="flex min-h-[32vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/12 bg-black/30 py-12">
                <Target className="size-12 text-slate-700" strokeWidth={1} aria-hidden />
                <p className="font-mono-technical text-[10px] uppercase tracking-widest text-slate-600">KAYIT_YOK · FİLTRE_VEYA_YENİ_RAPOR</p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded border border-[#ffb400]/40 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase text-[#ffb400]"
                >
                  + YENİ_RAPOR
                </button>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((row) => (
                  <AarCard key={row.id} row={row} onEdit={openEdit} onOpenDetail={openDetail} />
                ))}
              </div>
            )}
          </div>
        </TacticalPanel>
      </div>

      <OpDetayKonsolu row={detailLiveRow} onClose={closeDetail} onEdit={openEditFromDetail} />

      <AarRecordModal
        open={modalOpen}
        mode={modalMode}
        initial={editRow}
        onClose={closeModal}
        onSubmit={handleSubmit}
        busy={saveBusy}
      />
    </div>
  )
}
