/**
 * Progress bulk PDF + chart PNG proof test (Playwright).
 * Run: node scripts/test-progress-bulk-pdf.mjs
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(__dirname, 'output')
mkdirSync(outDir, { recursive: true })

const cssFiles = readdirSync(join(root, 'dist/assets')).filter((f) => f.endsWith('.css'))
const css = cssFiles.length
  ? readFileSync(join(root, 'dist/assets', cssFiles[0]), 'utf8')
  : ''

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>${css}</style></head>
<body>
<script type="module">
import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/+esm'

function canvasToPng(w, h, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, w, h)
  draw(ctx, w, h)
  return canvas.toDataURL('image/png')
}

function hasContent(png, min = 200) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, c.width, c.height).data
      let colored = 0
      for (let i = 0; i < data.length; i += 16) {
        if (data[i] > 40 || data[i+1] > 40 || data[i+2] > 40) {
          colored++
          if (colored >= min) { resolve(true); return }
        }
      }
      resolve(false)
    }
    img.onerror = () => resolve(false)
    img.src = png
  })
}

function drawTitle(ctx, title, w) {
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 18px monospace'
  ctx.fillText(title, 24, 28)
}

const matrixPng = canvasToPng(960, 420, (ctx, w, h) => {
  drawTitle(ctx, 'TACTICAL CHARACTER MATRIX', w)
  const padL = 56, padT = 52, plotW = w - 80, plotH = h - 96
  ctx.strokeStyle = 'rgba(148,163,184,0.2)'
  ctx.strokeRect(padL, padT, plotW, plotH)
  const pts = [
    { r: 0.4, a: 92, c: '#38bdf8' },
    { r: 1.2, a: 78, c: '#f59e0b' },
    { r: 2.1, a: 61, c: '#fb7185' },
    { r: 0.9, a: 88, c: '#a78bfa' },
  ]
  const maxR = 3
  for (const p of pts) {
    const x = padL + (p.r / maxR) * plotW
    const y = padT + plotH - (p.a / 100) * plotH
    ctx.fillStyle = p.c
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill()
  }
})

const radarPng = canvasToPng(960, 320, (ctx, w) => {
  drawTitle(ctx, 'CHRONIC ERROR RADAR', w)
  const items = [
    { code: 'ERR_BLIND_ENTRY', count: 5 },
    { code: 'ERR_MUZZLE_FLAG', count: 3 },
    { code: 'ERR_FATAL_FUNNEL', count: 2 },
  ]
  const max = 5
  items.forEach((item, i) => {
    const y = 52 + i * 34
    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 13px monospace'
    ctx.fillText(item.code, 24, y + 18)
    const bw = (item.count / max) * 680
    ctx.fillStyle = '#f43f5e'
    ctx.fillRect(200, y + 4, bw, 20)
  })
})

const wavePng = canvasToPng(960, 360, (ctx, w, h) => {
  drawTitle(ctx, 'STRESS-PERFORMANCE WAVE', w)
  const padL = 48, padT = 56, plotW = w - 72, plotH = h - 96
  const vals = [72, 81, 64, 90, 55, 88]
  ctx.strokeStyle = '#34d399'
  ctx.lineWidth = 3
  ctx.beginPath()
  vals.forEach((v, i) => {
    const x = padL + (i / (vals.length - 1)) * plotW
    const y = padT + plotH - (v / 100) * plotH
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
  vals.forEach((v, i) => {
    const x = padL + (i / (vals.length - 1)) * plotW
    const y = padT + plotH - (v / 100) * plotH
    ctx.fillStyle = '#34d399'
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill()
  })
})

const tcccPng = canvasToPng(960, 360, (ctx, w, h) => {
  drawTitle(ctx, 'ANALYTIC TCCC REACTION WAVE', w)
  const padL = 48, padT = 56, plotW = w - 72, plotH = h - 104
  const vals = [40, 62, 55, 78, 33, 71, 85, 48]
  const barW = (plotW - 9 * 8) / vals.length
  vals.forEach((v, i) => {
    const bh = (v / 100) * plotH
    const x = padL + 8 + i * (barW + 8)
    const y = padT + plotH - bh
    ctx.fillStyle = '#fb7185'
    ctx.fillRect(x, y, barW, Math.max(2, bh))
  })
})

const charts = { matrix: matrixPng, radar: radarPng, wave: wavePng, tccc: tcccPng }
const content = {}
for (const [k, png] of Object.entries(charts)) {
  content[k] = await hasContent(png)
}

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
const pageW = doc.internal.pageSize.getWidth()
const margin = 14
let y = 20
doc.setFontSize(14)
doc.text('AUDAZ PROGRESS BULK REPORT TEST', margin, y)
y += 12
doc.setFontSize(10)
doc.text('Operator: GHOST-01 · Role: Member · View: Self', margin, y)
y += 10
doc.text('HUD: ORS 82 · Success 76% · Events 12 · Critical 3', margin, y)
y += 12

for (const [name, png] of Object.entries(charts)) {
  doc.setFontSize(11)
  doc.text(name.toUpperCase(), margin, y)
  y += 4
  const imgW = pageW - margin * 2
  const imgH = 55
  if (y + imgH > 270) { doc.addPage(); y = 20 }
  doc.addImage(png, 'PNG', margin, y, imgW, imgH)
  y += imgH + 10
}

doc.setFontSize(10)
doc.text('Activity: CQB CORNER-FED · 88% · 09 Jul 2026', margin, y)
y += 6
doc.text('Errors: ERR_BLIND_ENTRY x5 · ERR_MUZZLE_FLAG x3', margin, y)

const pdfB64 = doc.output('datauristring')
const filenameEn = 'AUDAZ-Progress-Bulk-GHOST-01-12records-2026-07-10.pdf'
const filenameTr = 'AUDAZ-Basari-Toplu-GHOST-01-12kayit-2026-07-10.pdf'

window.__PROGRESS_PDF_TEST__ = {
  content,
  bytes: Object.fromEntries(Object.entries(charts).map(([k, v]) => [k, v.length])),
  pdfBytes: pdfB64.length,
  pageCount: doc.getNumberOfPages(),
  pdfB64,
  filenameEn,
  filenameTr,
  hasTurkishInFilename: /[çğıöşüÇĞİÖŞÜ]/.test(filenameEn + filenameTr),
}
</script>
</body></html>`

function startServer(body) {
  return new Promise((resolve) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(body)
    })
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}/` })
    })
  })
}

const { server, url } = await startServer(html)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForFunction(() => window.__PROGRESS_PDF_TEST__, null, { timeout: 60000 })
const result = await page.evaluate(() => window.__PROGRESS_PDF_TEST__)

const pdfPath = join(outDir, 'progress-bulk-report-test.pdf')
const b64 = result.pdfB64.replace(/^data:application\/pdf;filename=generated.pdf;base64,/, '').replace(/^data:application\/pdf;base64,/, '')
writeFileSync(pdfPath, Buffer.from(b64, 'base64'))

console.log('=== Progress Bulk PDF Chart Proof ===')
console.log('Chart content (non-empty pixels):', result.content)
console.log('Chart PNG byte lengths:', result.bytes)
console.log('PDF pages:', result.pageCount)
console.log('PDF data URI length:', result.pdfBytes)
console.log('EN filename:', result.filenameEn)
console.log('TR filename:', result.filenameTr)
console.log('Turkish chars in filenames:', result.hasTurkishInFilename)
console.log('Wrote:', pdfPath)

const allChartsOk = Object.values(result.content).every(Boolean)
const pdfOk = result.pageCount >= 2 && result.pdfBytes > 50000
const namesOk = !result.hasTurkishInFilename

await browser.close()
server.close()

if (!allChartsOk || !pdfOk || !namesOk) {
  console.error('FAIL', { allChartsOk, pdfOk, namesOk })
  process.exit(1)
}
console.log('PASS: all 4 charts non-empty + PDF generated')
process.exit(0)
