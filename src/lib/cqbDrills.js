/** Özel CQB parkuru seçimi */
export const CQB_DRILL_CUSTOM = '__cqb_custom__'

/**
 * @typedef {{
 *   id: string
 *   name: string
 *   label: string
 * }} CqbDrillOption
 * @typedef {{ level: number; title: string; drills: CqbDrillOption[] }} CqbDrillLevel
 */

/** @type {CqbDrillLevel[]} */
export const CQB_DRILL_LEVELS = [
  {
    level: 1,
    title: 'Seviye 1: Temel Oda Girişleri',
    drills: [
      {
        id: 'l1-single-room',
        name: 'Single Room Clearing',
        label: 'SINGLE ROOM CLEARING (Tek Oda Temizleme)',
      },
      {
        id: 'l1-corner-entry',
        name: 'Corner Check & Entry',
        label: 'CORNER CHECK & ENTRY (Köşe Kontrolü ve Giriş)',
      },
      {
        id: 'l1-fatal-funnel',
        name: 'Fatal Funnel Transition',
        label: 'FATAL FUNNEL TRANSITION (Ölüm Hunisi Geçişi)',
      },
    ],
  },
  {
    level: 2,
    title: 'Seviye 2: Tim Koordinasyonu',
    drills: [
      {
        id: 'l2-high-low',
        name: 'High-Low Entry Technique',
        label: 'HIGH-LOW ENTRY TECHNIQUE (Yüksek-Alçak Giriş Tekniği)',
      },
      {
        id: 'l2-cross-entry',
        name: 'Cross Entry / Crossover',
        label: 'CROSS ENTRY / CROSSOVER (Çapraz Giriş / Geçiş)',
      },
      {
        id: 'l2-hook-entry',
        name: 'Hook Entry',
        label: 'HOOK ENTRY (Kanca Giriş Tekniği)',
      },
    ],
  },
  {
    level: 3,
    title: 'Seviye 3: Dinamik Senaryolar',
    drills: [
      {
        id: 'l3-multi-room',
        name: 'Multi-Room & Corridor Clearing',
        label: 'MULTI-ROOM & CORRIDOR CLEARING (Çoklu Oda ve Koridor Temizleme)',
      },
      {
        id: 'l3-hostage',
        name: 'Hostage Rescue',
        label: 'HOSTAGE RESCUE / REHİNELİ ODALAR (Rehineli Oda Kurtarma)',
      },
      {
        id: 'l3-nvg-lowlight',
        name: 'NVG & Low-Light Night Operations',
        label: 'NVG & LOW-LIGHT NIGHT OPERATIONS (Gece / Düşük Işık Operasyonu)',
      },
    ],
  },
]

/**
 * @param {CqbDrillOption} drill
 */
export function getCqbDrillOptionLabel(drill) {
  return drill.label || drill.name
}
