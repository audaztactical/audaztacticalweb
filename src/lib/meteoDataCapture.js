import { fetchLocationWeather } from './weatherService'
import { resolveCaptureLocation } from './meteoLocationStorage'

/**
 * @typedef {{
 *   temperatureC: number | null,
 *   windSpeedKmh: number | null,
 *   windDirection: string | null,
 *   humidity: number | null,
 *   pressureHpa: number | null,
 *   locationLabel: string,
 *   capturedAt: string,
 *   source: string,
 * }} MeteoDataSnapshot
 */

/**
 * @returns {Promise<MeteoDataSnapshot | null>}
 */
export async function captureMeteoSnapshot() {
  try {
    const location = await resolveCaptureLocation()
    const weather = await fetchLocationWeather(location)
    return {
      temperatureC: weather.temperatureC ?? null,
      windSpeedKmh: weather.windSpeedKmh ?? null,
      windDirection: weather.windDirection ?? null,
      humidity: weather.humidity ?? null,
      pressureHpa: weather.pressureHpa ?? null,
      locationLabel: location.label,
      capturedAt: new Date().toISOString(),
      source: weather.source ?? 'open-meteo',
    }
  } catch {
    return null
  }
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Promise<Record<string, unknown>>}
 */
export async function attachMeteoDataToPayload(payload) {
  const meteoData = await captureMeteoSnapshot()
  if (!meteoData) return payload
  return { ...payload, meteoData }
}

/**
 * @param {Record<string, unknown>} row
 * @returns {MeteoDataSnapshot | null}
 */
export function getLogMeteoData(row) {
  const raw = row.meteoData
  if (!raw || typeof raw !== 'object') return null
  const m = /** @type {Record<string, unknown>} */ (raw)
  return {
    temperatureC: m.temperatureC != null ? Number(m.temperatureC) : null,
    windSpeedKmh: m.windSpeedKmh != null ? Number(m.windSpeedKmh) : null,
    windDirection: m.windDirection != null ? String(m.windDirection) : null,
    humidity: m.humidity != null ? Number(m.humidity) : null,
    pressureHpa: m.pressureHpa != null ? Number(m.pressureHpa) : null,
    locationLabel: String(m.locationLabel ?? '—'),
    capturedAt: String(m.capturedAt ?? ''),
    source: String(m.source ?? 'open-meteo'),
  }
}

/**
 * @param {MeteoDataSnapshot | null} meteo
 */
export function formatMeteoOverviewRows(meteo) {
  if (!meteo) {
    return [
      ['Sıcaklık', 'Kayıt yok'],
      ['Rüzgar', 'Kayıt yok'],
      ['Nem', 'Kayıt yok'],
    ]
  }
  return [
    ['Sıcaklık', meteo.temperatureC != null ? `${meteo.temperatureC}°C` : '—'],
    [
      'Rüzgar',
      meteo.windSpeedKmh != null
        ? `${meteo.windSpeedKmh} km/h${meteo.windDirection ? ` · ${meteo.windDirection}` : ''}`
        : '—',
    ],
    ['Nem', meteo.humidity != null ? `%${meteo.humidity}` : '—'],
    ['Konum', meteo.locationLabel || '—'],
  ]
}
