/**
 * NÖRO — saf olay → mesaj dönüşümü (Firebase yok).
 */

import { REGION_IDS, DAILY_CAP } from '../../../lib/neural/neuralConfig'
import {
  ADV,
  ACT_LABEL,
  SCI,
  V,
  WELCOME,
  EMPTY_USER,
  lineForRegion,
  pick,
  regionName,
  scoreLine,
} from './noroCopy'

/** @typedef {'e'|'s'|'k'} NoroTone */
/** @typedef {{ id: string; text: string; kind?: string; meta?: Record<string, unknown> }} NoroMessage */

export const AUTO_MSG_DAY_CAP = 3

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
 * @param {string} dayKey istanbul YYYY-MM-DD
 * @param {number} used
 */
export function canEmitAutoMessage(dayKey, used) {
  return Boolean(dayKey) && Number(used) < AUTO_MSG_DAY_CAP
}

/**
 * İki komşu bölge ilk kez birlikte ≥ lv3.
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

/** Basit komşuluk (beyin lobları) */
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
 * @param {object} p
 * @param {NoroTone} p.tone
 * @param {Record<string, number>} p.gains
 * @param {number|null} p.score
 * @param {{ bonus?: boolean; cap?: boolean; typeCap?: boolean; streakBonus?: number }} p.flags
 * @param {number} p.streak
 * @param {Record<string, number>} p.prevLevels
 * @param {Record<string, number>} p.nextLevels
 * @param {string|null} [p.aarReminder]
 */
export function buildEventReaction(p) {
  const { tone, gains, score, flags, streak, prevLevels, nextLevels, aarReminder } = p
  const id = primaryRegionFromGains(gains)
  const g0 = Number(gains[id]) || 0
  /** @type {string[]} */
  const parts = []

  if (flags?.cap || flags?.typeCap) {
    if (g0 <= 0) {
      parts.push(
        V(
          tone,
          `${regionName(id)} bugünlük doydu (${DAILY_CAP} puan sınırı). Beyin de kas gibi, dinlenince büyür. Yarın devam.`,
          `${regionName(id)} günlük sınıra ulaştı.`,
          `${regionName(id)} günlük sınır doldu. Yarın.`,
        ),
      )
      return { primaryId: id, texts: parts, offerAar: false }
    }
  }

  let h = lineForRegion(id, g0, tone)
  if (score != null && Number.isFinite(score)) {
    h += ` ${scoreLine(Number(score), tone)}`
  }

  const side = Object.entries(gains || {}).filter(([r, g]) => r !== id && Number(g) > 0.05)
  if (side.length) {
    h += ` ${V(tone, pick(['Sekme puanlar:', 'Yan etkiler:', 'Bonus olarak:']), 'Diğer bölgeler:', 'Ek:')} ${side
      .map(([r, g]) => `${regionName(r)} +${Math.round(Number(g))}`)
      .join(', ')}.`
  }

  if (flags?.bonus) {
    h +=
      '\n' +
      V(
        tone,
        `${regionName(id)} tozlanmıştı, geri dönüş bonusu: puanlar 1,5 kat. Unutulan beceri sıfırdan öğrenilenden hızlı geri gelir.`,
        'Geri dönüş bonusu: puanlar 1,5 kat.',
        'Geri dönüş bonusu aktif. Açığı kapat.',
      )
  }

  if (aarReminder) {
    h +=
      '\n' +
      V(
        tone,
        `Geçen sefer “${aarReminder}” demiştin. Uygulayabildin mi?`,
        `Önceki AAR notun: “${aarReminder}”.`,
        `AAR notun: “${aarReminder}”. Uyguladın mı?`,
      )
  }

  parts.push(h)

  /** @type {string[]} */
  const ex = []
  for (const rid of REGION_IDS) {
    const pl = Number(prevLevels[rid]) || 0
    const nl = Number(nextLevels[rid]) || 0
    if (nl > pl) {
      ex.push(
        tone === 's'
          ? `${regionName(rid)} lv ${nl}.`
          : tone === 'k'
            ? `${regionName(rid)} lv ${nl}. İyi. Devam.`
            : nl >= 10
              ? `${regionName(rid)} lv 10! Bu bölgede öğrenecek bir şey kalmadı.`
              : `Seviye atladı: ${regionName(rid)} artık lv ${nl}! ${pick(['Yeni nöronlar doğdu.', 'Bağlantılar çoğalıyor.', 'Haritada yeni ışıklar yandı.'])}`,
      )
    }
  }

  for (const [a, b] of detectNewBridges(prevLevels, nextLevels, REGION_EDGES)) {
    ex.push(
      tone === 's'
        ? `Yeni bağlantı: ${regionName(a)} ↔ ${regionName(b)}.`
        : tone === 'k'
          ? `Bağlantı kuruldu: ${regionName(a)} ↔ ${regionName(b)}.`
          : `Köprü kuruldu: ${regionName(a)} ↔ ${regionName(b)}. ${pick(['İki bölge artık aynı dili konuşuyor.', 'Ağ birleşiyor.', 'Bilgi çift şeritten akıyor.'])}`,
    )
  }

  const streakBonus = Number(flags?.streakBonus) || 0
  if ((streakBonus > 0 || streak >= 2) && streak >= 2) {
    ex.push(
      tone === 's'
        ? `Seri: ${streak} gün.`
        : tone === 'k'
          ? `Seri ${streak} gün. Zinciri kırma.`
          : streak % 7 === 0
            ? `${streak} günlük seri! Hipokampus madalya hazırlatıyor.`
            : `Seri ${streak} gün. Hipokampus "bu iş ciddi" diye not aldı.`,
    )
  }

  if (flags?.cap || flags?.typeCap) {
    ex.push(
      tone === 'k'
        ? `${regionName(id)} günlük sınır doldu. Yarın.`
        : tone === 's'
          ? `${regionName(id)} günlük sınıra ulaştı.`
          : `${regionName(id)} bugünkü ${DAILY_CAP} puan sınırına ulaştı. Daha fazlası bugün sayılmaz.`,
    )
  }

  if (ex.length) parts.push(ex.join('\n\n'))

  return { primaryId: id, texts: parts, offerAar: id !== 'frontal' }
}

