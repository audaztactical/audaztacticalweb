import { invNum, invStr } from './inventoryIlws'

export const MEDEVAC_TRANSMISSION_DEADLINE_SEC = 45

/** @typedef {typeof import('./medevacSimulatorConstants').MEDEVAC_SIM_INITIAL} MedevacSimForm */

const MGRS_SPACED_RE = /^\d{1,2}[C-HJ-NP-X]\s+[A-HJ-NP-Z]{2}\s+\d{1,5}\s+\d{1,5}$/
const NUMERIC_TOKEN_RE = /^-?\d+(?:\.\d+)?$/

/** 6-token DMS: latDeg latMin latSec lngDeg lngMin lngSec */
const DMS_SIX_GROUP_RE =
  /^\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*$/

export const HAT1_COORDINATE_GUIDE_LINE =
  "• [HAT 1 REHBERİ]: Görseldeki koordinatları girmek için özel işaretleri kaldırıp sadece sayıları ve boşlukları kullanın. Örn: '38 40 25.92 26 45 29.44' şeklinde yazın, sistem otomatik dönüştürecektir."

export const HAT1_UNSEPARATED_BLOC_LINE =
  "• [🚨 KOORDİNAT KÖR NOKTASI]: SAYILARI BİTİŞİK GİRDİNİZ! Dünya üzerindeki derece, dakika ve saniye basamakları (tek veya çift hane) coğrafyaya göre değiştiği için sistemin enlem ve boylam sınırını hatasız tahmin etmesi imkansızdır. Lütfen sayıların arasına boşluk bırakarak giriniz. Örn: '38 40 25.92 26 45 29.44'"

/** @param {string} token */
function isAmbiguousDigitBlocToken(token) {
  return /^\d{7,}$/.test(token)
}

/**
 * Bitişik sayı bloğu — boşluk/nokta/slash ayrımı yok (örn. 3840259226452944)
 * @param {string} raw
 */
export function hasUnseparatedDigitBloc(raw) {
  const trimmed = invStr(raw).trim()
  if (!trimmed) return false

  const hasCoordinateSeparators = /[\s.,/;,]/.test(trimmed)

  if (/[A-Za-z]/.test(trimmed)) {
    return trimmed.split(/\s+/).filter(Boolean).some((token) => isAmbiguousDigitBlocToken(token))
  }

  if (!hasCoordinateSeparators && /^-?\d+$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 7) {
    return true
  }

  return trimmed.split(/\s+/).filter(Boolean).some((token) => isAmbiguousDigitBlocToken(token))
}

/**
 * @param {string} raw
 */
