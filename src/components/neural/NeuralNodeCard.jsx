import { LEVEL_THRESHOLDS } from '../../lib/neural/neuralConfig'
import { levelForXp, xpToNextLevel } from '../../lib/neural/neuralEngine'
import { shareEntriesForRule } from './lobeMeta'

/** 26×26 halka, r=9.5 → 2πr ≈ 59.7 */
const RING = 59.7
/** 22×22 halka, r=8 → 2πr ≈ 50.27 */
const RING_MOBILE = 50.27

/**
 * @param {number} xp
 */
function progressInLevel(xp) {
  const level = levelForXp(xp)
  if (level >= 10) return 100
  const lo = LEVEL_THRESHOLDS[level - 1]
  const hi = LEVEL_THRESHOLDS[level]
  if (hi <= lo) return 100
  return Math.max(0, Math.min(100, ((xp - lo) / (hi - lo)) * 100))
}

/**
 * @param {{
 *   meta: import('./lobeMeta').LOBE_META[number]
 *   region: {
 *     effectiveXp: number
 *     xp: number
 *     level: number
 *     xpToNext: number
 *     decaying: boolean
 *     decayLoss: number
 *     daysToDecay: number
 *     lastActiveAt: number|null
 *     idleDays: number
 *   }
 *   selected: boolean
 *   open: boolean
 *   mobile: boolean
 *   side: 'pr'|'pl'
 *   style: React.CSSProperties
 *   nodeRef: (el: HTMLDivElement|null) => void
 *   onSelect: () => void
 *   onToggleOpen: () => void
 *   onHide: () => void
 *   onDragStart: (e: React.PointerEvent) => void
 *   onDragMove: (e: React.PointerEvent) => void
 *   onDragEnd: (e: React.PointerEvent) => void
 *   onGoModule: (to: string|null) => void
 *   guidePulse?: boolean
 * }} props
 */
export default function NeuralNodeCard({
  meta,
  region,
  selected,
  open,
  mobile,
  side,
  style,
  nodeRef,
  onSelect,
  onToggleOpen,
  onHide,
  onDragStart,
  onDragMove,
  onDragEnd,
  onGoModule,
  guidePulse = false,
}) {
  const xp = region?.effectiveXp ?? 0
  const level = region?.level ?? levelForXp(xp)
  const pct = progressInLevel(xp)
  const ringLen = mobile ? RING_MOBILE : RING
  const dash = (ringLen * (1 - level / 10)).toFixed(1)
  const share = shareEntriesForRule(meta.shareRule)

  let nxtClass = 'ob-nxt'
  let nxtText = level >= 10 ? 'azami seviye' : `lv ${level + 1} için +${Math.ceil(xpToNextLevel(xp))}`
  if (region?.decaying && (region.decayLoss ?? 0) > 0.5) {
    nxtClass = 'ob-nxt ob-dec'
    nxtText = `sönüyor · −${Math.round(region.decayLoss)}`
  } else if (!region?.decaying && region?.daysToDecay <= 7 && region?.daysToDecay > 0 && region?.lastActiveAt) {
    nxtClass = 'ob-nxt ob-warn'
    nxtText = `tazele · ${Math.ceil(region.daysToDecay)} gün`
  }

  const lastLabel =
    region?.lastActiveAt != null
      ? new Date(region.lastActiveAt).toLocaleDateString('tr-TR', { dateStyle: 'medium' })
      : '—'

  const collapsed = !open && !mobile
  const cls = [
    'ob-node',
    side === 'pl' ? 'ob-pl' : 'ob-pr',
    mobile ? 'ob-compact' : '',
    collapsed ? 'ob-col' : '',
    selected ? 'ob-sel' : '',
    guidePulse ? 'ob-guide' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const ringBox = mobile ? 22 : 26
  const ringR = mobile ? 8 : 9.5

  return (
    <div
      ref={nodeRef}
      className={cls}
      style={{ ...style, ['--ob-c']: meta.col }}
      hidden={style?.visibility === 'hidden'}
    >
      <div
        className="ob-hd"
        onPointerDown={mobile ? undefined : onDragStart}
        onPointerMove={mobile ? undefined : onDragMove}
        onPointerUp={mobile ? undefined : onDragEnd}
        onPointerCancel={mobile ? undefined : onDragEnd}
        onClick={() => {
          if (mobile) onSelect()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelect()
        }}
        tabIndex={0}
        role="button"
        aria-label={meta.name}
      >
        <span className="ob-dot" aria-hidden />
        <span className="ob-ttl">
          <span className="ob-nm" title={meta.name}>
            {meta.name}
          </span>
          <span className="ob-cd" title={`${meta.code} · ${meta.func}`}>
            <span className="ob-cd-code">{meta.code}</span>
            {!collapsed ? (
              <span className="ob-cd-func"> · {meta.func.toUpperCase()}</span>
            ) : null}
          </span>
        </span>
        <span className="ob-ring">
          <svg viewBox={`0 0 ${ringBox} ${ringBox}`} aria-hidden>
            <circle className="ob-bgc" cx={ringBox / 2} cy={ringBox / 2} r={ringR} />
            <circle
              className="ob-fg"
              cx={ringBox / 2}
              cy={ringBox / 2}
              r={ringR}
              style={{ strokeDashoffset: dash, strokeDasharray: ringLen }}
            />
          </svg>
          <span className="ob-nlv">{level}</span>
        </span>
        {!mobile ? (
          <span className="ob-tools">
            <button
              type="button"
              className="ob-cb"
              aria-label="Aç / kapat"
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation()
                onToggleOpen()
              }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="ob-xb"
              aria-label="Gizle"
              onClick={(e) => {
                e.stopPropagation()
                onHide()
              }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        ) : null}
        <i className="ob-pt" aria-hidden />
      </div>
      <div className="ob-body">
        <div className="ob-stat">
          <span className="ob-k">puan</span>
          <span className="ob-nxp">{Math.round(xp)}</span>
          <span className={nxtClass}>{nxtText}</span>
        </div>
        <div className="ob-meter">
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="ob-mods">
          {meta.mods.map((m) => (
            <button
              key={m.label}
              type="button"
              className="ob-rw"
              disabled={!!m.soon}
              onClick={() => onGoModule(m.soon ? null : m.to)}
            >
              <span>
                {m.label}
                {m.soon ? <span className="ob-bdg">Yakında</span> : null}
              </span>
              {!m.soon ? <span className="ob-go">↗</span> : null}
              <i className="ob-pt" aria-hidden />
            </button>
          ))}
        </div>
        {selected ? (
          <div className="ob-ext">
            <div className="ob-src">{meta.src}</div>
            <div className="ob-share">
              Puan paylaşımı:{' '}
              {share.map((s, i) => (
                <span key={s.id}>
                  {i > 0 ? ' · ' : null}
                  <b>{s.short}</b> %{s.pct}
                </span>
              ))}
            </div>
            <div className="ob-meta">Son aktivite: {lastLabel}</div>
            <button type="button" className="ob-act" onClick={() => onGoModule(meta.goTo)}>
              MODÜLE GİT
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
