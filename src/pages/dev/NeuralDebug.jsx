import { useMemo, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { useAuth } from '../../context/AuthContext'
import { getAudazFunctions } from '../../lib/cloudFunctions'
import { computeORS } from '../../lib/orsEngine'
import { REGIONS, REGION_IDS, NEURAL_SOURCES } from '../../lib/neural/neuralConfig'
import {
  docFieldNames,
  normalizeEvent,
} from '../../lib/neural/neuralEngine'
import { useAudazData } from '../../hooks/useAudazData'
import { NEURAL_READ_LIMIT, useNeuralState } from '../../hooks/useNeuralState'

const DAY_MS = 86_400_000

/**
 * @param {unknown} raw
 */
function summarizeBackfillResult(raw) {
  const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {})
  const levels = r.levels && typeof r.levels === 'object' ? r.levels : {}
  return {
    dryRun: r.dryRun === true,
    eventCount: Number(r.eventCount) || 0,
    totalLevel: Number(r.totalLevel) || 0,
    streak: Number(r.streak) || 0,
    bySource: r.bySource && typeof r.bySource === 'object' ? r.bySource : {},
    levels,
  }
}

export default function NeuralDebug() {
  const { user, userData, isAdmin } = useAuth()
  const uid = user?.uid ?? null
  const [nowOffsetDays, setNowOffsetDays] = useState(0)
  const nowMs = Date.now() + nowOffsetDays * DAY_MS
  const [backfillBusy, setBackfillBusy] = useState(false)
  const [backfillConfirmWrite, setBackfillConfirmWrite] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState(/** @type {string|null} */ (null))
  const [backfillErr, setBackfillErr] = useState(/** @type {string|null} */ (null))

  const {
    state: neural,
    clientState,
    serverState,
    serverStored,
    source: neuralSource,
    events,
    ignored,
    stats,
    loading,
    error,
    refresh,
    truncateWarn,
    sources,
  } = useNeuralState({ nowMs })

  const inventory = useAudazData('inventory')
  const health = useAudazData('health_records')

  const legacyMatched = useMemo(() => {
    const out = []
    for (const doc of (sources.range || []).slice(0, NEURAL_READ_LIMIT)) {
      const kind = String(doc.kind ?? '')
      const cat = String(doc.operationCategory ?? '')
      if (kind || cat) continue
      const { event } = normalizeEvent(NEURAL_SOURCES.RANGE_LOGS, doc)
      if (event?.legacy) {
        out.push({ type: event.type, fieldNames: docFieldNames(doc) })
      }
    }
    return out
  }, [sources.range])

  const ignoredSummary = useMemo(() => {
    /** @type {Map<string, { count: number; fieldNameSets: string[][] }>} */
    const map = new Map()
    for (const ig of ignored) {
      const key = `${ig.source} | ${ig.reason} | kind=${ig.kind ?? '—'} | cat=${ig.operationCategory ?? '—'} | mode=${ig.mode ?? '—'}`
      const cur = map.get(key) ?? { count: 0, fieldNameSets: [] }
      cur.count += 1
      if (ig.fieldNames?.length) {
        const sig = ig.fieldNames.join(',')
        if (!cur.fieldNameSets.some((s) => s.join(',') === sig)) {
          cur.fieldNameSets.push(ig.fieldNames)
        }
      }
      map.set(key, cur)
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count)
  }, [ignored])

  const ors = useMemo(() => {
    return computeORS({
      inventory: inventory.items,
      trainings: sources.trainings,
      rangeLogs: sources.range,
      observedEvalLogs: [...sources.vbss, ...sources.tccc],
      health: health.items,
      nowMs: Date.now(),
    })
  }, [inventory.items, sources.trainings, sources.range, sources.vbss, sources.tccc, health.items])

  const recentLog = useMemo(() => [...neural.eventLog].reverse().slice(0, 50), [neural.eventLog])

  /**
   * @param {boolean} dryRun
   */
  async function runBackfill(dryRun) {
    if (!uid || !isAdmin || backfillBusy) return
    setBackfillBusy(true)
    setBackfillErr(null)
    setBackfillMsg(null)
    try {
      const functions = getAudazFunctions()
      if (!functions) throw new Error('Firebase Functions yok')
      const fn = httpsCallable(functions, 'neuralBackfillUser')
      const res = await fn({ uid, dryRun })
      const s = summarizeBackfillResult(res.data)
      const levelParts = Object.entries(s.levels)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')
      const srcParts = Object.entries(s.bySource)
        .map(([k, v]) => `${k}=${v}`)
        .join(' · ')
      setBackfillMsg(
        [
          s.dryRun ? 'DRY-RUN' : 'YAZILDI',
          `eventCount=${s.eventCount}`,
          `totalLevel=${s.totalLevel}`,
          `streak=${s.streak}`,
          levelParts ? `levels ${levelParts}` : null,
          srcParts ? `bySource ${srcParts}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      )
      setBackfillConfirmWrite(false)
      if (!dryRun) refresh()
    } catch (err) {
      const code = String(/** @type {{ code?: string }} */ (err)?.code ?? '')
      const message = String(/** @type {{ message?: string }} */ (err)?.message ?? err ?? '')
      setBackfillErr([code, message].filter(Boolean).join(' — ') || 'Backfill hatası')
    } finally {
      setBackfillBusy(false)
    }
  }

  if (!uid) {
    return (
      <div className="p-6 font-mono-technical text-sm text-slate-400">
        Operatör Beyni debug — oturum gerekli.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-16 text-slate-200 sm:p-6">
      <header className="border-b border-white/10 pb-4">
        <p className="font-mono-technical text-[10px] uppercase tracking-[0.3em] text-[#ffb400]">
          DEV ONLY · /dev/operator-beyni
        </p>
        <h1 className="font-display mt-2 text-2xl font-bold text-white">Operatör Beyni — Debug</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kaynak:{' '}
          <span className={neuralSource === 'server' ? 'text-emerald-400' : 'text-orange-300'}>
            {neuralSource}
          </span>
          {serverStored ? ` · eventCount ${serverStored.eventCount ?? '—'}` : ' · state yok (client-fallback)'}
          {' · '}
          callsign <span className="text-slate-400">{userData?.callsign ? '•' : '—'}</span>
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          className="mt-2 rounded border border-white/15 px-3 py-1 font-mono-technical text-xs text-slate-400 hover:bg-white/5"
        >
          Yenile
        </button>
      </header>

      {isAdmin ? (
        <section className="rounded-lg border border-[#ffb400]/25 bg-[#ffb400]/5 p-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[#d4af37]">
            Admin · neuralBackfillUser
          </h2>
          <p className="mt-1 font-mono-technical text-[11px] text-slate-500">
            Oturumdaki uid için callable · önce deneme, sonra yaz (canlı Firestore).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={backfillBusy}
              onClick={() => void runBackfill(true)}
              className="rounded border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 font-mono-technical text-xs text-sky-200 hover:bg-sky-900/50 disabled:opacity-40"
            >
              Backfill — deneme (dry-run)
            </button>
            {!backfillConfirmWrite ? (
              <button
                type="button"
                disabled={backfillBusy}
                onClick={() => {
                  setBackfillConfirmWrite(true)
                  setBackfillErr(null)
                }}
                className="rounded border border-orange-500/40 bg-orange-950/40 px-3 py-1.5 font-mono-technical text-xs text-orange-200 hover:bg-orange-900/50 disabled:opacity-40"
              >
                Backfill — yaz
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded border border-orange-500/50 bg-black/50 px-3 py-2">
                <span className="font-mono-technical text-[11px] text-orange-200">
                  Canlı yazma onaylansın mı? (neural_events + neural/state)
                </span>
                <button
                  type="button"
                  disabled={backfillBusy}
                  onClick={() => void runBackfill(false)}
                  className="rounded border border-red-500/50 bg-red-950/60 px-3 py-1 font-mono-technical text-xs text-red-100 hover:bg-red-900/60 disabled:opacity-40"
                >
                  Evet, yaz
                </button>
                <button
                  type="button"
                  disabled={backfillBusy}
                  onClick={() => setBackfillConfirmWrite(false)}
                  className="rounded border border-white/15 px-3 py-1 font-mono-technical text-xs text-slate-400 hover:bg-white/5 disabled:opacity-40"
                >
                  İptal
                </button>
              </div>
            )}
          </div>
          {backfillBusy ? (
            <p className="mt-2 font-mono-technical text-xs text-slate-500">Backfill çalışıyor…</p>
          ) : null}
          {backfillMsg ? (
            <p className="mt-2 break-all font-mono-technical text-[11px] text-emerald-300/90">{backfillMsg}</p>
          ) : null}
          {backfillErr ? (
            <p className="mt-2 break-all font-mono-technical text-[11px] text-red-300">{backfillErr}</p>
          ) : null}
        </section>
      ) : null}

      {truncateWarn.length > 0 ? (
        <p className="rounded-lg border border-orange-500/40 bg-orange-950/30 px-3 py-2 font-mono-technical text-xs text-orange-200">
          Limit ({NEURAL_READ_LIMIT}) aşıldı / sınırda: {truncateWarn.join(', ')}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 font-mono-technical text-xs text-red-200">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="font-mono-technical text-xs text-slate-500">Veriler yükleniyor…</p>
      ) : null}

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[#d4af37]">
          Sunucu vs istemci
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 font-mono-technical text-[10px] uppercase text-slate-500">
                <th className="px-2 py-2">Bölge</th>
                <th className="px-2 py-2">Srv base</th>
                <th className="px-2 py-2">Srv peak</th>
                <th className="px-2 py-2">Cli xp</th>
                <th className="px-2 py-2">Cli peak</th>
                <th className="px-2 py-2">Δ base</th>
              </tr>
            </thead>
            <tbody>
              {REGION_IDS.map((id) => {
                const srvB = Number(serverStored?.regions?.[id]?.base ?? NaN)
                const srvP = Number(serverStored?.regions?.[id]?.peak ?? NaN)
                const cliB = Number(clientState?.regions?.[id]?.xp ?? 0)
                const cliP = Number(clientState?.regions?.[id]?.peak ?? 0)
                const delta = Number.isFinite(srvB) ? srvB - cliB : null
                const mismatch = delta != null && Math.abs(delta) > 0.05
                return (
                  <tr
                    key={id}
                    className={[
                      'border-b border-white/5 font-mono-technical',
                      mismatch ? 'bg-red-950/40 text-red-200' : '',
                    ].join(' ')}
                  >
                    <td className="px-2 py-1.5">{REGIONS[id]?.nameTr ?? id}</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {Number.isFinite(srvB) ? srvB.toFixed(1) : '—'}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {Number.isFinite(srvP) ? srvP.toFixed(1) : '—'}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{cliB.toFixed(1)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{cliP.toFixed(1)}</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {delta == null ? '—' : delta.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono-technical text-[10px] text-slate-600">
          Sunucu view totalLevel: {serverState?.totalLevel ?? '—'} · istemci:{' '}
          {clientState?.totalLevel ?? '—'}
        </p>
      </section>

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[#d4af37]">
          Kaynak özeti
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 font-mono-technical text-[10px] uppercase text-slate-500">
                <th className="px-2 py-2">Kaynak</th>
                <th className="px-2 py-2">Okunan</th>
                <th className="px-2 py-2">Eşleşen</th>
                <th className="px-2 py-2">Eşleşmeyen</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats).map(([src, st]) => (
                <tr key={src} className="border-b border-white/5 font-mono-technical">
                  <td className="px-2 py-1.5 text-slate-300">{src}</td>
                  <td className="px-2 py-1.5 tabular-nums text-[#ffb400]">{st.read}</td>
                  <td className="px-2 py-1.5 tabular-nums text-emerald-400/90">{st.matched}</td>
                  <td className="px-2 py-1.5 tabular-nums text-orange-300/90">{st.ignored}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono-technical text-[10px] text-slate-600">
          Toplam olay: {events.length} · ignored: {ignored.length}
          {legacyMatched.length > 0 ? ` · legacy eşleşen: ${legacyMatched.length}` : ''}
        </p>
      </section>

      <section className="flex flex-wrap items-end gap-4">
        <div>
          <p className="font-mono-technical text-[10px] uppercase text-slate-500">Şimdiki zaman simülasyonu</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[0, 1, 7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setNowOffsetDays(d)}
                className={[
                  'rounded border px-3 py-1.5 font-mono-technical text-xs',
                  nowOffsetDays === d
                    ? 'border-[#ffb400]/50 bg-[#ffb400]/15 text-[#ffb400]'
                    : 'border-white/15 text-slate-400 hover:bg-white/5',
                ].join(' ')}
              >
                {d === 0 ? 'şimdi' : `+${d}g`}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
          <p className="font-mono-technical text-[10px] uppercase text-slate-500">Seri / toplam seviye</p>
          <p className="font-mono-technical text-lg text-white">
            streak <span className="text-[#ffb400]">{neural.streak}</span> · level{' '}
            <span className="text-[#ffb400]">{neural.totalLevel}</span>
            <span className="text-slate-600">/80</span>
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
          <p className="font-mono-technical text-[10px] uppercase text-slate-500">OHP (ORS) — birleştirilmedi</p>
          <p className="font-mono-technical text-lg text-[#d4af37]">
            {typeof ors?.score === 'number' ? Math.round(ors.score) : '—'}
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[#d4af37]">
          8 bölge
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 font-mono-technical text-[10px] uppercase text-slate-500">
                <th className="px-2 py-2">Bölge</th>
                <th className="px-2 py-2">Lv</th>
                <th className="px-2 py-2">Efektif</th>
                <th className="px-2 py-2">Taban</th>
                <th className="px-2 py-2">Peak</th>
                <th className="px-2 py-2">Sonraki sev.</th>
                <th className="px-2 py-2">Boşta g</th>
                <th className="px-2 py-2">Sönmeye kalan</th>
                <th className="px-2 py-2">Sönüyor</th>
                <th className="px-2 py-2">Kayıp</th>
              </tr>
            </thead>
            <tbody>
              {REGION_IDS.map((id) => {
                const r = neural.regions[id]
                const meta = REGIONS[id]
                return (
                  <tr key={id} className="border-b border-white/5 font-mono-technical">
                    <td className="px-2 py-1.5 text-slate-200" title={meta.functionTr}>
                      {meta.nameTr}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums text-[#ffb400]">{r.level}</td>
                    <td className="px-2 py-1.5 tabular-nums">{r.effectiveXp.toFixed(1)}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-400">{r.xp.toFixed(1)}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-500">{r.peak.toFixed(1)}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-300">
                      {r.level >= 10 ? 'MAX' : Number(r.xpToNext).toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{r.idleDays.toFixed(1)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{r.daysToDecay.toFixed(1)}</td>
                    <td className={`px-2 py-1.5 ${r.decaying ? 'text-orange-400' : 'text-slate-600'}`}>
                      {r.decaying ? 'EVET' : '—'}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums text-orange-300/80">
                      {r.decayLoss > 0.05 ? r.decayLoss.toFixed(1) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {legacyMatched.length > 0 ? (
        <section>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[#d4af37]">
            Legacy eşleşen (alan adları)
          </h2>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto font-mono-technical text-[11px] text-slate-400">
            {legacyMatched.map((row, i) => (
              <li key={`leg-${i}`}>
                <span className="text-emerald-400/90">{row.type}</span>
                {' → '}
                {row.fieldNames.join(', ')}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[#d4af37]">
          Eşleşmeyen kayıt tipleri
        </h2>
        {ignoredSummary.length === 0 ? (
          <p className="mt-2 font-mono-technical text-xs text-slate-600">Yok</p>
        ) : (
          <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto font-mono-technical text-[11px] text-slate-400">
            {ignoredSummary.map(([key, info]) => (
              <li key={key} className="border-b border-white/5 pb-2">
                <div>
                  <span className="text-orange-300/90">{info.count}×</span> {key}
                </div>
                {info.fieldNameSets.length > 0 ? (
                  <details className="mt-1 ml-2">
                    <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
                      Alan adları ({info.fieldNameSets.length} şema)
                    </summary>
                    {info.fieldNameSets.map((names, idx) => (
                      <p key={idx} className="mt-1 break-all text-[10px] text-slate-600">
                        {names.join(', ')}
                      </p>
                    ))}
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[#d4af37]">
          Son 50 olay
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-white/10 font-mono-technical text-[10px] uppercase text-slate-500">
                <th className="px-2 py-2">Tarih</th>
                <th className="px-2 py-2">Tip</th>
                <th className="px-2 py-2">Kazançlar</th>
                <th className="px-2 py-2">Bayrak</th>
              </tr>
            </thead>
            <tbody>
              {recentLog.map((e) => (
                <tr key={`${e.id}-${e.ts}`} className="border-b border-white/5 font-mono-technical">
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">
                    {new Date(/** @type {number} */ (e.ts)).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-2 py-1.5 text-[#ffb400]">{String(e.type)}</td>
                  <td className="px-2 py-1.5 text-slate-400">
                    {Object.entries(/** @type {Record<string, number>} */ (e.gains ?? {}))
                      .filter(([, v]) => v > 0.01)
                      .map(([k, v]) => `${k}:${Number(v).toFixed(1)}`)
                      .join(' · ') || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-slate-500">
                    {[
                      e.legacy ? 'LEGACY' : null,
                      e.returnBonus ? 'BONUS×1.5' : null,
                      e.hitDailyCap ? 'CAP' : null,
                      e.cappedType ? 'TYPE_CAP' : null,
                      (e.streakBonus ?? 0) > 0 ? `STREAK+${e.streakBonus}` : null,
                    ]
                      .filter(Boolean)
                      .join(' ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
