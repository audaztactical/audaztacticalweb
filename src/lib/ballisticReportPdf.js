import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import {
  PDF_COLORS,
  PDF_FONT_SIZE,
  PDF_LAYOUT,
  drawSectionTitle,
  getAutoTableOptions,
  setupReportFirstPage,
  stampPdfFooters,
} from './pdfDesignTokens'

/**
 * @param {import('./ballisticsEngine.js').BallisticsEngineOutput} output
 * @param {{ profileName?: string }} meta
 */
export async function exportBallisticReportPdf(output, meta = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
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
    head: [['M (m)', 'Drop (cm)', 'Wind (cm)', 'TOF (s)', 'V (fps)', 'E (ft·lb)', 'MOA', 'MRAD']],
    body: output.results.map((r) => [
      String(r.distance),
      Math.abs(r.dropCm).toFixed(1),
      Math.abs(r.windageCm).toFixed(1),
      r.timeOfFlightSeconds.toFixed(3),
      r.velocityRemaining.toFixed(0),
      r.energyRemaining.toFixed(0),
      r.dropMOA.toFixed(2),
      r.dropMRAD.toFixed(2),
    ]),
    ...getAutoTableOptions(margin),
  })

  stampPdfFooters(doc, reportId)
  doc.save(`audaz-balistik-${Date.now()}.pdf`)
}
