import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatTcccDateCell,
  formatTcccEvacWaitingTime,
  formatTcccFilterSummary,
  formatTcccInterventionTime,
  formatTcccSystolicBp,
  getTcccAppliedTreatmentsSummary,
  getTcccCasualtyType,
  getTcccInjuryType,
  getTcccMarchSectionsForReport,
  getTcccOperationNote,
  getTcccOutcome,
  getTcccPhase,
  getTcccProcedurePerformed,
  getTcccSuccessPercent,
  getTcccTourniquetLocation,
} from './tcccLogRegistry'
import { formatMeteoOverviewRows, getLogMeteoData } from './meteoDataCapture'
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
 * @param {number} startY
 * @param {number} margin
 * @param {number} pageW
 * @param {Record<string, unknown>} log
 */
function drawEnvironmentalConditions(doc, startY, margin, pageW, log) {
  const meteo = getLogMeteoData(log)
  const tableStart = drawSectionTitle(doc, margin, pageW, 'Çevresel Koşullar · Meteo-Veri', startY)

  autoTable(doc, {
    startY: tableStart,
    head: [['Parametre', 'Değer']],
    body: formatMeteoOverviewRows(meteo),
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  return (doc.lastAutoTable?.finalY ?? tableStart + 20) + 8
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {Record<string, unknown>} log
 * @param {number} startY
 */
function drawClinicalSummary(doc, margin, pageW, log, startY) {
  const summaryStart = drawSectionTitle(doc, margin, pageW, 'Klinik ve Taktik Özet', startY)

  autoTable(doc, {
    startY: summaryStart,
    head: [['Parametre', 'Değer']],
    body: [
      ['Tarih', formatTcccDateCell(log)],
      ['Yaralı tipi', getTcccCasualtyType(log)],
      ['Müdahale süresi', formatTcccInterventionTime(log)],
      ['Uygulanan prosedür', getTcccProcedurePerformed(log)],
      ['Sonuç', getTcccOutcome(log)],
      ['Yaralanma tipi', getTcccInjuryType(log)],
      ['TCCC fazı', getTcccPhase(log)],
      ['Turnike konumu', getTcccTourniquetLocation(log)],
      ['Tahliye bekleme', formatTcccEvacWaitingTime(log)],
      ['Sistolik BP', formatTcccSystolicBp(log)],
      ['Başarı oranı', `%${getTcccSuccessPercent(log).toLocaleString('tr-TR')}`],
    ],
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? summaryStart) + 8

  const marchSections = getTcccMarchSectionsForReport(log)
  if (marchSections.length > 0) {
    cursorY = drawSectionTitle(doc, margin, pageW, 'MARCH müdahale özeti', cursorY)

    autoTable(doc, {
      startY: cursorY,
      head: [['Faz', 'Uygulanan müdahaleler']],
      body: marchSections.map((section) => [section.step, section.items.join(' · ')]),
      ...getAutoTableOptions(margin, { styles: { fontSize: PDF_FONT_SIZE.table } }),
    })
    // @ts-expect-error jspdf-autotable plugin
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8
  }

  const treatments = getTcccAppliedTreatmentsSummary(log)
  const note = getTcccOperationNote(log)

  cursorY = drawSectionTitle(doc, margin, pageW, 'Tıbbi Notlar', cursorY)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)

  if (treatments !== '—') {
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text('Uygulanan tedaviler:', margin, cursorY)
    cursorY += 5
    doc.setTextColor(...PDF_COLORS.text)
    const treatmentLines = doc.splitTextToSize(treatments, pageW - margin * 2)
    doc.text(treatmentLines, margin, cursorY)
    cursorY += treatmentLines.length * 5 + 4
  }

  doc.setTextColor(...PDF_COLORS.muted)
  doc.text('Operasyon notu:', margin, cursorY)
  cursorY += 5
  doc.setTextColor(...PDF_COLORS.text)

  const noteLines = doc.splitTextToSize(note, pageW - margin * 2)
  doc.text(noteLines, margin, cursorY)

  return cursorY + noteLines.length * 5
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {number} startY
 * @param {Record<string, unknown>[]} logs
 * @param {boolean} filterActive
 * @param {string} filterLabel
 */
function drawBulkSummaryPage(doc, margin, pageW, startY, logs, filterActive, filterLabel) {
  const avgSuccess =
    logs.length > 0
      ? Math.round((logs.reduce((sum, row) => sum + getTcccSuccessPercent(row), 0) / logs.length) * 10) /
        10
      : 0

  let y = drawSectionTitle(doc, margin, pageW, 'Performans Özeti', startY)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`Kayıt sayısı: ${logs.length}`, margin, y)
  y += 5
  doc.text(`Ortalama başarı: %${avgSuccess.toLocaleString('tr-TR')}`, margin, y)
  y += 5
  doc.text(
    filterActive ? `Filtre: ${filterLabel}` : 'Filtre: Yok — tüm kayıtlar',
    margin,
    y
  )
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Tarih', 'Yaralı Tipi', 'Müdahale', 'Prosedür', 'Sonuç', 'Başarı %']],
    body: logs.map((row) => [
      formatTcccDateCell(row),
      getTcccCasualtyType(row),
      formatTcccInterventionTime(row),
      getTcccProcedurePerformed(row),
      getTcccOutcome(row),
      `%${getTcccSuccessPercent(row).toLocaleString('tr-TR')}`,
    ]),
    ...getAutoTableOptions(margin, { styles: { fontSize: PDF_FONT_SIZE.table } }),
  })
}

function buildPdfFilename(logs, callsign) {
  const safeCallsign = callsign.replace(/[^\w-]+/g, '_').slice(0, 24)
  if (logs.length === 1) {
    const logMs = formatTcccDateCell(logs[0]).replace(/[^\d]/g, '').slice(0, 12) || 'rapor'
    return `AUDAZ-TCCC-${safeCallsign}-${logMs}.pdf`
  }
  const stamp = new Date().toISOString().slice(0, 10)
  return `AUDAZ-TCCC-Toplu-${safeCallsign}-${logs.length}kayit-${stamp}.pdf`
}

/**
 * @param {{
 *   logs: Record<string, unknown>[],
 *   operator?: OperatorInfo | null,
 *   filterActive?: boolean,
 *   filterLabel?: string,
 * }} params
 */
export async function generateTcccTacticalReportPdf({
  logs,
  operator,
  filterActive = false,
  filterLabel = '',
}) {
  const rows = Array.isArray(logs) ? logs.filter(Boolean) : []
  if (rows.length === 0) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin
  const isBulk = rows.length > 1

  const { reportId, callsign, contentStartY, reportTitle } = setupReportFirstPage(
    doc,
    pageW,
    pageH,
    logoDataUrl,
    logoDims,
    'tccc',
    operator,
  )

  if (isBulk) {
    drawBulkSummaryPage(doc, margin, pageW, contentStartY, rows, filterActive, filterLabel)
  }

  rows.forEach((log, index) => {
    let startY = contentStartY
    if (isBulk) {
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

    let cursorY = drawEnvironmentalConditions(doc, startY, margin, pageW, log)
    drawClinicalSummary(doc, margin, pageW, log, cursorY)
  })

  stampPdfFooters(doc, reportId)
  doc.save(buildPdfFilename(rows, callsign))
}
