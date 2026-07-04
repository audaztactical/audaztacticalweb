import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  countFofTacticalErrors,
  formatFofCoverUtilization,
  formatFofDateCell,
  formatFofDuration,
  formatFofFilterSummary,
  formatFofTimeToFirstEngagement,
  getFofBlueOnBlue,
  getFofDebriefNotes,
  getFofDecisionAccuracy,
  getFofEngagementRounds,
  getFofEngagementType,
  getFofFriendlyCasualties,
  getFofHitTakenRatio,
  getFofHitTakenRatioLabel,
  getFofHitsTaken,
  getFofLethalHits,
  getFofNonLethalHits,
  getFofOpforCount,
  getFofScenarioType,
  getFofSelfTcccApplied,
  getFofSimSystem,
  getFofSuccessPercent,
  getFofTacticalErrors,
} from './fofLogRegistry'
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
function drawEngagementSummary(doc, margin, pageW, log, startY) {
  const summaryStart = drawSectionTitle(doc, margin, pageW, 'Müdahale Özeti', startY)

  autoTable(doc, {
    startY: summaryStart,
    head: [['Parametre', 'Değer']],
    body: [
      ['Tarih', formatFofDateCell(log)],
      ['Senaryo tipi', getFofScenarioType(log)],
      ['Simülasyon sistemi', getFofSimSystem(log)],
      ['Angajman tipi', getFofEngagementType(log)],
      ['OPFOR sayısı', String(getFofOpforCount(log))],
      ['Simülasyon süresi', formatFofDuration(log)],
      ['İlk atış süresi', formatFofTimeToFirstEngagement(log)],
      ['Angajman atışları', String(getFofEngagementRounds(log))],
      ['Karar doğruluğu', `%${getFofDecisionAccuracy(log).toLocaleString('tr-TR')}`],
      ['Vuruş/Alınan oranı', `${getFofHitTakenRatioLabel(log)} (×${getFofHitTakenRatio(log).toLocaleString('tr-TR')})`],
      ['Alınan vuruş', String(getFofHitsTaken(log))],
      ['Öldürücü / Öldürücü olmayan', `${getFofLethalHits(log)} / ${getFofNonLethalHits(log)}`],
      ['Siper kullanımı', formatFofCoverUtilization(log)],
      ['Dost kaybı', String(getFofFriendlyCasualties(log))],
      ['Blue-on-blue', getFofBlueOnBlue(log) ? 'EVET' : 'HAYIR'],
      ['TCCC (ateş altında)', getFofSelfTcccApplied(log) ? 'UYGULANDI' : 'HAYIR'],
      ['Başarı oranı', `%${getFofSuccessPercent(log).toLocaleString('tr-TR')}`],
    ],
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? summaryStart) + 8

  const errorCount = countFofTacticalErrors(log)
  if (errorCount > 0) {
    cursorY = drawSectionTitle(doc, margin, pageW, 'Taktik Hatalar', cursorY)

    autoTable(doc, {
      startY: cursorY,
      head: [['Hata']],
      body: getFofTacticalErrors(log).map((label) => [label]),
      ...getErrorTableOptions(margin),
    })

    // @ts-expect-error jspdf-autotable plugin
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8
  }

  cursorY = drawSectionTitle(doc, margin, pageW, 'Değerlendirme Notları', cursorY)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)

  const noteLines = doc.splitTextToSize(getFofDebriefNotes(log), pageW - margin * 2)
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
  const avgDecision =
    logs.length > 0
      ? Math.round(
          (logs.reduce((sum, row) => sum + getFofDecisionAccuracy(row), 0) / logs.length) * 10
        ) / 10
      : 0
  const avgSuccess =
    logs.length > 0
      ? Math.round(
          (logs.reduce((sum, row) => sum + getFofSuccessPercent(row), 0) / logs.length) * 10
        ) / 10
      : 0

  let y = drawSectionTitle(doc, margin, pageW, 'Performans Özeti', startY)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`Kayıt sayısı: ${logs.length}`, margin, y)
  y += 5
  doc.text(`Ortalama karar doğruluğu: %${avgDecision.toLocaleString('tr-TR')}`, margin, y)
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
    head: [['Tarih', 'Angajman', 'Süre', 'Karar %', 'Hit/Taken', 'Başarı %']],
    body: logs.map((row) => [
      formatFofDateCell(row),
      getFofEngagementType(row),
      formatFofDuration(row),
      `%${getFofDecisionAccuracy(row).toLocaleString('tr-TR')}`,
      getFofHitTakenRatioLabel(row),
      `%${getFofSuccessPercent(row).toLocaleString('tr-TR')}`,
    ]),
    ...getAutoTableOptions(margin),
  })
}

/**
 * @param {Record<string, unknown>[]} logs
 * @param {string} callsign
 */
function buildPdfFilename(logs, callsign) {
  const safeCallsign = callsign.replace(/[^\w-]+/g, '_').slice(0, 24)
  if (logs.length === 1) {
    const logMs = formatFofDateCell(logs[0]).replace(/[^\d]/g, '').slice(0, 12) || 'rapor'
    return `AUDAZ-FOF-${safeCallsign}-${logMs}.pdf`
  }
  const stamp = new Date().toISOString().slice(0, 10)
  return `AUDAZ-FOF-Toplu-${safeCallsign}-${logs.length}kayit-${stamp}.pdf`
}

/**
 * @param {{
 *   logs: Record<string, unknown>[],
 *   operator?: OperatorInfo | null,
 *   filterActive?: boolean,
 *   filterLabel?: string,
 * }} params
 */
export async function generateFofTacticalReportPdf({
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
    'fof',
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
    drawEngagementSummary(doc, margin, pageW, log, cursorY)
  })

  stampPdfFooters(doc, reportId)
  doc.save(buildPdfFilename(rows, callsign))
}
