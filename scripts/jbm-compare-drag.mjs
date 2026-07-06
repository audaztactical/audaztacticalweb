import { writeFileSync } from 'fs'

async function fetchJBM(params, tag) {
  const body = new URLSearchParams(params)
  const res = await fetch('https://jbmballistics.com/cgi-bin/jbmtraj_simp-5.1.cgi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
    },
    body: body.toString(),
  })
  const html = await res.text()
  writeFileSync(`jbm_${tag}.html`, html)
  return html
}

function parseRows(html) {
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
        dropCm: Math.abs(Number(cells[1])),
        velocity: Number(cells[5]),
        mach: Number(cells[6]),
        time: Number(cells[8]),
      })
    }
  }
  return rows
}

function parseMeta(html) {
  const elev = html.match(/Elevation:[\s\S]*?([\d.]+) MOA/)
  const df = html.match(/\(null\) \(d_f\.value\) = "(\d+)"/)
  return { elevMoa: elev?.[1], dragCode: df?.[1] }
}

const base = {
  'b_id.v': '-1',
  'bc.v': '0.243',
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
  'rng_min.v': '0',
  'rng_max.v': '500',
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
  'rng_un.v': 'on',
  'col1_un.v': '1.00',
  'col1_un.u': '11',
  'col2_un.v': '1.00',
  'col2_un.u': '4',
  'col_eng.v': '0',
}

for (const [tag, extra] of [
  ['g7_0243', { 'd_f.v': '4', 'bc.v': '0.243' }],
  ['g1_0496', { 'd_f.v': '0', 'bc.v': '0.496' }],
  ['g1_0243', { 'd_f.v': '0', 'bc.v': '0.243' }],
]) {
  const html = await fetchJBM({ ...base, ...extra }, tag)
  const meta = parseMeta(html)
  const rows = parseRows(html)
  console.log(`\n=== ${tag} drag=${meta.dragCode} elev=${meta.elevMoa} MOA ===`)
  for (const r of rows) {
    console.log(`${r.range}m drop=${r.dropCm.toFixed(1)}cm vel=${r.velocity.toFixed(1)} mach=${r.mach.toFixed(3)} t=${r.time.toFixed(3)}s`)
  }
}
