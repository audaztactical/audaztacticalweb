import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Crosshair,
  Package,
  Ruler,
  Scan,
  Tag,
  Warehouse,
  Wrench,
  X,
} from 'lucide-react'

/** @param {unknown} v */
function drawerToStr(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** @param {unknown} v */
function drawerToNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {{ row: Record<string, unknown> | null, onClose: () => void, needsMaintenance: (iso: string | undefined) => boolean }} props
 */
export default function InventoryDrawer({ row, onClose, needsMaintenance }) {
  return (
    <AnimatePresence>
      {row ? (
        <Motion.div
          key={row.id}
          className="fixed inset-0 z-[76]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <Motion.aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-app-bg/95 shadow-[-24px_0_48px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.28 }}
          >
            <DrawerContent row={row} onClose={onClose} needsMaintenance={needsMaintenance} />
          </Motion.aside>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * @param {{ row: Record<string, unknown>, onClose: () => void, needsMaintenance: (iso: string | undefined) => boolean }} props
 */
function DrawerContent({ row, onClose, needsMaintenance }) {
  const iso = drawerToStr(row.lastMaintenanceAt)
  const needs = needsMaintenance(iso)
  const isWeapon = drawerToStr(row.category) === 'Silah'

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-accent">
          <Warehouse className="size-5" strokeWidth={1.5} aria-hidden />
          <span className="font-mono-technical text-xl font-bold tabular-nums">{drawerToNum(row.quantity)}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-app-text/70 transition hover:bg-white/10 hover:text-app-text"
          aria-label="Kapat"
        >
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 space-y-0 overflow-y-auto">
        <SpecRow Icon={Crosshair} value={drawerToStr(row.name)} accent />
        <SpecRow Icon={Tag} value={drawerToStr(row.category)} />
        <SpecRow Icon={Package} value={drawerToStr(row.brand) || '—'} />
        <SpecRow Icon={Ruler} value={drawerToStr(row.calibre) || '—'} />
        <SpecRow Icon={Scan} value={drawerToStr(row.serialNo) || '—'} mono />

        {isWeapon ? (
          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-app-text/70">
                <Calendar className="size-4" strokeWidth={1.25} aria-hidden />
                <span className="font-mono-technical text-sm tabular-nums text-app-text">
                  {iso ? iso.slice(0, 10).replace(/-/g, '.') : '—'}
                </span>
              </div>
              <MaintenanceBadge needs={needs} />
            </div>
          </div>
        ) : (
          <div className="border-t border-white/10 px-4 py-4">
            <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/30 py-6">
              <Package className="size-10 text-accent/50" strokeWidth={1} aria-hidden />
              <span className="font-mono-technical text-4xl font-bold tabular-nums text-accent">
                {drawerToNum(row.quantity)}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/** @param {{ Icon: typeof Tag, value: string, accent?: boolean, mono?: boolean }} props */
function SpecRow(props) {
  const Icon = props.Icon
  const { value, accent, mono } = props
  return (
    <div className="flex items-center gap-4 border-b border-white/10 px-4 py-3.5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/5">
        <Icon className="size-5 text-accent/90" strokeWidth={1.4} aria-hidden />
      </div>
      <p
        className={`min-w-0 flex-1 truncate text-sm ${accent ? 'font-display font-bold text-app-text' : 'text-app-text/90'} ${mono ? 'font-mono-technical tabular-nums' : ''}`}
      >
        {value || '—'}
      </p>
    </div>
  )
}

/** @param {{ needs: boolean }} props */
function MaintenanceBadge({ needs }) {
  if (needs) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-orange-500/40 bg-orange-950/35 px-2 py-1 text-orange-300">
        <AlertTriangle className="size-4" strokeWidth={1.75} aria-hidden />
        <Wrench className="size-4" strokeWidth={1.5} aria-hidden />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/35 bg-emerald-950/25 px-2 py-1 text-emerald-400">
      <CheckCircle2 className="size-4" strokeWidth={1.75} aria-hidden />
    </span>
  )
}
