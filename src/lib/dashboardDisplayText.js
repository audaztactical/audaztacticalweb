import i18n from '../i18n/index.js'

/** @type {Record<string, string>} orsEngine.js HATA_KODU → i18n penalty.codes anahtarı */
const ORS_PENALTY_CODE_IDS = {
  'HATA_KODU: MÜHİMMAT EŞİK ALTINDA': 'lowAmmo',
  'HATA_KODU: YAKINDA EĞİTİM KAYDI YOK': 'lowTraining',
  'HATA_KODU: OLAY_ALANI HAZIRLIK': 'incidentReadiness',
  'HATA_KODU: MAVİ-MAVİ (FOF)': 'blueOnBlue',
  'HATA_KODU: NAMLU FLAG (CQB)': 'muzzleFlag',
  'HATA_KODU: ÖLÜM HUNİSİ (CQB)': 'fatalFunnel',
  'HATA_KODU: TCCC EŞİK ALTINDA': 'tcccBelowThreshold',
  'HATA_KODU: YAVAŞ KIRMA (CQB)': 'slowBreach',
  'HATA_KODU: YAVAŞ TAMAMLAMA': 'slowCompletion',
  'HATA_KODU: DÜŞÜK İSABET': 'lowAccuracy',
}

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

/** @param {string} part */
function translateOrsPenaltyDetailPart(part) {
  const p = String(part ?? '').trim()
  if (!p) return ''

  if (p === 'T-24H') return i18n.t('penalty.last24h', { ns: 'dashboard' })
  if (p === 'OLAY_IX') return i18n.t('penalty.details.incident', { ns: 'dashboard' })

  const sev = p.match(/^SEV_(\d+)$/)
  if (sev) return i18n.t('penalty.level', { ns: 'dashboard', n: sev[1] })

  const train7 = p.match(/^7G_SAY\s+(\d+)\/(\d+)$/)
  if (train7) {
    return i18n.t('penalty.details.training7d', {
      ns: 'dashboard',
      current: train7[1],
      min: train7[2],
    })
  }

  const ammo = p.match(/^Σ_MHM\s+(\d+)\/(\d+)$/)
  if (ammo) {
    return i18n.t('penalty.details.ammo', {
      ns: 'dashboard',
      current: ammo[1],
      threshold: ammo[2],
    })
  }

  const sessions = p.match(/^OTURUM\s+(\d+)$/i)
  if (sessions) return i18n.t('penalty.details.sessions', { ns: 'dashboard', count: sessions[1] })

  const count = p.match(/^SAY\s+(\d+)$/i)
  if (count) return i18n.t('penalty.details.count', { ns: 'dashboard', count: count[1] })

  const tccc = p.match(/^<40%\s*·\s*(\d+)\s+OTURUM$/i)
  if (tccc) return i18n.t('penalty.details.tcccSessions', { ns: 'dashboard', count: tccc[1] })

  return p
    .replace(/Σ_MHM\s*/g, `${i18n.t('penalty.ammo', { ns: 'dashboard' })} `)
    .replace(/7G_SAY\s*/g, `${i18n.t('penalty.sevenDays', { ns: 'dashboard' })} `)
    .replace(/\bSAY\b/g, i18n.t('penalty.count', { ns: 'dashboard' }))
    .replace(/\bOTURUM\b/g, i18n.t('penalty.session', { ns: 'dashboard' }))
    .replace(/SEV_(\d+)/g, (_, n) => i18n.t('penalty.level', { ns: 'dashboard', n }))
    .replace(/T-24H/g, i18n.t('penalty.last24h', { ns: 'dashboard' }))
    .trim()
}

/** @param {string} code */
export function humanizeOrsPenaltyCode(code) {
  const raw = String(code ?? '').trim()
  const id = ORS_PENALTY_CODE_IDS[raw]
  if (id) {
    return i18n.t(`penalty.codes.${id}`, { ns: 'dashboard' })
  }

  return raw
    .replace(/^HATA_KODU:\s*/i, '')
    .replace(/_/g, ' ')
    .replace(/\bOLAY ALANI\b/i, i18n.t('penalty.incidentArea', { ns: 'dashboard' }))
    .replace(/\bNAMLU FLAG\b/i, i18n.t('penalty.barrelFlag', { ns: 'dashboard' }))
    .trim()
}

/** @param {string} detail */
export function humanizeOrsPenaltyDetail(detail) {
  const raw = String(detail ?? '').trim()
  if (!raw) return ''

  if (raw.includes(' · ')) {
    return raw
      .split(' · ')
      .map((part) => translateOrsPenaltyDetailPart(part.trim()))
      .filter(Boolean)
      .join(' · ')
  }

  return translateOrsPenaltyDetailPart(raw)
}
