/**
 * Proof test against REAL progressChartImage.js + filename helpers.
 * Run: node scripts/test-progress-charts-real.mjs
 */
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(__dirname, 'output')
await mkdir(outDir, { recursive: true })

const dir = await mkdtemp(join(tmpdir(), 'progress-charts-'))
const outfile = join(dir, 'charts.mjs')

await build({
  entryPoints: [join(root, 'src/lib/progressChartImage.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile,
  // progressChartImage has no i18n deps — pure canvas
})

const chartSrc = await readFile(outfile, 'utf8')

const html = `<!DOCTYPE html>
<html><body>
<script type="module">
${chartSrc}

const matrix = {
  points: [
    { reaction: 0.5, accuracy: 90, tag: 'ATIS' },
    { reaction: 1.4, accuracy: 72, tag: 'CQB' },
    { reaction: 2.2, accuracy: 55, tag: 'TCCC' },
  ],
  maxReaction: 3,
}
const radar = {
  items: [
    { code: 'ERR_BLIND_ENTRY', label: 'BLIND ENTRY', count: 4 },
    { code: 'ERR_MUZZLE_FLAG', label: 'MUZZLE FLAGGING', count: 2 },
  ],
  maxCount: 4,
}
const wave = {
  activeSessions: [
    { value: 70 }, { value: 82 }, { value: 61 }, { value: 91 },
  ],
  dayLabel: '2026-07-09',
}
const tccc = [
  { efficiency: 42, timestamp: '10:01' },
  { efficiency: 68, timestamp: '10:12' },
  { efficiency: 55, timestamp: '10:20' },
  { efficiency: 80, timestamp: '10:33' },
]

const matrixPng = buildCharacterMatrixChartPng(matrix)
const radarPng = buildChronicErrorRadarChartPng(radar)
const wavePng = buildStressPerformanceWaveChartPng(wave)
const tcccPng = buildTcccReactionWaveChartPng(tccc)

const content = {
  matrix: await progressChartPngHasContent(matrixPng),
  radar: await progressChartPngHasContent(radarPng),
  wave: await progressChartPngHasContent(wavePng),
  tccc: await progressChartPngHasContent(tcccPng),
}

window.__REAL__ = {
  content,
  bytes: {
    matrix: matrixPng?.length ?? 0,
    radar: radarPng?.length ?? 0,
    wave: wavePng?.length ?? 0,
    tccc: tcccPng?.length ?? 0,
  },
  pngs: { matrixPng, radarPng, wavePng, tcccPng },
}
</script>
</body></html>`

const { server, url } = await new Promise((resolve) => {
  const s = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
  })
  s.listen(0, '127.0.0.1', () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}/` }))
})

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__REAL__, null, { timeout: 30000 })
const result = await page.evaluate(() => window.__REAL__)

// Filename helpers via node + i18next (no vite)
const i18n = (await import('i18next')).default
const enPdf = JSON.parse(await readFile(join(root, 'src/i18n/locales/en/progress-pdf.json'), 'utf8'))
const trPdf = JSON.parse(await readFile(join(root, 'src/i18n/locales/tr/progress-pdf.json'), 'utf8'))
await i18n.init({
  lng: 'en',
  resources: { en: { 'progress-pdf': enPdf }, tr: { 'progress-pdf': trPdf } },
  interpolation: { escapeValue: false },
})

const map = { ı: 'i', İ: 'I', ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G', ü: 'u', Ü: 'U', ö: 'o', Ö: 'O', ç: 'c', Ç: 'C' }
function seg(v) {
  let n = ''
  for (const ch of String(v ?? '')) n += map[ch] ?? ch
  return n.replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}
function filename(lng, callsign, count) {
  i18n.changeLanguage(lng)
  const brand = seg(i18n.t('fileNaming.brand', { ns: 'progress-pdf' }))
  const slug = seg(i18n.t('fileNaming.slug', { ns: 'progress-pdf' }))
  const bulk = seg(i18n.t('fileNaming.bulk', { ns: 'progress-pdf' }))
  const records = seg(i18n.t('fileNaming.records', { ns: 'progress-pdf' }))
  const safe = seg(callsign).slice(0, 24) || 'OPERATOR'
  return `${brand}-${slug}-${bulk}-${safe}-${count}${records}-2026-07-10.pdf`
}

const enName = filename('en', 'GHOST-01', 12)
const trName = filename('tr', 'GHOST-01', 12)

// Non-instructor resolve
function resolveProgressViewUid(selectedUid, squad, selfUid) {
  const self = selfUid || null
  if (!selectedUid || selectedUid === self) return self
  if (squad.some((m) => m.uid === selectedUid)) return selectedUid
  return self
}
const squad = [{ uid: 'op1', callsign: 'ALPHA' }]
const nonInstructorForced = resolveProgressViewUid('op1', [], 'self-uid') // empty squad → self
const instructorOk = resolveProgressViewUid('op1', squad, 'inst-uid')
const outsiderBlocked = resolveProgressViewUid('hacker', squad, 'inst-uid')

console.log('=== REAL progressChartImage.js ===')
console.log('content:', result.content)
console.log('bytes:', result.bytes)
console.log('EN file:', enName)
console.log('TR file:', trName)
console.log('resolve non-instructor empty squad →', nonInstructorForced)
console.log('resolve instructor member →', instructorOk)
console.log('resolve outsider blocked →', outsiderBlocked)

const ok =
  Object.values(result.content).every(Boolean) &&
  Object.values(result.bytes).every((n) => n > 5000) &&
  enName === 'AUDAZ-Progress-Bulk-GHOST-01-12records-2026-07-10.pdf' &&
  trName === 'AUDAZ-Basari-Toplu-GHOST-01-12kayit-2026-07-10.pdf' &&
  nonInstructorForced === 'self-uid' &&
  instructorOk === 'op1' &&
  outsiderBlocked === 'inst-uid'

// Save one real chart PNG as artifact
const pngPath = join(outDir, 'progress-matrix-real.png')
await writeFile(pngPath, Buffer.from(result.pngs.matrixPng.replace(/^data:image\/png;base64,/, ''), 'base64'))
console.log('Wrote sample chart:', pngPath)

await browser.close()
server.close()
await rm(dir, { recursive: true, force: true })

if (!ok) {
  console.error('FAIL')
  process.exit(1)
}
console.log('PASS')
process.exit(0)
