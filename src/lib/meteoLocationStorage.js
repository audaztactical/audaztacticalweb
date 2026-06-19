import { DEFAULT_DISTRICT_NAME, DEFAULT_PROVINCE_ID, resolveLocation } from './turkeyLocations'

const STORAGE_KEY = 'audaz-meteo-location'

/**
 * @returns {{ provinceId: string, districtName: string, source?: string, lat?: number, lon?: number }}
 */
export function readMeteoLocationPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { provinceId: DEFAULT_PROVINCE_ID, districtName: DEFAULT_DISTRICT_NAME, source: 'default' }
    }
    const parsed = JSON.parse(raw)
    const lat = parsed.lat != null ? Number(parsed.lat) : undefined
    const lon = parsed.lon != null ? Number(parsed.lon) : undefined
    return {
      provinceId: String(parsed.provinceId ?? DEFAULT_PROVINCE_ID),
      districtName: String(parsed.districtName ?? DEFAULT_DISTRICT_NAME),
      source: typeof parsed.source === 'string' ? parsed.source : 'default',
      ...(Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : {}),
    }
  } catch {
    return { provinceId: DEFAULT_PROVINCE_ID, districtName: DEFAULT_DISTRICT_NAME, source: 'default' }
  }
}

/**
 * @param {string} provinceId
 * @param {string} districtName
 * @param {'manual' | 'gps' | 'default'} [source]
 * @param {{ lat?: number, lon?: number }} [coords]
 */
export function saveMeteoLocationPreference(provinceId, districtName, source = 'manual', coords) {
  /** @type {Record<string, unknown>} */
  const payload = { provinceId, districtName, source, savedAt: new Date().toISOString() }
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)) {
    payload.lat = coords.lat
    payload.lon = coords.lon
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
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
