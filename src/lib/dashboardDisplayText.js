import i18n from '../i18n'

/** @param {string} text */
function replaceKnownPhrases(text) {
  /** @type {Record<string, string>} */
  const phrases = i18n.t('systemLog.phrases', { ns: 'dashboard', returnObjects: true })
  let out = text
  if (phrases && typeof phrases === 'object') {
    for (const [from, to] of Object.entries(phrases)) {
      out = out.split(from).join(to)
    }
  }
  return out.replace(/_/g, ' ')
}

/** @param {string} code */
export function humanizeDashboardLogCode(code) {
  const key = String(code ?? '').trim()
  const mapped = i18n.t(`systemLog.codes.${key}`, { ns: 'dashboard', defaultValue: '' })
  if (mapped) return mapped
  return replaceKnownPhrases(key)
}

/** @param {string} msg */
export function humanizeDashboardLogMessage(msg) {
  const raw = String(msg ?? '').trim()
  if (!raw) return '—'
  const region = i18n.t('systemLog.region', { ns: 'dashboard' })
  return replaceKnownPhrases(raw)
    .replace(/\s·\sBÖLGE\s/i, ` · ${region} `)
    .replace(/\s·\sZONE\s/i, ` · ${region} `)
    .replace(/\sΔ\s·\s/g, ' · ')
    .replace(/\sΔ\b/g, '')
    .trim()
}

/** @param {string} code */
export function humanizeOrsPenaltyCode(code) {
  return String(code ?? '')
    .replace(/^HATA_KODU:\s*/i, '')
    .replace(/_/g, ' ')
    .replace(/\bOLAY ALANI\b/i, i18n.t('penalty.incidentArea', { ns: 'dashboard' }))
    .replace(/\bNAMLU FLAG\b/i, i18n.t('penalty.barrelFlag', { ns: 'dashboard' }))
    .trim()
}

/** @param {string} detail */
export function humanizeOrsPenaltyDetail(detail) {
  return String(detail ?? '')
    .replace(/Σ_MHM\s*/g, `${i18n.t('penalty.ammo', { ns: 'dashboard' })} `)
    .replace(/7G_SAY\s*/g, `${i18n.t('penalty.sevenDays', { ns: 'dashboard' })} `)
    .replace(/\bSAY\b/g, i18n.t('penalty.count', { ns: 'dashboard' }))
    .replace(/\bOTURUM\b/g, i18n.t('penalty.session', { ns: 'dashboard' }))
    .replace(/SEV_(\d+)/g, (_, n) => i18n.t('penalty.level', { ns: 'dashboard', n }))
    .replace(/T-24H/g, i18n.t('penalty.last24h', { ns: 'dashboard' }))
    .trim()
}
