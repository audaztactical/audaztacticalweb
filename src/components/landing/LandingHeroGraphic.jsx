import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Crosshair,
  HeartPulse,
  LayoutDashboard,
  MessageSquare,
  Shield,
} from 'lucide-react'

/** @typedef {{ id: string, label: string, sub: string, x: string, y: string, accent?: 'green' | 'gold' | 'cyan' }} SchematicNode */

/** @type {SchematicNode[]} */
const NODES = [
  { id: 'siber_savunma', label: 'Siber Savunma', sub: 'Tehdit kalkanı', x: '50%', y: '12%', accent: 'green' },
  { id: 'istihbarat', label: 'Küresel Haber', sub: 'Canlı akış', x: '82%', y: '22%', accent: 'cyan' },
  { id: 'muhabere', label: 'Muhabere', sub: 'Şifreli', x: '14%', y: '38%', accent: 'gold' },
  { id: 'task_matrix', label: 'Görev Merkezi', sub: 'Görev · senkron', x: '50%', y: '42%', accent: 'green' },
  { id: 'cephanelik', label: 'Cephanelik', sub: 'Envanter · %87', x: '86%', y: '48%', accent: 'gold' },
  { id: 'tccc', label: 'TCCC', sub: 'Tahliye', x: '18%', y: '68%', accent: 'cyan' },
  { id: 'ors', label: 'ORS', sub: 'Risk Skoru', x: '78%', y: '72%', accent: 'green' },
]

const EDGES = [
  ['siber_savunma', 'task_matrix'],
  ['istihbarat', 'task_matrix'],
  ['muhabere', 'task_matrix'],
  ['cephanelik', 'task_matrix'],
  ['tccc', 'task_matrix'],
  ['ors', 'task_matrix'],
  ['siber_savunma', 'istihbarat'],
  ['muhabere', 'tccc'],
]

const THREAT_MATRIX = [
  ['●', '○', '●', '○'],
  ['○', '●', '○', '●'],
  ['●', '●', '○', '○'],
  ['○', '○', '●', '●'],
]

const TASK_ROWS = [
  { id: 'ALPHA-7', status: 'AKTİF', pct: 87 },
  { id: 'BRAVO-2', status: 'BEKLE', pct: 42 },
  { id: 'DELTA-1', status: 'HAZIR', pct: 100 },
]

const OPERATOR_TILES = [
  { to: '/dashboard', label: 'Ana Sayfa', sub: 'ORS · envanter · hazırlık', icon: LayoutDashboard },
  { to: '/antrenman', label: 'Antrenman', sub: 'Atış · CQB · FoF', icon: Crosshair },
  { to: '/mesajlar', label: 'Muhabere', sub: 'Taktik kanallar', icon: MessageSquare },
  { to: '/tccc', label: 'TCCC · Sağlık', sub: 'Tahliye · IFAK', icon: HeartPulse },
  { to: '/cephanelik', label: 'Cephanelik', sub: 'Silah · mühimmat', icon: Shield },
]

const TICKER_TEXT = ['Güvenli Bağlantı · Audaz Tactical', 'Operasyonel veri ağı · şifreli']
  .concat(['Güvenli Bağlantı · Audaz Tactical', 'Operasyonel veri ağı · şifreli'])
  .join(' · ')

/**
 * @param {{ node: SchematicNode }} props
 */
function HudNode({ node }) {
  const ring =
    node.accent === 'gold'
      ? 'border-[#ffaa00]/55 shadow-[0_0_18px_-4px_rgba(255,170,0,0.55)]'
      : node.accent === 'cyan'
        ? 'border-cyan-400/45 shadow-[0_0_18px_-4px_rgba(34,211,238,0.45)]'
        : 'border-emerald-400/50 shadow-[0_0_18px_-4px_rgba(52,211,153,0.5)]'

  const labelColor =
    node.accent === 'gold' ? 'text-[#ffaa00]' : node.accent === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'

  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: node.x, top: node.y }}
    >
      <motion.div
        className={`relative rounded-sm border bg-black/80 px-2.5 py-1.5 backdrop-blur-sm sm:px-3 sm:py-2 ${ring}`}
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span
          className="absolute -left-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.8)]"
          aria-hidden
        />
        <p className={`font-mono-technical text-[7px] font-bold uppercase tracking-[0.18em] sm:text-[8px] ${labelColor}`}>
          {node.label}
        </p>
        <p className="font-mono-technical text-[6px] tabular-nums text-app-text/55 sm:text-[7px]">{node.sub}</p>
      </motion.div>
    </div>
  )
}

