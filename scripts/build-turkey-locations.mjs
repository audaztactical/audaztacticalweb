/**
 * TurkiyeAPI 2025 il/ilçe listesi + Open-Meteo Geocoding ile ilçe koordinatları.
 * Kaynak: https://api.turkiyeapi.dev/v2/datasets/2025/
 * Koordinat: https://open-meteo.com/en/docs/geocoding-api
 *
 * Kullanım: node scripts/build-turkey-locations.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const provinces = JSON.parse(fs.readFileSync(path.join(__dirname, 'tmp-provinces.json'), 'utf8'))
const districts = JSON.parse(fs.readFileSync(path.join(__dirname, 'tmp-districts.json'), 'utf8'))

/** @param {string} s */
function normTr(s) {
  return String(s ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * @param {string} districtName
 * @param {string} provinceName
 * @param {{ lat: number, lon: number }} fallback
 */
async function geocodeDistrict(districtName, provinceName, fallback) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', districtName)
  url.searchParams.set('count', '12')
  url.searchParams.set('language', 'tr')
  url.searchParams.set('countryCode', 'TR')

  try {
    const res = await fetch(url)
    if (!res.ok) return fallback
    const json = await res.json()
    const results = json.results ?? []
    const pNorm = normTr(provinceName)

    const match =
      results.find(
        (r) =>
          (r.feature_code === 'PPLA2' || r.feature_code === 'PPLA3') &&
          normTr(r.admin1) === pNorm &&
          normTr(r.name) === normTr(districtName),
      ) ??
      results.find((r) => normTr(r.admin1) === pNorm && normTr(r.name) === normTr(districtName)) ??
      results.find((r) => normTr(r.admin1) === pNorm && r.feature_code === 'PPLA2') ??
      results.find((r) => normTr(r.admin1) === pNorm)

    if (match) {
      return {
        lat: Math.round(match.latitude * 1e6) / 1e6,
        lon: Math.round(match.longitude * 1e6) / 1e6,
      }
    }
  } catch {
    /* fallback */
  }

  return fallback
}

/** @type {Map<number, typeof provinces[0]>} */
const provinceById = new Map(provinces.map((p) => [p.id, p]))

/** @type {Map<number, typeof districts>} */
const districtsByProvince = new Map()
for (const d of districts) {
  const list = districtsByProvince.get(d.provinceId) ?? []
  list.push(d)
  districtsByProvince.set(d.provinceId, list)
}

/** @type {Array<{ id: string, name: string, lat: number, lon: number, coastal: boolean, districts: { name: string, lat: number, lon: number }[] }>} */
const output = []

let geocoded = 0
let fallbackCount = 0

for (const province of provinces.sort((a, b) => a.id - b.id)) {
  const provDistricts = (districtsByProvince.get(province.id) ?? []).sort((a, b) =>
    a.name.localeCompare(b.name, 'tr-TR'),
  )

  const provLat = province.coordinates?.latitude ?? 0
  const provLon = province.coordinates?.longitude ?? 0
  const coastal = province.isCoastal === true

  /** @type {{ name: string, lat: number, lon: number }[]} */
  const districtRows = []

  for (const district of provDistricts) {
    const fallback = { lat: provLat, lon: provLon }
    const coords = await geocodeDistrict(district.name, province.name, fallback)
    if (coords.lat === fallback.lat && coords.lon === fallback.lon) fallbackCount += 1
    else geocoded += 1

    districtRows.push({
      name: district.name,
      lat: coords.lat,
      lon: coords.lon,
    })

    await sleep(110)
  }

  output.push({
    id: String(province.id).padStart(2, '0'),
    name: province.name,
    lat: Math.round(provLat * 1e6) / 1e6,
    lon: Math.round(provLon * 1e6) / 1e6,
    coastal,
    districts: districtRows,
  })

  process.stdout.write(`\r${province.name.padEnd(20)} ${districtRows.length} ilce`)
}

console.log(`\nGeocoded: ${geocoded}, province fallback: ${fallbackCount}, total districts: ${districts.length}`)

const totalDistricts = output.reduce((n, p) => n + p.districts.length, 0)
const coastalCount = output.filter((p) => p.coastal).length

const fileBody = `/**
 * Türkiye il / ilçe koordinatları — otomatik üretilmiş veri dosyası.
 * Üretim: scripts/build-turkey-locations.mjs
 * İl/ilçe adları: TurkiyeAPI 2025 (https://github.com/ubeydeozdmr/turkiye-api) — ${provinces.length} il, ${totalDistricts} ilçe
 * İlçe koordinatları: Open-Meteo Geocoding API (https://open-meteo.com/en/docs/geocoding-api)
 * coastal: TurkiyeAPI isCoastal (${coastalCount} kıyı ili)
 * Yeniden üretmek için: node scripts/build-turkey-locations.mjs
 */

/** @typedef {{ name: string, lat: number, lon: number }} District */
/** @typedef {{ id: string, name: string, lat: number, lon: number, coastal: boolean, districts: District[] }} Province */

/** @type {Province[]} */
export const TURKEY_PROVINCES = ${JSON.stringify(output, null, 2)}
`

const outPath = path.join(ROOT, 'src', 'data', 'turkeyLocations.js')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, fileBody, 'utf8')
console.log('Wrote', outPath)
