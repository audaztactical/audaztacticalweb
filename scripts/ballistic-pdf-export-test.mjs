/**
 * .308 Win senaryosu ile balistik PDF üretir (grafiksiz yapı).
 * node scripts/ballistic-pdf-export-test.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calculateBallistics } from '../src/lib/ballisticsEngine.js'
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

  doc.addFileToVFS('Roboto-Regular.ttf', arrayBufferToBase64(regular))
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', arrayBufferToBase64(bold))
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
}

function setPdfFont(doc, style = 'normal') {
  doc.setFont('Roboto', style)
}

function ensureSpace(doc, pageW, pageH, y, needed = 20) {
  if (y + needed <= pageH - PDF_MARGIN) return y
  doc.addPage()
  return PDF_MARGIN + 8
}

async function buildPdf(output, saveTo) {
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
  layoutLog.push(`Sayfa ${doc.getNumberOfPages()}: Terim açıklamaları başlangıcı`)
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

const pdfPath = path.join(outDir, 'balistik-308-test.pdf')
const result = await buildPdf(output, pdfPath)

console.log('=== Balistik PDF Test (.308 Win) ===')
console.log('Profil: .308 Win 175gr SMK (G7 BC 0.243)')
console.log('Menzil noktası:', output.results.length)
console.log('PDF:', pdfPath)
console.log('PDF boyutu:', `${Math.round(result.pdfSize / 1024)} KB`)
console.log('Sayfa sayısı:', result.pageCount)
console.log('\nSayfa yapısı:')
result.layoutLog.forEach((line) => console.log(' -', line))

const pdfRaw = readFileSync(pdfPath)
const pageMarkers = (pdfRaw.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length
console.log('\nPDF /Page işaretleyici sayısı:', pageMarkers)

if (result.pageCount < 2 || pageMarkers < 2) {
  console.error('FAIL: Beklenen en az 2 sayfa (tablo + terimler)')
  process.exit(1)
}

console.log('\nOK: Grafiksiz PDF oluşturuldu.')
