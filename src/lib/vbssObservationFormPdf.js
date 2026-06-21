import { jsPDF } from 'jspdf'
import { PDF_FONT_FAMILY, preparePdfAssets, setPdfFont } from './pdfFontLoader'
import { VBSS_EVALUATION_PHASES } from './vbssEvaluationPayload'
import { VBSS_OBSERVED_PDF_FORM_VERSION } from './observedEvalConstants'

/** @typedef {{ callsign?: string; username?: string; displayName?: string }} OperatorPrefill */

const COLORS = {
  bg: [10, 10, 10],
  text: [203, 213, 225],
  muted: [100, 116, 139],
  accent: [255, 180, 0],
  green: [0, 255, 65],
}

const MARGIN = 14

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} size
 */
function drawEmptyBox(doc, x, y, size = 4) {
  doc.setDrawColor(...COLORS.muted)
  doc.setLineWidth(0.2)
  doc.rect(x, y, size, size)
}

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
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  for (let i = 0; i < count; i++) {
    const n = startIndex + i
    const x = startX + i * (box + gap)
    drawEmptyBox(doc, x, y, box)
    doc.text(String(n), x + box / 2, y + box + 3.5, { align: 'center' })
  }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 */
function paintPage(doc, pageW, pageH) {
  doc.setFillColor(...COLORS.bg)
  doc.rect(0, 0, pageW, pageH, 'F')
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {string} logoDataUrl
 * @param {{ widthMm: number; heightMm: number }} logoDims
 * @param {string} formId
 */
function drawHeader(doc, logoDataUrl, logoDims, formId) {
  doc.addImage(logoDataUrl, 'PNG', MARGIN, 10, logoDims.widthMm, logoDims.heightMm)
  const textX = MARGIN + logoDims.widthMm + 4

  setPdfFont(doc, 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.accent)
  doc.text('VBSS PEER OBSERVATION FORM', textX, 16)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.green)
  doc.text('AUDAZ TACTICAL · Gemi Operasyonu Gözlem Formu', textX, 21)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Form: ${formId} · ${VBSS_OBSERVED_PDF_FORM_VERSION}`, textX, 26)
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {OperatorPrefill} [operator]
 */
function drawMetaBlock(doc, y, operator) {
  const operatorName = operator?.callsign || operator?.username || operator?.displayName || ''
  setPdfFont(doc, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.text('Operatör / Gözlemci bilgileri', MARGIN, y)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  let cursor = y + 6
  doc.text('Operatör (callsign / ad):', MARGIN, cursor)
  doc.setTextColor(...COLORS.text)
  doc.text(operatorName || '________________________________', MARGIN + 48, cursor)
  cursor += 7
  doc.setTextColor(...COLORS.muted)
  doc.text('Gözlemci adı:', MARGIN, cursor)
  doc.text('________________________________', MARGIN + 48, cursor)
  cursor += 7
  doc.text('Gözlemci callsign:', MARGIN, cursor)
  doc.text('________________________', MARGIN + 48, cursor)
  cursor += 7
  doc.text('Saha tarihi:', MARGIN, cursor)
  doc.text('____ / ____ / ______', MARGIN + 48, cursor)
  doc.text('Lokasyon:', MARGIN + 95, cursor)
  doc.text('____________________', MARGIN + 115, cursor)
  cursor += 7
  doc.text('Gözlemci imza:', MARGIN, cursor)
  doc.line(MARGIN + 48, cursor, MARGIN + 120, cursor)
  cursor += 8
  doc.text('☐ Zamanlı oturum    Hedef operasyon süresi (sn): ________', MARGIN, cursor)

  return cursor + 8
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} startY
 * @param {number} pageW
 * @param {number} pageH
 */
function drawPhases(doc, startY, pageW, pageH) {
  let y = startY

  setPdfFont(doc, 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  const instr = doc.splitTextToSize(
    'Talimat: Gözlemci sahadaki performansı işaretler. Operatör, işaretlemeleri uygulamaya kendi eliyle girer.',
    pageW - MARGIN * 2,
  )
  doc.text(instr, MARGIN, y)
  y += instr.length * 4 + 6

  for (const meta of VBSS_EVALUATION_PHASES) {
    if (y > pageH - 45) {
      doc.addPage()
      paintPage(doc, pageW, pageH)
      y = 20
    }

    setPdfFont(doc, 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.accent)
    doc.text(meta.title, MARGIN, y)
    y += 5
    setPdfFont(doc, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    doc.text(meta.subtitle, MARGIN, y)
    y += 6

    doc.text('SKOR (0–10):', MARGIN, y)
    drawScoreBoxes(doc, MARGIN + 28, y - 3.5, 11, 0)
    y += 12

    doc.text('GÖZLEM NOTU:', MARGIN, y)
    y += 4
    doc.setDrawColor(...COLORS.muted)
    doc.line(MARGIN, y + 8, pageW - MARGIN, y + 8)
    doc.line(MARGIN, y + 16, pageW - MARGIN, y + 16)
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

  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  paintPage(doc, pageW, pageH)
  drawHeader(doc, logoDataUrl, logoDims, formId)

  const metaEnd = drawMetaBlock(doc, 34, operator)
  drawPhases(doc, metaEnd, pageW, pageH)

  setPdfFont(doc, 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text(
    'Bu form doğrulanmamış gözlem kaydı içindir · Eğitmen onayı ayrı kanaldan yapılır.',
    MARGIN,
    pageH - 10,
  )

  doc.save(`VBSS-Gozlem-Formu-${formId}.pdf`)
  return formId
}

export { PDF_FONT_FAMILY }
