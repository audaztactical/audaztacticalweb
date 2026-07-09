/** @typedef {'ALL' | 'P_TFK' | 'T_TAB' | 'AV_TFK' | 'KNT' | 'OPT' | 'MHM'} IlwsFilterId */

/** `code` is TR fallback; prefer `labelFilter` / `ilwsFilterOptions` from armoryDisplayText at render. */
export const ILWS_FILTERS = [
  { id: /** @type {IlwsFilterId} */ ('ALL'), code: 'Tümü' },
  { id: 'P_TFK', code: 'Piyade Tüfeği' },
  { id: 'T_TAB', code: 'Taktik Tabanca' },
  { id: 'AV_TFK', code: 'Av Tüfeği' },
  { id: 'KNT', code: 'Keskin Nişancı Tüfeği' },
  { id: 'OPT', code: 'Aksesuar' },
  { id: 'MHM', code: 'Mühimmat' },
]

/** `label` is TR fallback; prefer `labelTacticalCategory` / `tacticalCategoryOptions` at render. */
export const TACTICAL_CATEGORIES = [
  { value: 'P_TFK', label: 'Piyade Tüfeği' },
  { value: 'T_TAB', label: 'Taktik Tabanca' },
  { value: 'AV_TFK', label: 'Av Tüfeği' },
  { value: 'KNT', label: 'Keskin Nişancı Tüfeği' },
  { value: 'OPT', label: 'Optik / Nişangâh' },
  { value: 'MHM', label: 'Mühimmat' },
]

/** @param {string} tc — prefer `labelTacticalCategory` from armoryDisplayText in UI */
export function tacticalCategoryLabel(tc) {
  const u = invStr(tc).toUpperCase()
  const found = TACTICAL_CATEGORIES.find((c) => c.value === u)
  return found?.label ?? invStr(tc)
}

export const OPERATIONAL_STATUSES = ['AKTİF', 'BAKIMDA', 'GÖREV_DIŞI']

export const ATTACHMENT_PRESETS = ['RED_DOT', 'HOLO', 'MAGNIFIER', 'SUPPRESSOR', 'LASER', 'YOK']

