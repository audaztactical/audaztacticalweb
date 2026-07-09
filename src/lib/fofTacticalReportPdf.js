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
  getFofDecisionAccuracy,
  getFofEngagementRounds,
  getFofFriendlyCasualties,
  getFofHitTakenRatio,
  getFofHitTakenRatioLabel,
  getFofHitsTaken,
  getFofLethalHits,
  getFofNonLethalHits,
  getFofOpforCount,
  getFofSelfTcccApplied,
  getFofSuccessPercent,
} from './fofLogRegistry'
import { getLogMeteoData } from './meteoDataCapture'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import {
  pdfExtractSingleLogDateStamp,
  pdfFilterLine,
  pdfFormatNumber,
  pdfFormatPercent,
  pdfMeteoRows,
  pdfParamValueHead,
  pdfRecordLabel,
  pdfT,
  pdfTacticalReportFilename,
  pdfYesNo,
} from './pdfReportText'
import {
  formatFofDebriefNotesDisplay,
  formatFofEngagementTypeDisplay,
  formatFofSelectFieldDisplay,
  formatFofTacticalErrorsDisplay,
} from './trainingDisplayText'
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
function drawEngagementSummary(doc, margin, pageW, log, startY) {
  const summaryStart = drawSectionTitle(doc, margin, pageW, pdfT('common.engagementSummary'), startY)

  autoTable(doc, {
    startY: summaryStart,
    head: [pdfParamValueHead()],
    body: [
      [pdfT('fof.fields.date'), formatFofDateCell(log)],
      [pdfT('fof.fields.scenarioType'), formatFofSelectFieldDisplay(log, 'scenarioType')],
      [pdfT('fof.fields.simSystem'), formatFofSelectFieldDisplay(log, 'simSystem')],
      [pdfT('fof.fields.engagementType'), formatFofEngagementTypeDisplay(log)],
      [pdfT('fof.fields.opforCount'), String(getFofOpforCount(log))],
      [pdfT('fof.fields.simDuration'), formatFofDuration(log)],
      [pdfT('fof.fields.timeToFirstShot'), formatFofTimeToFirstEngagement(log)],
      [pdfT('fof.fields.engagementRounds'), String(getFofEngagementRounds(log))],
      [pdfT('fof.fields.decisionAccuracy'), pdfFormatPercent(getFofDecisionAccuracy(log))],
      [
        pdfT('fof.fields.hitTakenRatio'),
        `${getFofHitTakenRatioLabel(log)} (×${pdfFormatNumber(getFofHitTakenRatio(log))})`,
      ],
      [pdfT('fof.fields.hitsTaken'), String(getFofHitsTaken(log))],
      [
        pdfT('fof.fields.lethalNonLethal'),
        `${getFofLethalHits(log)} / ${getFofNonLethalHits(log)}`,
      ],
      [pdfT('fof.fields.coverUtilization'), formatFofCoverUtilization(log)],
      [pdfT('fof.fields.friendlyCasualties'), String(getFofFriendlyCasualties(log))],
      [pdfT('fof.fields.blueOnBlue'), pdfYesNo(getFofBlueOnBlue(log))],
      [
        pdfT('fof.fields.tcccUnderFire'),
        getFofSelfTcccApplied(log) ? pdfT('common.applied') : pdfT('common.no'),
      ],
      [pdfT('fof.fields.successRate'), pdfFormatPercent(getFofSuccessPercent(log))],
    ],
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? summaryStart) + 8

  const errorCount = countFofTacticalErrors(log)
  if (errorCount > 0) {
    cursorY = drawSectionTitle(doc, margin, pageW, pdfT('common.tacticalErrors'), cursorY)

    autoTable(doc, {
      startY: cursorY,
      head: [[pdfT('fof.errors.error')]],
      body: formatFofTacticalErrorsDisplay(log).map((label) => [label]),
      ...getErrorTableOptions(margin),
    })

    // @ts-expect-error jspdf-autotable plugin
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8
  }

  cursorY = drawSectionTitle(doc, margin, pageW, pdfT('common.evaluationNotes'), cursorY)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)

  const noteLines = doc.splitTextToSize(formatFofDebriefNotesDisplay(log), pageW - margin * 2)
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

  let y = drawSectionTitle(doc, margin, pageW, pdfT('common.performanceSummary'), startY)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(pdfT('common.recordCount', { count: logs.length }), margin, y)
  y += 5
  doc.text(pdfT('fof.summary.avgDecision', { percent: pdfFormatPercent(avgDecision) }), margin, y)
  y += 5
  doc.text(pdfT('fof.summary.avgSuccess', { percent: pdfFormatPercent(avgSuccess) }), margin, y)
  y += 5
  doc.text(pdfFilterLine(filterActive, filterLabel), margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [[
      pdfT('fof.bulkColumns.date'),
      pdfT('fof.bulkColumns.engagement'),
      pdfT('fof.bulkColumns.duration'),
      pdfT('fof.bulkColumns.decision'),
      pdfT('fof.bulkColumns.hitTaken'),
      pdfT('fof.bulkColumns.success'),
    ]],
    body: logs.map((row) => [
      formatFofDateCell(row),
      formatFofEngagementTypeDisplay(row),
      formatFofDuration(row),
      pdfFormatPercent(getFofDecisionAccuracy(row)),
      getFofHitTakenRatioLabel(row),
      pdfFormatPercent(getFofSuccessPercent(row)),
    ]),
    ...getAutoTableOptions(margin),
  })
}

/**
 * @param {Record<string, unknown>[]} logs
 * @param {string} callsign
 */
function buildPdfFilename(logs, callsign) {
  const singleStamp =
    logs.length === 1 ? pdfExtractSingleLogDateStamp(formatFofDateCell(logs[0])) : ''
  return pdfTacticalReportFilename('fof', callsign, logs.length, singleStamp)
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
        pdfRecordLabel(index, rows.length),
      )
    }

    let cursorY = drawEnvironmentalConditions(doc, startY, margin, pageW, log)
    drawEngagementSummary(doc, margin, pageW, log, cursorY)
  })

  stampPdfFooters(doc, reportId)
  doc.save(buildPdfFilename(rows, callsign))
}
