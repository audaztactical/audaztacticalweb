import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatVbssBoardingTime,
  formatVbssBridgeControlTime,
  formatVbssContainmentTime,
  formatVbssDateCell,
  formatVbssEngineRoomControlTime,
  formatVbssFilterSummary,
  formatVbssSearchDuration,
  formatVbssVesselSpeed,
  getVbssBoardingPoint,
  getVbssOperationNote,
  getVbssSeaState,
  getVbssSuccessPercent,
  getVbssThreatLevel,
  getVbssVesselType,
} from './vbssLogRegistry'
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
function drawVbssSummary(doc, margin, pageW, log, startY) {
  const summaryStart = drawSectionTitle(doc, margin, pageW, 'Operasyon Özeti', startY)

  autoTable(doc, {
    startY: summaryStart,
    head: [['Parametre', 'Değer']],
    body: [
      ['Tarih', formatVbssDateCell(log)],
      ['Biniş noktası', getVbssBoardingPoint(log)],
      ['Gemi tipi', getVbssVesselType(log)],
      ['Arama süresi', formatVbssSearchDuration(log)],
      ['Tehdit seviyesi', getVbssThreatLevel(log)],
      ['Deniz durumu', getVbssSeaState(log)],
      ['Gemi hızı', formatVbssVesselSpeed(log)],
      ['Gemiye çıkış', formatVbssBoardingTime(log)],
      ['Köprüüstü kontrol', formatVbssBridgeControlTime(log)],
      ['Makine dairesi', formatVbssEngineRoomControlTime(log)],
      ['Emniyete alma', formatVbssContainmentTime(log)],
      ['Başarı oranı', `%${getVbssSuccessPercent(log).toLocaleString('tr-TR')}`],
    ],
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? summaryStart) + 8

  cursorY = drawSectionTitle(doc, margin, pageW, 'Değerlendirme Notları', cursorY)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)

  const noteLines = doc.splitTextToSize(getVbssOperationNote(log), pageW - margin * 2)
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
      ? Math.round((logs.reduce((sum, row) => sum + getVbssSuccessPercent(row), 0) / logs.length) * 10) /
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
    head: [['Tarih', 'Giriş Noktası', 'Gemi Tipi', 'Arama Süresi', 'Tehdit', 'Başarı %']],
    body: logs.map((row) => [
      formatVbssDateCell(row),
      getVbssBoardingPoint(row),
      getVbssVesselType(row),
      formatVbssSearchDuration(row),
      getVbssThreatLevel(row),
      `%${getVbssSuccessPercent(row).toLocaleString('tr-TR')}`,
    ]),
    ...getAutoTableOptions(margin, { styles: { fontSize: PDF_FONT_SIZE.table } }),
  })
}

function buildPdfFilename(logs, callsign) {
  const safeCallsign = callsign.replace(/[^\w-]+/g, '_').slice(0, 24)
  if (logs.length === 1) {
    const logMs = formatVbssDateCell(logs[0]).replace(/[^\d]/g, '').slice(0, 12) || 'rapor'
    return `AUDAZ-VBSS-${safeCallsign}-${logMs}.pdf`
  }
  const stamp = new Date().toISOString().slice(0, 10)
  return `AUDAZ-VBSS-Toplu-${safeCallsign}-${logs.length}kayit-${stamp}.pdf`
}

/**
 * @param {{
 *   logs: Record<string, unknown>[],
 *   operator?: OperatorInfo | null,
 *   filterActive?: boolean,
 *   filterLabel?: string,
 * }} params
 */
export async function generateVbssTacticalReportPdf({
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
    'vbss',
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
    drawVbssSummary(doc, margin, pageW, log, cursorY)
  })

  stampPdfFooters(doc, reportId)
  doc.save(buildPdfFilename(rows, callsign))
}
