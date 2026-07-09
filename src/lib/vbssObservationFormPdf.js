import { jsPDF } from 'jspdf'
import { PDF_FONT_FAMILY, preparePdfAssets, setPdfFont } from './pdfFontLoader'
import { VBSS_EVALUATION_PHASES } from './vbssEvaluationPayload'
import { VBSS_PHASE_SUB_CRITERIA } from './evaluationPhaseCriteria'
import { VBSS_OBSERVED_PDF_FORM_VERSION } from './observedEvalConstants'
import { pdfReportTitle, pdfT } from './pdfReportText'
import {
  formatObservedEvalCriterionLabel,
  formatObservedEvalPhaseSubtitle,
  formatObservedEvalPhaseTitle,
} from './trainingDisplayText'
import {
  PDF_COLORS,
  PDF_FONT_SIZE,
  PDF_LAYOUT,
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
 * @param {number} count
 * @param {number} [startIndex]
 */
function drawScoreBoxes(doc, startX, y, count, startIndex = 0) {
  const box = 5
  const gap = 1.5
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  for (let i = 0; i < count; i++) {
    const n = startIndex + i
    const x = startX + i * (box + gap)
    drawEmptyFormBox(doc, x, y, box)
    doc.text(String(n), x + box / 2, y + box + 3.5, { align: 'center' })
  }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {number} pageW
 * @param {OperatorPrefill} [operator]
 */
function drawMetaBlock(doc, y, pageW, operator) {
  const margin = PDF_LAYOUT.margin
  const operatorName = operator?.callsign || operator?.username || operator?.displayName || ''
  let cursor = drawSectionTitle(doc, margin, pageW, pdfT('obsForm.vbss.operatorObserverInfo'), y)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(pdfT('obsForm.vbss.operatorLabel'), margin, cursor)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text(operatorName || '________________________________', margin + 48, cursor)
  cursor += 7
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(pdfT('obsForm.vbss.observerName'), margin, cursor)
  doc.text('________________________________', margin + 48, cursor)
  cursor += 7
  doc.text(pdfT('obsForm.vbss.observerCallsign'), margin, cursor)
  doc.text('________________________', margin + 48, cursor)
  cursor += 7
  doc.text(pdfT('obsForm.vbss.fieldDate'), margin, cursor)
  doc.text('____ / ____ / ______', margin + 48, cursor)
  doc.text(pdfT('obsForm.vbss.location'), margin + 95, cursor)
  doc.text('____________________', margin + 115, cursor)
  cursor += 7
  doc.text(pdfT('obsForm.vbss.observerSignature'), margin, cursor)
  drawFormFieldLine(doc, margin + 48, cursor, 72)
  cursor += 8
  doc.text(pdfT('obsForm.vbss.timedSession'), margin, cursor)

  return cursor + 8
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} startY
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number; heightMm: number }} logoDims
 * @param {string} formTitle
 */
function drawPhases(doc, startY, pageW, pageH, logoDataUrl, logoDims, formTitle) {
  const margin = PDF_LAYOUT.margin
  let y = startY

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  const instr = doc.splitTextToSize(pdfT('obsForm.vbss.instruction'), pageW - margin * 2)
  doc.text(instr, margin, y)
  y += instr.length * 4 + 6

  for (const meta of VBSS_EVALUATION_PHASES) {
    if (y > pageH - 45) {
      doc.addPage()
      paintPdfPage(doc, pageW, pageH)
      drawPdfHeader(doc, pageW, logoDataUrl, logoDims, formTitle)
      y = PDF_LAYOUT.headerHeight + 6
    }

    y = drawSectionTitle(
      doc,
      margin,
      pageW,
      formatObservedEvalPhaseTitle('vbss', meta.id, meta.title),
      y
    )
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.small)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(formatObservedEvalPhaseSubtitle('vbss', meta.id, meta.subtitle), margin, y)
    y += 6

    const criteria = VBSS_PHASE_SUB_CRITERIA[meta.id] ?? []
    for (const criterion of criteria) {
      const label = formatObservedEvalCriterionLabel('vbss', meta.id, criterion.id, criterion.label)
      doc.text(pdfT('obsForm.vbss.scoreRange', { label }), margin, y)
      drawScoreBoxes(doc, margin + 48, y - 3.5, 11, 0)
      y += 10
    }
    if (!criteria.length) {
      doc.text(pdfT('obsForm.vbss.scoreFallback'), margin, y)
      drawScoreBoxes(doc, margin + 28, y - 3.5, 11, 0)
      y += 10
    }

    doc.text(pdfT('obsForm.vbss.observationNote'), margin, y)
    y += 4
    drawFormFieldLine(doc, margin, y + 8, pageW - margin * 2)
    drawFormFieldLine(doc, margin, y + 16, pageW - margin * 2)
    y += 22
  }

  return y
}

/**
 * @param {OperatorPrefill} [operator]
 */
export async function generateVbssObservationFormPdf(operator = {}) {
  const formId = `OBS-V1-${Date.now().toString(36).toUpperCase().slice(-8)}`
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin
  const formTitle = pdfReportTitle('vbssObsForm')

  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  const headerEnd = drawObservationFormHeader(
    doc,
    pageW,
    pageH,
    logoDataUrl,
    logoDims,
    formTitle,
    formId,
    VBSS_OBSERVED_PDF_FORM_VERSION,
  )

  const metaEnd = drawMetaBlock(doc, headerEnd, pageW, operator)
  const phasesEnd = drawPhases(doc, metaEnd, pageW, pageH, logoDataUrl, logoDims, formTitle)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(pdfT('obsForm.vbss.disclaimer'), margin, phasesEnd)

  stampPdfFooters(doc, formId)
  doc.save(`VBSS-Gozlem-Formu-${formId}.pdf`)
  return formId
}

export { PDF_FONT_FAMILY }
