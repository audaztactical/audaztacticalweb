import { Lock, Unlock } from 'lucide-react'
import { INVENTORY_UNLOCK_WARNING } from '../../lib/inventoryFillLocks.js'

export const lockedInputClass =
  'cursor-not-allowed border-cyan-500/25 bg-black/25 text-slate-300/85 focus:border-cyan-500/25'

/**
 * @param {{ show: boolean }} props
 */
export function OverrideMarker({ show }) {
  if (!show) return null
  return (
    <span
      className="inline-block size-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.75)]"
      title="Manuel değiştirildi — Cephanelik ile senkron değil"
      aria-hidden
    />
  )
}

/**
 * @param {{ onUnlock: () => void }} props
 */
export function InventorySectionLockBar({ onUnlock }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-cyan-500/30 bg-cyan-950/25 px-2.5 py-2">
      <span className="flex items-center gap-1.5 font-mono-technical text-[9px] uppercase tracking-wider text-cyan-200/90">
        <Lock className="size-3 shrink-0" aria-hidden />
        Cephanelik verisi · salt okunur
      </span>
      <button type="button" className={unlockBtnClass} onClick={onUnlock}>
        <Unlock className="size-3" aria-hidden />
        Kilidi Aç
      </button>
    </div>
  )
}

/**
 * @param {{ open: boolean, onCancel: () => void, onConfirm: () => void }} props
 */
export function InventoryUnlockModal({ open, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/75 p-3 sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Kapat" onClick={onCancel} />
      <div className="relative z-[1] w-full max-w-md rounded-lg border border-amber-500/40 bg-app-bg p-4 shadow-2xl">
        <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
          Kilidi Aç
        </p>
        <p className="mt-3 font-mono-technical text-xs leading-relaxed text-slate-200">{INVENTORY_UNLOCK_WARNING}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={cancelBtnClass} onClick={onCancel}>
            Vazgeç
          </button>
          <button type="button" className={confirmBtnClass} onClick={onConfirm}>
            Evet, Düzenle
          </button>
        </div>
      </div>
    </div>
  )
}

const unlockBtnClass =
  'inline-flex items-center gap-1 rounded border border-cyan-500/40 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/10'
const cancelBtnClass =
  'flex-1 rounded border border-white/15 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/70 hover:bg-white/5 sm:flex-none'
const confirmBtnClass =
  'flex-1 rounded border border-amber-500/45 bg-amber-500/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500/18 sm:flex-none'
