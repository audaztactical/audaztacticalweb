import { isArmorySessionFieldLocked } from './inventoryFillLocks.js'

/** Tek kaynak: disabled + readOnly + görsel kilit sınıfları */
export const inventoryLockedFieldClass =
  'pointer-events-none cursor-not-allowed opacity-50 bg-neutral-800/50 border-cyan-500/35 text-slate-400/90'

/**
 * Kilitli cephanelik alanı için HTML input/select prop'ları — tek conditional.
 * @param {{
 *   group: 'weapon' | 'optic' | 'ammo'
 *   field: string
 *   label: string
 *   session: import('./inventoryFillLocks.js').ArmorySessionState | null | undefined
 *   baseClass: string
 * }} opts
 */
export function getInventoryFieldControlProps({ group, field, label, session, baseClass }) {
  const locked = isArmorySessionFieldLocked(session, group, field)
  return {
    name: field,
    'aria-label': label,
    disabled: locked,
    readOnly: locked,
    'data-inventory-locked': locked ? 'true' : 'false',
    'data-inventory-field': `${group}.${field}`,
    'aria-disabled': locked,
    className: locked ? `${baseClass} ${inventoryLockedFieldClass}` : baseClass,
  }
}
