import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_DISTRICT_NAME, DEFAULT_PROVINCE_ID, resolveLocation } from '../lib/turkeyLocations'
import { readMeteoLocationPreference, saveMeteoLocationPreference } from '../lib/meteoLocationStorage'
import { fetchLocationWeather } from '../lib/weatherService'

/**
 * @typedef {import('../lib/weatherService').fetchLocationWeather extends (...args: any) => Promise<infer R> ? R : never} WeatherData
 */

/**
 * @param {string} provinceId
 * @param {string} districtName
 */
export function useLocationWeather(provinceId, districtName) {
  const location = useMemo(
    () => resolveLocation(provinceId, districtName),
    [provinceId, districtName]
  )

  const [data, setData] = useState(/** @type {WeatherData | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchLocationWeather(location)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null)
          setError(err instanceof Error ? err.message : 'Veri alınamadı')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [location.lat, location.lon, location.coastal, location.label])

  return { location, data, loading, error }
}

export function useDefaultLocationSelection() {
  const saved = readMeteoLocationPreference()
  const [provinceId, setProvinceId] = useState(saved.provinceId || DEFAULT_PROVINCE_ID)
  const [districtName, setDistrictName] = useState(saved.districtName || DEFAULT_DISTRICT_NAME)

  useEffect(() => {
    saveMeteoLocationPreference(provinceId, districtName)
  }, [provinceId, districtName])

  return { provinceId, setProvinceId, districtName, setDistrictName }
}
