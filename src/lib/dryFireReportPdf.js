/**
 * Kuru Tetik seans PDF raporu.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
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
import {
  pdfFormatDateTime,
  pdfMeteoRows,
  pdfParamValueHead,
  pdfT,
  pdfTacticalReportFilename,
} from './pdfReportText'
import { buildSplitRows, formatShotMillis, formatShotSeconds } from './dryFireTimer'

/** @typedef {{ callsign?: string, username?: string, email?: string, bloodType?: string, displayName?: string }} OperatorInfo */

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {number} pageH
 * @param {number} need
 * @param {{
 *   pageW: number
 *   pageH: number
 *   logoDataUrl: string
 *   logoDims: { widthMm: number, heightMm: number }
 *   reportTitle: string
 * }} pageCtx
 */
function ensureReportSpace(doc, y, pageH, need, pageCtx) {
  if (y + need <= pageH - 14) return y
  doc.addPage()
  return setupReportContinuationPage(
    doc,
    pageCtx.pageW,
    pageCtx.pageH,
    pageCtx.logoDataUrl,
    pageCtx.logoDims,
    pageCtx.reportTitle,
  )
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{ name: string, value: number }[]} points
 */
function drawFlinchTrendLine(doc, x, y, w, h, points) {
  doc.setDrawColor(...PDF_COLORS.tableLine)
  doc.setLineWidth(0.25)
  doc.rect(x, y, w, h, 'S')
  if (!points.length) return

  const padL = 12
  const padR = 4
  const padT = 4
  const padB = 8
  const plotX = x + padL
  const plotY = y + padT
  const plotW = w - padL - padR
  const plotH = h - padT - padB
  const maxV = Math.max(100, ...points.map((p) => p.value), 1)

  doc.setDrawColor(...PDF_COLORS.tableLine)
  doc.setLineWidth(0.1)
  for (let i = 0; i <= 4; i++) {
    const gy = plotY + (plotH * i) / 4
    doc.line(plotX, gy, plotX + plotW, gy)
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(String(Math.round(maxV - (maxV * i) / 4)), x + 1, gy + 1.2)
  }

  const n = points.length
  const coords = points.map((p, i) => ({
    px: n === 1 ? plotX + plotW / 2 : plotX + (i / (n - 1)) * plotW,
    py: plotY + plotH - (p.value / maxV) * plotH,
  }))

  doc.setDrawColor(...PDF_COLORS.text)
  doc.setLineWidth(0.55)
  for (let i = 1; i < coords.length; i++) {
    doc.line(coords[i - 1].px, coords[i - 1].py, coords[i].px, coords[i].py)
  }

  coords.forEach((c, i) => {
    doc.setFillColor(...PDF_COLORS.accent)
    doc.circle(c.px, c.py, 1.1, 'F')
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(points[i].name, c.px, y + h - 1.5, { align: 'center' })
  })
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{ x: number, y: number }[]} samples
 */
function drawHitScatter(doc, x, y, w, h, samples) {
  doc.setDrawColor(...PDF_COLORS.tableLine)
  doc.setLineWidth(0.25)
  doc.rect(x, y, w, h, 'S')

  const pad = 8
  const plotX = x + pad
  const plotY = y + pad
  const plotW = w - pad * 2
  const plotH = h - pad * 2
  const domain = 1.2

  doc.setDrawColor(...PDF_COLORS.tableLine)
  doc.setLineWidth(0.12)
  doc.line(plotX, plotY + plotH / 2, plotX + plotW, plotY + plotH / 2)
  doc.line(plotX + plotW / 2, plotY, plotX + plotW / 2, plotY + plotH)

  samples.forEach((s) => {
    const px = plotX + ((s.x + domain) / (2 * domain)) * plotW
    const py = plotY + plotH - ((s.y + domain) / (2 * domain)) * plotH
    doc.setFillColor(...PDF_COLORS.accent)
    doc.circle(px, py, 1.2, 'F')
  })
}

/**
 * @param {{
 *   session: import('./dryFireSessionStore').DryFireSession
 *   operator?: OperatorInfo | null
 * }} opts
 */
