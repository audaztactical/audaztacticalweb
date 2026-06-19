/** Madde 24 (Disiplin), Madde 30–31 (Terör/İllegal) — yerel kara liste denetimi */

export const MUHABERE_CONTENT_VIOLATION = 'Operasyonel Disiplinsizlik: İhlal'

/**
 * Normalize text for blacklist matching (Turkish chars, spacing).
 * @param {string} text
 */
function normalizeForFilter(text) {
  return String(text ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** @type {readonly string[]} */
const BLACKLIST_TERMS = [
  // Madde 30 — terör / yasa dışı yapılar
  'pkk',
  'ypg',
  'pyd',
  'dhkp-c',
  'dhkpc',
  'fetö',
  'feto',
  'fetullah',
  'isid',
  'isis',
  'deaş',
  'deas',
  'el kaide',
  'el-kaide',
  'teror orgutu',
  'teror propagandasi',
  'teror orgutune',
  // Madde 31 — kamu düzeni / şiddet teşviki
  'halki kin ve dusmanliga',
  'kin ve dusmanliga tahrik',
  'silahli direnis',
  'silahli ayaklanma',
  'kitleleri galeyana',
  'linç',
  'linc',
  // Madde 24 — operatör disiplini
  'orospu',
  'orospu cocugu',
  'siktir',
  'sikeyim',
  'amk',
  'aq',
  'pic',
  'pezevenk',
  'gotveren',
  'salak herif',
  'aptal herif',
  'nefret soylemi',
  'irkci',
  'soykirim yapalim',
  'oldurelim hepsini',
  'hepsini oldur',
]

/**
 * @param {string} text
 * @returns {{ allowed: boolean, matchedTerm?: string }}
 */
export function inspectMuhabereContent(text) {
  const normalized = normalizeForFilter(text)
  if (!normalized) return { allowed: true }

  for (const term of BLACKLIST_TERMS) {
    const needle = normalizeForFilter(term)
    if (!needle) continue
    if (normalized.includes(needle)) {
      return { allowed: false, matchedTerm: term }
    }
  }

  return { allowed: true }
}

/**
 * @param {string} text
 * @throws {Error & { code?: string }}
 */
export function assertMuhabereContentAllowed(text) {
  const result = inspectMuhabereContent(text)
  if (result.allowed) return

  const err = new Error(MUHABERE_CONTENT_VIOLATION)
  err.code = 'content-filter-violation'
  throw err
}
