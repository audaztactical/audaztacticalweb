import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Activity, AlertTriangle, Crosshair, Maximize2, Radio, TrendingUp, X } from 'lucide-react'
import {
  buildCharacterMatrix,
  buildChronicErrorRadar,
  buildStressPerformanceWave,
  resolveLogFocusId,
} from '../../lib/progressHudAnalytics'
import { invStr } from '../../lib/inventoryIlws'
import { buildLogsById, buildTacticalTooltipLines } from '../../lib/progressTacticalTooltip'
import { buildTcccHudTooltipModel, buildTcccReactionChartPoints } from '../../lib/tcccSimHudAnalytics'
import PerformanceTrendChart from './PerformanceTrendChart'
import TcccReactionWaveChart from './TcccReactionWaveChart'
import { CursorFollowTooltip, TACTICAL_TOOLTIP_CLASS } from './TacticalTooltip'

/** @typedef {'MATRIX' | 'RADAR' | 'WAVE' | 'TCCC' | 'TREND'} ExpandedHudPanelId */
/** @type {ExpandedHudPanelId[]} */
export const EXPANDED_HUD_PANEL_IDS = ['MATRIX', 'RADAR', 'WAVE', 'TCCC', 'TREND']
/** @typedef {'compact' | 'expanded'} HudPanelVariant */

const TAG_DOT = {
  ATIS: 'bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.7)]',
  CQB: 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.65)]',
  TCCC: 'bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.65)]',
  FOF: 'bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.65)]',
  VBSS: 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.65)]',
  OTHER: 'bg-slate-400',
}

const PANEL_TITLES = {
  MATRIX: 'TAKTİK KARAKTER MATRİSİ',
  RADAR: 'KRONİK HATA RADARI',
  WAVE: 'STRES-PERFORMANS DALGASI',
  TCCC: 'ANALİTİK TCCC REAKSİYON DALGASI',
  TREND: 'PERFORMANS TRENDİ',
}

const PANEL_ACCENTS = {
  MATRIX: 'text-emerald-400',
  RADAR: 'text-rose-400/90',
  WAVE: 'text-emerald-400',
  TCCC: 'text-amber-400',
  TREND: 'text-emerald-400',
}

const PANEL_ICONS = {
  MATRIX: Crosshair,
  RADAR: AlertTriangle,
  WAVE: Activity,
  TCCC: Radio,
  TREND: TrendingUp,
}

/**
 * @param {{
 *   title: string
 *   accentClass: string
 *   icon: import('lucide-react').LucideIcon
 *   badge?: React.ReactNode
 *   trailing?: React.ReactNode
 *   onExpand?: () => void
 *   variant?: HudPanelVariant
 * }} props
 */