export async function exportDryFireSessionPdf(opts) {
  const { session } = opts
  if (!session?.hits?.length && !session?.reactionTimesMs?.length) return

  const operator = {
    callsign: opts.operator?.callsign || session.operator?.callsign || '',
    username: opts.operator?.username || session.operator?.username || '',
    bloodType: opts.operator?.bloodType || '',
    displayName: opts.operator?.displayName || '',
    email: opts.operator?.email || '',
  }

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
    'dryFire',
    operator,
  )

  const pageCtx = { pageW, pageH, logoDataUrl, logoDims, reportTitle }
  let y = contentStartY

  y = drawSectionTitle(doc, margin, pageW, pdfT('common.environmentalConditions'), y)
  autoTable(doc, {
    startY: y,
    head: [pdfParamValueHead()],
    body: pdfMeteoRows(/** @type {any} */ ({})),
    ...getAutoTableOptions(margin),
  })
  // @ts-expect-error autotable
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  const when = pdfFormatDateTime(new Date(session.createdAt))
  const drawMs = session.timingSummary?.reactionMs
  const avgSplit =
    session.timingSummary?.avgSplitMs != null
      ? `${formatShotMillis(session.timingSummary.avgSplitMs)} ms`
      : '—'
  const avgFlinch =
    session.hitSummary?.avgFlinch != null ? String(session.hitSummary.avgFlinch) : '—'
  const groupR =
    session.hitSummary?.groupRadius != null ? session.hitSummary.groupRadius.toFixed(3) : '—'

  /** @type {[string, string][]} */
  const detailRows = [
    [pdfT('atis.fields.date'), when],
    [pdfT('atis.fields.drillType'), pdfT('dryFire.drillType')],
    [pdfT('atis.fields.distance'), `${session.distanceM} m`],
    [pdfT('atis.fields.roundsHits'), `${session.shotCount}`],
    [pdfT('dryFire.fields.draw'), drawMs != null ? `${formatShotMillis(drawMs)} ms` : '—'],
    [pdfT('dryFire.fields.avgSplit'), avgSplit],
    [pdfT('dryFire.fields.avgFlinch'), avgFlinch],
    [pdfT('dryFire.fields.group'), groupR],
    [
      pdfT('dryFire.fields.delay'),
      session.delayMs > 0 ? `${(session.delayMs / 1000).toFixed(2)} s` : pdfT('dryFire.fields.delayNone'),
    ],
    [
      pdfT('dryFire.fields.par'),
      session.parTimeMs != null ? `${formatShotSeconds(session.parTimeMs)} s` : '—',
    ],
  ]

  y = ensureReportSpace(doc, y, pageH, 50, pageCtx)
  y = drawSectionTitle(doc, margin, pageW, pdfT('common.trainingDetails'), y)
  autoTable(doc, {
    startY: y,
    head: [pdfParamValueHead()],
    body: detailRows,
    ...getAutoTableOptions(margin),
  })
  // @ts-expect-error autotable
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  const times = session.reactionTimesMs?.length
    ? session.reactionTimesMs
    : session.shotTimesMs || []
  if (times.length > 0) {
    y = ensureReportSpace(doc, y, pageH, 40, pageCtx)
    y = drawSectionTitle(doc, margin, pageW, pdfT('dryFire.sections.reactions'), y)
    const splits = buildSplitRows(times)
    const splitBody = [
      [
        pdfT('dryFire.fields.draw'),
        formatShotSeconds(times[0]),
        formatShotMillis(times[0]),
      ],
      ...splits.map((r) => [
        `Split ${r.index}`,
        formatShotSeconds(r.splitMs),
        formatShotMillis(r.splitMs),
      ]),
    ]
    autoTable(doc, {
      startY: y,
      head: [
        [
          pdfT('standardShot.tables.label'),
          pdfT('standardShot.tables.timeS'),
          pdfT('standardShot.tables.timeMs'),
        ],
      ],
      body: splitBody,
      ...getAutoTableOptions(margin),
    })
    // @ts-expect-error autotable
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  }

  if (session.hits?.length) {
    y = ensureReportSpace(doc, y, pageH, 70, pageCtx)
    y = drawSectionTitle(doc, margin, pageW, pdfT('dryFire.sections.flinchTrend'), y)
    drawFlinchTrendLine(
      doc,
      margin,
      y,
      pageW - 2 * margin,
      36,
      session.hits.map((h) => ({ name: String(h.index), value: h.flinchScore })),
    )
    y += 40

    y = ensureReportSpace(doc, y, pageH, 70, pageCtx)
    y = drawSectionTitle(doc, margin, pageW, pdfT('dryFire.sections.dispersion'), y)
    drawHitScatter(
      doc,
      margin,
      y,
      pageW - 2 * margin,
      44,
      session.hits.map((h) => ({ x: h.x, y: h.y })),
    )
    y += 48

    y = ensureReportSpace(doc, y, pageH, 40, pageCtx)
    y = drawSectionTitle(doc, margin, pageW, pdfT('dryFire.sections.coords'), y)
    autoTable(doc, {
      startY: y,
      head: [
        [
          pdfT('dryFire.tables.shot'),
          pdfT('dryFire.tables.x'),
          pdfT('dryFire.tables.y'),
          pdfT('dryFire.tables.flinch'),
          pdfT('dryFire.tables.reaction'),
        ],
      ],
      body: session.hits.map((h) => [
        String(h.index),
        h.x.toFixed(3),
        h.y.toFixed(3),
        String(h.flinchScore),
        h.reactionMs != null ? `${formatShotMillis(h.reactionMs)} ms` : '—',
      ]),
      ...getAutoTableOptions(margin),
    })
  }

  y = ensureReportSpace(doc, y, pageH, 28, pageCtx)
  y = drawSectionTitle(doc, margin, pageW, pdfT('common.evaluationNotes'), y)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  const note = pdfT('dryFire.evaluationDefault', {
    shots: session.shotCount,
    draw: drawMs != null ? `${formatShotMillis(drawMs)} ms` : '—',
    flinch: avgFlinch,
  })
  const noteLines = doc.splitTextToSize(note, pageW - margin * 2)
  doc.text(noteLines, margin, y)

  stampPdfFooters(doc, reportId)

  const stamp = new Date(session.createdAt).toISOString().slice(0, 10).replace(/-/g, '')
  doc.save(pdfTacticalReportFilename(/** @type {'atis'} */ (/** @type {unknown} */ ('dryFire')), callsign, 1, stamp))
}
