import { useId, useMemo } from 'react'
import TacticalPanel from '../ui/TacticalPanel'
import { useTheme } from '../../contexts/ThemeContext'
import { getAccentColor } from '../../lib/themeColors'

const TACTIC_AMBER = '#f59e0b'
const COMBAT_RED = '#FF0000'

/**
 * OHP (Operasyonel Hazırlık Puanı) — üst yarım daire + durum + hata kodları.
 * @param {{ score: number, penalties: { code: string, delta: number, detail: string }[], loading?: boolean, embedded?: boolean }} props
 */
export default function OrsReadinessGauge({ score, penalties, loading, embedded = false }) {
  const gid = useId().replace(/:/g, '')
  const { themeClass } = useTheme()
  const accentColor = useMemo(() => getAccentColor(), [themeClass])
  const cx = 100
  const cy = 80
  const r = 68
  const sw = 10

  const p = Math.min(100, Math.max(0, score)) / 100
  const angleEnd = Math.PI * (1 - p)
  const x2 = cx + r * Math.cos(angleEnd)
  const y2 = cy - r * Math.sin(angleEnd)

  const isReady = score >= 85
  const isMarginal = score >= 50 && score < 85
  const isCritical = score < 50

  const strokeTrack = 'rgba(255,255,255,0.1)'
  let glow = `drop-shadow(0 0 16px color-mix(in srgb, ${accentColor} 60%, transparent))`
  let statusLine = 'DURUM: GÖREVE HAZIR'
  let titleAccent = 'text-accent/90'
  let scoreColor = 'text-accent'
  let fillStart = accentColor

  if (isMarginal) {
    fillStart = TACTIC_AMBER
    glow = 'drop-shadow(0 0 14px rgba(245,158,11,0.55))'
    statusLine = 'DURUM: DİKKAT - SINIRDA HAZIR'
    titleAccent = 'text-accent/90'
    scoreColor = 'text-accent'
  }
  if (isCritical) {
    fillStart = COMBAT_RED
    glow = `drop-shadow(0 0 20px ${COMBAT_RED}cc)`
    statusLine = 'DURUM: KRİTİK - GÖREV İPTAL'
    titleAccent = 'text-red-500'
    scoreColor = 'text-[#FF0000]'
  }

  const panelPulse = isCritical ? 'ring-1 ring-[#FF0000]/45' : ''

  const inner = (
    <>
      <div className="pointer-events-none flex flex-col items-center text-center">
        <p className={`font-mono-technical text-[10px] font-bold uppercase tracking-[0.45em] ${titleAccent}`}>OHP</p>
        <p className="mt-1.5 font-mono-technical text-[9px] uppercase tracking-[0.22em] text-app-text/45">
          OPERASYONEL_HAZIRLIK_PUANI
        </p>
      </div>

      <div className="relative mx-auto mt-1 flex h-[148px] w-full max-w-[300px] items-start justify-center">
        {loading ? (
          <div className="absolute inset-0 z-[2] flex items-center justify-center rounded-lg bg-black/35 font-mono-technical text-[10px] uppercase tracking-widest text-app-text/55 backdrop-blur-[1px]">
            HESAPLANIYOR...
          </div>
        ) : null}
        <svg width="300" height="145" viewBox="0 0 200 120" className="overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`ohpArcFill-${gid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={fillStart} stopOpacity={0.95} />
              <stop offset="100%" stopColor={fillStart} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={strokeTrack}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={`url(#ohpArcFill-${gid})`}
            strokeWidth={sw}
            strokeLinecap="round"
            style={{ filter: glow }}
          />
        </svg>
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 flex-col items-center">
          <span className={`font-mono-technical text-5xl font-black tabular-nums leading-none tracking-tight ${scoreColor}`}>{score}</span>
          <span className="mt-1 font-mono-technical text-[10px] text-app-text/45">/ 100</span>
        </div>
      </div>

      <p
        className={`mt-3 text-center font-mono-technical text-[10px] font-bold uppercase leading-snug tracking-[0.06em] ${isReady ? 'text-accent' : ''} ${isMarginal ? 'text-amber-400' : ''} ${isCritical ? 'text-[#FF0000]' : ''}`}
      >
        {statusLine}
      </p>

      <div className="mt-4 space-y-1 border-t border-white/10 pt-3">
        {penalties.length === 0 ? (
          <p className="text-center font-mono-technical text-[9px] uppercase tracking-wider text-accent/75">
            HATA_KUYRUĞU: TEMİZ · PUAN_KESİNTİSİ_YOK
          </p>
        ) : (
          penalties.slice(0, 3).map((pen, i) => (
            <div
              key={`${pen.code}-${i}`}
              className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-[9px] sm:justify-between"
            >
              <span className="font-mono-technical text-[#FF0000]/95">{pen.code}</span>
              <span className="font-mono-technical tabular-nums text-app-text/55">{pen.detail}</span>
              <span className="font-mono-technical tabular-nums text-app-text/45">{pen.delta} PUAN</span>
            </div>
          ))
        )}
      </div>
    </>
  )

  if (embedded) {
    return <div className={`cmd-ohp-embedded h-full px-2 py-1 ${panelPulse}`}>{inner}</div>
  }

  return (
    <TacticalPanel className={`mx-auto w-full max-w-xl px-4 pb-4 pt-5 sm:px-6 ${panelPulse}`}>
      {inner}
    </TacticalPanel>
  )
}