/**
 * @param {object} p
 * @param {NoroTone} p.tone
 * @param {number} p.daysSince
 * @param {Array<{ id: string; idleDays: number; decayLoss: number; daysToDecay: number; decaying: boolean; level: number }>} p.regions
 * @param {number} p.streak
 */
export function buildBriefing(p) {
  const { tone, daysSince, regions, streak } = p
  const n = Math.max(1, Math.floor(daysSince))
  /** @type {string[]} */
  const parts = []

  const started = regions.filter((r) => r.decaying && r.decayLoss > 0.5)
  const warn = regions.filter((r) => !r.decaying && r.daysToDecay > 0 && r.daysToDecay <= 7)

  started.forEach((r) => {
    parts.push(
      V(
        tone,
        `${regionName(r.id)} ${Math.round(r.idleDays)} gündür sessiz, sönmeye başladı −${r.decayLoss.toFixed(0)}. ${SCI[/** @type {keyof typeof SCI} */ (r.id)] || ''}`,
        `${regionName(r.id)} ${Math.round(r.idleDays)} gündür boşta, sönme başladı −${r.decayLoss.toFixed(0)}.`,
        `${regionName(r.id)}: ${Math.round(r.idleDays)} gün boşta, −${r.decayLoss.toFixed(0)}. Derhal tazele.`,
      ),
    )
  })

  warn.forEach((r) => {
    parts.push(
      V(
        tone,
        `${regionName(r.id)} için ${Math.ceil(r.daysToDecay)} gün kaldı, sonra sönme başlıyor. Ufak bir "${ACT_LABEL[/** @type {keyof typeof ACT_LABEL} */ (r.id)]}" yeter.`,
        `${regionName(r.id)}: sönmeye ${Math.ceil(r.daysToDecay)} gün.`,
        `${regionName(r.id)}: ${Math.ceil(r.daysToDecay)} gün içinde "${ACT_LABEL[/** @type {keyof typeof ACT_LABEL} */ (r.id)]}" yap.`,
      ),
    )
  })

  if (streak <= 0 && n >= 2) {
    parts.push(
      V(
        tone,
        'Seri yok; bugün bir kayıtla başlatabilirsin.',
        'Seri yok.',
        'Seri kırık. Bugün yeniden başla.',
      ),
    )
  }

  if (!parts.length) {
    return [
      V(
        tone,
        pick([
          `${n} gün geçti. Sakin; kimse paslanmıyor, harita yerli yerinde.`,
          `${n} gün geçti. Ortalık sessiz, beyin dinleniyor. Sen de dinlen ama çok değil.`,
        ]),
        `${n} gün geçti, değişiklik yok.`,
        `${n} gün geçti. Durum stabil.`,
      ),
    ]
  }

  parts.unshift(
    V(tone, `${n} gün geçti, haritayı taradım.`, `${n} gün geçti:`, `${n} günlük durum:`),
  )
  return [parts.join('\n\n')]
}

/**
 * @param {'rapor'|'oneri'|'zayif'} q
 * @param {object} view applyDecay çıktısı benzeri
 * @param {NoroTone} tone
 * @returns {{ text: string; links?: Array<{ regionId: string; to: string; label: string }> }}
 */
export function buildQuickAnswer(q, view, tone) {
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
      V(tone, '\nÜçünü yaparsan harita bayram eder.', '', '\nYürüt.')
    return { text: body, links }
  }

  return {
    text: `En zayıf yerin ${regionName(weak)}, lv ${ranked[0][1]}. ${ADV[/** @type {keyof typeof ADV} */ (weak)]}${V(
      tone,
      ' Ayıp değil, herkesin bir beyin sapı vardır.',
      '',
      ' Öncelik bu.',
    )}`,
    links: [{ regionId: weak, to: goToForRegion(weak), label: ACT_LABEL[/** @type {keyof typeof ACT_LABEL} */ (weak)] }],
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
    occipital: '/intel',
    temporal: '/rehber',
    hippocampus: '/antrenman',
    cerebellum: '/timer',
    stem: '/antrenman?sector=tccc',
  }
  return map[/** @type {keyof typeof map} */ (id)] || '/antrenman'
}

/**
 * @param {NoroTone} tone
 * @param {boolean} hasActivity
 */
export function buildWelcome(tone, hasActivity) {
  if (!hasActivity) return V(tone, EMPTY_USER.e, EMPTY_USER.s, EMPTY_USER.k)
  return V(tone, WELCOME.e, WELCOME.s, WELCOME.k)
}

export const OPSEC_WARN = Object.freeze({
  e: 'Dur kanka! Mesajında konum, koordinat, plaka ya da operasyon detayı olabilir. Bunu ne bana ne başka bir yapay zekâya yaz. Ben sadece eğitim kayıtlarınla ilgilenirim; mesajını göndermedim.',
  s: 'Mesajında operasyonel bilgi olabilir (konum, koordinat, plaka, operasyon detayı). Güvenlik için göndermedim. Lütfen yalnızca eğitimle ilgili yaz.',
  k: 'Dur. Operasyonel bilgi tespit edildi. Mesaj gönderilmedi. Bu kanala yalnızca eğitim konuş.',
})

export function opsecWarnText(tone) {
  return V(tone, OPSEC_WARN.e, OPSEC_WARN.s, OPSEC_WARN.k)
}