function OperatorKarargahPanel() {
  return (
    <div className="flex h-full flex-col border-t border-emerald-500/15 bg-[#050607] lg:border-l lg:border-t-0">
      <div className="border-b border-emerald-500/10 px-3 py-2 sm:px-4">
        <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#ffaa00] sm:text-[9px]">
          Operatör Karargâh
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-1">
        {OPERATOR_TILES.map((tile) => {
          const Icon = tile.icon
          return (
            <Link
              key={tile.to}
              to={tile.to}
              className="group rounded-sm border border-white/10 bg-black/35 p-3 transition hover:border-emerald-500/35 hover:bg-emerald-950/20"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-sm border border-emerald-500/25 bg-emerald-950/30 p-1.5 text-emerald-400 transition group-hover:border-emerald-400/45">
                  <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.14em] text-app-text group-hover:text-emerald-300">
                    {tile.label}
                  </p>
                  <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">{tile.sub}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="border-t border-emerald-500/10 px-3 py-3 sm:px-4">
        <p className="font-mono-technical text-[7px] uppercase tracking-wider text-app-text/40">
          Güvenli Bağlantı · Audaz Tactical
        </p>
      </div>
    </div>
  )
}

/**
 * @param {Record<string, SchematicNode>} nodeMap
 */
function TopologyCanvas({ nodeMap, expanded }) {
  const canvasClass = expanded
    ? 'relative aspect-video min-h-[260px] w-full sm:min-h-[320px] md:min-h-[380px]'
    : 'relative aspect-video min-h-[220px] w-full sm:min-h-[280px] md:min-h-[340px]'

  return (
    <div className={canvasClass}>
      <svg className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(52,211,153,0.15)" />
            <stop offset="50%" stopColor="rgba(52,211,153,0.65)" />
            <stop offset="100%" stopColor="rgba(255,170,0,0.35)" />
          </linearGradient>
        </defs>
        {EDGES.map(([from, to]) => {
          const a = nodeMap[from]
          const b = nodeMap[to]
          if (!a || !b) return null
          return (
            <motion.line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="url(#edgeGrad)"
              strokeWidth="1"
              strokeDasharray="4 6"
              initial={{ pathLength: 0, opacity: 0.3 }}
              animate={{ pathLength: 1, opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )
        })}
        <circle cx="50%" cy="42%" r="28" fill="none" stroke="rgba(52,211,153,0.25)" strokeWidth="1" strokeDasharray="3 5" />
        <circle cx="50%" cy="42%" r="48" fill="none" stroke="rgba(255,170,0,0.12)" strokeWidth="1" />
      </svg>

      <div
        className="pointer-events-none absolute left-1/2 top-[42%] z-[5] -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        <div className="flex size-14 items-center justify-center rounded-full border border-emerald-400/40 bg-black/70 shadow-[0_0_24px_-4px_rgba(52,211,153,0.6)] sm:size-16">
          <span className="font-mono-technical text-[7px] font-bold uppercase tracking-widest text-emerald-300 sm:text-[8px]">
            CORE
          </span>
        </div>
      </div>

      {NODES.map((node) => (
        <HudNode key={node.id} node={node} />
      ))}

      <motion.div
        className="pointer-events-none absolute bottom-2 left-0 right-0 overflow-hidden border-t border-[#ffaa00]/10 bg-black/40 py-1"
        aria-hidden
      >
        <motion.p
          className="whitespace-nowrap font-mono-technical text-[7px] uppercase tracking-wider text-emerald-400/60"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        >
          {TICKER_TEXT}
        </motion.p>
      </motion.div>
    </div>
  )
}

function ThreatMatrixPanel() {
  return (
    <div className="border-b border-emerald-500/10 p-3 sm:p-4 md:border-b-0 md:border-r">
      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-emerald-400 sm:text-[9px]">
        Siber Tehdit Matrisi
      </p>
      <div className="mt-3 inline-grid grid-cols-4 gap-1.5">
        {THREAT_MATRIX.flatMap((row, ri) =>
          row.map((cell, ci) => (
            <span
              key={`${ri}-${ci}`}
              className={[
                'flex size-6 items-center justify-center rounded-sm border font-mono-technical text-[10px] sm:size-7',
                cell === '●'
                  ? 'border-emerald-400/50 bg-emerald-950/40 text-emerald-400 shadow-[0_0_10px_-2px_rgba(52,211,153,0.5)]'
                  : 'border-white/10 bg-black/40 text-app-text/25',
              ].join(' ')}
            >
              {cell}
            </span>
          )),
        )}
      </div>
      <p className="mt-2 font-mono-technical text-[7px] text-app-text/45">Tehdit: düşük · koruma aktif</p>
    </div>
  )
}

function TaskMatrixPanel() {
  return (
    <div className="p-3 sm:p-4">
      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-[#ffaa00] sm:text-[9px]">
        GÖREV MATRİSİ
      </p>
      <ul className="mt-3 space-y-2">
        {TASK_ROWS.map((row) => (
          <li key={row.id} className="flex items-center gap-2">
            <span className="w-16 shrink-0 font-mono-technical text-[8px] font-bold text-app-text/70">{row.id}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-[#ffaa00]/70"
                style={{ width: `${row.pct}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono-technical text-[7px] uppercase text-emerald-400/90">
              {row.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NetworkStatusPanel() {
  return (
    <div className="border-t border-emerald-500/10 p-3 sm:p-4 md:border-t-0 md:border-l">
      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-cyan-400 sm:text-[9px]">
        AĞ DURUMU
      </p>
      <ul className="mt-3 space-y-2 font-mono-technical text-[8px] uppercase text-app-text/60">
        <li className="flex justify-between gap-2">
          <span>Muhabere</span>
          <span className="text-emerald-400">ŞİFRELİ</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Küresel haber</span>
          <span className="text-emerald-400">Canlı</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>ORS motoru</span>
          <span className="text-[#ffaa00]">SENKRON</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Cephanelik</span>
          <span className="text-emerald-400">%87</span>
        </li>
      </ul>
    </div>
  )
}

/**
 * Statik HUD şematik — siber_savunma, task_matrix ve modül ağı.
 * @param {{ expanded?: boolean }} props
 */
export default function LandingHeroGraphic({ expanded = false }) {
  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]))

  return (
    <div className="relative overflow-hidden rounded-sm border border-emerald-500/20 bg-[#060809] shadow-[0_0_48px_-16px_rgba(52,211,153,0.25)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(52,211,153,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(52,211,153,0.12) 1px, transparent 1px),
            linear-gradient(rgba(255,170,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,170,0,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px, 48px 48px, 12px 12px, 12px 12px',
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.08)_0%,transparent_65%)]" aria-hidden />

      <div className="relative border-b border-emerald-500/15 px-3 py-2 sm:px-4">
        <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.35em] text-emerald-400/90 sm:text-[9px]">
          AUDAZ · TAKTİK VERİ TOPOLOJİSİ
        </p>
        <p className="mt-0.5 font-mono-technical text-[7px] uppercase tracking-wider text-app-text/40">
          {expanded ? 'Genişletilmiş topoloji · oturum aktif' : 'Canlı simülasyon'}
        </p>
      </div>

      {expanded ? (
        <div className="lg:grid lg:grid-cols-[1.55fr_0.85fr] lg:items-stretch">
          <TopologyCanvas nodeMap={nodeMap} expanded />
          <OperatorKarargahPanel />
        </div>
      ) : (
        <TopologyCanvas nodeMap={nodeMap} expanded={false} />
      )}

      <div className={expanded ? 'grid border-t border-emerald-500/15 md:grid-cols-3' : 'grid border-t border-emerald-500/15 md:grid-cols-2'}>
        <ThreatMatrixPanel />
        <TaskMatrixPanel />
        {expanded ? <NetworkStatusPanel /> : null}
      </div>
    </div>
  )
}
