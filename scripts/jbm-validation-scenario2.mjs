import { writeFileSync } from 'fs'
import { calculateBallistics, computeAtmosphericFactors } from '../src/lib/ballisticsEngine.js'

async function fetchJBM(params) {
  const body = new URLSearchParams(params)
  const res = await fetch('https://jbmballistics.com/cgi-bin/jbmtraj_simp-5.1.cgi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://jbmballistics.com/cgi-bin/jbmtraj_simp-5.1.cgi',
      Accept: 'text/html,application/xhtml+xml',
    },
    body: body.toString(),
  })
  return res.text()
}

function parseJBM(html) {
  const rows = []
  const trRe = /<TR[^>]*>([\s\S]*?)<\/TR>/gi
  let m
  while ((m = trRe.exec(html)) !== null) {
    const cells = [...m[1].matchAll(/<TD[^>]*>([\s\S]*?)<\/TD>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
    )
    if (cells.length >= 9 && /^\d+$/.test(cells[0])) {
      rows.push({
        range: Number(cells[0]),
        dropCm: Number(cells[1]),
        windageCm: Number(cells[3]),
        velocity: Number(cells[5]),
        energy: Number(cells[7]),
        time: Number(cells[8]),
      })
    }
  }
  const density = html.match(/Atmospheric Density:[\s\S]*?([\d.]+)\s*lb\/ft/)
  const sos = html.match(/Speed of Sound:[\s\S]*?([\d.]+)\s*ft\/s/)
  const elev = html.match(/Elevation:[\s\S]*?([\d.]+)\s*MOA/)
  const windElev = html.match(/Windage:[\s\S]*?([\d.]+)\s*MOA/)
  return { rows, density: density?.[1], sos: sos?.[1], elevMoa: elev?.[1], windMoa: windElev?.[1] }
}

const TARGETS = [100, 300, 500, 700, 900, 1200]

// 950 hPa @ 1200m = station (absolute) pressure — cor_prs OFF per JBM docs
const jbmParams = {
  'b_id.v': '-1',
  'bc.v': '0.315',
  'd_f.v': '4',
  'bt_wgt.v': '140',
  'bt_wgt.u': '23',
  'cal.v': '0.264',
  'cal.u': '8',
  'm_vel.v': '2710',
  'm_vel.u': '16',
  'hgt_sgt.v': '4',
  'hgt_sgt.u': '11',
  'los.v': '0.0',
  'cnt.v': '0.0',
  'spd_wnd.v': '10.0',
  'spd_wnd.u': '14',
  'spd_tgt.v': '0.0',
  'spd_tgt.u': '14',
  'ang_wnd.v': '90.0',
  'rng_min.v': '0',
  'rng_max.v': '1200',
  'rng_inc.v': '100',
  'rng_zer.v': '200',
  'tmp.v': '5.0',
  'tmp.u': '18',
  'prs.v': '950',
  'prs.u': '21',
  'hum.v': '60.0',
  'alt.v': '1200',
  'alt.u': '12',
  'cor_ele.v': 'on',
  'rng_un.v': 'on',
  'col1_un.v': '1.00',
  'col1_un.u': '11',
  'col2_un.v': '1.00',
  'col2_un.u': '4',
  'col_eng.v': '0',
}

const html = await fetchJBM(jbmParams)
writeFileSync('jbm_scenario2.html', html)
const jbm = parseJBM(html)

const engineInput = {
  muzzleVelocity: 2710,
  velocityUnit: 'fps',
  ballisticCoefficient: 0.315,
  bcModel: 'G7',
  bulletWeight: 140,
  weightUnit: 'grain',
  bulletDiameter: 0.264,
  bulletDiameterUnit: 'inch',
  sightHeight: 4,
  sightHeightUnit: 'cm',
  zeroDistance: 200,
  zeroUnit: 'meter',
  shootingAngle: 0,
  windSpeed: 10,
  windSpeedUnit: 'mph',
  windAngleDegrees: 90,
  energyUnit: 'ftlb',
  atmospheric: {
    temperatureC: 5,
    pressureHpa: 950,
    humidityPercent: 60,
    altitudeM: 1200,
  },
  coriolis: { enabled: false, latitude: 0, azimuthDegrees: 0 },
  targetDistances: TARGETS,
  targetUnit: 'meter',
  timeStep: 0.0005,
}

const atmo = computeAtmosphericFactors(engineInput.atmospheric)
const eng = calculateBallistics(engineInput)

console.log('=== SCENARIO 2: 6.5 CM 140gr G7 BC=0.315 ===')
console.log('JBM meta: density=' + jbm.density + ' lb/ft³, SOS=' + jbm.sos + ' fps, elev=' + jbm.elevMoa + ' MOA')
console.log('Motor atmo: densityRatio=' + atmo.densityRatio.toFixed(4) + ', SOS=' + atmo.speedOfSoundFps.toFixed(1) + ' fps')
console.log('Motor launch angle: ' + eng.launchAngleDegrees + ' deg')
console.log('')

const pct = (motor, ref) => {
  if (ref === 0) return Math.abs(motor) < 0.05 ? '0.00' : 'N/A'
  return (((motor - ref) / ref) * 100).toFixed(2)
}

console.log('Range | JBM drop | Mot drop | drop% | JBM wind | Mot wind | wind% | JBM vel | Mot vel | vel% | JBM TOF | Mot TOF | tof% | JBM E | Mot E | E%')
for (const t of TARGETS) {
  const j = jbm.rows.find((r) => r.range === t)
  const m = eng.results.find((r) => r.distance === t)
  if (!j || !m) {
    console.log(t + 'm — missing row')
    continue
  }
  const jDrop = Math.abs(j.dropCm)
  const jWind = Math.abs(j.windageCm)
  console.log(
    [
      t + 'm',
      jDrop.toFixed(1),
      m.dropCm.toFixed(1),
      pct(m.dropCm, jDrop),
      jWind.toFixed(1),
      Math.abs(m.windageCm).toFixed(1),
      pct(Math.abs(m.windageCm), jWind),
      j.velocity.toFixed(1),
      m.velocityRemaining.toFixed(0),
      pct(m.velocityRemaining, j.velocity),
      j.time.toFixed(3),
      m.timeOfFlightSeconds.toFixed(3),
      pct(m.timeOfFlightSeconds, j.time),
      j.energy.toFixed(1),
      m.energyRemaining.toFixed(1),
      pct(m.energyRemaining, j.energy),
    ].join(' | '),
  )
}
