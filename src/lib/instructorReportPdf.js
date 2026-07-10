import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import {
  instructorPdfFilename,
  instructorPdfT,
  pdfFormatDateTime,
  pdfFormatPercent,
  pdfLocale,
} from './pdfReportText'
import {
  PDF_COLORS,
  PDF_FONT_SIZE,
  PDF_LAYOUT,
  drawPdfHeader,
  drawSectionTitle,
  generateReportId,
  getAutoTableOptions,
  paintPdfPage,
  setupReportContinuationPage,
  stampPdfFooters,
} from './pdfDesignTokens'
import { buildGroupAggregateTrend } from './groupActivityHud'
import { buildLiveGroupLeaderboard } from './instructorGroupAnalytics'
import {
  buildGroupPerformanceCurvePng,
  buildOperatorSuccessComparisonPng,
  instructorChartPngHasContent,
} from './instructorChartImage'
import {
  formatInstructorDateTime,
  formatInstructorDrillName,
  labelInstructorDiscipline,
  labelInstructorSource,
} from './instructorDisplayText'
import { filterOperatorGroupTrainingLogs } from './firestoreGroupTraining'

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @param {number} y
 * @param {number} [needed]
 */
function ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, needed = 20) {
  if (y + needed <= pageH - PDF_LAYOUT.margin) return y
  doc.addPage()
  return setupReportContinuationPage(
    doc,
    pageW,
    pageH,
    logoDataUrl,
    logoDims,
    reportTitle,
    instructorPdfT('continuation.continue'),
  )
}

/**
 * @param {import('./firestoreGroupTraining').GroupActivityLog} log
 */
function resolveFeedSourceKey(log) {
  if (log.sourceDomain === 'trainings') return 'trainings'
  if (log.sourceDomain === 'range_logs') return 'range_logs'
  if (log.type === 'operator_group_feed' || log.operatorSubmitted) return 'operator'
  return 'instructor'
}

/**
 * @param {{
 *   logs: import('./firestoreGroupTraining').GroupActivityLog[]
 *   operators: import('./firestoreInstructor').OperatorProfile[]
 *   groupName?: string
 *   instructorName?: string
 *   returnBlob?: boolean
 * }} input
 */
export async function exportInstructorFeedPdf(input) {
  const operators = input.operators ?? []
  const opMap = new Map(operators.map((o) => [o.uid, o]))
  const logs = filterOperatorGroupTrainingLogs(input.logs ?? []).slice(0, 200)
  const groupName = String(input.groupName || 'GROUP').trim() || 'GROUP'
  const instructorName = String(input.instructorName || '').trim()

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin
  const reportTitle = instructorPdfT('titles.feedFor', { group: groupName })
  const reportId = generateReportId('IFD')

  paintPdfPage(doc, pageW, pageH)
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, reportTitle)
  let y = PDF_LAYOUT.headerHeight + 8

  y = drawSectionTitle(doc, margin, pageW, instructorPdfT('sections.meta'), y)
  autoTable(doc, {
    ...getAutoTableOptions(margin),
    startY: y,
    body: [
      [instructorPdfT('fields.group'), groupName],
      [instructorPdfT('fields.instructor'), instructorName || '—'],
      [instructorPdfT('fields.generated'), pdfFormatDateTime(new Date())],
      [instructorPdfT('fields.logCount'), String(logs.length)],
    ],
    theme: 'plain',
    styles: { fontSize: PDF_FONT_SIZE.body, textColor: PDF_COLORS.text, font: 'Roboto' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 'auto' } },
  })
  y = /** @type {{ lastAutoTable?: { finalY: number } }} */ (doc).lastAutoTable?.finalY ?? y
  y += 8

  y = drawSectionTitle(doc, margin, pageW, instructorPdfT('sections.feedTable'), y)
  if (logs.length === 0) {
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.body)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(instructorPdfT('empty.feed'), margin, y + 6)
  } else {
    autoTable(doc, {
      ...getAutoTableOptions(margin),
      startY: y,
      head: [[
        instructorPdfT('table.feed.time'),
        instructorPdfT('table.feed.operator'),
        instructorPdfT('table.feed.discipline'),
        instructorPdfT('table.feed.record'),
        instructorPdfT('table.feed.score'),
        instructorPdfT('table.feed.source'),
      ]],
      body: logs.map((log) => {
        const op = opMap.get(log.operatorId)
        const callsign = op?.callsign || op?.username || log.operatorId.slice(0, 8)
        return [
          formatInstructorDateTime(log.timestamp),
          callsign,
          labelInstructorDiscipline(log.discipline),
          formatInstructorDrillName(log.drillName, log.templateId),
          pdfFormatPercent(log.score),
          labelInstructorSource(resolveFeedSourceKey(log)),
        ]
      }),
      styles: { fontSize: PDF_FONT_SIZE.table, textColor: PDF_COLORS.text, font: 'Roboto' },
      headStyles: {
        fillColor: PDF_COLORS.tableHeadBg,
        textColor: PDF_COLORS.tableHeadText,
        fontStyle: 'bold',
      },
    })
  }

  stampPdfFooters(doc, reportId)
  const filename = instructorPdfFilename('feed', groupName, logs.length)
  if (input.returnBlob) {
    return { blob: doc.output('blob'), filename, pageCount: doc.getNumberOfPages() }
  }
  doc.save(filename)
  return { filename, pageCount: doc.getNumberOfPages() }
}

