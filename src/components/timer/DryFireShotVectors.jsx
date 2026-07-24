import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { buildShotToShotLinks, mapHitToFacePercent } from '../../lib/dryFireHits'

/** Taktiksel vektör rengi — sarı nişangah/isabetlerden ayrışır */
const VEC_STROKE = 'rgba(45, 212, 191, 0.72)'
const VEC_FILL = 'rgba(45, 212, 191, 0.92)'
const VEC_LABEL = 'rgba(153, 246, 228, 0.95)'
const VEC_LABEL_BORDER = 'rgba(45, 212, 191, 0.4)'

/**
 * Varış isabetinin merkezine (x2,y2) bakan ok ucu.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} [size]
 */
function arrowHeadPoints(x1, y1, x2, y2, size = 1.65) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const tipX = x2
  const tipY = y2
  const bx = x2 - ux * size
  const by = y2 - uy * size
  const px = -uy * size * 0.42
  const py = ux * size * 0.42
  return `${tipX},${tipY} ${bx + px},${by + py} ${bx - px},${by - py}`
}

/**
 * Ardışık atış vektörleri — yalnızca isabet (x,y) → yüz % koordinatlarından çizilir.
 * Marker DOM'una transform uygulanmaz; oklar sabit anchor noktalarına bağlanır.
 *
 * @param {{
 *   hits: import('../../lib/dryFireHits').DryFireHit[]
 *   distanceM: number
 *   faceHitRadiusPct?: number
 *   visible?: boolean
 *   newestLinkToIndex?: number | null
 * }} props
 */
export default function DryFireShotVectors({
  hits,
  distanceM,
  faceHitRadiusPct = 46,
  visible = false,
  newestLinkToIndex = null,
}) {
  const { t } = useTranslation('timer')
  const links = useMemo(() => buildShotToShotLinks(hits), [hits])

  if (!visible || links.length === 0) return null

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {links.map((link) => {
        // Marker ile aynı map — son (x,y) konumlarının merkezleri
        const from = mapHitToFacePercent(link.from.x, link.from.y, distanceM, faceHitRadiusPct)
        const to = mapHitToFacePercent(link.to.x, link.to.y, distanceM, faceHitRadiusPct)
        const x1 = from.leftPct
        const y1 = from.topPct
        const x2 = to.leftPct
        const y2 = to.topPct
        const dx = x2 - x1
        const dy = y2 - y1
        const len = Math.hypot(dx, dy) || 1
        // Çizgi ok tabanında bitsin; uç = varış marker merkezi
        const trim = Math.min(1.55, len * 0.22)
        const lx2 = x2 - (dx / len) * trim
        const ly2 = y2 - (dy / len) * trim
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2
        const label = `${link.distance.toFixed(2)} · ${link.splitMs}ms`
        const isNew = newestLinkToIndex != null && link.toIndex === newestLinkToIndex

        return (
          <g key={link.id} className={isNew ? 'df-vec-pop' : undefined}>
            <line
              x1={x1}
              y1={y1}
              x2={lx2}
              y2={ly2}
              stroke={VEC_STROKE}
              strokeWidth="0.22"
              strokeLinecap="round"
              strokeDasharray="0.85 0.75"
            />
            <polygon
              points={arrowHeadPoints(x1, y1, x2, y2)}
              fill={VEC_FILL}
              stroke="rgba(10,10,11,0.35)"
              strokeWidth="0.08"
            />
            <rect
              x={mx - 8.5}
              y={my - 2.2}
              width="17"
              height="4.4"
              rx="0.5"
              fill="rgba(10,10,11,0.88)"
              stroke={VEC_LABEL_BORDER}
              strokeWidth="0.15"
            />
            <text
              x={mx}
              y={my + 0.3}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={VEC_LABEL}
              fontSize="1.85"
              fontFamily="ui-monospace, monospace"
              fontWeight="700"
            >
              {label}
            </text>
            <title>
              {t('dryFire.analytics.graphs.vectorTitle', {
                from: link.fromIndex,
                to: link.toIndex,
                dist: link.distance.toFixed(3),
                split: link.splitMs,
              })}
            </title>
          </g>
        )
      })}

      <style>{`
        @keyframes dfVecPop {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .df-vec-pop {
          animation: dfVecPop 0.4s ease-out both;
        }
      `}</style>
    </svg>
  )
}
