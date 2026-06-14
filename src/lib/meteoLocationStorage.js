import { DEFAULT_DISTRICT_NAME, DEFAULT_PROVINCE_ID, resolveLocation } from './turkeyLocations'

const STORAGE_KEY = 'audaz-meteo-location'

/**
 * @returns {{ provinceId: string, districtName: string }}
 */
export function readMeteoLocationPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { provinceId: DEFAULT_PROVINCE_ID, districtName: DEFAULT_DISTRICT_NAME }
    }
    const parsed = JSON.parse(raw)
    return {
      provinceId: String(parsed.provinceId ?? DEFAULT_PROVINCE_ID),
      districtName: String(parsed.districtName ?? DEFAULT_DISTRICT_NAME),
    }
  } catch {
    return { provinceId: DEFAULT_PROVINCE_ID, districtName: DEFAULT_DISTRICT_NAME }
  }
}

/**
 * @param {string} provinceId
 * @param {string} districtName
 */
export function saveMeteoLocationPreference(provinceId, districtName) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ provinceId, districtName, savedAt: new Date().toISOString() })
  )
}

/**
 * @returns {Promise<{ lat: number, lon: number, label: string, coastal: boolean, source: string }>}
 */
export async function resolveCaptureLocation() {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 300000,
        })
      })
      return {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        label: 'GPS konumu',
        coastal: false,
        source: 'geolocation',
      }
    } catch {
      /* tercih veya varsayılan */
    }
  }

  const pref = readMeteoLocationPreference()
  const resolved = resolveLocation(pref.provinceId, pref.districtName)
  return {
    lat: resolved.lat,
    lon: resolved.lon,
    label: resolved.label,
    coastal: resolved.coastal,
    source: 'preference',
  }
}