function HudPanelHeader({ title, accentClass, icon, badge, trailing, onExpand, variant = 'compact' }) {
  const Icon = icon
  const titleClass =
    variant === 'expanded'
      ? 'text-sm font-bold uppercase tracking-[0.28em]'
      : 'text-[11px] font-bold uppercase tracking-[0.22em]'

  return (
    <header
      className={[
        'relative z-20 flex shrink-0 items-start justify-between gap-3',
        variant === 'expanded' ? 'mb-2' : 'mb-3',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onExpand}
        disabled={!onExpand}
        className={[
          'group flex min-w-0 flex-1 items-center gap-2 text-left transition-colors',
          onExpand ? 'cursor-pointer hover:opacity-90' : 'cursor-default',
        ].join(' ')}
      >
        <Icon className={`size-4 shrink-0 ${accentClass}`} strokeWidth={1.5} aria-hidden />
        <h2 className={[titleClass, accentClass].join(' ')}>
          {title}
          {badge}
        </h2>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        {variant === 'compact' && onExpand ? (
          <button
            type="button"
            onClick={onExpand}
            className="rounded border border-slate-700 bg-slate-900/80 p-1.5 text-app-text/70 transition-colors hover:border-emerald-600/50 hover:text-emerald-400"
            aria-label={`${title} tam ekran`}
          >
            <Maximize2 className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
      </div>
    </header>
  )
}

/**
 * @param {HudPanelVariant} variant
 * @param {boolean} [embeddedInOverlay]
 */
function panelShellClass(variant, embeddedInOverlay = false) {
  if (variant === 'expanded' && embeddedInOverlay) {
    return 'progress-hud-panel relative flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-transparent p-0 font-mono'
  }
  return variant === 'expanded'
    ? 'progress-hud-panel relative flex h-full max-h-full w-full min-h-0 max-w-full flex-col overflow-hidden rounded-xl border border-emerald-800/40 bg-slate-950/95 p-3 font-mono shadow-[0_0_48px_rgba(52,211,153,0.1)] sm:p-4'
    : 'progress-hud-panel relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono'
}

/**
 * @param {{ logRow: Record<string, unknown> | null }} props
 */
export function TcccHudTooltipContent({ logRow }) {
  if (!logRow) {
    return (
      <div className={TACTICAL_TOOLTIP_CLASS} role="tooltip">
        <p className="font-mono text-xs uppercase text-app-text/55">VERİ BULUNAMADI</p>
      </div>
    )
  }

  const model = buildTcccHudTooltipModel(logRow)

  return (
    <div className={TACTICAL_TOOLTIP_CLASS} role="tooltip" style={{ width: 'max-content', minWidth: 300 }}>
      <div className="max-h-[300px] overflow-x-hidden overflow-y-auto pr-1">
        <div className="space-y-1.5 font-mono text-[10px] uppercase leading-relaxed tracking-wide">
        <p
          className={
            model.failed
              ? 'animate-pulse font-bold text-red-400'
              : 'font-bold text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]'
          }
        >
          • OPERASYON DURUMU: {model.statusLabel}
        </p>
        <p className="text-amber-400">• TOPLAM SÜRE: {model.elapsedTime} SN</p>
        <p className={model.overtimeSec > 0 ? 'text-red-400' : 'text-emerald-400/90'}>
          • GECİKME SÜRESİ: {model.overtimeLabel}
        </p>
        <p className="text-amber-300/90">• TELSİZ MODU: {model.simulationMode}</p>
        <p className="text-app-text/70">• REAKSİYON VERİMLİLİĞİ: %{model.efficiency}</p>

        {model.failed ? (
          <div className="mt-2 border-t border-red-900/50 pt-2">
            <p className="mb-1.5 text-[9px] font-bold text-red-300">• İHLAL / RED GEREKÇELERİ (TAM METİN)</p>
            {model.rejectionReasons.length > 0 ? (
              model.rejectionReasons.map((reason, idx) => (
                <p
                  key={`tccc-tip-reason-${idx}`}
                  className="mt-1 border-t border-red-900/50 pt-1 font-mono text-[10px] uppercase leading-relaxed text-red-400"
                >
                  {reason.startsWith('•') ? reason : `• ${reason}`}
                </p>
              ))
            ) : (
              <p className="mt-1 border-t border-red-900/50 pt-1 font-mono text-[10px] uppercase text-red-400">
                • TRANSMISSION FAILURE · AYRINTI ARŞİVLENMEDİ
              </p>
            )}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  )
}

/** Recharts tooltip — STRES-PERFORMANS DALGASI: sabit üst Y, sınır kaçışı, offset. */
const STRESS_PERFORMANCE_WAVE_TOOLTIP = {
  offset: 25,
  allowEscapeViewBox: { x: false, y: true },
  /** @param {{ x?: number } | undefined} coord */
  position: (coord) => ({
    x: coord?.x ?? 0,
    y: 50,
  }),
}

/**
 * TCCC stres dalgası — uzun debrief tooltip jitter önlenir.
 * @param {React.ComponentProps<typeof TcccReactionWaveChart>} props
 */
function StressPerformanceTcccChart(props) {
  return (
    <TcccReactionWaveChart
      {...props}
      stableDebriefTooltip
      rechartsTooltipProps={STRESS_PERFORMANCE_WAVE_TOOLTIP}
    />
  )
}

/**
 * @param {{ logs: Record<string, unknown>[] }} props
 */
function TcccSimulationDebriefSidebar({ logs }) {
  const operations = useMemo(() => buildTcccReactionChartPoints(logs, 8).slice().reverse(), [logs])

  if (operations.length === 0) {
    return (
      <aside className="flex h-full min-h-[200px] w-full shrink-0 flex-col rounded-lg border border-amber-900/40 bg-black/40 p-3 lg:w-[min(100%,22rem)]">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-500/80">
          [ SON 8 OTURUM · DEBRİEF ]
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase text-app-text/45">KAYIT YOK</p>
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-lg border border-amber-900/40 bg-black/40 lg:w-[min(100%,22rem)]">
      <p className="shrink-0 border-b border-amber-900/35 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-500/80">
        [ SON {operations.length} OTURUM · TAM DEBRİEF ]
      </p>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {operations.map((op) => {
          const row =
            op.logRow && typeof op.logRow === 'object'
              ? /** @type {Record<string, unknown>} */ (op.logRow)
              : null
          if (!row) return null
          const model = buildTcccHudTooltipModel(row)

          return (
            <li
              key={op.id}
              className="rounded border border-slate-800/80 bg-slate-950/70 p-2.5 font-mono text-[9px] uppercase leading-relaxed"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-amber-400">{op.label}</span>
                <span className={model.failed ? 'text-red-400' : 'text-emerald-400'}>{op.mod}</span>
              </div>
              <p className={model.failed ? 'mt-1 text-red-400' : 'mt-1 text-emerald-400'}>
                {model.statusLabel}
              </p>
              <p className="mt-1 text-amber-400/90">
                SÜRE: {model.elapsedTime} SN · GECİKME: {model.overtimeLabel}
              </p>
              {model.failed && model.rejectionReasons.length > 0 ? (
                <div className="mt-2 space-y-1 border-t border-red-900/40 pt-2">
                  {model.rejectionReasons.map((reason, idx) => (
                    <p key={`${op.id}-r-${idx}`} className="text-[9px] leading-relaxed text-red-400/95">
                      {reason.startsWith('•') ? reason : `• ${reason}`}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[9px] text-emerald-500/80">PROTOKOL TEMİZ · RED YOK</p>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   focusedLogId?: string | null
 *   variant?: HudPanelVariant
 *   onExpand?: () => void
 *   suppressHeader?: boolean
 *   embeddedInOverlay?: boolean
 * }} props
 */
export function TacticalCharacterMatrix({
  logs,
  focusedLogId = null,
  variant = 'compact',
  onExpand,
  suppressHeader = false,
  embeddedInOverlay = false,
}) {
  const expanded = variant === 'expanded'
  const logsById = useMemo(() => buildLogsById(logs), [logs])
  const [tooltip, setTooltip] = useState(/** @type {{ x: number; y: number; lines: string[] } | null} */ (null))
  const { points, maxReaction } = useMemo(() => buildCharacterMatrix(logs), [logs])

  const visiblePoints = useMemo(() => {
    if (!focusedLogId) return points
    const match = points.find((p) => p.id === focusedLogId)
    return match ? [match] : []
  }, [points, focusedLogId])

  const plotMaxReaction = useMemo(() => {
    if (!focusedLogId || visiblePoints.length === 0) return maxReaction
    return Math.max(0.5, ...visiblePoints.map((p) => p.reaction)) * 1.15
  }, [focusedLogId, visiblePoints, maxReaction])

  const cornerText = expanded ? 'text-[10px]' : 'text-[7px]'
  const axisText = expanded ? 'text-[9px]' : 'text-[7px]'
  const emptyText = expanded ? 'text-xs' : 'text-[9px]'
  const dotLocked = expanded ? 'progress-hud-focus-pulse size-6 ring-2 ring-amber-400/80' : 'progress-hud-focus-pulse size-4 ring-2 ring-amber-400/80'
  const dotNormal = expanded ? 'progress-hud-sonar size-4' : 'progress-hud-sonar size-2.5'

  return (
    <section className={panelShellClass(variant, embeddedInOverlay)}>
      <span
        className={[
          'progress-hud-scanline pointer-events-none absolute inset-0 z-10',
          expanded ? 'opacity-55' : 'opacity-40',
        ].join(' ')}
        aria-hidden
      />
      {!suppressHeader ? (
        <HudPanelHeader
          title={PANEL_TITLES.MATRIX}
          accentClass="text-emerald-400"
          icon={Crosshair}
          variant={variant}
          onExpand={onExpand}
          badge={
            focusedLogId ? (
              <span className="ml-2 text-[8px] font-bold text-amber-400/90">· LOCK_ON</span>
            ) : null
          }
        />
      ) : null}

      <figure
        className={[
          'relative z-20 m-0 border border-emerald-900/30 bg-black/60',
          embeddedInOverlay
            ? 'min-h-0 w-full max-w-full flex-1 aspect-square max-h-full'
            : expanded
              ? 'mx-auto aspect-square h-auto w-full max-h-[min(75vh,calc(100vw-3rem))] max-w-[min(75vh,calc(100vw-3rem))] shrink-0'
              : 'aspect-[4/3] w-full shrink-0',
        ].join(' ')}
      >
        <figcaption className="sr-only">Reaksiyon süresi ve isabet matrisi</figcaption>
        <ul className="absolute inset-0 grid list-none grid-cols-2 grid-rows-2 p-0">
          <li
            className={`border-r border-b border-emerald-900/25 p-1 font-bold uppercase text-emerald-500/70 ${cornerText}`}
          >
            ÖLÜMCÜL
          </li>
          <li
            className={`border-b border-emerald-900/25 p-1 text-right font-bold uppercase text-amber-500/70 ${cornerText}`}
          >
            AGRESİF
          </li>
          <li
            className={`border-r border-emerald-900/25 p-1 font-bold uppercase text-app-text/55 ${cornerText}`}
          >
            TEREDDÜTLÜ
          </li>
          <li className={`p-1 text-right font-bold uppercase text-rose-500/80 ${cornerText}`}>PERVASIZ</li>
        </ul>
        <p className={`absolute bottom-8 left-3 m-0 uppercase text-app-text/45 ${axisText}`}>REAKSİYON SN →</p>
        <p
          className={`absolute left-3 top-10 m-0 origin-left -rotate-90 uppercase text-app-text/45 ${axisText}`}
        >
          İSABET % ↑
        </p>
        {visiblePoints.length === 0 ? (
          <p
            className={`absolute inset-0 m-0 flex items-center justify-center uppercase text-app-text/45 ${emptyText}`}
          >
            {focusedLogId ? 'LOCK_ON · OTURUM MATRİS VERİSİ YOK' : 'MATRİS VERİSİ YOK'}
          </p>
        ) : (
          visiblePoints.map((p, i) => {
            const x = (p.reaction / plotMaxReaction) * 88 + 6
            const y = 92 - (p.accuracy / 100) * 84
            const dotClass = TAG_DOT[/** @type {keyof typeof TAG_DOT} */ (p.tag)] ?? TAG_DOT.OTHER
            const isLocked = focusedLogId != null
            return (
              <span
                key={p.id}
                role="img"
                aria-label={`${p.tag} matris noktası`}
                className={[
                  'absolute cursor-crosshair rounded-full',
                  isLocked ? dotLocked : dotNormal,
                  dotClass,
                ].join(' ')}
                style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 6) * 0.35}s` }}
                onMouseMove={(e) => {
                  const row = logsById.get(p.id)
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    lines: buildTacticalTooltipLines(row),
                  })
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            )
          })
        )}
      </figure>
      <CursorFollowTooltip
        active={tooltip != null}
        x={tooltip?.x ?? 0}
        y={tooltip?.y ?? 0}
        lines={tooltip?.lines ?? []}
      />
    </section>
  )
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   focusedLogId?: string | null
 *   variant?: HudPanelVariant
 *   onExpand?: () => void
 *   suppressHeader?: boolean
 *   embeddedInOverlay?: boolean
 * }} props
 */
export function ChronicErrorRadar({
  logs,
  focusedLogId = null,
  variant = 'compact',
  onExpand,
  suppressHeader = false,
  embeddedInOverlay = false,
}) {
  const expanded = variant === 'expanded'
  const logsById = useMemo(() => buildLogsById(logs), [logs])
  const [tooltip, setTooltip] = useState(/** @type {{ x: number; y: number; lines: string[] } | null} */ (null))
  const { items, maxCount } = useMemo(() => buildChronicErrorRadar(logs), [logs])

  return (
    <section className={panelShellClass(variant, embeddedInOverlay)}>
      {expanded ? (
        <span className="progress-hud-scanline pointer-events-none absolute inset-0 z-10 opacity-25" aria-hidden />
      ) : null}
      {!suppressHeader ? (
        <HudPanelHeader
          title={PANEL_TITLES.RADAR}
          accentClass="text-rose-400/90"
          icon={AlertTriangle}
          variant={variant}
          onExpand={onExpand}
          badge={
            focusedLogId ? (
              <span className="ml-2 text-[8px] font-bold text-rose-300/90">· TEK GÖREV</span>
            ) : null
          }
        />
      ) : null}

      {items.length === 0 ? (
        <p
          className={`text-center uppercase text-app-text/45 ${embeddedInOverlay ? 'flex flex-1 items-center justify-center text-xs' : expanded ? 'py-6 text-xs' : 'py-6 text-[9px]'}`}
        >
          {focusedLogId ? 'BU OTURUMDA KRİTİK HATA YOK' : 'HATA KAYDI YOK · TEMİZ HAT'}
        </p>
      ) : (
        <ul
          className={[
            embeddedInOverlay
              ? 'flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-hidden'
              : expanded
                ? 'space-y-4'
                : 'space-y-3',
          ].join(' ')}
        >
          {items.map((item) => {
            const pct = Math.round((item.count / maxCount) * 100)
            const critical = focusedLogId ? item.count >= 1 : item.count >= 2
            const sampleLog =
              focusedLogId != null
                ? logsById.get(focusedLogId)
                : [...logsById.values()].find((row) => {
                    const errors = Array.isArray(row.tacticalErrors) ? row.tacticalErrors : []
                    return errors.some((e) => invStr(e).trim() === item.id) || (item.id === 'blue_on_blue' && row.blueOnBlue)
                  })

            return (
              <li
                key={item.id}
                className="cursor-crosshair"
                onMouseMove={(e) => {
                  const base = [
                    `• İHLAL: ${item.label}`,
                    `• KOD: ${item.code}`,
                    `• FLAG_FREQ: ${item.count}`,
                  ]
                  const drill = sampleLog ? buildTacticalTooltipLines(sampleLog) : []
                  setTooltip({ x: e.clientX, y: e.clientY, lines: [...base, ...drill] })
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <p className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`font-bold uppercase text-app-text/55 ${expanded ? 'text-[10px]' : 'text-[8px]'}`}
                  >
                    {item.code}
                  </span>
                  <span
                    className={`tabular-nums text-app-text/45 ${expanded ? 'text-[10px]' : 'text-[8px]'}`}
                  >
                    FLAG_FREQ_{item.count}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  {critical ? (
                    <AlertTriangle
                      className={`progress-hud-glitch shrink-0 text-rose-400 ${expanded ? 'size-5' : 'size-3.5'}`}
                      aria-hidden
                    />
                  ) : (
                    <span className={expanded ? 'size-5 shrink-0' : 'size-3.5 shrink-0'} aria-hidden />
                  )}
                  <span
                    className={[
                      'relative block flex-1 overflow-hidden rounded-sm border border-slate-800 bg-slate-900',
                      expanded ? 'h-3' : 'h-2',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'progress-hud-bar-fill block h-full rounded-sm',
                        critical
                          ? 'bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.55)]'
                          : 'bg-amber-500/90 shadow-[0_0_10px_rgba(245,158,11,0.35)]',
                      ].join(' ')}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </p>
                <p
                  className={`mt-1 font-bold uppercase ${critical ? 'text-rose-400' : 'text-app-text/70'} ${expanded ? 'text-[11px]' : 'text-[9px]'}`}
                >
                  {item.label}
                </p>
              </li>
            )
          })}
        </ul>
      )}
      <CursorFollowTooltip
        active={tooltip != null}
        x={tooltip?.x ?? 0}
        y={tooltip?.y ?? 0}
        lines={tooltip?.lines ?? []}
      />
    </section>
  )
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   focusedLogId?: string | null
 *   variant?: HudPanelVariant
 *   onExpand?: () => void
 *   suppressHeader?: boolean
 *   embeddedInOverlay?: boolean
 * }} props
 */
export function StressPerformanceWave({
  logs,
  focusedLogId = null,
  variant = 'compact',
  onExpand,
  suppressHeader = false,
  embeddedInOverlay = false,
}) {
  const expanded = variant === 'expanded'
  const logsById = useMemo(() => buildLogsById(logs), [logs])
  const wave = useMemo(() => buildStressPerformanceWave(logs), [logs])
  const simChartData = useMemo(
    () => (wave.source === 'tccc_sim' ? wave.simSeries : []),
    [wave],
  )
  const [hoverIdx, setHoverIdx] = useState(/** @type {number | null} */ (null))
  const [tooltip, setTooltip] = useState(/** @type {{ x: number; y: number; lines: string[] } | null} */ (null))

  const sessions = useMemo(() => {
    if (!focusedLogId) return wave.activeSessions
    if (wave.source === 'tccc_sim') {
      const hit = wave.activeSessions.find((s) => s.id === focusedLogId)
      return hit ? wave.activeSessions : wave.activeSessions
    }
    for (const day of wave.days) {
      const hit = day.sessions.find((s) => s.id === focusedLogId)
      if (hit) return day.sessions
    }
    return wave.activeSessions
  }, [wave, focusedLogId])

  const focusSessionIdx = focusedLogId ? sessions.findIndex((s) => s.id === focusedLogId) : -1
  const w = expanded ? 720 : 320
  const h = expanded ? 200 : 120
  const pad = expanded ? 16 : 12

  const pathD = useMemo(() => {
    if (sessions.length < 2) return ''
    const step = (w - pad * 2) / Math.max(1, sessions.length - 1)
    return sessions
      .map((s, i) => {
        const x = pad + i * step
        const y = pad + (1 - s.value / 100) * (h - pad * 2)
        return `${i === 0 ? 'M' : 'L'}${x},${y}`
      })
      .join(' ')
  }, [sessions, w, h, pad])

  return (
    <section className={panelShellClass(variant, embeddedInOverlay)}>
      <span
        className={[
          'progress-hud-scanline pointer-events-none absolute inset-0 z-10',
          expanded ? 'opacity-45' : 'opacity-0',
        ].join(' ')}
        aria-hidden
      />
      {!suppressHeader ? (
        <HudPanelHeader
          title={PANEL_TITLES.WAVE}
          accentClass="text-emerald-400"
          icon={Activity}
          variant={variant}
          onExpand={onExpand}
          badge={
            focusedLogId ? (
              <span className="ml-2 text-[8px] font-bold text-amber-400/90">· OTURUM İZOLE</span>
            ) : null
          }
          trailing={
            <span className={`uppercase text-app-text/45 ${expanded ? 'text-[10px]' : 'text-[8px]'}`}>
              {wave.dayLabel || '—'}
            </span>
          }
        />
      ) : null}

      {wave.source === 'tccc_sim' && simChartData.length >= 2 ? (
        <div
          className={[
            'relative z-20 min-h-0 w-full flex-1',
            embeddedInOverlay ? 'min-h-[min(38vh,280px)]' : expanded ? 'min-h-[min(42vh,340px)]' : 'min-h-52',
          ].join(' ')}
        >
          <StressPerformanceTcccChart
            logs={logs}
            data={simChartData}
            variant={variant}
            TooltipContent={TcccHudTooltipContent}
            accent="emerald"
          />
        </div>
      ) : sessions.length < 2 ? (
        <p
          className={`text-center uppercase text-app-text/45 ${embeddedInOverlay ? 'flex flex-1 items-center justify-center text-xs' : expanded ? 'py-8 text-xs' : 'py-8 text-[9px]'}`}
        >
          {wave.source === 'tccc_sim' ? '≥2 TCCC SİMÜLASYON KAYDI GEREKLİ' : 'AYNI GÜN İÇİNDE ≥2 OTURUM GEREKLİ'}
        </p>
      ) : (
        <figure
          className={[
            'relative z-20 m-0 flex w-full min-h-0 flex-col',
            embeddedInOverlay ? 'h-full max-h-full flex-1 justify-center' : expanded ? 'mx-auto max-w-[min(96vw,56rem)]' : '',
          ].join(' ')}
        >
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className={[
              'progress-hud-wave-line w-full shrink-0',
              embeddedInOverlay ? 'max-h-[min(38vh,280px)]' : expanded ? 'max-h-[min(42vh,340px)]' : '',
            ].join(' ')}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <path
              d={pathD}
              fill="none"
              stroke="rgb(52 211 153)"
              strokeWidth={expanded ? 3 : 2}
              strokeLinecap="round"
              className="progress-hud-ekg"
            />
          </svg>
          {(hoverIdx != null && sessions[hoverIdx]) || focusSessionIdx >= 0 ? (
            <span
              className={[
                'progress-hud-scan-beam pointer-events-none absolute inset-y-0 w-0.5 shadow-[0_0_12px_rgba(52,211,153,0.8)]',
                focusSessionIdx >= 0 && hoverIdx == null
                  ? 'bg-amber-400/90 shadow-[0_0_14px_rgba(245,158,11,0.75)]'
                  : 'bg-emerald-400/80',
              ].join(' ')}
              style={{
                left: `${(((hoverIdx ?? focusSessionIdx) / Math.max(1, sessions.length - 1)) * 100).toFixed(1)}%`,
              }}
            />
          ) : null}
          <menu
            className={`mt-3 flex list-none flex-wrap justify-between gap-2 p-0 ${embeddedInOverlay ? 'mt-4 max-h-[28vh] overflow-hidden' : expanded ? 'mt-6' : ''}`}
          >
            {sessions.map((s, i) => {
              const isFocus = focusedLogId != null && s.id === focusedLogId
              return (
                <li key={s.id} className="flex-1">
                  <button
                    type="button"
                    className={[
                      'w-full rounded border font-mono uppercase transition-colors',
                      expanded ? 'py-2 text-[10px]' : 'py-1 text-[7px]',
                      isFocus
                        ? 'border-amber-500/60 bg-amber-950/30 font-bold text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                        : 'border-transparent text-app-text/45 hover:border-emerald-800/50 hover:text-emerald-400',
                      focusedLogId && !isFocus ? 'opacity-40' : '',
                    ].join(' ')}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseMove={(e) => {
                      setHoverIdx(i)
                      const row = logsById.get(s.id)
                      setTooltip({
                        x: e.clientX,
                        y: e.clientY,
                        lines: buildTacticalTooltipLines(row),
                      })
                    }}
                    onMouseLeave={() => {
                      setHoverIdx(null)
                      setTooltip(null)
                    }}
                  >
                    {s.label} · {Math.round(s.value)}%
                  </button>
                </li>
              )
            })}
          </menu>
        </figure>
      )}
      <CursorFollowTooltip
        active={tooltip != null}
        x={tooltip?.x ?? 0}
        y={tooltip?.y ?? 0}
        lines={tooltip?.lines ?? []}
      />
    </section>
  )
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   variant?: HudPanelVariant
 *   onExpand?: () => void
 *   suppressHeader?: boolean
 *   embeddedInOverlay?: boolean
 * }} props
 */
export function TcccReactionWavePanel({
  logs,
  variant = 'compact',
  onExpand,
  suppressHeader = false,
  embeddedInOverlay = false,
}) {
  const expanded = variant === 'expanded'
  const chartData = useMemo(() => buildTcccReactionChartPoints(logs, 8), [logs])

  return (
    <section className={panelShellClass(variant, embeddedInOverlay)}>
      <span
        className={[
          'progress-hud-scanline pointer-events-none absolute inset-0 z-10',
          expanded ? 'opacity-35' : 'opacity-0',
        ].join(' ')}
        aria-hidden
      />
      {!suppressHeader ? (
        <HudPanelHeader
          title={`[ ${PANEL_TITLES.TCCC} ]`}
          accentClass="text-amber-400"
          icon={Radio}
          variant={variant}
          onExpand={onExpand}
        />
      ) : null}
      <div
        className={[
          'relative z-20 min-h-0 flex-1',
          expanded ? 'flex min-h-0 flex-col gap-3 lg:flex-row' : '',
        ].join(' ')}
      >
        <div className={expanded ? 'min-h-0 min-w-0 flex-1' : 'h-full w-full'}>
          <TcccReactionWaveChart
            logs={logs}
            data={chartData}
            variant={variant}
            TooltipContent={TcccHudTooltipContent}
          />
        </div>
        {expanded ? <TcccSimulationDebriefSidebar logs={logs} /> : null}
      </div>
    </section>
  )
}

/**
 * @param {{
 *   panelId: ExpandedHudPanelId
 *   onClose: () => void
 *   logs: Record<string, unknown>[]
 *   errorLogs: Record<string, unknown>[]
 *   focusedLogId: string | null
 *   trendSeries?: { id: string; label: string; value: number; tag: string; logRow?: Record<string, unknown> | null }[]
 *   barsAnimate?: boolean
 * }} props
 */
function HudPanelExpandOverlay({
  panelId,
  onClose,
  logs,
  errorLogs,
  focusedLogId,
  trendSeries = [],
  barsAnimate = false,
}) {
  const TitleIcon = PANEL_ICONS[panelId]
  const accent = PANEL_ACCENTS[panelId]
  const matrixLogs = useMemo(() => {
    if (!focusedLogId) return logs
    return logs.filter((row) => resolveLogFocusId(row) === focusedLogId)
  }, [logs, focusedLogId])

  const overlay = (
    <div
      className="progress-hud-expand-overlay animate-fade-in fixed inset-0 z-[200] flex h-screen w-screen flex-col justify-between overflow-hidden bg-slate-950/98 p-6 font-mono md:p-12"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hud-expand-title"
    >
      <span className="progress-hud-scanline pointer-events-none absolute inset-0 z-0 opacity-20" aria-hidden />

      <button
        type="button"
        onClick={onClose}
        className="progress-hud-expand-close absolute right-4 top-4 z-[210] rounded border border-amber-500/70 bg-amber-950/60 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-100 shadow-[0_0_28px_rgba(245,158,11,0.45)] transition-colors hover:border-rose-500/80 hover:bg-rose-950/70 hover:text-rose-50 md:right-8 md:top-8 md:px-4 md:py-2.5"
        aria-label="Odaktan çık"
      >
        <span className="inline-flex items-center gap-2">
          <X className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          <span className="hidden sm:inline">[ ODAKTAN ÇIK / ESC ]</span>
          <span className="sm:hidden">[ ÇIK / ESC ]</span>
        </span>
      </button>

      <header className="relative z-10 w-full max-w-6xl shrink-0 pr-28 md:pr-44">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-500/80">
          TAM EKRAN · HUD ENTEGRASYONU
        </p>
        <div className="mt-2 flex items-center gap-2">
          <TitleIcon className={`size-5 shrink-0 ${accent}`} strokeWidth={1.5} aria-hidden />
          <h2 id="hud-expand-title" className={`text-base font-bold uppercase tracking-[0.24em] md:text-lg ${accent}`}>
            {PANEL_TITLES[panelId]}
            {focusedLogId ? (
              <span className="ml-2 text-[10px] font-bold text-amber-400/90">· LOCK_ON</span>
            ) : null}
          </h2>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden py-2">
        <div className="flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden">
        {panelId === 'MATRIX' ? (
          <TacticalCharacterMatrix
            logs={matrixLogs}
            focusedLogId={focusedLogId}
            variant="expanded"
            suppressHeader
            embeddedInOverlay
          />
        ) : null}
        {panelId === 'RADAR' ? (
          <ChronicErrorRadar
            logs={errorLogs}
            focusedLogId={focusedLogId}
            variant="expanded"
            suppressHeader
            embeddedInOverlay
          />
        ) : null}
        {panelId === 'WAVE' ? (
          <StressPerformanceWave
            logs={logs}
            focusedLogId={focusedLogId}
            variant="expanded"
            suppressHeader
            embeddedInOverlay
          />
        ) : null}
        {panelId === 'TCCC' ? (
          <TcccReactionWavePanel logs={logs} variant="expanded" suppressHeader embeddedInOverlay />
        ) : null}
        {panelId === 'TREND' ? (
          <div className="relative flex h-full min-h-[280px] w-full min-w-0 flex-1 flex-col overflow-hidden">
            <PerformanceTrendChart series={trendSeries} barsAnimate={barsAnimate} variant="expanded" />
          </div>
        ) : null}
        </div>
      </div>

      <p className="relative z-10 shrink-0 text-center text-[8px] uppercase tracking-widest text-app-text/45">
        ESC · TAM EKRAN MODU
      </p>
    </div>
  )

  return createPortal(overlay, document.body)
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   focusedLogId?: string | null
 *   radarLogs?: Record<string, unknown>[]
 *   expandedPanel?: ExpandedHudPanelId | null
 *   onExpandedPanelChange?: (id: ExpandedHudPanelId | null) => void
 *   trendSeries?: { id: string; label: string; value: number; tag: string; logRow?: Record<string, unknown> | null }[]
 *   barsAnimate?: boolean
 * }} props
 */
export default function ProgressHudPanels({
  logs,
  focusedLogId = null,
  radarLogs,
  expandedPanel: controlledExpanded,
  onExpandedPanelChange,
  trendSeries = [],
  barsAnimate = false,
}) {
  const errorLogs = radarLogs ?? logs
  const matrixLogs = useMemo(() => {
    if (!focusedLogId) return logs
    return logs.filter((row) => resolveLogFocusId(row) === focusedLogId)
  }, [logs, focusedLogId])
  const [internalExpanded, setInternalExpanded] = useState(/** @type {ExpandedHudPanelId | null} */ (null))
  const expandedPanel = controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  const setExpandedPanel = onExpandedPanelChange ?? setInternalExpanded

  const closeExpanded = useCallback(() => setExpandedPanel(null), [setExpandedPanel])

  useEffect(() => {
    if (!expandedPanel) return undefined
    const scrollY = window.scrollY
    const prevBodyOverflow = document.body.style.overflow
    const prevBodyPosition = document.body.style.position
    const prevBodyTop = document.body.style.top
    const prevBodyWidth = document.body.style.width
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeExpanded()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.position = prevBodyPosition
      document.body.style.top = prevBodyTop
      document.body.style.width = prevBodyWidth
      window.scrollTo(0, scrollY)
      window.removeEventListener('keydown', onKey)
    }
  }, [expandedPanel, closeExpanded])

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2 border-b border-emerald-900/30 pb-2">
        <Radio className="size-4 text-emerald-500" aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400/90">
          İSTİHBARAT ANALİTİK MERKEZİ · HUD MODÜLLERİ
          {focusedLogId ? (
            <span className="ml-2 text-amber-400/90">· DRILL-DOWN AKTİF</span>
          ) : null}
        </p>
      </header>

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-hidden={expandedPanel ? true : undefined}
        {...(expandedPanel ? { inert: true } : {})}
      >
        <TacticalCharacterMatrix
          logs={matrixLogs}
          focusedLogId={focusedLogId}
          onExpand={() => setExpandedPanel('MATRIX')}
        />
        <ChronicErrorRadar
          logs={errorLogs}
          focusedLogId={focusedLogId}
          onExpand={() => setExpandedPanel('RADAR')}
        />
        <StressPerformanceWave
          logs={logs}
          focusedLogId={focusedLogId}
          onExpand={() => setExpandedPanel('WAVE')}
        />
        <TcccReactionWavePanel logs={logs} onExpand={() => setExpandedPanel('TCCC')} />
      </section>

      {expandedPanel ? (
        <HudPanelExpandOverlay
          panelId={expandedPanel}
          onClose={closeExpanded}
          logs={logs}
          errorLogs={errorLogs}
          focusedLogId={focusedLogId}
          trendSeries={trendSeries}
          barsAnimate={barsAnimate}
        />
      ) : null}
    </section>
  )
}
