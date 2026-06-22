import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { requestDevicePosition } from '../lib/deviceGeolocation'
import { resolveTurkeyLocationFromGps } from '../lib/geoLocationResolve'
import { DEFAULT_DISTRICT_NAME, DEFAULT_PROVINCE_ID, getProvinceById, resolveLocation } from '../lib/turkeyLocations'
import { readMeteoLocationPreference, saveMeteoLocationPreference } from '../lib/meteoLocationStorage'
import { fetchLocationWeather } from '../lib/weatherService'

const WEATHER_REFRESH_MS = 30 * 60 * 1000

/**
 * @typedef {import('../lib/weatherService').fetchLocationWeather extends (...args: any) => Promise<infer R> ? R : never} WeatherData
 * @typedef {{ lat: number, lon: number }} GpsCoords
 * @typedef {'idle' | 'locating' | 'ok' | 'failed' | 'unsupported'} GeoStatus
 */

/**
 * @param {string} provinceId
 * @param {string} districtName
 * @param {GpsCoords | null} [gpsCoords]
 */
export function useLocationWeather(provinceId, districtName, gpsCoords = null) {
  const location = useMemo(() => {
    const base = resolveLocation(provinceId, districtName)
    if (gpsCoords && Number.isFinite(gpsCoords.lat) && Number.isFinite(gpsCoords.lon)) {
      return {
        ...base,
        lat: gpsCoords.lat,
        lon: gpsCoords.lon,
        label: `${base.label} · GPS`,
      }
    }
    return base
  }, [provinceId, districtName, gpsCoords?.lat, gpsCoords?.lon])

  const [data, setData] = useState(/** @type {WeatherData | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let cancelled = false

    const loadWeather = (/** @type {boolean} */ silent) => {
      if (!silent) {
        setLoading(true)
        setError(null)
      }

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
    }

    loadWeather(false)

    const intervalId = window.setInterval(() => loadWeather(true), WEATHER_REFRESH_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [location.lat, location.lon, location.coastal])

  return { location, data, loading, error }
}

function readInitialSelection() {
  const saved = readMeteoLocationPreference()
  if (saved.source === 'gps' && saved.provinceId) {
    return {
      provinceId: saved.provinceId,
      districtName: saved.districtName || DEFAULT_DISTRICT_NAME,
      gpsCoords:
        saved.lat != null && saved.lon != null && Number.isFinite(saved.lat) && Number.isFinite(saved.lon)
          ? { lat: saved.lat, lon: saved.lon }
          : null,
      geoActive: true,
    }
  }
  return {
    provinceId: DEFAULT_PROVINCE_ID,
    districtName: DEFAULT_DISTRICT_NAME,
    gpsCoords: null,
    geoActive: false,
  }
}

export function useDefaultLocationSelection() {
  const initial = readInitialSelection()
  const [provinceId, setProvinceId] = useState(initial.provinceId)
  const [districtName, setDistrictName] = useState(initial.districtName)
  const [gpsCoords, setGpsCoords] = useState(/** @type {GpsCoords | null} */ (initial.gpsCoords))
  const [geoStatus, setGeoStatus] = useState(/** @type {GeoStatus} */ ('locating'))
  const [geoActive, setGeoActive] = useState(initial.geoActive)
  const gpsRunId = useRef(0)
  const gpsBootstrapped = useRef(false)

  const applyResolvedGps = useCallback((resolved) => {
    setProvinceId(resolved.provinceId)
    setDistrictName(resolved.districtName)
    setGpsCoords({ lat: resolved.lat, lon: resolved.lon })
    setGeoActive(true)
    setGeoStatus('ok')
    saveMeteoLocationPreference(resolved.provinceId, resolved.districtName, 'gps', {
      lat: resolved.lat,
      lon: resolved.lon,
    })
  }, [])

  const runGpsLookup = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unsupported')
      return false
    }

    const runId = ++gpsRunId.current
    setGeoStatus('locating')

    const coords = await requestDevicePosition()
    if (runId !== gpsRunId.current) return false

    if (!coords) {
      setGeoStatus('failed')
      return false
    }

    const resolved = await resolveTurkeyLocationFromGps(coords.lat, coords.lon)
    if (runId !== gpsRunId.current) return false

    if (!resolved) {
      setGeoStatus('failed')
      return false
    }

    applyResolvedGps(resolved)
    return true
  }, [applyResolvedGps])

  useEffect(() => {
    if (gpsBootstrapped.current) return
    gpsBootstrapped.current = true
    runGpsLookup()
  }, [runGpsLookup])

  const setProvinceIdManual = useCallback((id) => {
    const province = getProvinceById(id)
    const district = province.districts[0]?.name ?? DEFAULT_DISTRICT_NAME
    gpsRunId.current += 1
    setGeoActive(false)
    setGeoStatus('idle')
    setGpsCoords(null)
    setProvinceId(id)
    setDistrictName(district)
    saveMeteoLocationPreference(id, district, 'manual')
  }, [])

  const setDistrictNameManual = useCallback(
    (name) => {
      gpsRunId.current += 1
      setGeoActive(false)
      setGeoStatus('idle')
      setGpsCoords(null)
      setDistrictName(name)
      saveMeteoLocationPreference(provinceId, name, 'manual')
    },
    [provinceId]
  )

  const refreshFromGps = useCallback(() => runGpsLookup(), [runGpsLookup])

  return {
    provinceId,
    setProvinceId: setProvinceIdManual,
    districtName,
    setDistrictName: setDistrictNameManual,
    gpsCoords,
    geoStatus,
    geoActive,
    refreshFromGps,
  }
}