/** @param {unknown} v */
export function invStr(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** @param {unknown} v */
export function invNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** @param {string | undefined} id */
export function stokKodu(id) {
  const raw = (id || 'XXXX').replace(/-/g, '').slice(0, 4).toUpperCase()
  return `SK-${raw}`
}

/** @param {Record<string, unknown>} row */
export function getTacticalCategory(row) {
  const tc = invStr(row.tacticalCategory).toUpperCase()
  if (['P_TFK', 'T_TAB', 'AV_TFK', 'KNT', 'OPT', 'MHM'].includes(tc)) return tc
  const legacy = invStr(row.category)
  if (legacy === 'Mühimmat') return 'MHM'
  if (legacy === 'Optik') return 'OPT'
  if (legacy === 'Silah') {
    const wt = invStr(row.weaponType).toLowerCase()
    if (wt.includes('tabanca') || wt === 'pistol' || wt === 't_tab') return 'T_TAB'
    if (wt.includes('av') || wt === 'av_tfk') return 'AV_TFK'
    if (wt.includes('keskin') || wt === 'knt' || wt.includes('sniper') || wt.includes('dmr')) return 'KNT'
    return 'P_TFK'
  }
  if (legacy === 'Ekipman') return 'OPT'
  return 'OPT'
}

/** @param {string} code */
export function categoryRibbonLabel(code) {
  const map = { P_TFK: 'Tfk', T_TAB: 'Tab', AV_TFK: 'AvT', KNT: 'Knt', OPT: 'Opt', MHM: 'Mhm' }
  return map[code] ?? code
}

/** @param {string} tc */
export function isWeaponTacticalCategoryId(tc) {
  const c = invStr(tc).toUpperCase()
  return c === 'P_TFK' || c === 'T_TAB' || c === 'AV_TFK' || c === 'KNT'
}

/** @param {Record<string, unknown>} row */
export function isWeaponCategory(row) {
  return isWeaponTacticalCategoryId(getTacticalCategory(row))
}

/** @param {Record<string, unknown>} row */
export function getConditionPercent(row) {
  const n = invNum(row.conditionPercent)
  if (n > 0) return Math.min(100, Math.max(1, Math.round(n)))
  if (isWeaponCategory(row)) return 95
  return 0
}

/** @param {Record<string, unknown>} row */
export function getTechnicalDescription(row) {
  const d = invStr(row.technicalDescription).trim()
  if (d) return d
  const parts = [invStr(row.brand), invStr(row.calibre)].filter(Boolean)
  if (parts.length) return parts.join(' · ')
  return invStr(row.notes).trim() || 'Teknik özet kayıtlı değil.'
}

/** @param {Record<string, unknown>} row */
export function getOperationalStatus(row) {
  const s = invStr(row.operationalStatus).toUpperCase()
  if (OPERATIONAL_STATUSES.includes(s)) return s
  return 'AKTİF'
}

/** @param {Record<string, unknown>} row */
export function getAttachmentLink(row) {
  const a = invStr(row.attachmentLink).trim()
  return a || 'YOK'
}

/**
 * @param {string | undefined} iso
 * @returns {boolean}
 */
export function needsMaintenance(iso) {
  if (!iso || typeof iso !== 'string') return true
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return true
  const sixMonthsMs = 183 * 24 * 60 * 60 * 1000
  return Date.now() - t > sixMonthsMs
}

/** @param {Record<string, unknown>} row @returns {{ date: string, text: string, status: string }[]} */
export function buildWeaponMaintenanceLog(row) {
  const structured = row.maintenance_logs ?? row.maintenanceLogEntries
  const logs = []
  if (Array.isArray(structured)) {
    for (const entry of structured) {
      if (entry && typeof entry === 'object') {
        const o = /** @type {Record<string, unknown>} */ (entry)
        logs.push({
          date: invStr(o.date) || '—',
          text: invStr(o.maintenanceType ?? o.text) || 'BAKIM_KAYDI',
          status: invStr(o.note) ? 'NOT' : 'OK',
        })
      }
    }
  }
  const iso = invStr(row.lastMaintenanceAt)
  if (logs.length === 0 && iso) {
    const d = iso.slice(0, 10).split('-').reverse().join('.')
    logs.push({ date: d, text: 'NAMLU_TEMİZLİĞİ_YAPILDI', status: 'OK' })
  }
  if (logs.length === 0) {
    logs.push({ date: '—', text: 'BAKIM_KAYDI_BEKLENİYOR', status: 'BEK' })
  }
  if (needsMaintenance(iso)) {
    logs.push({ date: new Date().toLocaleDateString('tr-TR'), text: 'PERİYODİK_BAKIM_GEREKLİ', status: 'UYR' })
  }
  return logs
}

/** @param {Record<string, unknown>} row */
export function buildWeaponSpecs(row) {
  const cat = getTacticalCategory(row)
  const range =
    invStr(row.effectiveRange).trim() ||
    (cat === 'T_TAB'
      ? '50M_ETKİLİ'
      : cat === 'AV_TFK'
        ? '40M_ETKİLİ'
        : cat === 'KNT'
          ? '1000M_ETKİLİ'
          : '300M_ETKİLİ')
  const weight =
    invStr(row.weight).trim() ||
    (cat === 'T_TAB' ? '0.85KG' : cat === 'AV_TFK' ? '3.4KG' : cat === 'KNT' ? '6.0KG' : '3.2KG')
  return [
    { key: 'ETKİLİ_MENZİL', value: range },
    { key: 'AĞIRLIK', value: weight },
    { key: 'KALİBRE', value: invStr(row.calibre) || '—' },
    { key: 'SERİ_NO', value: invStr(row.serialNo) || invStr(row.serial) || '—' },
    { key: 'MARKA', value: invStr(row.brand) || '—' },
    ...(row.barrelLength != null && row.barrelLength !== ''
      ? [{ key: 'NAMLU_UZUNLUĞU', value: `${row.barrelLength} in` }]
      : []),
    ...(invStr(row.twistRate).trim() ? [{ key: 'BURULMA', value: invStr(row.twistRate).trim() }] : []),
    ...(row.muzzleVelocity != null && row.muzzleVelocity !== ''
      ? [{ key: 'NAMLU_HIZI', value: `${row.muzzleVelocity} fps` }]
      : []),
    ...(row.sightHeightDefault != null && row.sightHeightDefault !== ''
      ? [{ key: 'SIGHT_HEIGHT', value: `${row.sightHeightDefault} cm` }]
      : []),
  ]
}

/** @param {IlwsFilterId} filter @param {Record<string, unknown>} row */
export function matchesIlwsFilter(filter, row) {
  if (filter === 'ALL') return true
  return getTacticalCategory(row) === filter
}

/** @param {Record<string, unknown>} row */
export function isOpticCategory(row) {
  return getTacticalCategory(row) === 'OPT'
}

/** @param {Record<string, unknown>} row */
export function isAmmoCategory(row) {
  return getTacticalCategory(row) === 'MHM'
}

/** @param {Record<string, unknown>} row */
export function getBallisticType(row) {
  const b = invStr(row.ballisticType).trim()
  if (b) return b
  const cal = invStr(row.calibre)
  if (cal) return `FMJ · ${cal}`
  return 'STANDARD_BALL · 9×19'
}

/** @param {Record<string, unknown>} row */
export function getAmmoMunitionType(row) {
  const m = invStr(row.munitionType || row.ammoType || row.mhmType).trim()
  if (m) return m.toUpperCase()
  const cal = invStr(row.calibre)
  if (cal) return `PARABELLUM · ${cal}`
  return 'PARABELLUM · 9×19'
}

/** @param {Record<string, unknown>} row */
export function getLinkedWeaponDisplay(row) {
  const linked = invStr(row.linkedWeaponName).trim()
  if (linked) return linked.replace(/\s+/g, '_').toUpperCase()
  const mount = invStr(row.attachmentLink).trim()
  if (mount && mount !== 'YOK') return `MOUNT_${mount}`
  return null
}

/** @param {Record<string, unknown>} row */
export function getOpticStatusLabel(row) {
  const status = invStr(row.operationalStatus).trim()
  if (status.includes('ÜZERİNDE')) return `DURUM: ${status}`
  const linked = getLinkedWeaponDisplay(row)
  if (linked) return `BAĞLI_SİLAH: ${linked}`
  if (invStr(row.mountedOnWeaponId).trim()) return `BAĞLI_SİLAH: MOUNT_${invStr(row.mountedOnWeaponId).slice(0, 4).toUpperCase()}`
  return 'DURUM: BOŞTA · ENSTALASYONA_HAZIR'
}

/** @param {Record<string, unknown>} row */
export function getAttachmentHistoryCount(row) {
  if (Array.isArray(row.attachmentHistoryEntries)) return row.attachmentHistoryEntries.length
  return invNum(row.attachmentHistoryCount)
}

/** @param {Record<string, unknown>} row @param {number} max */
export function getMaintenanceLogPreview(row, max = 2) {
  return buildWeaponMaintenanceLog(row).slice(0, max)
}

/** @param {Record<string, unknown>[]} items @param {IlwsFilterId} filter */
export function partitionInventoryBySector(items, filter) {
  const weapons = []
  const optics = []
  const ammo = []
  for (const row of items) {
    if (!matchesIlwsFilter(filter, row)) continue
    const c = getTacticalCategory(row)
    if (c === 'P_TFK' || c === 'T_TAB' || c === 'AV_TFK' || c === 'KNT') weapons.push(row)
    else if (c === 'OPT') optics.push(row)
    else if (c === 'MHM') ammo.push(row)
  }
  return { weapons, optics, ammo }
}
