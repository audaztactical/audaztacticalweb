import { findNearestTurkeyLocation, resolveLocation, TURKEY_PROVINCES } from './turkeyLocations'

/** @param {string} s */
function normTr(s) {
  return String(s || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+(ili|ilçesi|province|region)$/i, '')
    .replace(/\s+/g, ' ')
}

/**
 * @param {string} provinceName
 * @param {string} [districtName]
 */
export function matchProvinceDistrictFromNames(provinceName, districtName = '') {
  const pNorm = normTr(provinceName)
  if (!pNorm) return null

  const province =
    TURKEY_PROVINCES.find((p) => normTr(p.name) === pNorm) ??
    TURKEY_PROVINCES.find((p) => pNorm.includes(normTr(p.name)) || normTr(p.name).includes(pNorm))

  if (!province) return null

  const dNorm = normTr(districtName)
  let district =
    province.districts.find((d) => normTr(d.name) === dNorm) ??
    province.districts.find(
      (d) => dNorm && (dNorm.includes(normTr(d.name)) || normTr(d.name).includes(dNorm))
    ) ??
    province.districts[0]

  return {
    provinceId: province.id,
    provinceName: province.name,
    districtName: district.name,
    coastal: province.coastal,
    label: `${province.name} / ${district.name}`,
  }
}

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ provinceId: string, districtName: string, lat: number, lon: number, label: string, coastal: boolean, source: string } | null>}
 */
export async function resolveTurkeyLocationFromGps(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const nearest = findNearestTurkeyLocation(lat, lon)
  if (!nearest) return null

  const loc = resolveLocation(nearest.provinceId, nearest.districtName)

  return {
    provinceId: nearest.provinceId,
    districtName: nearest.districtName,
    lat,
    lon,
    label: loc.label,
    coastal: loc.coastal,
    source: 'nearest',
  }
}
