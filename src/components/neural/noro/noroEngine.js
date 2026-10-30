/**
 * NÖRO — saf olay → mesaj / niyet / motivasyon (Firebase yok).
 */

import { REGION_IDS, DAILY_CAP } from '../../../lib/neural/neuralConfig'
import {
  ADV,
  ACT_LABEL,
  SCI,
  MOTIVATION,
  DRAG_LINES,
  WELCOME,
  EMPTY_USER,
  OPSEC_WARN,
  lineForRegion,
  pick,
  regionName,
  scoreLine,
} from './noroCopy'

export const AUTO_MSG_DAY_CAP = 3
export const MOTIVATION_REPEAT_WINDOW = 20
export const DRAG_COOLDOWN_MS = 2_000
export const DRAG_SESSION_CAP = 30
export const DRAG_MIN_DISTANCE_PX = 40
export const DRAG_RECENT_WINDOW = 6

/** OPSEC — prototip regex seti */
export const OPSEC_PATTERNS = [
  /\b\d{1,3}[.,]\d{3,}\s*°?\s*[NSEWKGDB]?\b/i,
  /\d{1,3}\s*°\s*\d{1,2}/,
  /\b\d{2}\s?[A-ZÇĞİÖŞÜ]{1,3}\s?\d{2,4}\b/,
  /(\+?90[\s-]?)?0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/,
  /\b\d{1,2}[A-Z]{3}\s?\d{4,10}\b/,
  /(koordinat|operasyon (bölgesi|yeri|saati)|baskın|hedef adres|şüphelinin ad|muhbir|istihbarat kaynağ|konuşlan|devriye güzergâh|devriye güzergah)/i,
]

/**
 * @param {string} t
 */
export function isOpsecRisky(t) {
  return OPSEC_PATTERNS.some((r) => r.test(String(t ?? '')))
}

export function opsecWarnText() {
  return OPSEC_WARN
}

/**
 * Türkçe karakter / ek sadeleştirme (eşleme için).
 * @param {string} s
 */
