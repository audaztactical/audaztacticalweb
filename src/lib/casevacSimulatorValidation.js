import { invNum, invStr } from './inventoryIlws'
import { CASEVAC_TRANSMISSION_DEADLINE_SEC } from './casevacSimulatorConstants'

/** @typedef {typeof import('./casevacSimulatorConstants').CASEVAC_SIM_INITIAL} CasevacSimForm */

/** @param {CasevacSimForm} form */
export function getCasevacCasualtyCount(form) {
  return Math.max(0, Math.floor(invNum(form.casualty_count)))
}

/**
 * @param {CasevacSimForm} form
 * @returns {string[]}
 */
export function detectCasevacConflicts(form) {
  /** @type {string[]} */
  const issues = []
  const treatment = Array.isArray(form.mist_treatment) ? form.mist_treatment : []

  if (treatment.includes('tourniquet') && form.mist_vitals === 'shock_no') {
    issues.push('TOURNIQUET_WITHOUT_SHOCK')
  }

  if (form.mist_vitals === 'shock_yes' && treatment.includes('morphine')) {
    issues.push('MORPHINE_UNDER_SHOCK')
  }

  return issues
}

/** @param {CasevacSimForm} form */
export function isCasevacFormComplete(form) {
  const metric = Array.isArray(form.mist_metric) ? form.mist_metric : []
  const treatment = Array.isArray(form.mist_treatment) ? form.mist_treatment : []
  if (getCasevacCasualtyCount(form) < 1) return false
  if (metric.length === 0) return false
  if (!form.mist_injury_site) return false
  if (!form.mist_vitals) return false
  if (treatment.length === 0) return false
  if (!invStr(form.pickup_callsign).trim()) return false
  return true
}

/**
 * @param {CasevacSimForm} form
 * @param {{ timedOut?: boolean }} [opts]
 * @returns {string[]}
 */
export function buildCasevacRejectionReasons(form, { timedOut = false } = {}) {
  /** @type {string[]} */
  const reasons = []

  if (timedOut) {
    reasons.push(
      '• [HATA_KODU: TAHLİYE_BASKINI] Telsiz süresi 30 saniyeyi geçti! Sıcak bölgede CASEVAC aracı pusuya düşürüldü, tahliye başarısız!'
    )
  }

  const count = getCasevacCasualtyCount(form)
  if (count < 1) {
    reasons.push(
      '• [MIST HATASI · YARALI SAYISI]: Toplam yaralı sayısı girilmedi — CASEVAC kapasitesi hesaplanamaz.'
    )
  }

  const metric = Array.isArray(form.mist_metric) ? form.mist_metric : []
  if (metric.length === 0) {
    reasons.push(
      '• [M — METRIC HATASI]: Yaralanma tipi (Kurşun/Şarapnel/Amputasyon/Yanık) seçilmedi.'
    )
  }

  if (!form.mist_injury_site) {
    reasons.push(
      '• [I — INJURY HATASI]: Yarının yeri ve anatomisi (Baş/Göğüs/Batın/Uzuv) bildirilmedi.'
    )
  }

  if (!form.mist_vitals) {
    reasons.push('• [S — SIGNS HATASI]: Vital bulgular (bilinç/şok) seçilmedi.')
  }

  const treatment = Array.isArray(form.mist_treatment) ? form.mist_treatment : []
  if (treatment.length === 0) {
    reasons.push('• [T — TREATMENT HATASI]: Yapılan müdahale (turnike, mühür, hava yolu vb.) işaretlenmedi.')
  }

  if (!invStr(form.pickup_callsign).trim()) {
    reasons.push('• [CASEVAC ÇAĞRI HATASI]: Sıcak bölge çağrı işareti / frekans boş — araç yönlendirilemez.')
  }

  if (treatment.includes('tourniquet') && form.mist_vitals === 'shock_no') {
    reasons.push(
      '• [MIST TAKTİK UYARI · T+S]: Turnike uygulandı ancak «ŞOK BELİRTİSİ YOK» seçildi — klinik tablo çelişkili, rapor reddedildi.'
    )
  }

  for (const code of detectCasevacConflicts(form)) {
    if (code === 'TOURNIQUET_WITHOUT_SHOCK') continue
    if (code === 'MORPHINE_UNDER_SHOCK') {
      reasons.push(
        '• [MIST TAKTİK UYARI · T+S]: Şok belirtisi varken morfin bildirimi — protokol ihlali riski.'
      )
    }
  }

  return reasons
}

/**
 * @param {CasevacSimForm} form
 * @param {number} elapsedSec
 * @param {{ timedOut?: boolean; forcedFailure?: boolean }} [opts]
 */
export function scoreCasevacTransmission(form, elapsedSec, opts = {}) {
  if (opts.forcedFailure || opts.timedOut) return 28
  if (buildCasevacRejectionReasons(form, { timedOut: false }).length > 0) return 26
  if (!isCasevacFormComplete(form)) return 30
  if (elapsedSec > CASEVAC_TRANSMISSION_DEADLINE_SEC) return 32

  let score = 96
  if (elapsedSec > 22) score -= 8
  else if (elapsedSec > 15) score -= 4
  return Math.max(90, Math.min(100, score))
}
