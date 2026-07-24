/**
 * Audaz Tactical Timer — genişletilebilir mod kataloğu.
 * @typedef {'standard-shot' | 'dry-fire' | 'fof' | 'structural-frame'} TimerModeId
 */

/**
 * @typedef {Object} TimerModeDef
 * @property {TimerModeId} id
 * @property {string} titleKey
 * @property {string} descriptionKey
 * @property {import('lucide-react').LucideIcon} icon
 * @property {string} opsCode
 * @property {boolean} available  false = stub / yakında
 */

import { Crosshair, Flame, Scan, Target } from 'lucide-react'

/** @type {TimerModeDef[]} */
export const TIMER_MODES = [
  {
    id: 'standard-shot',
    titleKey: 'modes.standard-shot.title',
    descriptionKey: 'modes.standard-shot.description',
    icon: Crosshair,
    opsCode: 'TMR-01',
    available: true,
  },
  {
    id: 'dry-fire',
    titleKey: 'modes.dry-fire.title',
    descriptionKey: 'modes.dry-fire.description',
    icon: Target,
    opsCode: 'TMR-02',
    available: true,
  },
  {
    id: 'fof',
    titleKey: 'modes.fof.title',
    descriptionKey: 'modes.fof.description',
    icon: Flame,
    opsCode: 'TMR-03',
    available: false,
  },
  {
    id: 'structural-frame',
    titleKey: 'modes.structural-frame.title',
    descriptionKey: 'modes.structural-frame.description',
    icon: Scan,
    opsCode: 'TMR-04',
    available: false,
  },
]

/**
 * @param {string | null | undefined} id
 * @returns {TimerModeDef | null}
 */
export function findTimerMode(id) {
  if (!id) return null
  return TIMER_MODES.find((m) => m.id === id) ?? null
}
