import { ACTIVITY_RULES, REGIONS } from '../../lib/neural/neuralConfig'

/** @typedef {{ label: string; to: string|null; soon?: boolean }} LobeModule */

/**
 * Bölge UI meta + gerçek route'lar (prototip modülleri güncellendi).
 * @type {ReadonlyArray<{
 *   id: import('../../lib/neural/neuralConfig').NeuralRegionId
 *   name: string
 *   func: string
 *   col: string
 *   kind: 'c'|'b'|'s'
 *   code: string
 *   short: string
 *   src: string
 *   shareRule: string
 *   mods: LobeModule[]
 *   goTo: string
 * }>}
 */
export const LOBE_META = Object.freeze([
  {
    id: 'frontal',
    name: REGIONS.frontal.nameTr,
    func: 'Karar, planlama',
    col: '#5b8def',
    kind: 'c',
    code: 'FRN-01',
    short: 'frontal',
    src: 'FOF senaryoları ve kendi eğitim planların seviyeyi besler.',
    shareRule: 'FOF_DRILL',
    mods: [
      { label: 'FOF', to: '/antrenman?sector=fof' },
      { label: 'Eğitim planı', to: '/antrenman?sector=egitim' },
      { label: 'AAR Terminal', to: null, soon: true },
    ],
    goTo: '/antrenman?sector=fof',
  },
  {
    id: 'motor',
    name: REGIONS.motor.nameTr,
    func: 'Hareket',
    col: '#3fbf6f',
    kind: 'c',
    code: 'MTR-02',
    short: 'motor',
    src: 'Atış, CQB ve VBSS kayıtların motor korteksi besler.',
    shareRule: 'ATIS_DRILL',
    mods: [
      { label: 'Atış', to: '/antrenman?sector=atis' },
      { label: 'CQB', to: '/antrenman?sector=cqb' },
      { label: 'VBSS', to: '/antrenman?sector=vbss' },
    ],
    goTo: '/antrenman?sector=atis',
  },
  {
    id: 'parietal',
    name: REGIONS.parietal.nameTr,
    func: 'Uzamsal hesap',
    col: '#c9b52c',
    kind: 'c',
    code: 'PRT-03',
    short: 'parietal',
    src: 'Balistik profiller ve CQB kayıtları parietal lobu besler.',
    shareRule: 'BALLISTIC_PROFILE',
    mods: [
      { label: 'Balistik terminal', to: '/balistik' },
      { label: 'CQB', to: '/antrenman?sector=cqb' },
    ],
    goTo: '/balistik',
  },
  {
    id: 'occipital',
    name: REGIONS.occipital.nameTr,
    func: 'Görme',
    col: '#e8862a',
    kind: 'c',
    code: 'OCC-04',
    short: 'görme',
    src: 'Haber ağı ve kuru tetik seansları oksipital lobu besler.',
    shareRule: 'TIMER_DRYFIRE',
    mods: [
      { label: 'Haber ağı', to: '/istihbarat' },
      { label: 'Kuru tetik', to: '/taktik-timer' },
    ],
    goTo: '/istihbarat',
  },
  {
    id: 'temporal',
    name: REGIONS.temporal.nameTr,
    func: 'Hafıza, dil',
    col: '#36b9c9',
    kind: 'c',
    code: 'TMP-05',
    short: 'temporal',
    src: 'Kılavuz, brifing (forum) ve akademi temporal lobu besler.',
    shareRule: 'FORUM_POST',
    mods: [
      { label: 'Kılavuz', to: '/kilavuz' },
      { label: 'Brifing odası', to: '/forum' },
      { label: 'Akademi', to: '/akademi' },
    ],
    goTo: '/kilavuz',
  },
  {
    id: 'hippocampus',
    name: REGIONS.hippocampus.nameTr,
    func: 'Kayıt, hatıra',
    col: '#e0609a',
    kind: 'c',
    code: 'HPC-06',
    short: 'hipokampus',
    src: 'Ardışık aktif gün serisi (streak) hipokampusu besler.',
    shareRule: 'GUIDE_READ',
    mods: [{ label: 'Başarı takibi', to: '/basarilar' }],
    goTo: '/basarilar',
  },
  {
    id: 'cerebellum',
    name: REGIONS.cerebellum.nameTr,
    func: 'Koordinasyon, refleks',
    col: '#f0a53a',
    kind: 'b',
    code: 'CBL-07',
    short: 'beyincik',
    src: 'Tactical Timer ve kuru tetik seansları beyinciği besler.',
    shareRule: 'TIMER_STANDARD',
    mods: [
      { label: 'Tactical Timer', to: '/taktik-timer' },
      { label: 'Kuru tetik analizi', to: '/taktik-timer' },
    ],
    goTo: '/taktik-timer',
  },
  {
    id: 'stem',
    name: REGIONS.stem.nameTr,
    func: 'Hayati fonksiyonlar',
    col: '#e5534b',
    kind: 's',
    code: 'STM-08',
    short: 'sap',
    src: 'TCCC tatbikat ve gözlem kayıtları beyin sapını besler.',
    shareRule: 'TCCC_DRILL',
    mods: [{ label: 'TCCC paketi', to: '/tccc' }],
    goTo: '/tccc',
  },
])

