/**
 * Türkiye konum çözümleme — il/ilçe verisi src/data/turkeyLocations.js içinde.
 */

import { TURKEY_PROVINCES } from '../data/turkeyLocations.js'

export { TURKEY_PROVINCES }

/** @typedef {{ name: string, lat: number, lon: number }} District */
/** @typedef {{ id: string, name: string, lat: number, lon: number, coastal: boolean, districts: District[] }} Province */

export const DEFAULT_PROVINCE_ID = '34'
export const DEFAULT_DISTRICT_NAME = 'Adalar'

/** @param {string} provinceId */
export function getProvinceById(provinceId) {
  return TURKEY_PROVINCES.find((p) => p.id === provinceId) ?? TURKEY_PROVINCES[0]
}

/**
 * @param {string} provinceId
 * @param {string} districtName
 */
export function resolveLocation(provinceId, districtName) {
  const province = getProvinceById(provinceId)
  const district = province.districts.find((d) => d.name === districtName) ?? province.districts[0]
  return {
    province,
    district,
    label: `${province.name} / ${district.name}`,
    lat: district.lat,
    lon: district.lon,
    coastal: province.coastal,
  }
}

/** @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * GPS koordinatına en yakın il / ilçe eşlemesi.
 * @param {number} lat
 * @param {number} lon
 */
export function findNearestTurkeyLocation(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  let best = /** @type {{ provinceId: string, districtName: string, distanceKm: number } | null} */ (null)
  let bestDist = Infinity

  for (const province of TURKEY_PROVINCES) {
    for (const district of province.districts) {
      const dist = haversineKm(lat, lon, district.lat, district.lon)
      if (dist < bestDist) {
        bestDist = dist
        best = {
          provinceId: province.id,
          districtName: district.name,
          distanceKm: Math.round(dist * 10) / 10,
        }
      }
    }
  }

  return best
}
