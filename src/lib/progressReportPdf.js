import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import {
  progressPdfBulkFilename,
  progressPdfReportTitle,
  progressPdfT,
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
import {
  buildCharacterMatrix,
  buildChronicErrorRadar,
  buildStressPerformanceWave,
} from './progressHudAnalytics'
import { buildTcccReactionChartPoints } from './tcccSimHudAnalytics'
import {
  buildCharacterMatrixChartPng,
  buildChronicErrorRadarChartPng,
  buildStressPerformanceWaveChartPng,
  buildTcccReactionWaveChartPng,
  progressChartPngHasContent,
} from './progressChartImage'
import {
  formatProgressDisciplineTag,
  humanizeProgressFeedTitle,
} from './progressDisplayText'
import { buildActivityFeed } from './progressAnalytics'

/**
 * @typedef {{
 *   callsign: string
 *   role?: string
 *   viewMode?: 'self' | 'member'
 *   orsScore?: number | null
 *   overallSuccess?: number | null
 *   totalEvents?: number
 *   criticalErrors?: number
 *   avgAccuracy?: number | null
 *   filteredLogCount?: number
 *   disciplineLabel?: string
 *   timeframeLabel?: string
 * }} ProgressPdfMeta
 */

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
    progressPdfT('continuation.continue'),
  )
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @param {number} y
 * @param {string} sectionTitle
 * @param {string | null} png
 * @param {number} [imgAspectW]
 * @param {number} [imgAspectH]
 */
async function embedChart(
  doc,
  margin,
  pageW,
  pageH,
  logoDataUrl,
  logoDims,
  reportTitle,
  y,
  sectionTitle,
  png,
  imgAspectW = 960,
  imgAspectH = 420,
) {
  const imgW = pageW - margin * 2
  const imgH = Math.min(78, imgW * (imgAspectH / imgAspectW))
  y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, imgH + 16)
  y = drawSectionTitle(doc, margin, pageW, sectionTitle, y)
  if (png && (await progressChartPngHasContent(png))) {
    doc.addImage(png, 'PNG', margin, y, imgW, imgH)
    return y + imgH + 8
  }
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(progressPdfT('empty.chart'), margin, y + 6)
  return y + 14
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   filteredLogs?: Record<string, unknown>[]
 *   meta: ProgressPdfMeta
 *   returnBlob?: boolean
 * }} input
 */
