/**
 * NÖRO rehber arama — paket yok, basit puanlama.
 */

import { GUIDE_MISS } from './noroCopy'
import { NORO_KB, kbForPath } from './noroGuideKb'
import { normalizeTr } from './noroEngine'

/** Niyet kalıpları — eşleme puanına girmez */
export const INTENT_STOPWORDS = Object.freeze([
  'nasil',
  'nered',
  'nerede',
  'nereye',
  'ne',
  'ise',
  'yarar',
  'adim',
  'adimlar',
  'anlat',
  'tarif',
  'et',
  'eder',
  'yardim',
  'kullanirim',
  'kullanilir',
  'kullan',
  'bu',
  'su',
  'bir',
  'mi',
  'mı',
  'mu',
  'mü',
  'ben',
  'bana',
  'icin',
  'ile',
  've',
  'veya',
  'ya',
  'da',
  'de',
])

/**
 * @param {string} raw
 */
export function isOnboardingQuery(raw) {
  const t = normalizeTr(raw)
  if (!t) return false
  // Sayfa odaklı sorular onboarding değil
  if (t.includes('bu sayfa') || t.includes('bu ekran') || t.includes('sayfa nasil')) return false

  const hard = [
    'bu sistemi',
    'sistemi nasil',
    'adim adim',
    'tarif et',
    'nereden basla',
    'yeni basladim',
    'ne yapabilirim',
    'site ne ise',
    'platform ne',
    'baslangic rehberi',
    'genel baslangic',
  ]
  if (hard.some((p) => t.includes(p))) return true

  // "nasıl kullanılır" vb. — yalnızca anlamlı konu kelimesi yoksa
  const soft =
    t.includes('nasil kullanirim') ||
    t.includes('nasil kullanilir') ||
    t === 'nasil kullan' ||
    t.startsWith('nasil kullan ')
  if (!soft) return false
  const tokens = contentTokens(raw).filter(
    (x) => !['sistem', 'sistemi', 'site', 'platform', 'platformu', 'uygulama'].includes(x),
  )
  return tokens.length === 0
}

/**
 * @param {string} query
 */
export function contentTokens(query) {
  return normalizeTr(query)
    .split(' ')
    .filter((t) => t.length >= 2 && !INTENT_STOPWORDS.includes(t))
}

/**
 * @param {string} query
 * @param {typeof NORO_KB} [kb]
 */
export function searchGuide(query, kb = NORO_KB) {
  const q = normalizeTr(query)
  if (!q) return { best: null, second: null, score: 0, score2: 0 }

  const tokens = contentTokens(query)
  const qContent = tokens.join(' ')

  /** @type {Array<{ entry: (typeof NORO_KB)[0]; score: number }>} */
  const scored = []
  for (const entry of kb) {
    let score = 0
    const titleN = normalizeTr(entry.title)
    if (qContent && (titleN === qContent || titleN.includes(qContent) || qContent.includes(titleN))) {
      score += 22
    }
    if (titleN === q) score += 40

    for (const kw of entry.keywords) {
      const k = normalizeTr(kw)
      if (!k) continue
      if (q === k || qContent === k) score += 28
      else if (q.includes(k) || (qContent && qContent.includes(k))) score += 16
      else if (k.includes(qContent) && qContent.length >= 4) score += 10
      else {
        for (const t of tokens) {
          if (k.includes(t) || t.includes(k)) score += 5
        }
      }
    }

    for (const t of tokens) {
      if (titleN.includes(t)) score += 4
    }

    if (score > 0) scored.push({ entry, score })
  }

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0] || null
  const second = scored[1] || null
  return {
    best: best?.entry || null,
    second: second?.entry || null,
    score: best?.score || 0,
    score2: second?.score || 0,
  }
}

const STRONG = 14
const AMBIGUOUS_GAP = 6
const WEAK = 8

/**
 * @param {import('./noroGuideKb').NoroKbEntry} entry
 */