export function normalizeTr(s) {
  return String(s ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â|ê|î|û/g, (c) => ({ â: 'a', ê: 'e', î: 'i', û: 'u' })[c] || c)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** @type {Record<string, string[]>} */
export const REGION_ALIASES = Object.freeze({
  frontal: ['frontal', 'karar', 'planlama', 'aar'],
  motor: ['motor', 'atis', 'ates', 'tetik', 'namlu'],
  parietal: ['parietal', 'balistik', 'hesap'],
  occipital: ['oksipital', 'occipital', 'gorsel', 'istihbarat', 'video'],
  temporal: ['temporal', 'doktrin', 'rehber', 'bilgi'],
  hippocampus: ['hipokampus', 'hippocampus', 'hafiza', 'seri'],
  cerebellum: ['beyincik', 'cerebellum', 'timer', 'refleks'],
  stem: ['sap', 'stem', 'beyin sapi', 'tccc', 'turnike'],
})

/**
 * @param {Record<string, number>|undefined} gains
 */
export function primaryRegionFromGains(gains) {
  if (!gains || typeof gains !== 'object') return 'motor'
  let best = 'motor'
  let max = -1
  for (const id of REGION_IDS) {
    const v = Number(gains[id]) || 0
    if (v > max) {
      max = v
      best = id
    }
  }
  return best
}

/**
 * @param {string} dayKey
 * @param {number} used
 */
export function canEmitAutoMessage(dayKey, used) {
  return Boolean(dayKey) && Number(used) < AUTO_MSG_DAY_CAP
}

/**
 * @param {Record<string, number>} prevLv
 * @param {Record<string, number>} nextLv
 * @param {Array<[string, string]>} edges
 */
export function detectNewBridges(prevLv, nextLv, edges) {
  /** @type {Array<[string, string]>} */
  const out = []
  for (const [a, b] of edges) {
    const was = (prevLv[a] || 0) >= 3 && (prevLv[b] || 0) >= 3
    const now = (nextLv[a] || 0) >= 3 && (nextLv[b] || 0) >= 3
    if (!was && now) out.push([a, b])
  }
  return out
}

export const REGION_EDGES = Object.freeze([
  ['frontal', 'motor'],
  ['frontal', 'parietal'],
  ['motor', 'cerebellum'],
  ['parietal', 'occipital'],
  ['temporal', 'hippocampus'],
  ['stem', 'cerebellum'],
  ['occipital', 'temporal'],
  ['frontal', 'temporal'],
])

/**
 * @param {string} tag
 * @param {string[]} recentIds son 20 mesajdaki motivasyon id'leri
 */
export function pickMotivation(tag, recentIds = []) {
  const recent = new Set(recentIds.slice(-MOTIVATION_REPEAT_WINDOW))
  const pool = MOTIVATION.filter((m) => m.tags.includes(tag) && !recent.has(m.id))
  const fallback = MOTIVATION.filter((m) => m.tags.includes('generic') && !recent.has(m.id))
  const list = pool.length ? pool : fallback.length ? fallback : MOTIVATION
  const m = pick(list)
  return m
}

/**
 * ~1/3 ihtimalle gaz cümlesi ekle (milestone etiketlerinde daha yüksek).
 * @param {string} text
 * @param {string|null} tag
 * @param {string[]} recentIds
 * @param {boolean} [force]
 */
export function maybeAppendMotivation(text, tag, recentIds, force = false) {
  if (!tag && !force) return { text, motivationId: null }
  const roll = force || Math.random() < (tag && tag !== 'generic' ? 0.55 : 0.33)
  if (!roll) return { text, motivationId: null }
  const m = pickMotivation(tag || 'generic', recentIds)
  return { text: `${text}\n\n${m.text}`, motivationId: m.id }
}

/**
 * @param {object} p
 * @param {Record<string, number>} p.gains
 * @param {number|null} p.score
 * @param {{ bonus?: boolean; cap?: boolean; typeCap?: boolean; streakBonus?: number }} p.flags
 * @param {number} p.streak
 * @param {Record<string, number>} p.prevLevels
 * @param {Record<string, number>} p.nextLevels
 * @param {string|null} [p.aarReminder]
 * @param {string[]} [p.recentMotivationIds]
 */
export function buildEventReaction(p) {
  const { gains, score, flags, streak, prevLevels, nextLevels, aarReminder, recentMotivationIds = [] } = p
  const id = primaryRegionFromGains(gains)
  const g0 = Number(gains[id]) || 0
  /** @type {string[]} */
  const parts = []
  /** @type {string[]} */
  const usedMot = []

  if (flags?.cap || flags?.typeCap) {
    if (g0 <= 0) {
      parts.push(
        `${regionName(id)} bugünlük doydu (${DAILY_CAP} puan sınırı). Beyin de kas gibi, dinlenince büyür. Yarın devam.`,
      )
      return { primaryId: id, texts: parts, offerAar: false, motivationIds: usedMot }
    }
  }

  let h = lineForRegion(id, g0)
  if (score != null && Number.isFinite(score)) {
    h += ` ${scoreLine(Number(score))}`
  }

  const side = Object.entries(gains || {}).filter(([r, g]) => r !== id && Number(g) > 0.05)
  if (side.length) {
    h += ` ${pick(['Sekme puanlar:', 'Yan etkiler:', 'Bonus olarak:'])} ${side
      .map(([r, g]) => `${regionName(r)} +${Math.round(Number(g))}`)
      .join(', ')}.`
  }

  if (flags?.bonus) {
    h += `\n${regionName(id)} tozlanmıştı, geri dönüş bonusu: puanlar 1,5 kat. Unutulan beceri sıfırdan öğrenilenden hızlı geri gelir.`
    const add = maybeAppendMotivation(h, 'return', [...recentMotivationIds, ...usedMot], true)
    h = add.text
    if (add.motivationId) usedMot.push(add.motivationId)
  } else if (score != null && Number(score) < 75) {
    const add = maybeAppendMotivation(h, 'low_score', [...recentMotivationIds, ...usedMot])
    h = add.text
    if (add.motivationId) usedMot.push(add.motivationId)
  } else {
    const add = maybeAppendMotivation(h, 'generic', [...recentMotivationIds, ...usedMot])
    h = add.text
    if (add.motivationId) usedMot.push(add.motivationId)
  }

  if (aarReminder) {
    h += `\nGeçen sefer “${aarReminder}” demiştin. Uygulayabildin mi?`
  }

  parts.push(h)

  /** @type {string[]} */
  const ex = []
  let leveled = false
  for (const rid of REGION_IDS) {
    const pl = Number(prevLevels[rid]) || 0
    const nl = Number(nextLevels[rid]) || 0
    if (nl > pl) {
      leveled = true
      let line =
        nl >= 10
          ? `${regionName(rid)} lv 10! Bu bölgede öğrenecek bir şey kalmadı.`
          : `Seviye atladı: ${regionName(rid)} artık lv ${nl}! ${pick(['Yeni nöronlar doğdu.', 'Bağlantılar çoğalıyor.', 'Haritada yeni ışıklar yandı.'])}`
      const add = maybeAppendMotivation(line, 'level_up', [...recentMotivationIds, ...usedMot], true)
      line = add.text
      if (add.motivationId) usedMot.push(add.motivationId)
      ex.push(line)
    }
  }

  for (const [a, b] of detectNewBridges(prevLevels, nextLevels, REGION_EDGES)) {
    ex.push(
      `Köprü kuruldu: ${regionName(a)} ↔ ${regionName(b)}. ${pick(['İki bölge artık aynı dili konuşuyor.', 'Ağ birleşiyor.', 'Bilgi çift şeritten akıyor.'])}`,
    )
  }

  const streakBonus = Number(flags?.streakBonus) || 0
  if ((streakBonus > 0 || streak >= 2) && streak >= 2) {
    let streakTag = 'generic'
    if (streak === 3) streakTag = 'streak_3'
    else if (streak === 7) streakTag = 'streak_7'
    else if (streak === 14) streakTag = 'streak_14'
    else if (streak === 30) streakTag = 'streak_30'
    else if (streak % 7 === 0) streakTag = 'streak_7'
    let line =
      streak % 7 === 0
        ? `${streak} günlük seri! Hipokampus madalya hazırlatıyor.`
        : `Seri ${streak} gün. Hipokampus "bu iş ciddi" diye not aldı.`
    const force = streak === 3 || streak === 7 || streak === 14 || streak === 30
    const add = maybeAppendMotivation(line, streakTag, [...recentMotivationIds, ...usedMot], force)
    line = add.text
    if (add.motivationId) usedMot.push(add.motivationId)
    ex.push(line)
  }

  if (flags?.cap || flags?.typeCap) {
    ex.push(`${regionName(id)} bugünkü ${DAILY_CAP} puan sınırına ulaştı. Daha fazlası bugün sayılmaz.`)
  }

  if (ex.length) parts.push(ex.join('\n\n'))
  void leveled

  return { primaryId: id, texts: parts, offerAar: id !== 'frontal', motivationIds: usedMot }
}

/**
 * @param {object} p
 * @param {number} p.daysSince
 * @param {Array<{ id: string; idleDays: number; decayLoss: number; daysToDecay: number; decaying: boolean; level: number }>} p.regions
 * @param {number} p.streak
 * @param {string[]} [p.recentMotivationIds]
 */
export function buildBriefing(p) {
  const { daysSince, regions, streak, recentMotivationIds = [] } = p
  const n = Math.max(1, Math.floor(daysSince))
  /** @type {string[]} */
  const parts = []
  /** @type {string[]} */
  const usedMot = []

  const started = regions.filter((r) => r.decaying && r.decayLoss > 0.5)
  const warn = regions.filter((r) => !r.decaying && r.daysToDecay > 0 && r.daysToDecay <= 7)

  started.forEach((r) => {
    parts.push(
      `${regionName(r.id)} ${Math.round(r.idleDays)} gündür sessiz, sönmeye başladı −${r.decayLoss.toFixed(0)}. ${SCI[/** @type {keyof typeof SCI} */ (r.id)] || ''}`,
    )
  })

  warn.forEach((r) => {
    parts.push(
      `${regionName(r.id)} için ${Math.ceil(r.daysToDecay)} gün kaldı, sonra sönme başlıyor. Ufak bir "${ACT_LABEL[/** @type {keyof typeof ACT_LABEL} */ (r.id)]}" yeter.`,
    )
  })

  if (streak <= 0 && n >= 2) {
    parts.push('Seri yok; bugün bir kayıtla başlatabilirsin.')
  }

  if (!parts.length) {
    let hello = pick([
      `${n} gün geçti. Sakin; kimse paslanmıyor, harita yerli yerinde.`,
      `${n} gün geçti. Ortalık sessiz, beyin dinleniyor. Sen de dinlen ama çok değil.`,
    ])
    if (n >= 5) {
      const add = maybeAppendMotivation(hello, 'comeback', recentMotivationIds, true)
      hello = add.text
      if (add.motivationId) usedMot.push(add.motivationId)
    }
    return { texts: [hello], motivationIds: usedMot }
  }

  parts.unshift(`${n} gün geçti, haritayı taradım.`)
  return { texts: [parts.join('\n\n')], motivationIds: usedMot }
}

/**
 * @param {'rapor'|'oneri'|'zayif'} q
 * @param {object} view
 */
export function buildQuickAnswer(q, view) {
  const regions = view?.regions || {}
  const ranked = REGION_IDS.map((id) => [id, Number(regions[id]?.level) || 0]).sort(
    (a, b) => a[1] - b[1],
  )
  const weak = /** @type {string} */ (ranked[0][0])
  const strong = /** @type {string} */ (ranked[ranked.length - 1][0])

  if (q === 'rapor') {
    const ors = Math.round(
      (REGION_IDS.reduce((a, id) => a + (Number(regions[id]?.level) || 0), 0) / 8) * 10,
    )
    const dec = REGION_IDS.filter((id) => regions[id]?.decaying)
    return {
      text: `Durum raporu: OHP ${ors}. En güçlü ${regionName(strong)} lv ${ranked[ranked.length - 1][1]}, en zayıf ${regionName(weak)} lv ${ranked[0][1]}. ${
        dec.length
          ? `Sönen bölge sayısı ${dec.length}: ${dec.map(regionName).join(', ')}.`
          : 'Sönen bölge yok, harita temiz.'
      } ${
        Number(view?.streak) >= 2
          ? `Serin ${view.streak} gün, devam.`
          : 'Seri yok; bugün bir kayıtla başlatabilirsin.'
      }`,
    }
  }

  if (q === 'oneri') {
    /** @type {Array<[number, string]>} */
    const items = []
    REGION_IDS.forEach((id) => {
      if (regions[id]?.decaying) items.push([0, id])
    })
    REGION_IDS.forEach((id) => {
      const k = Number(regions[id]?.daysToDecay)
      if (k > 0 && k <= 7) items.push([1, id])
    })
    ranked.slice(0, 3).forEach(([r]) => items.push([2, /** @type {string} */ (r)]))
    const seen = new Set()
    const top = items.filter(([, r]) => !seen.has(r) && seen.add(r)).slice(0, 3)
    const links = top.map(([, r]) => ({
      regionId: r,
      to: goToForRegion(r),
      label: ACT_LABEL[/** @type {keyof typeof ACT_LABEL} */ (r)] || regionName(r),
    }))
    const body =
      'Bugün için önerim:\n' +
      top
        .map(
          ([t, r], i) =>
            `${i + 1}) ${regionName(r)} ${t === 0 ? 'sönüyor, ' : t === 1 ? 'yakında sönecek, ' : ''}${ACT_LABEL[/** @type {keyof typeof ACT_LABEL} */ (r)]}.`,
        )
        .join('\n') +
      '\nÜçünü yaparsan harita bayram eder.'
    return { text: body, links }
  }

  return {
    text: `En zayıf yerin ${regionName(weak)}, lv ${ranked[0][1]}. ${ADV[/** @type {keyof typeof ADV} */ (weak)]} Ayıp değil, herkesin bir beyin sapı vardır.`,
    links: [
      {
        regionId: weak,
        to: goToForRegion(weak),
        label: ACT_LABEL[/** @type {keyof typeof ACT_LABEL} */ (weak)],
      },
    ],
  }
}

/**
 * @param {string} regionId
 * @param {object} view
 */
export function buildRegionStatus(regionId, view) {
  const r = view?.regions?.[regionId] || {}
  const lv = Number(r.level) || 0
  const decaying = Boolean(r.decaying)
  const dtd = Number(r.daysToDecay) || 0
  let extra = ''
  if (decaying) extra = ` Sönme aktif (−${Number(r.decayLoss || 0).toFixed(0)}).`
  else if (dtd > 0 && dtd <= 7) extra = ` Sönmeye ${Math.ceil(dtd)} gün.`
  return {
    text: `${regionName(regionId)} lv ${lv}.${extra} ${ADV[/** @type {keyof typeof ADV} */ (regionId)] || ''}`,
    links: [
      {
        regionId,
        to: goToForRegion(regionId),
        label: ACT_LABEL[/** @type {keyof typeof ACT_LABEL} */ (regionId)],
      },
    ],
  }
}

/**
 * @param {string} id
 */
export function goToForRegion(id) {
  const map = {
    frontal: '/antrenman?sector=fof',
    motor: '/antrenman?sector=atis',
    parietal: '/balistik',
    occipital: '/istihbarat',
    temporal: '/kilavuz',
    hippocampus: '/antrenman',
    cerebellum: '/taktik-timer',
    stem: '/antrenman?sector=tccc',
  }
  return map[/** @type {keyof typeof map} */ (id)] || '/antrenman'
}

/**
 * @param {boolean} hasActivity
 */
export function buildWelcome(hasActivity) {
  return hasActivity ? WELCOME : EMPTY_USER
}

/**
 * Serbest metin → niyet.
 * @param {string} raw
 * @returns {{ kind: string; regionId?: string; query?: string }}
 */
export function detectIntent(raw) {
  const t = normalizeTr(raw)
  if (!t) return { kind: 'empty' }

  // Bu sayfa / ekran → önce sayfa yardımı (genel onboarding'den önce)
  if (
    t.includes('bu sayfa') ||
    t.includes('bu ekran') ||
    t.includes('burada ne') ||
    t.includes('sayfa tanit') ||
    t.includes('burasi ne') ||
    t.includes('burada ne yapiyorum') ||
    (t.includes('nasil kullan') && (t.includes('burada') || t.includes('sayfa')))
  ) {
    return { kind: 'page_help' }
  }

  // Genel kullanım / onboarding (rehber başlangıç)
  if (
    t.includes('bu sistemi') ||
    t.includes('sistemi nasil') ||
    t.includes('adim adim') ||
    t.includes('tarif et') ||
    t.includes('nereden basla') ||
    t.includes('yeni basladim') ||
    t.includes('ne yapabilirim') ||
    t.includes('site ne ise') ||
    t.includes('platform ne') ||
    ((t.includes('nasil kullanirim') || t.includes('nasil kullanilir') || t === 'nasil kullan') &&
      !t.includes('balistik') &&
      !t.includes('timer') &&
      !t.includes('atis') &&
      !t.includes('sayfa') &&
      !t.includes('silah') &&
      !t.includes('envanter') &&
      !t.includes('grup') &&
      !t.includes('forum'))
  ) {
    return { kind: 'onboard' }
  }

  for (const id of REGION_IDS) {
    const aliases = REGION_ALIASES[id] || []
    if (aliases.some((a) => t.includes(normalizeTr(a)))) {
      // rehber sorusu mu yoksa bölge durumu mu?
      if (/\b(nasil|nered|ac|kaydet|ekle|gir)\b/.test(t) && !/\b(durum|seviye|lv|zayif)\b/.test(t)) {
        return { kind: 'guide', query: raw }
      }
      return { kind: 'region', regionId: id }
    }
  }

  if (
    /(^|\s)(durum|durumum|rapor|raporum|nasilim|ohp|hazirlik)(\s|$)/.test(t) ||
    t.includes('durum') ||
    t.includes('rapor')
  ) {
    return { kind: 'rapor' }
  }
  if (
    t.includes('ne yapayim') ||
    t.includes('oner') ||
    t.includes('plan') ||
    /(^|\s)bugun(\s|$)/.test(t)
  ) {
    return { kind: 'oneri' }
  }
  if (t.includes('zayif') || t.includes('eksik') || t.includes('en dusuk')) return { kind: 'zayif' }

  return { kind: 'guide', query: raw }
}

/**
 * @param {string} tag
 * @param {object} opts
 * @param {number} [opts.sessionCount]
 * @param {number} [opts.lastAt]
 * @param {number} [opts.now]
 */
export function canEmitDragReaction(opts = {}) {
  const now = opts.now ?? Date.now()
  const sessionCount = Number(opts.sessionCount) || 0
  const lastAt = Number(opts.lastAt) || 0
  if (sessionCount >= DRAG_SESSION_CAP) return false
  if (lastAt && now - lastAt < DRAG_COOLDOWN_MS) return false
  return true
}

/**
 * Peek / panel açıkken sürükleme → busy grubu.
 * @param {{ open?: boolean; peek?: { kind?: string }|null }} opts
 */
export function isBusyDragContext(opts = {}) {
  if (opts.open) return true
  const kind = opts.peek?.kind
  if (!kind) return false
  return kind !== 'drag' && kind !== 'busy'
}

/**
 * @param {string} tag
 * @param {string[]} [recentIds] aynı gruptan son tepki id'leri (en fazla DRAG_RECENT_WINDOW)
 */
export function pickDragLine(tag, recentIds = []) {
  const recent = new Set((recentIds || []).slice(-DRAG_RECENT_WINDOW))
  const pool = DRAG_LINES.filter((d) => d.tags.includes(tag) && !recent.has(d.id))
  const list = pool.length ? pool : DRAG_LINES.filter((d) => d.tags.includes(tag))
  return pick(list.length ? list : DRAG_LINES)
}

/**
 * Asıl peek korunur; busy yalnızca ek balon.
 * @param {{ text: string; kind?: string }|null} peek
 * @param {string} busyText
 */
export function withBusyPeek(peek, busyText) {
  return {
    main: peek,
    busy: peek ? { text: String(busyText || ''), kind: 'busy' } : null,
  }
}
