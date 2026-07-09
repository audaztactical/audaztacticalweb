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
  getVbssSuccessPercent,
} from './vbssLogRegistry'
import { getLogMeteoData } from './meteoDataCapture'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import {
  pdfExtractSingleLogDateStamp,
  pdfFilterLine,
  pdfFormatPercent,
  pdfMeteoRows,
  pdfParamValueHead,
  pdfRecordLabel,
  pdfT,
  pdfTacticalReportFilename,
} from './pdfReportText'
import {
  formatVbssBoardingPointDisplay,
  formatVbssOperationNoteDisplay,
  formatVbssSelectFieldDisplay,
  formatVbssThreatLevelDisplay,
} from './trainingDisplayText'
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
  const tableStart = drawSectionTitle(doc, margin, pageW, pdfT('common.environmentalConditions'), startY)

  autoTable(doc, {
    startY: tableStart,
    head: [pdfParamValueHead()],
    body: pdfMeteoRows(meteo),
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
  const summaryStart = drawSectionTitle(doc, margin, pageW, pdfT('common.operationSummary'), startY)

  autoTable(doc, {
    startY: summaryStart,
    head: [pdfParamValueHead()],
    body: [
      [pdfT('vbss.fields.date'), formatVbssDateCell(log)],
      [pdfT('vbss.fields.boardingPoint'), formatVbssBoardingPointDisplay(log)],
      [pdfT('vbss.fields.vesselType'), formatVbssSelectFieldDisplay(log, 'vesselType')],
      [pdfT('vbss.fields.searchDuration'), formatVbssSearchDuration(log)],
      [pdfT('vbss.fields.threatLevel'), formatVbssThreatLevelDisplay(log)],
      [pdfT('vbss.fields.seaState'), formatVbssSelectFieldDisplay(log, 'seaState')],
      [pdfT('vbss.fields.vesselSpeed'), formatVbssVesselSpeed(log)],
      [pdfT('vbss.fields.boardingTime'), formatVbssBoardingTime(log)],
      [pdfT('vbss.fields.bridgeControl'), formatVbssBridgeControlTime(log)],
      [pdfT('vbss.fields.engineRoom'), formatVbssEngineRoomControlTime(log)],
      [pdfT('vbss.fields.containment'), formatVbssContainmentTime(log)],
      [pdfT('vbss.fields.successRate'), pdfFormatPercent(getVbssSuccessPercent(log))],
    ],
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? summaryStart) + 8

  cursorY = drawSectionTitle(doc, margin, pageW, pdfT('common.evaluationNotes'), cursorY)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)

  const noteLines = doc.splitTextToSize(formatVbssOperationNoteDisplay(log), pageW - margin * 2)
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

  let y = drawSectionTitle(doc, margin, pageW, pdfT('common.performanceSummary'), startY)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(pdfT('common.recordCount', { count: logs.length }), margin, y)
  y += 5
  doc.text(pdfT('vbss.summary.avgSuccess', { percent: pdfFormatPercent(avgSuccess) }), margin, y)
  y += 5
  doc.text(pdfFilterLine(filterActive, filterLabel), margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [[
      pdfT('vbss.bulkColumns.date'),
      pdfT('vbss.bulkColumns.entryPoint'),
      pdfT('vbss.bulkColumns.vesselType'),
      pdfT('vbss.bulkColumns.searchDuration'),
      pdfT('vbss.bulkColumns.threat'),
      pdfT('vbss.bulkColumns.success'),
    ]],
    body: logs.map((row) => [
      formatVbssDateCell(row),
      formatVbssBoardingPointDisplay(row),
      formatVbssSelectFieldDisplay(row, 'vesselType'),
      formatVbssSearchDuration(row),
      formatVbssThreatLevelDisplay(row),
      pdfFormatPercent(getVbssSuccessPercent(row)),
    ]),
    ...getAutoTableOptions(margin, { styles: { fontSize: PDF_FONT_SIZE.table } }),
  })
}

function buildPdfFilename(logs, callsign) {
  const singleStamp =
    logs.length === 1 ? pdfExtractSingleLogDateStamp(formatVbssDateCell(logs[0])) : ''
  return pdfTacticalReportFilename('vbss', callsign, logs.length, singleStamp)
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
        pdfRecordLabel(index, rows.length),
      )
    }

    let cursorY = drawEnvironmentalConditions(doc, startY, margin, pageW, log)
    drawVbssSummary(doc, margin, pageW, log, cursorY)
  })

  stampPdfFooters(doc, reportId)
  doc.save(buildPdfFilename(rows, callsign))
}
