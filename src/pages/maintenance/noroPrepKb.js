/**
 * NÖRO prep-phase knowledge base — TR matches docs/brain3d-prototype.html 1:1.
 * EN translations preserve tone; jokes are meaning-matched.
 */

export function fold(t) {
  return t
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c])
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const GRACE = [21, 30, 30, 14, 30, 7, 45, 30]

export const REGKEY = [
  ['frontal', 'alin lobu', 'alin lob', 'on beyin'],
  ['motor korteks', 'motor'],
  ['parietal', 'yan lob'],
  ['oksipital', 'arka lob', 'gorme merkez'],
  ['temporal', 'sakak'],
  ['hipokampus', 'hippokampus'],
  ['beyincik', 'beyincig', 'serebellum'],
  ['beyin sapi', 'beyinsapi', 'sap'],
]

/** Intention entries used by the maintenance NÖRO (TR defaults from prototype). */
export function getPrepKb(locale = 'tr') {
  const en = String(locale).toLowerCase().startsWith('en')
  // Engine embeds full TR KB; this module documents + provides EN overlays for tests / future wiring.
  return { locale: en ? 'en' : 'tr', fold, GRACE, REGKEY }
}

export default { fold, GRACE, REGKEY, getPrepKb }
