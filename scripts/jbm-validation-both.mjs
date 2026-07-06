import { readFileSync, writeFileSync } from 'fs'
import { calculateBallistics, computeAtmosphericFactors } from '../src/lib/ballisticsEngine.js'

async function fetchJBM(params) {
  const body = new URLSearchParams(params)
  const res = await fetch('https://jbmballistics.com/cgi-bin/jbmtraj_simp-5.1.cgi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://jbmballistics.com/cgi-bin/jbmtraj_simp-5.1.cgi',
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
        drop: Number(cells[1]),
        wind: Number(cells[3]),
        vel: Number(cells[5]),
        e: Number(cells[7]),
        t: Number(cells[8]),
      })
    }
  }
  const density = html.match(/Atmospheric Density:[\s\S]*?([\d.]+)\s*lb\/ft/)
  const sos = html.match(/Speed of Sound:[\s\S]*?([\d.]+)\s*ft\/s/)
  return { rows, density: density?.[1], sos: sos?.[1] }
}

function pct(a, b) {
  if (b === 0) return Math.abs(a) < 0.05 ? '0.00' : 'N/A'
  return (((a - b) / b) * 100).toFixed(2)
}

function compare(label, jbmRows, engineInput, targets) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(label)
  console.log('='.repeat(60))
  const atmo = computeAtmosphericFactors(engineInput.atmospheric)
  console.log(
    `Motor rho ratio=${atmo.densityRatio.toFixed(4)} SOS=${atmo.speedOfSoundFps.toFixed(1)} fps`,
  )
  const eng = calculateBallistics({ ...engineInput, energyUnit: 'ftlb' })
  console.log(`Launch angle: ${eng.launchAngleDegrees} deg`)
  console.log(
    'Range | drop% | wind% | vel% | tof% | E% | JBM drop | Mot | JBM wind | Mot | JBM v | Mot',
  )
  for (const t of targets) {
    const j = jbmRows.find((r) => r.range === t)
    const m = eng.results.find((r) => r.distance === t)
    if (!j || !m) continue
    const jd = Math.abs(j.drop)
    const jw = Math.abs(j.wind)
    console.log(
      [
        `${t}m`,
        pct(m.dropCm, jd),
        pct(Math.abs(m.windageCm), jw),
        pct(m.velocityRemaining, j.vel),
        pct(m.timeOfFlightSeconds, j.t),
        pct(m.energyRemaining, j.e),
        jd.toFixed(1),
        m.dropCm.toFixed(1),
        jw.toFixed(1),
        Math.abs(m.windageCm).toFixed(1),
        j.vel.toFixed(0),
        m.velocityRemaining.toFixed(0),
      ].join(' | '),
    )
  }
}

// Scenario 1 — fetch JBM
const s1Params = {
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
  'spd_wnd.v': '0',
  'spd_wnd.u': '14',
  'rng_min.v': '0',
  'rng_max.v': '1000',
  'rng_inc.v': '100',
  'rng_zer.v': '100',
  'tmp.v': '15',
  'tmp.u': '18',
  'prs.v': '1013.25',
  'prs.u': '21',
  'hum.v': '0',
  'alt.v': '0',
  'alt.u': '12',
  'cor_prs.v': 'on',
  'cor_ele.v': 'on',
  'rng_un.v': 'on',
  'col1_un.v': '1.00',
  'col1_un.u': '11',
  'col_eng.v': '0',
}
const s1Html = await fetchJBM(s1Params)
writeFileSync('jbm_scenario1.html', s1Html)
const s1Jbm = parseJBM(s1Html)
console.log(`S1 JBM density=${s1Jbm.density} SOS=${s1Jbm.sos}`)

compare(
  'SCENARIO 1 — .308 Win 175gr G7 BC=0.243, sea level, no wind',
  s1Jbm.rows,
  {
    muzzleVelocity: 2600,
    velocityUnit: 'fps',
    ballisticCoefficient: 0.243,
    bcModel: 'G7',
    bulletWeight: 175,
    bulletDiameter: 0.308,
    sightHeight: 5,
    zeroDistance: 100,
    windSpeed: 0,
    atmospheric: {
      temperatureC: 15,
      pressureHpa: 1013.25,
      humidityPercent: 0,
      altitudeM: 0,
      pressureType: 'station',
    },
    targetDistances: [100, 300, 500, 700, 1000],
    timeStep: 0.0005,
  },
  [100, 300, 500, 700, 1000],
)

// Scenario 2 — use cached JBM or refetch
const s2Params = {
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
  'spd_wnd.v': '10',
  'spd_wnd.u': '14',
  'ang_wnd.v': '90',
  'rng_min.v': '0',
  'rng_max.v': '1200',
  'rng_inc.v': '100',
  'rng_zer.v': '200',
  'tmp.v': '5',
  'tmp.u': '18',
  'prs.v': '950',
  'prs.u': '21',
  'hum.v': '60',
  'alt.v': '1200',
  'alt.u': '12',
  'cor_ele.v': 'on',
  'rng_un.v': 'on',
  'col1_un.v': '1.00',
  'col1_un.u': '11',
  'col_eng.v': '0',
}
const s2Html = await fetchJBM(s2Params)
writeFileSync('jbm_scenario2.html', s2Html)
const s2Jbm = parseJBM(s2Html)
console.log(`\nS2 JBM density=${s2Jbm.density} SOS=${s2Jbm.sos}`)

compare(
  'SCENARIO 2 — 6.5CM 140gr, 1200m, 950hPa station, 10mph crosswind',
  s2Jbm.rows,
  {
    muzzleVelocity: 2710,
    velocityUnit: 'fps',
    ballisticCoefficient: 0.315,
    bcModel: 'G7',
    bulletWeight: 140,
    bulletDiameter: 0.264,
    sightHeight: 4,
    zeroDistance: 200,
    windSpeed: 10,
    windSpeedUnit: 'mph',
    windAngleDegrees: 90,
    atmospheric: {
      temperatureC: 5,
      pressureHpa: 950,
      humidityPercent: 60,
      altitudeM: 1200,
      pressureType: 'station',
    },
    targetDistances: [100, 300, 500, 700, 900, 1200],
    timeStep: 0.0005,
  },
  [100, 300, 500, 700, 900, 1200],
)
