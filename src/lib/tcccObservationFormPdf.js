import { jsPDF } from 'jspdf'
import { PDF_FONT_FAMILY, preparePdfAssets, setPdfFont } from './pdfFontLoader'
import { TCCC_MARCH_ACTION_CHIPS, TCCC_MARCH_EVALUATION_PHASES } from './tcccEvaluationPayload'
import { TCCC_PHASE_SUB_CRITERIA } from './evaluationPhaseCriteria'
import { TCCC_OBSERVED_PDF_FORM_VERSION } from './observedEvalConstants'
import {
  PDF_COLORS,
  PDF_FONT_SIZE,
  PDF_LAYOUT,
  PDF_REPORT_TITLES,
  drawEmptyFormBox,
  drawFormFieldLine,
  drawObservationFormHeader,
  drawPdfHeader,
  drawSectionTitle,
  paintPdfPage,
  stampPdfFooters,
} from './pdfDesignTokens'

/** @typedef {{ callsign?: string; username?: string; displayName?: string }} OperatorPrefill */

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} startX
 * @param {number} y
 */
function drawScoreBoxes1to10(doc, startX, y) {
  const box = 5
  const gap = 1.2
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  for (let i = 1; i <= 10; i++) {
    const x = startX + (i - 1) * (box + gap)
    drawEmptyFormBox(doc, x, y, box)
    doc.text(String(i), x + box / 2, y + box + 3.2, { align: 'center' })
  }
}

/**
 * @param {OperatorPrefill} [operator]
 */
export async function generateTcccObservationFormPdf(operator = {}) {
  const formId = `OBS-V1-${Date.now().toString(36).toUpperCase().slice(-8)}`
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin
  const formTitle = PDF_REPORT_TITLES.tcccObsForm

  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  let y = drawObservationFormHeader(
    doc,
    pageW,
    pageH,
    logoDataUrl,
    logoDims,
    formTitle,
    formId,
    TCCC_OBSERVED_PDF_FORM_VERSION,
  )

  const operatorName = operator?.callsign || operator?.username || operator?.displayName || ''
  y = drawSectionTitle(doc, margin, pageW, 'Operatör / Gözlemci Bilgileri', y)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text('Operatör:', margin, y)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text(operatorName || '________________________________', margin + 48, y)
  y += 7
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text('Gözlemci adı:', margin, y)
  doc.text('________________________________', margin + 48, y)
  y += 7
  doc.text('Gözlemci callsign:', margin, y)
  doc.text('________________________', margin + 48, y)
  y += 7
  doc.text('Saha tarihi:', margin, y)
  doc.text('____ / ____ / ______', margin + 48, y)
  y += 7
  doc.text('Gözlemci imza:', margin, y)
  drawFormFieldLine(doc, margin + 48, y, 72)
  y += 8
  doc.text('☐ Zamanlı müdahale    Hedef süre (sn): ________', margin, y)
  y += 10

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  const instr = doc.splitTextToSize(
    'Talimat: Gözlemci MARCH protokolünü safha safha işaretler. Kritik hata (K.İ.A) varsa skor 0 sayılır.',
    pageW - margin * 2,
  )
  doc.text(instr, margin, y)
  y += instr.length * 4 + 4

  for (const meta of TCCC_MARCH_EVALUATION_PHASES) {
    if (y > pageH - 55) {
      doc.addPage()
      paintPdfPage(doc, pageW, pageH)
      drawPdfHeader(doc, pageW, logoDataUrl, logoDims, formTitle)
      y = PDF_LAYOUT.headerHeight + 6
    }

    y = drawSectionTitle(doc, margin, pageW, `${meta.letter} — ${meta.title}`, y)
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.small)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(meta.subtitle, margin, y)
    y += 6

    doc.setTextColor(...PDF_COLORS.error)
    doc.text('☐ KRİTİK HATA (K.İ.A)', margin, y)
    y += 6
    doc.setTextColor(...PDF_COLORS.muted)
    const criteria = TCCC_PHASE_SUB_CRITERIA[meta.id] ?? []
    for (const criterion of criteria) {
      doc.text(`${criterion.label} (1–10):`, margin, y)
      drawScoreBoxes1to10(doc, margin + 48, y - 3.5)
      y += 10
    }
    if (!criteria.length) {
      doc.text('SKOR (1–10):', margin, y)
      drawScoreBoxes1to10(doc, margin + 28, y - 3.5)
      y += 6
    }

    doc.text('TAKTİK MÜDAHALE (uygulananları işaretleyin):', margin, y)
    y += 5
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.small)
    doc.setTextColor(...PDF_COLORS.text)
    const chips = TCCC_MARCH_ACTION_CHIPS[meta.id]
    let chipX = margin
    for (const chip of chips) {
      const label = `☐ ${chip.label}`
      const w = doc.getTextWidth(label) + 4
      if (chipX + w > pageW - margin) {
        chipX = margin
        y += 5
      }
      doc.text(label, chipX, y)
      chipX += w + 2
    }
    y += 8

    doc.setTextColor(...PDF_COLORS.muted)
    doc.text('GÖZLEM NOTU:', margin, y)
    y += 4
    drawFormFieldLine(doc, margin, y + 8, pageW - margin * 2)
    drawFormFieldLine(doc, margin, y + 16, pageW - margin * 2)
    y += 22
  }

  if (y > pageH - 25) {
    doc.addPage()
    paintPdfPage(doc, pageW, pageH)
    drawPdfHeader(doc, pageW, logoDataUrl, logoDims, formTitle)
    y = PDF_LAYOUT.headerHeight + 6
  }
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text('Yaralı durumu: ☐ STABLE    ☐ EKS / K.İ.A', margin, y)
  y += 8

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(
    'Bu form doğrulanmamış gözlem kaydı içindir · Eğitmen onayı ayrı kanaldan yapılır.',
    margin,
    y,
  )

  stampPdfFooters(doc, formId)
  doc.save(`TCCC-Gozlem-Formu-${formId}.pdf`)
  return formId
}

export { PDF_FONT_FAMILY }