/**
 * @param {{
 *   logs: import('./firestoreGroupTraining').GroupActivityLog[]
 *   operators: import('./firestoreInstructor').OperatorProfile[]
 *   group: import('./firestoreGroups').TacticalGroup | null
 *   instructorName?: string
 *   returnBlob?: boolean
 * }} input
 */
export async function exportInstructorAnalyticsPdf(input) {
  const group = input.group
  const groupName = group?.groupName || 'GROUP'
  const operators = input.operators ?? []
  const logs = input.logs ?? []
  const opMap = new Map(operators.map((o) => [o.uid, o]))

  const trend = buildGroupAggregateTrend(logs, 16, {
    resolveCallsign: (uid) => {
      const op = opMap.get(uid)
      return op?.callsign || op?.username || uid.slice(0, 8)
    },
  })
  const leaderboard = group ? buildLiveGroupLeaderboard(group, operators, logs) : []
  const comparison = leaderboard.map((row) => ({
    fullName: row.callsign,
    overall: row.overallSuccess,
    drills: row.totalDrills,
  }))

  const curvePng = buildGroupPerformanceCurvePng(trend, instructorPdfT('sections.curve'))
  const comparisonPng = buildOperatorSuccessComparisonPng(
    comparison,
    instructorPdfT('sections.comparison'),
  )

  const chartDebug = {
    curve: Boolean(curvePng && (await instructorChartPngHasContent(curvePng))),
    comparison: Boolean(comparisonPng && (await instructorChartPngHasContent(comparisonPng))),
    curveBytes: curvePng?.length ?? 0,
    comparisonBytes: comparisonPng?.length ?? 0,
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin
  const reportTitle = instructorPdfT('titles.analyticsFor', { group: groupName })
  const reportId = generateReportId('IAN')

  paintPdfPage(doc, pageW, pageH)
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, reportTitle)
  let y = PDF_LAYOUT.headerHeight + 8

  y = drawSectionTitle(doc, margin, pageW, instructorPdfT('sections.meta'), y)
  autoTable(doc, {
    ...getAutoTableOptions(margin),
    startY: y,
    body: [
      [instructorPdfT('fields.group'), groupName],
      [instructorPdfT('fields.instructor'), input.instructorName || '—'],
      [instructorPdfT('fields.generated'), pdfFormatDateTime(new Date())],
      [instructorPdfT('fields.logCount'), String(logs.length)],
    ],
    theme: 'plain',
    styles: { fontSize: PDF_FONT_SIZE.body, textColor: PDF_COLORS.text, font: 'Roboto' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 'auto' } },
  })
  y = /** @type {{ lastAutoTable?: { finalY: number } }} */ (doc).lastAutoTable?.finalY ?? y
  y += 8

  const embed = async (title, png, aspectH = 360) => {
    const imgW = pageW - margin * 2
    const imgH = Math.min(70, imgW * (aspectH / 960))
    y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, imgH + 16)
    y = drawSectionTitle(doc, margin, pageW, title, y)
    if (png && (await instructorChartPngHasContent(png))) {
      doc.addImage(png, 'PNG', margin, y, imgW, imgH)
      y += imgH + 8
    } else {
      setPdfFont(doc, 'normal')
      doc.setFontSize(PDF_FONT_SIZE.body)
      doc.setTextColor(...PDF_COLORS.muted)
      doc.text(instructorPdfT('empty.chart'), margin, y + 6)
      y += 14
    }
  }

  await embed(instructorPdfT('sections.curve'), curvePng, 360)
  await embed(instructorPdfT('sections.comparison'), comparisonPng, Math.max(280, 60 + comparison.length * 28))

  y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, 40)
  y = drawSectionTitle(doc, margin, pageW, instructorPdfT('sections.leaderboard'), y)
  if (leaderboard.length === 0) {
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.body)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(instructorPdfT('empty.leaderboard'), margin, y + 6)
  } else {
    autoTable(doc, {
      ...getAutoTableOptions(margin),
      startY: y,
      head: [[
        instructorPdfT('table.leaderboard.rank'),
        instructorPdfT('table.leaderboard.callsign'),
        instructorPdfT('table.leaderboard.drills'),
        instructorPdfT('table.leaderboard.atis'),
        instructorPdfT('table.leaderboard.cqb'),
        instructorPdfT('table.leaderboard.overall'),
      ]],
      body: leaderboard.map((row, idx) => [
        String(idx + 1),
        row.callsign,
        String(row.totalDrills),
        pdfFormatPercent(row.atisAverage),
        row.cqbSpeedSec != null ? String(row.cqbSpeedSec) : '—',
        pdfFormatPercent(row.overallSuccess),
      ]),
      styles: { fontSize: PDF_FONT_SIZE.table, textColor: PDF_COLORS.text, font: 'Roboto' },
      headStyles: {
        fillColor: PDF_COLORS.tableHeadBg,
        textColor: PDF_COLORS.tableHeadText,
        fontStyle: 'bold',
      },
    })
  }

  stampPdfFooters(doc, reportId)
  const filename = instructorPdfFilename('analytics', groupName, logs.length)
  if (input.returnBlob) {
    return {
      blob: doc.output('blob'),
      filename,
      chartDebug,
      pageCount: doc.getNumberOfPages(),
    }
  }
  doc.save(filename)
  return { filename, chartDebug, pageCount: doc.getNumberOfPages() }
}

void pdfLocale
