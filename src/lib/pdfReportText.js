import i18n from '../i18n'

const NS = 'training-pdf'

/** @returns {'tr-TR' | 'en-US'} */
export function pdfLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 */
export function pdfT(key, params = {}) {
  return i18n.t(key, { ns: NS, ...params })
}

/** @param {string} sector */
export function pdfReportTitle(sector) {
  return pdfT(`titles.${sector}`)
}

/** @returns {[string, string]} */
export function pdfParamValueHead() {
  return [pdfT('common.parameter'), pdfT('common.value')]
}

/** @param {Date} [date] */
export function pdfFormatDateTime(date = new Date()) {
  return date.toLocaleString(pdfLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** @param {number} value */
export function pdfFormatNumber(value) {
  return Number(value).toLocaleString(pdfLocale())
}

/**
 * Locale-aware percent display (TR: %73 · EN: 73%).
 * @param {number} value Whole percent (e.g. 73 for 73%)
 */
export function pdfFormatPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const formatted = pdfFormatNumber(n)
  return pdfLocale().startsWith('tr') ? `%${formatted}` : `${formatted}%`
}

/** @param {boolean} value */
export function pdfYesNo(value) {
  return value ? pdfT('common.yes') : pdfT('common.no')
}

/**
 * @param {boolean} filterActive
 * @param {string} filterLabel
 */
export function pdfFilterLine(filterActive, filterLabel) {
  return filterActive
    ? pdfT('common.filterActive', { label: filterLabel })
    : pdfT('common.filterNone')
}

/**
 * @param {number} index
 * @param {number} total
 */
export function pdfRecordLabel(index, total) {
  return pdfT('common.recordLabel', { index: index + 1, total })
}

/** @param {import('./meteoDataCapture').MeteoSnapshot | null | undefined} meteo */
export function pdfMeteoRows(meteo) {
  const noRecord = pdfT('common.meteo.noRecord')
  if (!meteo) {
    return [
      [pdfT('common.meteo.temperature'), noRecord],
      [pdfT('common.meteo.wind'), noRecord],
      [pdfT('common.meteo.humidity'), noRecord],
    ]
  }
  return [
    [pdfT('common.meteo.temperature'), meteo.temperatureC != null ? `${meteo.temperatureC}°C` : '—'],
    [
      pdfT('common.meteo.wind'),
      meteo.windSpeedKmh != null
        ? `${meteo.windSpeedKmh} km/h${meteo.windDirection ? ` · ${meteo.windDirection}` : ''}`
        : '—',
    ],
    [pdfT('common.meteo.humidity'), meteo.humidity != null ? `%${meteo.humidity}` : '—'],
    [pdfT('common.meteo.location'), meteo.locationLabel || '—'],
  ]
}

/** @type {Record<string, string>} */
const PDF_FILENAME_ASCII_MAP = {
  ı: 'i',
  İ: 'I',
  ş: 's',
  Ş: 'S',
  ğ: 'g',
  Ğ: 'G',
  ü: 'u',
  Ü: 'U',
  ö: 'o',
  Ö: 'O',
  ç: 'c',
  Ç: 'C',
}

/**
 * ASCII-safe filename segment (no Turkish chars, spaces, or unsafe symbols).
 * @param {unknown} value
 */
export function pdfFilenameSegment(value) {
  const raw = String(value ?? '')
  let normalized = ''
  for (const ch of raw) {
    normalized += PDF_FILENAME_ASCII_MAP[ch] ?? ch
  }
  return normalized
    .replace(/[^\w-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/** @param {unknown} callsign */
export function pdfSafeCallsign(callsign) {
  return pdfFilenameSegment(callsign).slice(0, 24) || pdfFilenameSegment(pdfT('common.defaultOperator'))
}

/**
 * @param {string} formattedDateCell
 */
export function pdfExtractSingleLogDateStamp(formattedDateCell) {
  const digits = String(formattedDateCell ?? '').replace(/[^\d]/g, '').slice(0, 12)
  return digits || pdfFilenameSegment(pdfT('fileNaming.reportFallback'))
}

/**
 * @param {'atis' | 'cqb' | 'fof' | 'vbss' | 'tccc'} sector
 * @param {string} callsign
 * @param {number} logCount
 * @param {string} [singleLogDateStamp]
 */
export function pdfTacticalReportFilename(sector, callsign, logCount, singleLogDateStamp = '') {
  const brand = pdfFilenameSegment(pdfT('fileNaming.brand'))
  const sectorSlug = pdfFilenameSegment(pdfT(`fileNaming.sectors.${sector}`))
  const safeCallsign = pdfSafeCallsign(callsign)

  if (logCount === 1) {
    const stamp = pdfFilenameSegment(singleLogDateStamp || pdfT('fileNaming.reportFallback'))
    return `${brand}-${sectorSlug}-${safeCallsign}-${stamp}.pdf`
  }

  const dateStamp = new Date().toISOString().slice(0, 10)
  const bulk = pdfFilenameSegment(pdfT('fileNaming.bulk'))
  const records = pdfFilenameSegment(pdfT('fileNaming.records'))
  return `${brand}-${sectorSlug}-${bulk}-${safeCallsign}-${logCount}${records}-${dateStamp}.pdf`
}

/**
 * @param {'vbss' | 'tccc'} sector
 * @param {string} formId
 */
export function pdfObservationFormFilename(sector, formId) {
  const prefix = pdfFilenameSegment(pdfT(`fileNaming.obsForm.${sector}`))
  const id = pdfFilenameSegment(formId)
  return `${prefix}-${id}.pdf`
}

