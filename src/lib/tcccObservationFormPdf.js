import { jsPDF } from 'jspdf'
import { PDF_FONT_FAMILY, preparePdfAssets, setPdfFont } from './pdfFontLoader'
import { TCCC_MARCH_ACTION_CHIPS, TCCC_MARCH_EVALUATION_PHASES } from './tcccEvaluationPayload'
import { TCCC_PHASE_SUB_CRITERIA } from './evaluationPhaseCriteria'
import { TCCC_OBSERVED_PDF_FORM_VERSION } from './observedEvalConstants'

/** @typedef {{ callsign?: string; username?: string; displayName?: string }} OperatorPrefill */

const COLORS = {
  bg: [10, 10, 10],
  text: [203, 213, 225],
  muted: [100, 116, 139],
  accent: [255, 180, 0],
  green: [0, 255, 65],
  red: [248, 113, 113],
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
 */
function drawScoreBoxes1to10(doc, startX, y) {
  const box = 5
  const gap = 1.2
  setPdfFont(doc, 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...COLORS.muted)
  for (let i = 1; i <= 10; i++) {
    const x = startX + (i - 1) * (box + gap)
    drawEmptyBox(doc, x, y, box)
    doc.text(String(i), x + box / 2, y + box + 3.2, { align: 'center' })
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
 * @param {OperatorPrefill} [operator]
 */
export async function generateTcccObservationFormPdf(operator = {}) {
  const formId = `OBS-V1-${Date.now().toString(36).toUpperCase().slice(-8)}`
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  paintPage(doc, pageW, pageH)

  doc.addImage(logoDataUrl, 'PNG', MARGIN, 10, logoDims.widthMm, logoDims.heightMm)
  const textX = MARGIN + logoDims.widthMm + 4
  setPdfFont(doc, 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.accent)
  doc.text('TCCC MARCH PEER OBSERVATION FORM', textX, 16)
  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.green)
  doc.text('AUDAZ TACTICAL · MARCH Gözlem Formu', textX, 21)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Form: ${formId} · ${TCCC_OBSERVED_PDF_FORM_VERSION}`, textX, 26)

  const operatorName = operator?.callsign || operator?.username || operator?.displayName || ''
  let y = 34
  setPdfFont(doc, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.text('Operatör / Gözlemci bilgileri', MARGIN, y)
  y += 6
  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text('Operatör:', MARGIN, y)
  doc.setTextColor(...COLORS.text)
  doc.text(operatorName || '________________________________', MARGIN + 48, y)
  y += 7
  doc.setTextColor(...COLORS.muted)
  doc.text('Gözlemci adı:', MARGIN, y)
  doc.text('________________________________', MARGIN + 48, y)
  y += 7
  doc.text('Gözlemci callsign:', MARGIN, y)
  doc.text('________________________', MARGIN + 48, y)
  y += 7
  doc.text('Saha tarihi:', MARGIN, y)
  doc.text('____ / ____ / ______', MARGIN + 48, y)
  y += 7
  doc.text('Gözlemci imza:', MARGIN, y)
  doc.line(MARGIN + 48, y, MARGIN + 120, y)
  y += 8
  doc.text('☐ Zamanlı müdahale    Hedef süre (sn): ________', MARGIN, y)
  y += 10

  setPdfFont(doc, 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  const instr = doc.splitTextToSize(
    'Talimat: Gözlemci MARCH protokolünü safha safha işaretler. Kritik hata (K.İ.A) varsa skor 0 sayılır.',
    pageW - MARGIN * 2,
  )
  doc.text(instr, MARGIN, y)
  y += instr.length * 4 + 4

  for (const meta of TCCC_MARCH_EVALUATION_PHASES) {
    if (y > pageH - 55) {
      doc.addPage()
      paintPage(doc, pageW, pageH)
      y = 20
    }

    setPdfFont(doc, 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.accent)
    doc.text(`${meta.letter} — ${meta.title}`, MARGIN, y)
    y += 5
    setPdfFont(doc, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    doc.text(meta.subtitle, MARGIN, y)
    y += 6

    doc.setTextColor(...COLORS.red)
    doc.text('☐ KRİTİK HATA (K.İ.A)', MARGIN, y)
    y += 6
    doc.setTextColor(...COLORS.muted)
    const criteria = TCCC_PHASE_SUB_CRITERIA[meta.id] ?? []
    for (const criterion of criteria) {
      doc.text(`${criterion.label} (1–10):`, MARGIN, y)
      drawScoreBoxes1to10(doc, MARGIN + 48, y - 3.5)
      y += 10
    }
    if (!criteria.length) {
      doc.text('SKOR (1–10):', MARGIN, y)
      drawScoreBoxes1to10(doc, MARGIN + 28, y - 3.5)
      y += 6
    }

    doc.text('TAKTİK MÜDAHALE (uygulananları işaretleyin):', MARGIN, y)
    y += 5
    setPdfFont(doc, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.text)
    const chips = TCCC_MARCH_ACTION_CHIPS[meta.id]
    let chipX = MARGIN
    for (const chip of chips) {
      const label = `☐ ${chip.label}`
      const w = doc.getTextWidth(label) + 4
      if (chipX + w > pageW - MARGIN) {
        chipX = MARGIN
        y += 5
      }
      doc.text(label, chipX, y)
      chipX += w + 2
    }
    y += 8

    doc.setTextColor(...COLORS.muted)
    doc.text('GÖZLEM NOTU:', MARGIN, y)
    y += 4
    doc.setDrawColor(...COLORS.muted)
    doc.line(MARGIN, y + 8, pageW - MARGIN, y + 8)
    doc.line(MARGIN, y + 16, pageW - MARGIN, y + 16)
    y += 22
  }

  if (y > pageH - 25) {
    doc.addPage()
    paintPage(doc, pageW, pageH)
    y = 20
  }
  doc.setTextColor(...COLORS.muted)
  doc.text('Yaralı durumu: ☐ STABLE    ☐ EKS / K.İ.A', MARGIN, y)

  setPdfFont(doc, 'normal')
  doc.setFontSize(7)
  doc.text(
    'Bu form doğrulanmamış gözlem kaydı içindir · Eğitmen onayı ayrı kanaldan yapılır.',
    MARGIN,
    pageH - 10,
  )

  doc.save(`TCCC-Gozlem-Formu-${formId}.pdf`)
  return formId
}

export { PDF_FONT_FAMILY }
