/**
 * .308 Win senaryosu ile balistik PDF üretir ve grafik şeklini doğrular.
 * node scripts/ballistic-pdf-export-test.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCanvas, loadImage } from 'canvas'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calculateBallistics } from '../src/lib/ballisticsEngine.js'
import {
  chartPngValidateShapeFromImageData,
  computeBallisticChartLayout,
  drawBallisticChartNode,
} from '../src/lib/ballisticChartImage.js'
import { getBallisticTerm, TABLE_COLUMN_TERM_KEYS } from '../src/data/ballisticTerms.js'

const PDF_MARGIN = 14
const PDF_TEXT = [26, 26, 46]
const PDF_MUTED = [74, 85, 104]

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(__dirname, 'output')
mkdirSync(outDir, { recursive: true })

function arrayBufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64')
}

function drawSectionTitle(doc, margin, pageW, title, y) {
  doc.setFillColor(26, 26, 46)
  doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F')
  doc.setFillColor(34, 197, 94)
  doc.rect(margin, y - 4, 2, 8, 'F')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(title, margin + 4, y + 1.5)
  return y + 10
}

function getAutoTableOptions(margin) {
  return {
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [26, 26, 46], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  }
}

async function preparePdfAssetsNode(doc) {
  const regular = readFileSync(path.join(root, 'public/fonts/Roboto-Regular.ttf'))
  const bold = readFileSync(path.join(root, 'public/fonts/Roboto-Bold.ttf'))
  const logoBuf = readFileSync(path.join(root, 'src/assets/logo.png'))
  const logoDataUrl = `data:image/png;base64,${logoBuf.toString('base64')}`

  doc.addFileToVFS('Roboto-Regular.ttf', arrayBufferToBase64(regular))
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', arrayBufferToBase64(bold))
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')

  return { logoDataUrl, logoDims: { widthMm: 16, heightMm: 16 } }
}

function setPdfFont(doc, style = 'normal') {
  doc.setFont('Roboto', style)
}

function buildChartPng(results) {
  const width = 960
  const height = 320
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  drawBallisticChartNode(ctx, results, width, height)
  return canvas.toDataURL('image/png')
}

async function loadPngImageDataNode(pngPath) {
  const img = await loadImage(pngPath)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, img.width, img.height)
  return { data: imageData.data, width: img.width, height: img.height }
}

function ensureSpace(doc, pageW, pageH, y, needed = 20) {
  if (y + needed <= pageH - PDF_MARGIN) return y
  doc.addPage()
  return PDF_MARGIN + 8
}

async function buildPdf(output, chartImageDataUrl, saveTo) {
  const layoutLog = []
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  await preparePdfAssetsNode(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_MARGIN
  const title = 'BALİSTİK TRAJEKTORİ · .308 Win Test'

  let y = margin + 10
  layoutLog.push('Sayfa 1: Kapak + balistik özet + menzil tablosu')

  setPdfFont(doc, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...PDF_TEXT)
  doc.text(title, margin, y)
  y += 8
  doc.text(`Sıfırlama açısı: ${output.launchAngleDegrees.toFixed(4)}°`, margin, y)
  y += 5
  doc.text(`Hava yoğunluğu oranı: ${output.airDensityRatio.toFixed(4)}`, margin, y)
  y += 5
  doc.text(`Ses hızı: ${output.speedOfSoundMps.toFixed(1)} m/s`, margin, y)
  y += 8

  const tableStart = drawSectionTitle(doc, margin, pageW, 'Menzil tablosu', y)
  autoTable(doc, {
    startY: tableStart,
    head: [['M (m)', 'Drop (cm)', 'Wind (cm)', 'TOF (s)', 'V (fps)', 'E (ft·lb)', 'MOA', 'MRAD', 'Mach']],
    body: output.results.map((r) => [
      String(r.distance),
      Math.abs(r.dropCm).toFixed(1),
      Math.abs(r.windageCm).toFixed(1),
      r.timeOfFlightSeconds.toFixed(3),
      r.velocityRemaining.toFixed(0),
      r.energyRemaining.toFixed(0),
      r.dropMOA.toFixed(2),
      r.dropMRAD.toFixed(2),
      r.machNumber.toFixed(3),
    ]),
    ...getAutoTableOptions(margin),
  })

  layoutLog.push(`Sayfa ${doc.getNumberOfPages()}: Menzil tablosu (${output.results.length} satır)`)

  doc.addPage()
  y = margin + 8
  layoutLog.push(`Sayfa ${doc.getNumberOfPages()}: Trajektori grafiği`)

  y = drawSectionTitle(doc, margin, pageW, 'Trajektori grafiği', y)
  const imgW = pageW - margin * 2
  const imgH = 72
  doc.addImage(chartImageDataUrl, 'PNG', margin, y, imgW, imgH, undefined, 'SLOW')
  y += imgH + 8

  const pngBuf = Buffer.from(chartImageDataUrl.split(',')[1], 'base64')
  writeFileSync(path.join(outDir, 'balistik-chart-test.png'), pngBuf)
  layoutLog.push(`Sayfa ${doc.getNumberOfPages()}: Grafik PNG gömüldü (${Math.round(pngBuf.length / 1024)} KB)`)

  y = ensureSpace(doc, pageW, pageH, y, 24)
  layoutLog.push(`Sayfa ${doc.getNumberOfPages()}: TERİM AÇIKLAMALARI başlangıcı`)
  y = drawSectionTitle(doc, margin, pageW, 'TERİM AÇIKLAMALARI', y)

  const contentW = pageW - margin * 2
  for (const termKey of TABLE_COLUMN_TERM_KEYS) {
    const term = getBallisticTerm(termKey)
    if (!term) continue
    y = ensureSpace(doc, pageW, pageH, y, 24)

    setPdfFont(doc, 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_TEXT)
    doc.text(`${term.termTr} (${term.termEn})`, margin, y)
    y += 5
    setPdfFont(doc, 'normal')
    doc.setFontSize(9)
    const defLines = doc.splitTextToSize(term.definition, contentW)
    doc.text(defLines, margin, y)
    y += defLines.length * 4.2 + 2
    if (term.actionAdvice) {
      setPdfFont(doc, 'bold')
      doc.setTextColor(...PDF_MUTED)
      doc.text('Ne yapmalı?', margin, y)
      y += 4
      setPdfFont(doc, 'normal')
      doc.setTextColor(...PDF_TEXT)
      const advLines = doc.splitTextToSize(term.actionAdvice, contentW)
      doc.text(advLines, margin, y)
      y += advLines.length * 4.2 + 4
    }
  }

  const pdfBuf = Buffer.from(doc.output('arraybuffer'))
  writeFileSync(saveTo, pdfBuf)

  return { pageCount: doc.getNumberOfPages(), layoutLog, pdfSize: pdfBuf.length }
}

const targets = []
for (let d = 100; d <= 1500; d += 100) targets.push(d)

const output = calculateBallistics({
  bulletWeight: 175,
  bulletDiameter: 0.308,
  muzzleVelocity: 2600,
  ballisticCoefficient: 0.243,
  bcModel: 'G7',
  sightHeight: 5,
  zeroDistance: 100,
  targetDistances: targets,
  temperatureC: 15,
  pressureHpa: 1013.25,
  humidityPercent: 0,
  altitudeM: 0,
  pressureType: 'station',
  windSpeed: 0,
  windSpeedUnit: 'mph',
  windAngleDegrees: 90,
  energyUnit: 'ftlb',
})

const layout = computeBallisticChartLayout(output.results)
console.log('=== Koordinat örneği (.308 Win) ===')
for (const d of [100, 800, 1500]) {
  const r = output.results.find((x) => x.distance === d)
  console.log(
    `${d}m: drop=${Math.abs(r.dropCm).toFixed(1)}cm → yDrop=${layout.yDrop(r.dropCm).toFixed(1)}, vel=${r.velocityRemaining.toFixed(0)}fps → yVel=${layout.yVel(r.velocityRemaining).toFixed(1)}, x=${layout.xAt(d).toFixed(1)}`,
  )
}

const chartPng = buildChartPng(output.results)
if (!chartPng || chartPng.length < 1200) {
  console.error('FAIL: Chart PNG üretilemedi, length=', chartPng?.length ?? 0)
  process.exit(1)
}

const pdfPath = path.join(outDir, 'balistik-308-test.pdf')
const result = await buildPdf(output, chartPng, pdfPath)

const pngPath = path.join(outDir, 'balistik-chart-test.png')
const loaded = await loadPngImageDataNode(pngPath)
const shape = chartPngValidateShapeFromImageData(loaded, output.results, 960, 320, { mode: 'strict' })

console.log('\n=== Balistik PDF Test (.308 Win) ===')
console.log('Profil: .308 Win 175gr SMK (G7 BC 0.243)')
console.log('Menzil noktası:', output.results.length)
console.log('Chart PNG:', `${Math.round(chartPng.length / 1024)} KB`)
console.log('PDF:', pdfPath)
console.log('PDF boyutu:', `${Math.round(result.pdfSize / 1024)} KB`)
console.log('Sayfa sayısı:', result.pageCount)
console.log('\nSayfa yapısı:')
result.layoutLog.forEach((line) => console.log(' -', line))

const pdfRaw = readFileSync(pdfPath)
const pageMarkers = (pdfRaw.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length
console.log('\nPDF /Page işaretleyici sayısı:', pageMarkers)

console.log('\n=== chartPngValidateShape ===')
console.log('Sonuç:', shape.ok ? 'GEÇTİ' : 'KALDI')
if (shape.checkpoints?.length) {
  shape.checkpoints.forEach((cp) => {
    console.log(
      ` - ${cp.distance}m: dropHit=${cp.dropHit} velHit=${cp.velHit} (drop y≈${cp.expectedDrop.y.toFixed(0)}, vel y≈${cp.expectedVel.y.toFixed(0)})`,
    )
  })
}
if (shape.issues?.length) {
  console.log('Sorunlar:', shape.issues.join('; '))
}
console.log('Drop Y serisi (100→1500m):', shape.dropYs?.map((y) => Math.round(y)).join(' → '))
console.log('Vel Y serisi (100→1500m):', shape.velYs?.map((y) => Math.round(y)).join(' → '))

if (!shape.ok) {
  console.error('FAIL: chartPngValidateShape başarısız')
  process.exit(1)
}

if (result.pageCount < 3 || pageMarkers < 3) {
  console.error('FAIL: Beklenen en az 3 sayfa')
  process.exit(1)
}

console.log('\nOK: PDF ve grafik PNG oluşturuldu — chartPngValidateShape geçti.')
