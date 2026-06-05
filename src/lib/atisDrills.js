/** Özel atış türü seçimi */
export const ATIS_DRILL_CUSTOM = '__custom__'

/**
 * @typedef {{
 *   id: string
 *   name: string
 *   label: string
 * }} AtisDrillOption
 * @typedef {{ level: number, title: string, drills: AtisDrillOption[] }} AtisDrillLevel
 */

/** @type {AtisDrillLevel[]} */
export const ATIS_DRILL_LEVELS = [
  {
    level: 1,
    title: 'Seviye 1: Temel Mekanikler',
    drills: [
      {
        id: 'l1-draw-first',
        name: 'Draw & First Shot',
        label: 'DRAW & FIRST SHOT (Kılıftan Kütleye & İlk Atış)',
      },
      {
        id: 'l1-double-tap',
        name: 'Double Tap',
        label: 'DOUBLE TAP (Çift Hızlı Atış)',
      },
      {
        id: 'l1-ready',
        name: 'Ready Position',
        label: 'READY POSITION (Hazır Duruş / Hazır Pozisyon)',
      },
    ],
  },
  {
    level: 2,
    title: 'Seviye 2: Manipülasyon ve Geçiş',
    drills: [
      {
        id: 'l2-reload',
        name: 'Reload Drills',
        label: 'RELOAD DRILLS (Şarjör Değiştirme Taktikleri)',
      },
      {
        id: 'l2-rifle-pistol',
        name: 'Rifle to Pistol Transition',
        label: 'RIFLE TO PISTOL TRANSITION (Tüfekten Tabancaya Geçiş Drilli)',
      },
      {
        id: 'l2-malfunction',
        name: 'Malfunction Clearance',
        label: 'MALFUNCTION CLEARANCE (Silah Tutukluk Giderme )',
      },
    ],
  },
  {
    level: 3,
    title: 'Seviye 3: Dinamik ve Reaksiyon',
    drills: [
      {
        id: 'l3-mozambique',
        name: 'Mozambique Drill',
        label: 'MOZAMBIQUE DRILL (Mozambik Drilli - 2 Gövde, 1 Baş)',
      },
      {
        id: 'l3-multi-target',
        name: 'Multi-Target Transition',
        label: 'MULTI-TARGET TRANSITION (Çoklu Hedef Arası Geçiş)',
      },
    ],
  },
]

/**
 * UI etiketi — veritabanı `name` alanı değişmez.
 * @param {AtisDrillOption} drill
 */
export function getAtisDrillOptionLabel(drill) {
  return drill.label || drill.name
}

/** @param {string} drillKey */
export function resolveAtisDrillMeta(drillKey) {
  for (const tier of ATIS_DRILL_LEVELS) {
    const hit = tier.drills.find((d) => d.id === drillKey)
    if (hit) return { level: tier.level, drillName: hit.name, drillId: hit.id }
  }
  return { level: null, drillName: '', drillId: drillKey }
}
