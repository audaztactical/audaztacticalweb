/**
 * Konum bazlı meteoroloji — Open-Meteo API.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const PRECIP_PROB_THRESHOLD = 30

const WIND_DIRS_TR = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB']

/** WMO weather code → kısa etiket */
const WMO_LABELS = {
  0: 'Açık',
  1: 'Az bulutlu',
  2: 'Parçalı bulutlu',
  3: 'Kapalı',
  45: 'Sis',
  48: 'Sis',
  51: 'Çisenti',
  53: 'Çisenti',
  55: 'Çisenti',
  61: 'Yağmur',
  63: 'Yağmur',
  65: 'Şiddetli yağmur',
  71: 'Kar',
  80: 'Sağanak',
  95: 'Fırtına',
}

/** @param {number} deg */
export function windDirectionLabel(deg) {
  if (!Number.isFinite(deg)) return '—'
  const idx = Math.round(deg / 45) % 8
  return WIND_DIRS_TR[idx]
}

/** @param {number} code */
export function wmoWeatherLabel(code) {
  return WMO_LABELS[code] ?? 'Değişken'
}

/** @param {number} code */
export function isClearWeather(code) {
  return code === 0 || code === 1
}

/** @param {number} mmh */
export function formatMmH(mmh) {
  const n = Number(mmh)
  if (!Number.isFinite(n) || n < 0.1) return 0
  return Math.round(n * 10) / 10
}

/**
 * @param {{ time: string[], precipitation_probability: number[], precipitation: number[] }} hourly
 */
function analyzeHourlyPrecipitation(hourly) {
  const len = Math.min(12, hourly.time?.length ?? 0)
  let maxProbabilityPct = 0
  let maxAmountMmH = 0
  let streak = 0
  let maxStreak = 0

  for (let i = 0; i < len; i++) {
    const probabilityPct = Number(hourly.precipitation_probability?.[i] ?? 0)
    const amountMmH = formatMmH(hourly.precipitation?.[i] ?? 0)
    maxProbabilityPct = Math.max(maxProbabilityPct, probabilityPct)
    maxAmountMmH = Math.max(maxAmountMmH, amountMmH)

    if (probabilityPct >= PRECIP_PROB_THRESHOLD || amountMmH > 0) {
      streak += 1
      maxStreak = Math.max(maxStreak, streak)
    } else {
      streak = 0
    }
  }

  return {
    probabilityPct: Math.round(maxProbabilityPct),
    amountMmH: maxAmountMmH,
    durationHours: maxStreak,
  }
}

/**
 * @param {number} weatherCode
 * @param {number} currentPrecipMm
 * @param {{ probabilityPct: number, amountMmH: number, durationHours: number }} hourly
 */
function buildPrecipitationState(weatherCode, currentPrecipMm, hourly) {
  const probabilityPct = hourly.probabilityPct
  const instantMmH = formatMmH(currentPrecipMm)
  const amountMmH = Math.max(instantMmH, hourly.amountMmH)
  const clearSky = isClearWeather(weatherCode)

  const rainExpected = probabilityPct >= PRECIP_PROB_THRESHOLD && amountMmH > 0

  return {
    probabilityPct,
    amountMmH: clearSky ? 0 : amountMmH,
    instantMmH,
    durationHours: hourly.durationHours,
    clearSky,
    rainExpected,
    statusText: rainExpected ? 'Yağış bekleniyor' : 'Yağış beklenmiyor',
  }
}

/**
 * @param {{ precipitation?: ReturnType<typeof buildPrecipitationState> }} data
 */
