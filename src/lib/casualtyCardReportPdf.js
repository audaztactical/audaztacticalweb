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

  let cursorY = drawSectionTitle(doc, margin, pageW, 'Yaralı Bilgileri', startY)

  autoTable(doc, {
    startY: cursorY,
    head: [['Parametre', 'Değer']],
    body: [
      ['Tarih', formatCasualtyCardDate(card)],
      ['Yaralı', getCasualtyPatientName(card)],
      ['Tahliye önceliği', getCasualtyEvacPriorityLabel(card)],
      ['Aktif MARCH adımı', `${marchMeta.key} · ${marchMeta.subtitle}`],
      ['Kan grubu', getCasualtyBloodTypeLabel(card)],
      ['Alerjiler', getCasualtyAllergies(card)],
      ['MOI (Yaralanma mekanizması)', getCasualtyMechanismOfInjury(card)],
      ['MARCH müdahaleleri', `${marchCount.done} kayıtlı`],
    ],
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8

  const sections = getCasualtyMarchSections(card)
  if (sections.length > 0) {
    cursorY = drawSectionTitle(doc, margin, pageW, 'MARCH Müdahale Özeti', cursorY)

    autoTable(doc, {
      startY: cursorY,
      head: [['Faz', 'Uygulanan müdahaleler']],
      body: sections.map((s) => [s.step, s.items.join(' · ')]),
      ...getAutoTableOptions(margin, { styles: { fontSize: PDF_FONT_SIZE.table - 1 } }),
    })
    // @ts-expect-error jspdf-autotable plugin
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8
  }

  const treatments = getCasualtyAppliedTreatmentsNote(card)
  const note = getCasualtyOperationNote(card)

  cursorY = drawSectionTitle(doc, margin, pageW, 'Tıbbi Notlar', cursorY)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)

  if (treatments !== '—') {
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text('Uygulanan tedaviler:', margin, cursorY)
    cursorY += 5
    doc.setTextColor(...PDF_COLORS.text)
    const tLines = doc.splitTextToSize(treatments, pageW - margin * 2)
    doc.text(tLines, margin, cursorY)
    cursorY += tLines.length * 5 + 4
  } else if (sections.length > 0) {
    const fallback = sections.map((s) => s.items.join(' · ')).join(' · ')
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text('Uygulanan tedaviler:', margin, cursorY)
    cursorY += 5
    doc.setTextColor(...PDF_COLORS.text)
    const tLines = doc.splitTextToSize(fallback, pageW - margin * 2)
    doc.text(tLines, margin, cursorY)
    cursorY += tLines.length * 5 + 4
  }

  if (note !== '—') {
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text('Operasyon notu:', margin, cursorY)
    cursorY += 5
    doc.setTextColor(...PDF_COLORS.text)
    const nLines = doc.splitTextToSize(note, pageW - margin * 2)
    doc.text(nLines, margin, cursorY)
  }
}

function buildPdfFilename(card, callsign) {
  const safeCallsign = callsign.replace(/[^\w-]+/g, '_').slice(0, 24)
  const stamp = formatCasualtyCardDate(card).replace(/[^\d]/g, '').slice(0, 12) || 'rapor'
  return `AUDAZ-DD1380-${safeCallsign}-${stamp}.pdf`
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
        `Kayıt ${index + 1} / ${rows.length}`,
      )
    }
    drawCasualtyDetail(doc, margin, pageW, card, startY)
  })

  stampPdfFooters(doc, reportId)
  doc.save(buildPdfFilename(rows[0], callsign))
}