export async function exportProgressBulkReportPdf(input) {
  const logs = Array.isArray(input.logs) ? input.logs : []
  const filtered = Array.isArray(input.filteredLogs) ? input.filteredLogs : logs
  const meta = input.meta ?? { callsign: 'OPERATOR' }
  const callsign = String(meta.callsign || 'OPERATOR').trim() || 'OPERATOR'

  const matrix = buildCharacterMatrix(filtered)
  const radar = buildChronicErrorRadar(filtered)
  const wave = buildStressPerformanceWave(filtered)
  const tcccPoints = buildTcccReactionChartPoints(filtered, 12)
  const activity = buildActivityFeed(filtered, 500)

  const matrixPng = buildCharacterMatrixChartPng(matrix, progressPdfT('sections.matrix'))
  const radarPng = buildChronicErrorRadarChartPng(radar, progressPdfT('sections.radar'))
  const wavePng = buildStressPerformanceWaveChartPng(wave, progressPdfT('sections.wave'))
  const tcccPng = buildTcccReactionWaveChartPng(tcccPoints, progressPdfT('sections.tccc'))

  const chartDebug = {
    matrix: Boolean(matrixPng && (await progressChartPngHasContent(matrixPng))),
    radar: Boolean(radarPng && (await progressChartPngHasContent(radarPng))),
    wave: Boolean(wavePng && (await progressChartPngHasContent(wavePng))),
    tccc: Boolean(tcccPng && (await progressChartPngHasContent(tcccPng))),
    matrixBytes: matrixPng?.length ?? 0,
    radarBytes: radarPng?.length ?? 0,
    waveBytes: wavePng?.length ?? 0,
    tcccBytes: tcccPng?.length ?? 0,
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin
  const reportTitle = progressPdfReportTitle(callsign)
  const reportId = generateReportId('PRG')

  paintPdfPage(doc, pageW, pageH)
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, reportTitle)
  let y = PDF_LAYOUT.headerHeight + 8

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.brandSub)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(pdfFormatDateTime(new Date()), margin, y)
  y += 8

  // Operator profile
  y = drawSectionTitle(doc, margin, pageW, progressPdfT('sections.operator'), y)
  const roleKey = String(meta.role || 'member')
  const roleLabel = progressPdfT(`roles.${roleKey}`, { defaultValue: roleKey })
  const viewLabel =
    meta.viewMode === 'member' ? progressPdfT('fields.viewMember') : progressPdfT('fields.viewSelf')
  autoTable(doc, {
    ...getAutoTableOptions(margin),
    startY: y,
    body: [
      [progressPdfT('fields.callsign'), callsign],
      [progressPdfT('fields.role'), roleLabel],
      [progressPdfT('fields.viewMode'), viewLabel],
    ],
    theme: 'plain',
    styles: { fontSize: PDF_FONT_SIZE.body, textColor: PDF_COLORS.text, font: 'Roboto' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 }, 1: { cellWidth: 'auto' } },
  })
  y = /** @type {{ lastAutoTable?: { finalY: number } }} */ (doc).lastAutoTable?.finalY ?? y
  y += 8

  // HUD summary
  y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, 40)
  y = drawSectionTitle(doc, margin, pageW, progressPdfT('sections.hudSummary'), y)
  autoTable(doc, {
    ...getAutoTableOptions(margin),
    startY: y,
    body: [
      [
        progressPdfT('fields.orsScore'),
        meta.orsScore != null && Number.isFinite(meta.orsScore) ? String(Math.round(meta.orsScore)) : '—',
      ],
      [
        progressPdfT('fields.overallSuccess'),
        meta.overallSuccess != null ? pdfFormatPercent(meta.overallSuccess) : '—',
      ],
      [progressPdfT('fields.totalEvents'), String(meta.totalEvents ?? filtered.length)],
      [progressPdfT('fields.criticalErrors'), String(meta.criticalErrors ?? 0)],
      [
        progressPdfT('fields.avgAccuracy'),
        meta.avgAccuracy != null ? pdfFormatPercent(meta.avgAccuracy) : '—',
      ],
      [progressPdfT('fields.filteredLogs'), String(meta.filteredLogCount ?? filtered.length)],
      [progressPdfT('fields.discipline'), meta.disciplineLabel || '—'],
      [progressPdfT('fields.timeframe'), meta.timeframeLabel || '—'],
    ],
    theme: 'plain',
    styles: { fontSize: PDF_FONT_SIZE.body, textColor: PDF_COLORS.text, font: 'Roboto' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { cellWidth: 'auto' } },
  })
  y = /** @type {{ lastAutoTable?: { finalY: number } }} */ (doc).lastAutoTable?.finalY ?? y
  y += 10

  // Charts
  y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, 20)
  y = drawSectionTitle(doc, margin, pageW, progressPdfT('sections.charts'), y)
  y += 2
  y = await embedChart(
    doc, margin, pageW, pageH, logoDataUrl, logoDims, reportTitle, y,
    progressPdfT('sections.matrix'), matrixPng, 960, 420,
  )
  y = await embedChart(
    doc, margin, pageW, pageH, logoDataUrl, logoDims, reportTitle, y,
    progressPdfT('sections.radar'), radarPng, 960,
    Math.max(280, 60 + Math.min(10, radar.items.length) * 34 + 24),
  )
  y = await embedChart(
    doc, margin, pageW, pageH, logoDataUrl, logoDims, reportTitle, y,
    progressPdfT('sections.wave'), wavePng, 960, 360,
  )
  y = await embedChart(
    doc, margin, pageW, pageH, logoDataUrl, logoDims, reportTitle, y,
    progressPdfT('sections.tccc'), tcccPng, 960, 360,
  )

  // Activity table
  y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, 30)
  y = drawSectionTitle(doc, margin, pageW, progressPdfT('sections.activity'), y)
  if (activity.length === 0) {
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.body)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(progressPdfT('empty.activity'), margin, y + 6)
    y += 14
  } else {
    autoTable(doc, {
      ...getAutoTableOptions(margin),
      startY: y,
      head: [[
        progressPdfT('table.activity.tag'),
        progressPdfT('table.activity.title'),
        progressPdfT('table.activity.success'),
        progressPdfT('table.activity.when'),
      ]],
      body: activity.map((item) => {
        const when = item.timestampMs
          ? new Date(item.timestampMs).toLocaleString(pdfLocale(), {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—'
        return [
          formatProgressDisciplineTag(item.tag),
          humanizeProgressFeedTitle(item.title),
          item.success != null ? pdfFormatPercent(item.success) : '—',
          when,
        ]
      }),
      styles: { fontSize: PDF_FONT_SIZE.table, textColor: PDF_COLORS.text, font: 'Roboto' },
      headStyles: {
        fillColor: PDF_COLORS.tableHeadBg,
        textColor: PDF_COLORS.tableHeadText,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 24 },
        3: { cellWidth: 36 },
      },
    })
    y = /** @type {{ lastAutoTable?: { finalY: number } }} */ (doc).lastAutoTable?.finalY ?? y
    y += 10
  }

  // Error codes
  y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, 30)
  y = drawSectionTitle(doc, margin, pageW, progressPdfT('sections.errors'), y)
  if (radar.items.length === 0) {
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.body)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(progressPdfT('empty.errors'), margin, y + 6)
  } else {
    autoTable(doc, {
      ...getAutoTableOptions(margin),
      startY: y,
      head: [[
        progressPdfT('table.errors.code'),
        progressPdfT('table.errors.label'),
        progressPdfT('table.errors.count'),
      ]],
      body: radar.items.map((item) => [item.code, item.label, String(item.count)]),
      styles: { fontSize: PDF_FONT_SIZE.table, textColor: PDF_COLORS.text, font: 'Roboto' },
      headStyles: {
        fillColor: PDF_COLORS.tableHeadBg,
        textColor: PDF_COLORS.tableHeadText,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22 },
      },
    })
  }

  stampPdfFooters(doc, reportId)

  const filename = progressPdfBulkFilename(callsign, filtered.length)
  if (input.returnBlob) {
    const blob = doc.output('blob')
    return { blob, filename, chartDebug, pageCount: doc.getNumberOfPages(), reportId }
  }

  doc.save(filename)
  return { filename, chartDebug, pageCount: doc.getNumberOfPages(), reportId }
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function buildProgressPdfChartBundle(logs) {
  const matrix = buildCharacterMatrix(logs)
  const radar = buildChronicErrorRadar(logs)
  const wave = buildStressPerformanceWave(logs)
  const tcccPoints = buildTcccReactionChartPoints(logs, 12)
  return {
    matrixPng: buildCharacterMatrixChartPng(matrix),
    radarPng: buildChronicErrorRadarChartPng(radar),
    wavePng: buildStressPerformanceWaveChartPng(wave),
    tcccPng: buildTcccReactionWaveChartPng(tcccPoints),
    matrix,
    radar,
    wave,
    tcccPoints,
  }
}
