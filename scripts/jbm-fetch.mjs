import { writeFileSync } from 'fs'
import { calculateBallistics, computeAtmosphericFactors, dragFunctionG } from '../src/lib/ballisticsEngine.js'

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
    if (cells.length >= 5 && /^\d+$/.test(cells[0])) rows.push(cells)
  }
  return rows
}

const jbmParams = {
  'b_id.v': '-1',
  'bc.v': '0.243',
  'd_f.v': '4',
  'bt_wgt.v': '175',
  'bt_wgt.u': '23',
  'cal.v': '0.308',
  'cal.u': '8',
  'm_vel.v': '2600',
  'm_vel.u': '16',
  'hgt_sgt.v': '5',
  'hgt_sgt.u': '11',
  'los.v': '0.0',
  'cnt.v': '0.0',
  'spd_wnd.v': '0.0',
  'spd_wnd.u': '14',
  'spd_tgt.v': '0.0',
  'spd_tgt.u': '14',
  'rng_min.v': '0',
  'rng_max.v': '1000',
  'rng_inc.v': '100',
  'rng_zer.v': '100',
  'tmp.v': '59.0',
  'tmp.u': '19',
  'prs.v': '29.92',
  'prs.u': '22',
  'hum.v': '0.0',
  'alt.v': '0.0',
  'alt.u': '10',
  'cor_prs.v': 'on',
  'cor_ele.v': 'on',
  'def_cnt.v': '', // off = standard LOS drop (not target-relative)
  'rng_un.v': 'on',
  'col1_un.v': '1.00',
  'col1_un.u': '11',
  'col2_un.v': '1.00',
  'col2_un.u': '4',
  'col_eng.v': '0',
}

const html = await fetchJBM(jbmParams)
writeFileSync('jbm_result.html', html)
const rows = parseJBM(html)
console.log('=== JBM Trajectory (Simplified) ===')
console.log('Params: G7 BC=0.243, 2600fps, 175gr, sight=5cm, zero=100m, 59F/15C, 29.92inHg, wind=0')
console.log('Source: https://jbmballistics.com/cgi-bin/jbmtraj_simp-5.1.cgi')
console.log('')
console.log('Range(m) | Drop1(cm) | Drop2(MOA) | Windage | Time(s) | Velocity(fps) | Energy | ...')
for (const r of rows) {
  console.log(r.join(' | '))
}

// Engine comparison
const input = {
  muzzleVelocity: 2600,
  velocityUnit: 'fps',
  ballisticCoefficient: 0.243,
  bcModel: 'G7',
  bulletWeight: 175,
  weightUnit: 'grain',
  bulletDiameter: 0.308,
  bulletDiameterUnit: 'inch',
  sightHeight: 5,
  sightHeightUnit: 'cm',
  zeroDistance: 100,
  zeroUnit: 'meter',
  shootingAngle: 0,
  windSpeed: 0,
  atmospheric: { temperatureC: 15, pressureHpa: 1013.25, humidityPercent: 0, altitudeM: 0 },
  coriolis: { enabled: false, latitude: 0, azimuthDegrees: 0 },
  targetDistances: [100, 300, 500, 700, 1000],
  targetUnit: 'meter',
  timeStep: 0.0005,
}

const out = calculateBallistics(input)
console.log('\n=== Audaz Engine ===')
console.log('launch angle deg:', out.launchAngleDegrees)
for (const r of out.results) {
  console.log(`${r.distance}m | drop ${r.dropCm.toFixed(2)} cm | TOF ${r.timeOfFlightSeconds.toFixed(3)} s | vel ${r.velocityRemaining.toFixed(0)} fps | mach ${r.machNumber.toFixed(3)}`)
}

// SOS before/after at 500m
const wrongSos = 49.0223 * Math.sqrt(15 + 273.15)
const fixedSos = computeAtmosphericFactors(input.atmospheric).speedOfSoundFps
const hardcoded = 1116.45
const v500 = out.results.find((r) => r.distance === 500).velocityRemaining

console.log('\n=== SOS / Mach / G(M) at 500m ===')
for (const [label, sos] of [
  ['Pre-fix drag (hardcoded SOS in G(M) lookup)', hardcoded],
  ['Buggy exported SOS (sqrt Kelvin, never used in drag before wiring)', wrongSos],
  ['Post-fix atmospheric SOS (Rankine, now used in drag)', fixedSos],
]) {
  const mach = v500 / sos
  const g = dragFunctionG(v500, 'G7', sos)
  const retard = (g * 1.0) / 0.243
  console.log(`${label}:`)
  console.log(`  SOS=${sos.toFixed(2)} fps, Mach=${mach.toFixed(4)}, G(M)=${g.toFixed(2)} fps/s, drag retard=${retard.toFixed(1)} fps/s`)
}
