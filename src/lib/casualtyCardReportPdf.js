import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  countCasualtyMarchInterventions,
  formatCasualtyCardDate,
  getCasualtyAllergies,
  getCasualtyAppliedTreatmentsNote,
  getCasualtyBloodTypeLabel,
  getCasualtyEvacPriorityLabel,
  getCasualtyMarchSections,
  getCasualtyMarchStepMeta,
  getCasualtyMechanismOfInjury,
  getCasualtyOperationNote,
  getCasualtyPatientName,
} from './casualtyCardRegistry'
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
import {
  healthPdfT,
  pdfFilenameSegment,
  pdfRecordLabel,
  pdfSafeCallsign,
} from './pdfReportText'

/** @typedef {{ callsign?: string, username?: string, email?: string, bloodType?: string }} OperatorInfo */

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {Record<string, unknown>} card
 * @param {number} startY
 */
function drawCasualtyDetail(doc, margin, pageW, card, startY) {
  const marchMeta = getCasualtyMarchStepMeta(card)
  const marchCount = countCasualtyMarchInterventions(card)

  let cursorY = drawSectionTitle(doc, margin, pageW, healthPdfT('casualtyReport.casualtyInfo'), startY)

  autoTable(doc, {
    startY: cursorY,
    head: [[healthPdfT('common.parameter'), healthPdfT('common.value')]],
    body: [
      [healthPdfT('casualtyReport.fields.date'), formatCasualtyCardDate(card)],
      [healthPdfT('casualtyReport.fields.casualty'), getCasualtyPatientName(card)],
      [healthPdfT('casualtyReport.fields.evacPriority'), getCasualtyEvacPriorityLabel(card)],
      [
        healthPdfT('casualtyReport.fields.activeMarch'),
        `${marchMeta.key} · ${marchMeta.subtitle}`,
      ],
      [healthPdfT('casualtyReport.fields.bloodType'), getCasualtyBloodTypeLabel(card)],
      [healthPdfT('casualtyReport.fields.allergies'), getCasualtyAllergies(card)],
      [healthPdfT('casualtyReport.fields.moi'), getCasualtyMechanismOfInjury(card)],
      [
        healthPdfT('casualtyReport.fields.marchInterventions'),
        healthPdfT('casualtyReport.marchCount', { count: marchCount.done }),
      ],
    ],
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8

  const sections = getCasualtyMarchSections(card)
  if (sections.length > 0) {
    cursorY = drawSectionTitle(doc, margin, pageW, healthPdfT('casualtyReport.marchSummary'), cursorY)

    autoTable(doc, {
      startY: cursorY,
      head: [[healthPdfT('casualtyReport.phaseCol'), healthPdfT('casualtyReport.interventionsCol')]],
      body: sections.map((s) => [s.step, s.items.join(' · ')]),
      ...getAutoTableOptions(margin, { styles: { fontSize: PDF_FONT_SIZE.table - 1 } }),
    })
    // @ts-expect-error jspdf-autotable plugin
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8
  }

  const treatments = getCasualtyAppliedTreatmentsNote(card)
  const note = getCasualtyOperationNote(card)
  const emDash = '—'

  cursorY = drawSectionTitle(doc, margin, pageW, healthPdfT('casualtyReport.medicalNotes'), cursorY)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)

  if (treatments !== emDash) {
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(healthPdfT('casualtyReport.appliedTreatments'), margin, cursorY)
    cursorY += 5
    doc.setTextColor(...PDF_COLORS.text)
    const tLines = doc.splitTextToSize(treatments, pageW - margin * 2)
    doc.text(tLines, margin, cursorY)
    cursorY += tLines.length * 5 + 4
  } else if (sections.length > 0) {
    const fallback = sections.map((s) => s.items.join(' · ')).join(' · ')
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(healthPdfT('casualtyReport.appliedTreatments'), margin, cursorY)
    cursorY += 5
    doc.setTextColor(...PDF_COLORS.text)
    const tLines = doc.splitTextToSize(fallback, pageW - margin * 2)
    doc.text(tLines, margin, cursorY)
    cursorY += tLines.length * 5 + 4
  }

  if (note !== emDash) {
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(healthPdfT('casualtyReport.operationNote'), margin, cursorY)
    cursorY += 5
    doc.setTextColor(...PDF_COLORS.text)
    const nLines = doc.splitTextToSize(note, pageW - margin * 2)
    doc.text(nLines, margin, cursorY)
  }
}

/**
 * @param {Record<string, unknown>} card
 * @param {string} callsign
 */
function buildPdfFilename(card, callsign) {
  const brand = pdfFilenameSegment(healthPdfT('fileNaming.brand'))
  const slug = pdfFilenameSegment(healthPdfT('fileNaming.dd1380Report'))
  const safeCallsign = pdfSafeCallsign(callsign)
  const stamp =
    formatCasualtyCardDate(card).replace(/[^\d]/g, '').slice(0, 12) ||
    pdfFilenameSegment(healthPdfT('common.reportFallback'))
  return `${brand}-${slug}-${safeCallsign}-${stamp}.pdf`
}

/**
 * @param {{
 *   cards: Record<string, unknown>[],
 *   operator?: OperatorInfo | null,
 * }} params
 */
export async function generateCasualtyCardReportPdf({ cards, operator }) {
  const rows = Array.isArray(cards) ? cards.filter(Boolean) : []
  if (rows.length === 0) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin

  const { reportId, callsign, contentStartY, reportTitle } = setupReportFirstPage(
    doc,
    pageW,
    pageH,
    logoDataUrl,
    logoDims,
    'dd1380',
    operator,
  )

  rows.forEach((card, index) => {
    let startY = contentStartY
    if (index > 0) {
      doc.addPage()
      startY = setupReportContinuationPage(
        doc,
        pageW,
        pageH,
        logoDataUrl,
        logoDims,
        reportTitle,
        pdfRecordLabel(index, rows.length),
      )
    }
    drawCasualtyDetail(doc, margin, pageW, card, startY)
  })

  stampPdfFooters(doc, reportId)
  doc.save(buildPdfFilename(rows[0], callsign))
}
