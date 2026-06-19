import { useId } from 'react'
import { getAccentColor } from '../../lib/themeColors'

/**
 * Ön yüz insan silüeti + tıklanabilir yaralanma bölgeleri (kod ile Firestore’a yazılır).
 */
const BODY_ZONES = [
  { id: 'H', aria: 'Üst gövde' },
  { id: 'LT', aria: 'Sol gövde' },
  { id: 'RT', aria: 'Sağ gövde' },
  { id: 'LA', aria: 'Sol kol' },
  { id: 'RA', aria: 'Sağ kol' },
  { id: 'LP', aria: 'Sol bacak' },
  { id: 'RP', aria: 'Sağ bacak' },
]

/**
 * @type {Record<string, { x: number; y: number; w: number; h: number }[]>}
 */
const ZONE_TARGETS = {
  H: [{ x: 38, y: 4, w: 24, h: 14 }],
  LT: [{ x: 42, y: 20, w: 12, h: 18 }],
  RT: [{ x: 54, y: 20, w: -12, h: 18 }],
  LA: [{ x: 26, y: 24, w: 10, h: 32 }],
  RA: [{ x: 74, y: 24, w: 10, h: 32 }],
  LP: [{ x: 40, y: 48, w: 10, h: 40 }],
  RP: [{ x: 54, y: 48, w: 10, h: 40 }],
}

/** @param {{ selectedId: string | null, onSelect: (id: string) => void }} props */
export function InjuryBodyMap({ selectedId, onSelect }) {
  const uid = useId().replace(/:/g, '')
  const gid = `${uid}-glow`

  return (
    <div
      className="relative mx-auto w-full max-w-[220px] rounded-xl border border-red-500/35 bg-black/55 p-5 shadow-[0_0_40px_-8px_rgba(239,68,68,0.35)] backdrop-blur-md"
      role="radiogroup"
      aria-label="Bölge"
    >
      <div className="pointer-events-none absolute left-3 top-3 size-5 border-l-2 border-t-2 border-red-400/55" aria-hidden />
      <div className="pointer-events-none absolute right-3 top-3 size-5 border-r-2 border-t-2 border-red-400/55" aria-hidden />
      <div className="pointer-events-none absolute bottom-3 left-3 size-5 border-b-2 border-l-2 border-amber-500/40" aria-hidden />
      <div className="pointer-events-none absolute bottom-3 right-3 size-5 border-b-2 border-r-2 border-amber-500/40" aria-hidden />

      <p className="mb-4 text-center font-mono-technical text-[10px] font-bold tracking-[0.45em] text-red-400/85">THREAT_MATRIX</p>

      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#070707] px-4 py-3">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(248,113,113,1) 1px,transparent 1px),linear-gradient(90deg,rgba(248,113,113,1) 1px,transparent 1px)',
            backgroundSize: '10px 10px',
          }}
          aria-hidden
        />

        <svg viewBox="0 0 100 100" className="relative w-full text-red-900/85" aria-hidden>
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.35" opacity="0.35" strokeDasharray="2 4" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.35" opacity="0.35" strokeDasharray="2 4" />
          <ellipse cx="50" cy="11" rx="11" ry="10" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
          <rect x="42" y="20" width="16" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <rect x="26" y="24" width="12" height="34" rx="2" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
          <rect x="62" y="24" width="12" height="34" rx="2" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
          <rect x="38" y="48" width="12" height="42" rx="2" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
          <rect x="50" y="48" width="12" height="42" rx="2" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
        </svg>

        <svg viewBox="0 0 100 100" className="absolute inset-x-4 inset-y-3 w-[calc(100%-2rem)]">
          <defs>
            <filter id={gid} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feColorMatrix
                in="b"
                type="matrix"
                values="2 0 0 0 0
                     0 0.15 0 0 0
                     0 0 0 0 0
                     0 0 0 0.9 0"
                result="redden"
              />
              <feMerge>
                <feMergeNode in="redden" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {BODY_ZONES.flatMap(({ id, aria }) =>
            (ZONE_TARGETS[id] ?? []).map((rect, i) => {
              const w = Math.abs(rect.w)
              const x = rect.w < 0 ? rect.x + rect.w : rect.x
              const active = selectedId === id
              const accent = getAccentColor()
              const fillCold = active ? `color-mix(in srgb, ${accent} 42%, transparent)` : 'rgba(127,29,29,0.14)'
              const strokeCold = active ? accent : 'rgba(248,113,113,0.45)'
              return (
                <rect
                  key={`${id}-${i}`}
                  role="radio"
                  aria-checked={active}
                  tabIndex={0}
                  aria-label={aria}
                  x={x}
                  y={rect.y}
                  width={w}
                  height={rect.h}
                  rx={2}
                  fill={fillCold}
                  stroke={strokeCold}
                  strokeWidth={active ? 1.6 : 1}
                  style={
                    active
                      ? {
                          filter: `url(#${gid}) drop-shadow(0 0 14px rgba(239,68,68,0.9)) drop-shadow(0 0 22px rgba(255,180,0,0.45))`,
                        }
                      : undefined
                  }
                  className={`cursor-pointer transition-all duration-200 ease-out hover:stroke-red-300/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${active ? 'injury-hot-zone' : ''}`}
                  onClick={() => onSelect(id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(id)
                    }
                  }}
                />
              )
            })
          )}
        </svg>
      </div>
    </div>
  )
}