export const LOBE_BY_ID = Object.freeze(Object.fromEntries(LOBE_META.map((l) => [l.id, l])))

/** Varsayılan yerleşim: [x oranı, y oranı, port yönü, hizalama] */
export const DEFAULT_LAYOUT = Object.freeze({
  frontal: [0.015, 0.2, 'pr', 'l'],
  temporal: [0.015, 0.62, 'pr', 'l'],
  hippocampus: [0.3, 1, 'pr', 'cb'],
  motor: [0.3, 0.015, 'pr', 'c'],
  parietal: [0.6, 0.015, 'pl', 'c'],
  occipital: [0.985, 0.2, 'pl', 'r'],
  cerebellum: [0.985, 0.62, 'pl', 'r'],
  stem: [0.7, 1, 'pl', 'cb'],
})

/**
 * Fill / kenardan kenara yerleşim (HUD alanlarını boş bırakır).
 * hizalama: l | r | ct (üst orta) | cb (alt orta)
 */
export const EDGE_LAYOUT = Object.freeze({
  frontal: [0, 0.3, 'pr', 'l'],
  temporal: [0, 0.58, 'pr', 'l'],
  motor: [0.38, 0, 'pr', 'ct'],
  parietal: [0.62, 0, 'pl', 'ct'],
  occipital: [1, 0.3, 'pl', 'r'],
  cerebellum: [1, 0.58, 'pl', 'r'],
  hippocampus: [0.38, 1, 'pr', 'cb'],
  stem: [0.62, 1, 'pl', 'cb'],
})

export const EDGE_MARGIN_PX = 24
/** HUD kaçınma (kart varsayılanı) */
export const HUD_SAFE = Object.freeze({
  topLeft: { w: 300, h: 140 },
  topRight: { w: 360, h: 60 },
  bottomLeft: { w: 300, h: 56 },
})

export const HINT_STORAGE_KEY = 'audaz-ob-hint-visits'
export const HINT_MAX_VISITS = 3

export const MOBILE_ORDER = Object.freeze([
  'frontal',
  'motor',
  'parietal',
  'occipital',
  'temporal',
  'hippocampus',
  'cerebellum',
  'stem',
])

/**
 * @param {string} ruleKey
 */
export function shareLabelForRule(ruleKey) {
  const rule = ACTIVITY_RULES[ruleKey]
  if (!rule?.weights) return ''
  return Object.entries(rule.weights)
    .map(([r, w]) => {
      const short = LOBE_BY_ID[r]?.short ?? r
      return `<b>${short}</b> %${Math.round(Number(w) * 100)}`
    })
    .join(' · ')
}

/**
 * @param {string} ruleKey
 * @returns {{ id: string; short: string; pct: number }[]}
 */
export function shareEntriesForRule(ruleKey) {
  const rule = ACTIVITY_RULES[ruleKey]
  if (!rule?.weights) return []
  return Object.entries(rule.weights).map(([r, w]) => ({
    id: r,
    short: LOBE_BY_ID[r]?.short ?? r,
    pct: Math.round(Number(w) * 100),
  }))
}

export const UI_STORAGE_KEY = 'audaz-ob-ui'

/**
 * @returns {{ pos: { d: Record<string, number[]>; m: Record<string, number[]> }; col: Record<string, boolean>; hid: Record<string, boolean> }}
 */
export function loadUiPrefs() {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY)
    if (!raw) return { pos: { d: {}, m: {} }, col: {}, hid: {} }
    const p = JSON.parse(raw)
    return {
      pos: { d: p?.pos?.d ?? {}, m: p?.pos?.m ?? {} },
      col: p?.col ?? {},
      hid: p?.hid ?? {},
    }
  } catch {
    return { pos: { d: {}, m: {} }, col: {}, hid: {} }
  }
}

/** @param {ReturnType<typeof loadUiPrefs>} ui */
export function saveUiPrefs(ui) {
  try {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(ui))
  } catch {
    /* quota / private */
  }
}
