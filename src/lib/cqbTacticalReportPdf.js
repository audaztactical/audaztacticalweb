import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  countCqbTacticalErrors,
  formatCqbClearanceTime,
  formatCqbDateCell,
  formatCqbFilterSummary,
  getCqbAccuracyScore,
  getCqbBreachingType,
  getCqbDoorState,
  getCqbEntryMethod,
  getCqbOperationNote,
  getCqbRoomTopology,
  getCqbSafetyViolations,
  getCqbSuccessPercent,
  getCqbTacticalDecision,
  getCqbTacticalErrorsGrouped,
  getCqbTeamSize,
  getCqbThreatNeutralized,
} from './cqbLogRegistry'
import { formatMeteoOverviewRows, getLogMeteoData } from './meteoDataCapture'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import {
  PDF_COLORS,
  PDF_FONT_SIZE,
  PDF_LAYOUT,
  drawSectionTitle,
  getAutoTableOptions,
  getErrorTableOptions,
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
function drawLogDetailSection(doc, margin, pageW, log, startY) {
  const { threats, neutralized } = getCqbThreatNeutralized(log)
  const errorGroups = getCqbTacticalErrorsGrouped(log)
  const errorCount = countCqbTacticalErrors(log)
  const note = getCqbOperationNote(log)

  const detailStart = drawSectionTitle(doc, margin, pageW, 'Eğitim Detayları', startY)
  autoTable(doc, {
    startY: detailStart,
    head: [['Parametre', 'Değer']],
    body: [
      ['Tarih', formatCqbDateCell(log)],
      ['Oda topolojisi', getCqbRoomTopology(log)],
      ['Giriş metodu', getCqbEntryMethod(log)],
      ['Kırma tipi', getCqbBreachingType(log)],
      ['Kapı durumu', getCqbDoorState(log)],
      ['Takım boyutu', getCqbTeamSize(log)],
      ['Tehdit / Etkisiz', `${threats} / ${neutralized}`],
      ['Temizleme süresi', formatCqbClearanceTime(log)],
      ['İsabet skoru', `%${getCqbAccuracyScore(log).toLocaleString('tr-TR')}`],
      ['Güvenlik ihlalleri', String(getCqbSafetyViolations(log))],
      ['Taktik karar', getCqbTacticalDecision(log)],
      ['Başarı oranı', `%${getCqbSuccessPercent(log).toLocaleString('tr-TR')}`],
    ],
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? detailStart) + 8

  if (errorCount > 0) {
    cursorY = drawSectionTitle(doc, margin, pageW, 'Taktik Hatalar', cursorY)

    const errorRows = errorGroups.flatMap((group) =>
      group.labels.map((label) => [group.phaseTitle, label])
    )

    autoTable(doc, {
      startY: cursorY,
      head: [['Faz', 'Hata']],
      body: errorRows,
      ...getErrorTableOptions(margin, { styles: { fontSize: PDF_FONT_SIZE.small } }),
    })

    // @ts-expect-error jspdf-autotable plugin
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8
  }

  cursorY = drawSectionTitle(doc, margin, pageW, 'Değerlendirme Notları', cursorY)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
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
  const avgAccuracy =
    logs.length > 0
      ? Math.round(
          (logs.reduce((sum, row) => sum + getCqbAccuracyScore(row), 0) / logs.length) * 10
        ) / 10
      : 0
  const totalViolations = logs.reduce((sum, row) => sum + getCqbSafetyViolations(row), 0)

  let y = drawSectionTitle(doc, margin, pageW, 'Performans Özeti', startY)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`Kayıt sayısı: ${logs.length}`, margin, y)
  y += 5
  doc.text(`Ortalama isabet skoru: %${avgAccuracy.toLocaleString('tr-TR')}`, margin, y)
  y += 5
  doc.text(`Toplam güvenlik ihlali: ${totalViolations}`, margin, y)
  y += 5
  doc.text(
    filterActive ? `Filtre: ${filterLabel}` : 'Filtre: Yok — tüm kayıtlar',
    margin,
    y
  )
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Tarih', 'Topoloji', 'Clearance', 'İsabet %', 'İhlal', 'Karar', 'Başarı %']],
    body: logs.map((row) => [
      formatCqbDateCell(row),
      getCqbRoomTopology(row),
      formatCqbClearanceTime(row),
      `%${getCqbAccuracyScore(row).toLocaleString('tr-TR')}`,
      String(getCqbSafetyViolations(row)),
      getCqbTacticalDecision(row),
      `%${getCqbSuccessPercent(row).toLocaleString('tr-TR')}`,
    ]),
    ...getAutoTableOptions(margin, { styles: { fontSize: PDF_FONT_SIZE.small } }),
  })
}

/**
 * @param {Record<string, unknown>[]} logs
 * @param {string} callsign
 */
function buildPdfFilename(logs, callsign) {
  const safeCallsign = callsign.replace(/[^\w-]+/g, '_').slice(0, 24)
  if (logs.length === 1) {
    const logMs = formatCqbDateCell(logs[0]).replace(/[^\d]/g, '').slice(0, 12) || 'rapor'
    return `AUDAZ-CQB-${safeCallsign}-${logMs}.pdf`
  }
  const stamp = new Date().toISOString().slice(0, 10)
  return `AUDAZ-CQB-Toplu-${safeCallsign}-${logs.length}kayit-${stamp}.pdf`
}

/**
 * @param {{
 *   logs: Record<string, unknown>[],
 *   operator?: OperatorInfo | null,
 *   filterActive?: boolean,
 *   filterLabel?: string,
 * }} params
 */
export async function generateCqbTacticalReportPdf({
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
    'cqb',
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
    drawLogDetailSection(doc, margin, pageW, log, cursorY)
  })

  stampPdfFooters(doc, reportId)
  doc.save(buildPdfFilename(rows, callsign))
}
