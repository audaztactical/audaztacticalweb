/** @typedef {'targets' | 'cover' | 'cqb' | 'special'} RangeAssetCategory */

/**
 * @typedef {Object} RangeLayoutAssetDef
 * @property {string} type
 * @property {RangeAssetCategory} category
 * @property {string} label
 * @property {string} shortLabel
 * @property {string} color
 */

/** @typedef {{ id: string; title: string; items: RangeLayoutAssetDef[] }} RangeAssetGroup */

export const RANGE_WIDTH_M = 30
export const RANGE_HEIGHT_M = 60

/** @type {RangeAssetGroup[]} */
export const RANGE_ASSET_GROUPS = [
  {
    id: 'targets',
    title: 'HEDEF TİPLERİ',
    items: [
      {
        type: 'silhouette_paper',
        category: 'targets',
        label: 'Karton Silüet',
        shortLabel: 'SLH',
        color: '#f87171',
      },
      {
        type: 'steel_popper',
        category: 'targets',
        label: 'Metal Popper',
        shortLabel: 'POP',
        color: '#fb923c',
      },
      {
        type: 'moving_target',
        category: 'targets',
        label: 'Raylı Hareketli Hedef',
        shortLabel: 'MOV',
        color: '#fbbf24',
      },
    ],
  },
  {
    id: 'cover',
    title: 'SİPERLER & BARİKATLAR',
    items: [
      {
        type: 'concrete_wall',
        category: 'cover',
        label: 'Beton Blok',
        shortLabel: 'BET',
        color: '#94a3b8',
      },
      {
        type: 'tire_stack',
        category: 'cover',
        label: 'Lastik Yığını',
        shortLabel: 'LST',
        color: '#64748b',
      },
      {
        type: 'sandbag_barrier',
        category: 'cover',
        label: 'Kum Torbası',
        shortLabel: 'KUM',
        color: '#a8a29e',
      },
      {
        type: 'low_cover',
        category: 'cover',
        label: 'Alçak Siper',
        shortLabel: 'ALC',
        color: '#78716c',
      },
    ],
  },
  {
    id: 'cqb',
    title: 'CQB ODACIKLAR',
    items: [
      {
        type: 'center_fed_room',
        category: 'cqb',
        label: 'Merkez Girişli',
        shortLabel: 'MER',
        color: '#5ec8ff',
      },
      {
        type: 'corner_fed_room',
        category: 'cqb',
        label: 'Köşe Girişli',
        shortLabel: 'KSE',
        color: '#38bdf8',
      },
      {
        type: 'l_shape_wall',
        category: 'cqb',
        label: 'L-Duvar',
        shortLabel: 'L-D',
        color: '#0ea5e9',
      },
      {
        type: 'corridor_module',
        category: 'cqb',
        label: 'Koridor',
        shortLabel: 'KOR',
        color: '#0284c7',
      },
    ],
  },
  {
    id: 'special',
    title: 'ÖZEL EKİPMAN',
    items: [
      {
        type: 'strobe_light',
        category: 'special',
        label: 'Strobe Kule',
        shortLabel: 'STR',
        color: '#c084fc',
      },
      {
        type: 'speaker_array',
        category: 'special',
        label: 'Ses Simülatörü',
        shortLabel: 'SES',
        color: '#a78bfa',
      },
      {
        type: 'laser_gate',
        category: 'special',
        label: 'Kronometre Sensörü',
        shortLabel: 'LZR',
        color: 'var(--accent-color)',
      },
      {
        type: 'smoke_generator',
        category: 'special',
        label: 'Duman Cihazı',
        shortLabel: 'DMN',
        color: '#86efac',
      },
    ],
  },
]

/** @type {Record<string, RangeLayoutAssetDef>} */
export const RANGE_ASSET_INDEX = Object.fromEntries(
  RANGE_ASSET_GROUPS.flatMap((g) => g.items.map((item) => [item.type, item]))
)

/**
 * @param {string} type
 */
export function getRangeAssetDef(type) {
  return RANGE_ASSET_INDEX[type] ?? null
}
