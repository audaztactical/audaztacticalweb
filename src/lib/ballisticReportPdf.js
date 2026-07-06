import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getBallisticTerm, TABLE_COLUMN_TERM_KEYS } from '../data/ballisticTerms.js'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import {
  PDF_COLORS,
  PDF_FONT_SIZE,
  PDF_LAYOUT,
  drawSectionTitle,
  getAutoTableOptions,
  setupReportContinuationPage,
  setupReportFirstPage,
  stampPdfFooters,
} from './pdfDesignTokens'

/**
 * Recharts SVG çıktısını PNG data URL'e çevirir (PDF gömme için).
 * @param {HTMLElement | null | undefined} container
 * @returns {Promise<string | null>}
 */
export async function chartContainerToPngDataUrl(container) {
  if (!container) return null

  const svg = container.querySelector('svg.recharts-surface')
  if (!svg) return null

  const rect = container.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const clone = /** @type {SVGSVGElement} */ (svg.cloneNode(true))
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }

  const svgString = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = url
    })

    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.scale(scale, scale)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @param {number} y
 * @returns {number}
 */
function ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, needed = 20) {
  if (y + needed <= pageH - PDF_LAYOUT.margin) return y
  doc.addPage()
  return setupReportContinuationPage(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, 'Devam')
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @param {number} startY
 */
function drawTermGlossarySection(doc, margin, pageW, pageH, logoDataUrl, logoDims, reportTitle, startY) {
  let y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, startY, 24)
  y = drawSectionTitle(doc, margin, pageW, 'TERİM AÇIKLAMALARI', y)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  const contentW = pageW - margin * 2

  for (const termKey of TABLE_COLUMN_TERM_KEYS) {
    const term = getBallisticTerm(termKey)
    if (!term) continue

    y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, 28)

    setPdfFont(doc, 'bold')
    doc.setFontSize(PDF_FONT_SIZE.body)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text(`${term.termTr} (${term.termEn})`, margin, y)
    y += 5

    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.small)
    doc.setTextColor(...PDF_COLORS.text)

    const definitionLines = doc.splitTextToSize(term.definition, contentW)
    doc.text(definitionLines, margin, y)
    y += definitionLines.length * 4.2 + 2

    if (term.actionAdvice) {
      setPdfFont(doc, 'bold')
      doc.setTextColor(...PDF_COLORS.muted)
      doc.text('Ne yapmalı?', margin, y)
      y += 4
      setPdfFont(doc, 'normal')
      doc.setTextColor(...PDF_COLORS.text)
      const adviceLines = doc.splitTextToSize(term.actionAdvice, contentW)
      doc.text(adviceLines, margin, y)
      y += adviceLines.length * 4.2 + 4
    } else {
      y += 3
    }
  }

  return y
}

/**
 * @param {import('./ballisticsEngine.js').BallisticsEngineOutput} output
 * @param {{ profileName?: string, chartImageDataUrl?: string | null }} meta
 */
export async function exportBallisticReportPdf(output, meta = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin

  const title = meta.profileName
    ? `BALİSTİK TRAJEKTORİ · ${meta.profileName}`
    : 'BALİSTİK TRAJEKTORİ RAPORU'

  const { reportId, contentStartY } = setupReportFirstPage(
    doc,
    pageW,
    pageH,
    logoDataUrl,
    logoDims,
    title,
    null,
  )

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  let y = contentStartY
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

  y = (doc.lastAutoTable?.finalY ?? tableStart) + 8

  if (meta.chartImageDataUrl) {
    y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, title, y, 55)
    y = drawSectionTitle(doc, margin, pageW, 'Trajektori grafiği', y)

    const imgW = pageW - margin * 2
    const imgH = 62
    doc.addImage(meta.chartImageDataUrl, 'PNG', margin, y, imgW, imgH, undefined, 'FAST')
    y += imgH + 8
  }

  drawTermGlossarySection(doc, margin, pageW, pageH, logoDataUrl, logoDims, title, y)

  stampPdfFooters(doc, reportId)
  doc.save(`audaz-balistik-${Date.now()}.pdf`)
}
