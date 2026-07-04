/** @param {string} text */
function replaceKnownPhrases(text) {
  const known = [
    ['AKSESUAR_SÖKÜLDÜ', 'Aksesuar söküldü'],
    ['AKSESUAR_MONTAJ', 'Aksesuar montaj'],
    ['CEP_GNC', 'Cephanelik güncellendi'],
    ['KANAL_AÇIK · OTURUM_AKTİF', 'Kanal açık · Oturum aktif'],
    ['GÖREV_SENK', 'Görev'],
    ['TATBİKAT_IX', 'Tatbikat'],
    ['SAHA_KAYIT', 'Saha kaydı'],
    ['TIBBİ_SENK', 'Tıbbi kayıt'],
    ['IFAK_IX', 'IFAK'],
    ['OLAY_IX', 'Olay kaydı'],
    ['UNK', 'Bilinmiyor'],
  ]
  let out = text
  for (const [from, to] of known) {
    out = out.split(from).join(to)
  }
  return out.replace(/_/g, ' ')
}

/** @param {string} code */
export function humanizeDashboardLogCode(code) {
  const key = String(code ?? '').trim()
  const map = {
    CEP_GNC: 'Cephanelik',
    CEP: 'Cephanelik',
    GÜV: 'Güvenlik',
    OPS: 'Operasyon',
    EĞT: 'Eğitim',
    SHT: 'Sağlık',
  }
  if (map[key]) return map[key]
  return replaceKnownPhrases(key)
}

/** @param {string} msg */
export function humanizeDashboardLogMessage(msg) {
  const raw = String(msg ?? '').trim()
  if (!raw) return '—'
  return replaceKnownPhrases(raw)
    .replace(/\s·\sBÖLGE\s/i, ' · Bölge ')
    .replace(/\sΔ\s·\s/g, ' · ')
    .replace(/\sΔ\b/g, '')
    .trim()
}

/** @param {string} code */
export function humanizeOrsPenaltyCode(code) {
  return String(code ?? '')
    .replace(/^HATA_KODU:\s*/i, '')
    .replace(/_/g, ' ')
    .replace(/\bOLAY ALANI\b/i, 'Olay alanı')
    .replace(/\bNAMLU FLAG\b/i, 'Namlu ihlali')
    .trim()
}

/** @param {string} detail */
export function humanizeOrsPenaltyDetail(detail) {
  return String(detail ?? '')
    .replace(/Σ_MHM\s*/g, 'Mühimmat ')
    .replace(/7G_SAY\s*/g, '7 gün ')
    .replace(/\bSAY\b/g, 'Adet')
    .replace(/\bOTURUM\b/g, 'oturum')
    .replace(/SEV_(\d+)/g, 'Seviye $1')
    .replace(/T-24H/g, 'Son 24 saat')
    .trim()
}