function stripCoordinateNoise(raw) {
  return invStr(raw)
    .trim()
    .replace(/[°'″"′''´`]/g, ' ')
    .replace(/\b([NnSsEeWwKkDd])\b/g, ' ')
    .replace(/(\d+(?:\.\d+)?)\s*([NnSsEeWwKkDd])\b/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {number} deg
 * @param {number} min
 * @param {number} sec
 */
function dmsComponentsToDecimal(deg, min, sec) {
  return Number(deg) + Number(min) / 60 + Number(sec) / 3600
}

/**
 * @param {number} lat
 * @param {number} lon
 */
function isValidLatLonPair(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
}

/**
 * @param {number[]} nums length 6
 */
function latLonFromDmsSixTuple(nums) {
  const lat = dmsComponentsToDecimal(nums[0], nums[1], nums[2])
  const lon = dmsComponentsToDecimal(nums[3], nums[4], nums[5])
  if (!isValidLatLonPair(lat, lon)) return null
  return { lat, lon }
}

/**
 * DMS — 6 sayı, boşlukla ayrılmış: 38 40 25.92 26 45 29.44
 * @param {string} raw
 * @returns {{ lat: number; lon: number } | null}
 */
export function parseLatLonDms(raw) {
  const cleaned = stripCoordinateNoise(raw)
  if (!cleaned) return null
  if (/[A-HJ-NP-Z]{2}/i.test(cleaned) && /\d{1,2}[C-HJ-NP-X]/i.test(cleaned)) return null

  const match = cleaned.match(DMS_SIX_GROUP_RE)
  if (match) {
    const nums = match.slice(1, 7).map((p) => Number(p))
    if (nums.every((n) => Number.isFinite(n))) {
      return latLonFromDmsSixTuple(nums)
    }
  }

  const parts = cleaned.split(/[\s,;]+/).filter(Boolean)
  if (parts.length === 6 && parts.every((p) => NUMERIC_TOKEN_RE.test(p))) {
    const nums = parts.map((p) => Number(p))
    return latLonFromDmsSixTuple(nums)
  }

  return null
}

/**
 * Noktalı DMS — 38.40.25 26.45.29 → derece/dakika/saniye bileşenleri
 * @param {string} raw
 * @returns {{ lat: number; lon: number } | null}
 */
export function parseLatLonDotDms(raw) {
  const cleaned = stripCoordinateNoise(raw)
  if (!cleaned) return null
  if (/[A-HJ-NP-Z]{2}/i.test(cleaned) && /\d{1,2}[C-HJ-NP-X]/i.test(cleaned)) return null

  const pair = cleaned.match(/^(-?\d+(?:\.\d+)+)\s+(-?\d+(?:\.\d+)+)$/)
  if (!pair) return null

  const latChunks = pair[1].split('.').map((p) => Number(p))
  const lonChunks = pair[2].split('.').map((p) => Number(p))
  if (latChunks.length !== 3 || lonChunks.length !== 3) return null
  if (latChunks.some((n) => !Number.isFinite(n)) || lonChunks.some((n) => !Number.isFinite(n))) {
    return null
  }

  return latLonFromDmsSixTuple([...latChunks, ...lonChunks])
}

/**
 * GPS / ondalık DD — 39.776104 30.521102 · 39.776104, 30.521102
 * @param {string} raw
 * @returns {{ lat: number; lon: number } | null}
 */
export function parseLatLonDecimal(raw) {
  const cleaned = stripCoordinateNoise(raw)
  if (!cleaned) return null
  if (/[A-HJ-NP-Z]{2}/i.test(cleaned) && /\d{1,2}[C-HJ-NP-X]/i.test(cleaned)) return null

  const m =
    cleaned.match(/(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)/) ||
    cleaned.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/)

  if (!m) return null

  const lat = Number(m[1])
  const lon = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

/**
 * @param {string} raw
 * @returns {{ lat: number; lon: number } | null}
 */
export function parseOperationalLatLon(raw) {
  if (hasUnseparatedDigitBloc(raw)) return null
  return parseLatLonDms(raw) ?? parseLatLonDotDms(raw) ?? parseLatLonDecimal(raw)
}

/**
 * MGRS — boşluksuz veya boşluklu: 36S TH 1234 5678 · 36STH12345678
 * @param {string} raw
 * @returns {string | null}
 */
export function normalizeMgrsPickup(raw) {
  const compact = invStr(raw).trim().toUpperCase().replace(/\s+/g, '')
  if (!compact) return null

  const m = compact.match(/^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z]{2})(\d{1,5})(\d{1,5})$/)
  if (!m) return null

  return `${m[1]}${m[2]} ${m[3]} ${m[4]} ${m[5]}`
}

/**
 * NATO MGRS veya GPS ondalık koordinat geçerliliği
 * @param {string} raw
 */
export function isValidMgrsPickup(raw) {
  const trimmed = invStr(raw).trim()
  if (!trimmed) return false
  if (hasUnseparatedDigitBloc(trimmed)) return false
  if (parseOperationalLatLon(trimmed)) return true

  const normalized = normalizeMgrsPickup(trimmed)
  if (normalized) return MGRS_SPACED_RE.test(normalized)

  const spaced = trimmed.toUpperCase().replace(/\s+/g, ' ')
  return MGRS_SPACED_RE.test(spaced)
}

/** @param {MedevacSimForm} form */
export function getPrecedenceTotal(form) {
  return (
    Math.max(0, Math.floor(invNum(form.line3_urgent))) +
    Math.max(0, Math.floor(invNum(form.line3_urgent_surge))) +
    Math.max(0, Math.floor(invNum(form.line3_priority))) +
    Math.max(0, Math.floor(invNum(form.line3_routine))) +
    Math.max(0, Math.floor(invNum(form.line3_convenience)))
  )
}

/** @param {MedevacSimForm} form */
export function getPatientTypeTotal(form) {
  return (
    Math.max(0, Math.floor(invNum(form.line5_litter))) +
    Math.max(0, Math.floor(invNum(form.line5_ambulatory)))
  )
}

/**
 * @param {MedevacSimForm} form
 * @returns {string[]}
 */
export function detectNineLineConflicts(form) {
  /** @type {string[]} */
  const issues = []

  const precedenceTotal = getPrecedenceTotal(form)
  const typeTotal = getPatientTypeTotal(form)

  if (precedenceTotal === 0) issues.push('LINE3_ZERO_PATIENTS')
  if (typeTotal === 0) issues.push('LINE5_ZERO_PATIENTS')
  if (precedenceTotal > 0 && typeTotal > 0 && precedenceTotal !== typeTotal) {
    issues.push('PATIENT_COUNT_MISMATCH')
  }

  if (form.line6_security === 'no_enemy' && form.line7_marking === 'none') {
    issues.push('UNMARKED_SECURE_LZ')
  }

  if (
    (form.line9_cbrn === 'nuclear' ||
      form.line9_cbrn === 'biological' ||
      form.line9_cbrn === 'chemical') &&
    form.line7_marking === 'none'
  ) {
    issues.push('CBRN_UNMARKED_LZ')
  }

  const line4 = Array.isArray(form.line4_equipment) ? form.line4_equipment : []
  const hasExtractionGear = line4.some((id) => id === 'extraction' || id === 'hoist')

  if (form.line6_security === 'armed_escort' && !hasExtractionGear) {
    issues.push('HOT_LZ_NO_EXTRACTION')
  }

  if (invNum(form.line3_urgent) > 0 && line4.length === 0 && form.line9_terrain === 'obstacles') {
    issues.push('URGENT_NO_EQUIP_TERRAIN')
  }

  return issues
}

/**
 * @param {MedevacSimForm} form
 */
export function isNineLineFormComplete(form) {
  if (!isValidMgrsPickup(form.line1_mgrs)) return false
  if (!invStr(form.line2_freq_callsign).trim()) return false
  const line4 = Array.isArray(form.line4_equipment) ? form.line4_equipment : []
  if (line4.length === 0) return false
  if (!form.line6_security) return false
  if (!form.line7_marking) return false
  if (!form.line8_nationality) return false
  if (!form.line9_cbrn && !form.line9_terrain) return false
  return getPrecedenceTotal(form) > 0 && getPatientTypeTotal(form) > 0
}

/**
 * @param {MedevacSimForm} form
 * @param {number} elapsedSec
 * @param {{ timedOut?: boolean; forcedFailure?: boolean }} [opts]
 */
export function scoreMedevacTransmission(form, elapsedSec, opts = {}) {
  if (opts.forcedFailure || opts.timedOut) return 28

  const conflicts = detectNineLineConflicts(form)
  if (conflicts.length > 0) return 26
  if (!isNineLineFormComplete(form)) return 30
  if (elapsedSec > MEDEVAC_TRANSMISSION_DEADLINE_SEC) return 32

  let score = 98
  if (elapsedSec > 35) score -= 6
  else if (elapsedSec > 25) score -= 3
  return Math.max(92, Math.min(100, score))
}
