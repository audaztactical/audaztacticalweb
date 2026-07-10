/**
 * Instructor analytics chart PNG + filename proof.
 * Run: node scripts/test-instructor-pdf-charts.mjs
 */
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import i18n from 'i18next'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(__dirname, 'output')
await mkdir(outDir, { recursive: true })

const dir = await mkdtemp(join(tmpdir(), 'inst-charts-'))
const outfile = join(dir, 'charts.mjs')

await build({
  entryPoints: [join(root, 'src/lib/instructorChartImage.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile,
})

const chartSrc = await readFile(outfile, 'utf8')
const enPdf = JSON.parse(await readFile(join(root, 'src/i18n/locales/en/instructor-pdf.json'), 'utf8'))
const trPdf = JSON.parse(await readFile(join(root, 'src/i18n/locales/tr/instructor-pdf.json'), 'utf8'))

await i18n.init({
  lng: 'en',
  resources: { en: { 'instructor-pdf': enPdf }, tr: { 'instructor-pdf': trPdf } },
  interpolation: { escapeValue: false },
})

const map = { ı: 'i', İ: 'I', ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G', ü: 'u', Ü: 'U', ö: 'o', Ö: 'O', ç: 'c', Ç: 'C' }
function seg(v) {
  let n = ''
  for (const ch of String(v ?? '')) n += map[ch] ?? ch
  return n.replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}
function filename(lng, kind, group, count) {
  i18n.changeLanguage(lng)
  const brand = seg(i18n.t('fileNaming.brand', { ns: 'instructor-pdf' }))
  const slugKey = kind === 'feed' ? 'fileNaming.feedSlug' : 'fileNaming.analyticsSlug'
  const slug = seg(i18n.t(slugKey, { ns: 'instructor-pdf' }))
  const bulk = seg(i18n.t('fileNaming.bulk', { ns: 'instructor-pdf' }))
  const records = seg(i18n.t('fileNaming.records', { ns: 'instructor-pdf' }))
  return `${brand}-${slug}-${bulk}-${seg(group).slice(0, 24)}-${count}${records}-2026-07-10.pdf`
}

const html = `<!DOCTYPE html><html><body><script type="module">
${chartSrc}
const trend = [
  { label: '#1', value: 72, callsign: 'EMRE' },
  { label: '#2', value: 50, callsign: 'GHOST' },
  { label: '#3', value: 88, callsign: 'ALPHA' },
  { label: '#4', value: 61, callsign: 'EMRE' },
  { label: '#5', value: 79, callsign: 'BRAVO' },
]
const comparison = [
  { fullName: 'EMRE', overall: 76, drills: 12 },
  { fullName: 'GHOST', overall: 64, drills: 8 },
  { fullName: 'ALPHA', overall: 91, drills: 15 },
]
const curvePng = buildGroupPerformanceCurvePng(trend, 'GROUP PERFORMANCE CURVE')
const comparisonPng = buildOperatorSuccessComparisonPng(comparison, 'OPERATOR SUCCESS COMPARISON')
window.__R__ = {
  content: {
    curve: await instructorChartPngHasContent(curvePng),
    comparison: await instructorChartPngHasContent(comparisonPng),
  },
  bytes: { curve: curvePng?.length ?? 0, comparison: comparisonPng?.length ?? 0 },
  pngs: { curvePng, comparisonPng },
}
</script></body></html>`

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
await page.waitForFunction(() => window.__R__, null, { timeout: 30000 })
const result = await page.evaluate(() => window.__R__)

const enFeed = filename('en', 'feed', 'DENEME', 24)
const trFeed = filename('tr', 'feed', 'DENEME', 24)
const enAn = filename('en', 'analytics', 'DENEME', 40)
const trAn = filename('tr', 'analytics', 'DENEME', 40)

await writeFile(
  join(outDir, 'instructor-curve-real.png'),
  Buffer.from(result.pngs.curvePng.replace(/^data:image\/png;base64,/, ''), 'base64'),
)

console.log('=== Instructor PDF Chart Proof ===')
console.log('content:', result.content)
console.log('bytes:', result.bytes)
console.log('EN feed:', enFeed)
console.log('TR feed:', trFeed)
console.log('EN analytics:', enAn)
console.log('TR analytics:', trAn)

const ok =
  result.content.curve &&
  result.content.comparison &&
  result.bytes.curve > 5000 &&
  result.bytes.comparison > 5000 &&
  enFeed === 'AUDAZ-InstructorFeed-Bulk-DENEME-24records-2026-07-10.pdf' &&
  trFeed === 'AUDAZ-EgitmenFeed-Toplu-DENEME-24kayit-2026-07-10.pdf' &&
  !/[çğıöşüÇĞİÖŞÜ]/.test(enFeed + trFeed + enAn + trAn)

await browser.close()
server.close()
await rm(dir, { recursive: true, force: true })

if (!ok) {
  console.error('FAIL')
  process.exit(1)
}
console.log('PASS')
process.exit(0)