export function formatKbAnswer(entry) {
  const steps = (entry.steps || []).slice(0, 5)
  const isStart = entry.id === 'extra-start-guide'
  const body = isStart
    ? `${entry.tip || ''}\n\n${entry.title}\n` + steps.map((s, i) => `${i + 1}) ${s}`).join('\n')
    : `${entry.title}\n` +
      steps.map((s, i) => `${i + 1}) ${s}`).join('\n') +
      (entry.tip ? `\nİpucu: ${entry.tip}` : '')
  /** @type {Array<{ to: string; label: string }>} */
  const links = []
  if (Array.isArray(entry.stepLinks) && entry.stepLinks.length) {
    for (const sl of entry.stepLinks) links.push(sl)
  } else {
    links.push({ to: entry.route, label: 'Sayfaya git' })
  }
  return {
    kind: 'hit',
    text: body,
    entryId: entry.id,
    links,
  }
}

function startGuideEntry() {
  return NORO_KB.find((e) => e.id === 'extra-start-guide') || null
}

function brainEntry() {
  return NORO_KB.find((e) => e.id === 'extra-operator-brain') || null
}

/**
 * Genel kullanım / sayfa bağlamı.
 * @param {string} pathname
 * @param {{ preferBrain?: boolean }} [opts]
 */
export function answerOnboarding(pathname, opts = {}) {
  const start = startGuideEntry()
  const path = String(pathname || '')
  const onDash = path === '/dashboard' || path.startsWith('/dashboard/')
  const page =
    opts.preferBrain || onDash ? brainEntry() || kbForPath(path) : kbForPath(path)

  if (page && page.id !== 'extra-start-guide') {
    const pageAns = formatKbAnswer(page)
    const links = [
      ...(pageAns.links || []),
      ...(start ? [{ to: `__howto__:${start.id}`, label: 'Genel başlangıç rehberi' }] : []),
    ]
    return {
      kind: 'hit',
      text: `${pageAns.text}${start ? '\n\nGenel bakış için başlangıç rehberine de bakabilirsin.' : ''}`,
      entryId: page.id,
      links,
    }
  }

  if (start) return formatKbAnswer(start)
  return {
    kind: 'miss',
    text: GUIDE_MISS,
    links: [
      { to: '/kilavuz', label: 'Kullanım Kılavuzu' },
      { to: '__feedback__', label: 'Geri Bildirim' },
    ],
  }
}

/**
 * @param {string} query
 * @param {{ pathname?: string }} [opts]
 */
export function answerGuideQuery(query, opts = {}) {
  const pathname = opts.pathname || '/'

  if (isOnboardingQuery(query)) {
    return answerOnboarding(pathname)
  }

  const { best, second, score, score2 } = searchGuide(query)

  if (best && score >= STRONG) {
    if (second && score - score2 <= AMBIGUOUS_GAP && score2 >= STRONG - 2) {
      return {
        kind: 'ambiguous',
        text: 'Şunlardan hangisini kastettin?',
        choices: [
          { id: best.id, title: best.title, to: best.route },
          { id: second.id, title: second.title, to: second.route },
        ],
      }
    }
    return formatKbAnswer(best)
  }

  // Zayıf / yok → sayfa önerisi (bilmiyorum demeden)
  const page = kbForPath(pathname)
  if (page && (score < STRONG || !best)) {
    if (!best || score < WEAK) {
      return {
        kind: 'suggest_page',
        text: `Şunu mu soruyorsun? ${page.title}`,
        entryId: page.id,
        links: [
          { to: `__howto__:${page.id}`, label: page.title },
          { to: `__howto__:extra-start-guide`, label: 'Genel başlangıç rehberi' },
        ],
      }
    }
  }

  if (best && score >= WEAK) return formatKbAnswer(best)

  return {
    kind: 'miss',
    text: GUIDE_MISS,
    links: [
      { to: '/kilavuz', label: 'Kullanım Kılavuzu' },
      { to: '__feedback__', label: 'Geri Bildirim' },
    ],
  }
}

/**
 * @param {string} pathname
 */
export function buildPageIntro(pathname) {
  const entry = kbForPath(pathname)
  if (!entry) {
    return {
      text: 'Bu sayfadayız. Takılırsan “nasıl kullanılır?” yaz, birlikte bakarız.',
      entry: null,
      links: [],
    }
  }
  return {
    text: `${entry.title}: ${entry.tip || entry.steps[0] || 'Burada işlerini görürsün.'}`,
    entry,
    links: [{ to: `__howto__:${entry.id}`, label: 'Nasıl kullanılır?' }],
  }
}