export function formatPrecipitationRows(data) {
  if (!data?.precipitation) {
    return { probability: '—', amount: '—', detail: undefined }
  }

  const p = data.precipitation

  if (p.probabilityPct < PRECIP_PROB_THRESHOLD) {
    return {
      probability: 'Yağış beklenmiyor',
      amount: p.clearSky ? 'Yağışsız' : 'Yağış beklenmiyor',
      detail: `İhtimal: %${p.probabilityPct}`,
    }
  }

  if (p.amountMmH === 0) {
    return {
      probability: `İhtimal: %${p.probabilityPct}`,
      amount: p.clearSky ? 'Yağışsız' : 'Yağış beklenmiyor',
      detail: p.durationHours > 0 ? `Tahmini süre ~${p.durationHours} saat` : undefined,
    }
  }

  return {
    probability: `İhtimal: %${p.probabilityPct}`,
    amount: p.clearSky ? 'Yağışsız' : `Miktar: ${p.amountMmH} mm/h`,
    detail: p.durationHours > 0 ? `Tahmini süre ~${p.durationHours} saat` : undefined,
  }
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {boolean} coastal
 */
async function fetchMarine(lat, lon, coastal) {
  if (!coastal) return null
  try {
    const url = new URL('https://marine-api.open-meteo.com/v1/marine')
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lon))
    url.searchParams.set('current', 'wave_height,sea_surface_temperature')
    url.searchParams.set('timezone', 'auto')

    const res = await fetch(url)
    if (!res.ok) return null
    const body = await res.json()
    const cur = body?.current
    if (!cur) return null
    return {
      waveHeightM: cur.wave_height != null ? Math.round(cur.wave_height * 10) / 10 : null,
      seaTempC: cur.sea_surface_temperature != null ? Math.round(cur.sea_surface_temperature) : null,
    }
  } catch {
    return null
  }
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {boolean} coastal
 */
async function fetchOpenMeteo(lat, lon, coastal) {
  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'current',
    'temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,pressure_msl'
  )
  url.searchParams.set('hourly', 'precipitation_probability,precipitation,wind_speed_10m')
  url.searchParams.set('wind_speed_unit', 'kmh')
  url.searchParams.set('pressure_unit', 'hPa')
  url.searchParams.set('timezone', 'auto')

  const [weatherRes, marine] = await Promise.all([fetch(url), fetchMarine(lat, lon, coastal)])
  if (!weatherRes.ok) throw new Error('Open-Meteo yanıtı alınamadı')

  const data = await weatherRes.json()
  const cur = data.current ?? {}
  const hourly = data.hourly ?? {}

  if (import.meta.env.DEV) {
    console.log('[Open-Meteo] API yanıtı', data)
    console.log('[Open-Meteo] current.precipitation (mm)', cur.precipitation)
    console.log(
      '[Open-Meteo] hourly[0] precipitation_probability (%)',
      hourly.precipitation_probability?.[0],
      '| precipitation (mm/h)',
      hourly.precipitation?.[0]
    )
  }

  const weatherCode = Number(cur.weather_code ?? -1)
  const currentPrecipMm = Number(cur.precipitation ?? 0)
  const hourlyPrecip = analyzeHourlyPrecipitation(hourly)
  const precipitation = buildPrecipitationState(weatherCode, currentPrecipMm, hourlyPrecip)

  const windSpeedKmh = Math.round(Number(cur.wind_speed_10m ?? 0))
  const windDeg = Number(cur.wind_direction_10m ?? 0)

  const windSeries = (hourly.time ?? []).slice(0, 7).map((t, i) => ({
    t: String(t).slice(11, 13),
    v: Math.round(Number(hourly.wind_speed_10m?.[i] ?? 0)),
  }))

  return {
    source: 'open-meteo',
    temperatureC: Math.round(Number(cur.temperature_2m ?? 0)),
    weatherCode,
    isClearSky: isClearWeather(weatherCode),
    apparentTemperatureC:
      cur.apparent_temperature != null ? Math.round(Number(cur.apparent_temperature)) : null,
    description: wmoWeatherLabel(weatherCode),
    precipitation,
    windSpeedKmh,
    windDeg,
    windDirection: windDirectionLabel(windDeg),
    humidity: cur.relative_humidity_2m != null ? Math.round(Number(cur.relative_humidity_2m)) : null,
    pressureHpa: cur.pressure_msl != null ? Math.round(Number(cur.pressure_msl)) : null,
    marine,
    windSeries,
  }
}

/**
 * @param {{ lat: number, lon: number, coastal: boolean }} location
 */
export async function fetchLocationWeather(location) {
  const { lat, lon, coastal } = location
  return fetchOpenMeteo(lat, lon, coastal)
}

export function formatWeatherSource() {
  return 'Open-Meteo'
}
