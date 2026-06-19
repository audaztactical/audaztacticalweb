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
import { PDF_FONT_FAMILY, preparePdfAssets, setPdfFont } from './pdfFontLoader'

/** @typedef {{ callsign?: string, username?: string, email?: string, bloodType?: string }} OperatorInfo */

const COLORS = {
  bg: [10, 10, 10],
  text: [203, 213, 225],
  muted: [100, 116, 139],
  accent: [255, 180, 0],
  green: [0, 255, 65],
}

const TABLE_STYLES = {
  font: PDF_FONT_FAMILY,
  fontSize: 8,
  textColor: COLORS.text,
  fillColor: COLORS.bg,
  lineColor: [51, 65, 85],
  lineWidth: 0.1,
}

function paintPage(doc, pageW, pageH) {
  doc.setFillColor(...COLORS.bg)
  doc.rect(0, 0, pageW, pageH, 'F')
}

function drawReportHeader(doc, logoDataUrl, logoDims, margin) {
  const textX = margin + logoDims.widthMm + 5
  doc.addImage(logoDataUrl, 'PNG', margin, 11, logoDims.widthMm, logoDims.heightMm)

  setPdfFont(doc, 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.accent)
  doc.text('DD-1380 · YARALI OPERASYON KAYDI', textX, 17)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.green)
  doc.text('AUDAZ TACTICAL · TCCC MARCH', textX, 22)

  doc.setTextColor(...COLORS.muted)
  doc.text(`Rapor üretim: ${new Date().toLocaleString('tr-TR')}`, textX, 27)
}

function drawOperatorBlock(doc, margin, operator) {
  const callsign = operator?.callsign || operator?.username || 'Operatör'
  setPdfFont(doc, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.text('Operatör kimliği', margin, 36)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Çağrı işareti: ${callsign}`, margin, 42)
  doc.text(`E-posta: ${operator?.email || '—'}`, margin, 47)
  return callsign
}

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

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
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
    theme: 'plain',
    styles: TABLE_STYLES,
    headStyles: {
      fillColor: [8, 8, 8],
      textColor: COLORS.green,
      fontStyle: 'bold',
      font: PDF_FONT_FAMILY,
    },
    alternateRowStyles: { fillColor: [15, 17, 21] },
    tableLineColor: [51, 65, 85],
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? startY) + 8

  const sections = getCasualtyMarchSections(card)
  if (sections.length > 0) {
    setPdfFont(doc, 'bold')
    doc.setTextColor(...COLORS.accent)
    doc.text('MARCH müdahale özeti', margin, cursorY)
    cursorY += 6

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Faz', 'Uygulanan müdahaleler']],
      body: sections.map((s) => [s.step, s.items.join(' · ')]),
      theme: 'plain',
      styles: { ...TABLE_STYLES, fontSize: 7 },
      headStyles: {
        fillColor: [8, 8, 8],
        textColor: COLORS.green,
        fontStyle: 'bold',
        font: PDF_FONT_FAMILY,
      },
      alternateRowStyles: { fillColor: [15, 17, 21] },
      tableLineColor: [51, 65, 85],
    })
    // @ts-expect-error jspdf-autotable plugin
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8
  }

  const treatments = getCasualtyAppliedTreatmentsNote(card)
  const note = getCasualtyOperationNote(card)

  setPdfFont(doc, 'bold')
  doc.setTextColor(...COLORS.accent)
  doc.text('Tıbbi notlar', margin, cursorY)
  cursorY += 6
  setPdfFont(doc, 'normal')
  doc.setTextColor(...COLORS.text)

  if (treatments !== '—') {
    doc.setTextColor(...COLORS.muted)
    doc.text('Uygulanan tedaviler:', margin, cursorY)
    cursorY += 5
    doc.setTextColor(...COLORS.text)
    const tLines = doc.splitTextToSize(treatments, pageW - margin * 2)
    doc.text(tLines, margin, cursorY)
    cursorY += tLines.length * 5 + 4
  } else if (sections.length > 0) {
    const fallback = sections.map((s) => s.items.join(' · ')).join(' · ')
    doc.setTextColor(...COLORS.muted)
    doc.text('Uygulanan tedaviler:', margin, cursorY)
    cursorY += 5
    doc.setTextColor(...COLORS.text)
    const tLines = doc.splitTextToSize(fallback, pageW - margin * 2)
    doc.text(tLines, margin, cursorY)
    cursorY += tLines.length * 5 + 4
  }

  if (note !== '—') {
    doc.setTextColor(...COLORS.muted)
    doc.text('Operasyon notu:', margin, cursorY)
    cursorY += 5
    doc.setTextColor(...COLORS.text)
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
  const margin = 14

  rows.forEach((card, index) => {
    if (index > 0) {
      doc.addPage()
    }
    paintPage(doc, pageW, pageH)
    drawReportHeader(doc, logoDataUrl, logoDims, margin)
    const callsign = drawOperatorBlock(doc, margin, operator)
    if (rows.length === 1) {
      void callsign
    }
    drawCasualtyDetail(doc, margin, pageW, card, index === 0 ? 54 : 54)
  })

  const callsign = operator?.callsign || operator?.username || 'Operatör'
  doc.save(buildPdfFilename(rows[0], callsign))
}
