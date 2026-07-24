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
import { buildSplitTrendSeries } from './standardShotSessionStore'
import { buildSplitRows, formatShotSeconds } from './standardShotTimer'

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
 * Split trend çizgi grafik.
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{ name: string, sec: number }[]} points
 */
function drawSplitTrendLine(doc, x, y, w, h, points) {
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
  const vals = points.map((p) => p.sec)
  const maxV = Math.max(...vals, 0.001)

  doc.setDrawColor(...PDF_COLORS.tableLine)
  doc.setLineWidth(0.1)
  for (let i = 0; i <= 4; i++) {
    const gy = plotY + (plotH * i) / 4
    doc.line(plotX, gy, plotX + plotW, gy)
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text((maxV - (maxV * i) / 4).toFixed(2), x + 1, gy + 1.2)
  }

  const n = points.length
  const coords = points.map((p, i) => ({
    px: n === 1 ? plotX + plotW / 2 : plotX + (i / (n - 1)) * plotW,
    py: plotY + plotH - (p.sec / maxV) * plotH,
  }))

  doc.setDrawColor(...PDF_COLORS.text)
  doc.setLineWidth(0.55)
  for (let i = 1; i < coords.length; i++) {
    doc.line(coords[i - 1].px, coords[i - 1].py, coords[i].px, coords[i].py)
  }

  coords.forEach((c, i) => {
    doc.setFillColor(...PDF_COLORS.accent)
    doc.circle(c.px, c.py, 1.1, 'F')
    doc.setDrawColor(...PDF_COLORS.text)
    doc.setLineWidth(0.2)
    doc.circle(c.px, c.py, 1.1, 'S')
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(points[i].name, c.px, y + h - 1.5, { align: 'center' })
  })
}

/**
 * Namlu sapma scatter.
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{ x: number, y: number, magnitude: number }[]} samples
 */
function drawDeviationScatter(doc, x, y, w, h, samples) {
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
  doc.setLineWidth(0.2)
  doc.rect(plotX, plotY, plotW, plotH, 'S')

  samples.forEach((s) => {
    const px = plotX + ((s.x + domain) / (2 * domain)) * plotW
    const py = plotY + plotH - ((s.y + domain) / (2 * domain)) * plotH
    const r = Math.max(0.6, Math.min(2.2, 0.5 + s.magnitude * 1.2))
    doc.setFillColor(...PDF_COLORS.accent)
    doc.circle(px, py, r, 'F')
    doc.setDrawColor(...PDF_COLORS.text)
    doc.setLineWidth(0.15)
    doc.circle(px, py, r, 'S')
  })

  setPdfFont(doc, 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text('-1.2', plotX, y + h - 1.5)
  doc.text('0', plotX + plotW / 2, y + h - 1.5, { align: 'center' })
  doc.text('+1.2', plotX + plotW, y + h - 1.5, { align: 'right' })
}

/**
 * @param {{
 *   session: import('./standardShotSessionStore').StandardShotSession
 *   operator?: OperatorInfo | null
 *   title?: string
 *   locale?: string
 * }} opts
 */
export async function exportStandardShotSessionPdf(opts) {
  const { session } = opts
  if (!session?.shotTimesMs?.length) return

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
    'standardShot',
    operator,
  )

  const pageCtx = { pageW, pageH, logoDataUrl, logoDims, reportTitle }
  let y = contentStartY

  // —— Çevresel koşullar / Meteo ——
  y = drawSectionTitle(doc, margin, pageW, pdfT('common.environmentalConditions'), y)
  autoTable(doc, {
    startY: y,
    head: [pdfParamValueHead()],
    body: pdfMeteoRows(/** @type {any} */ ({})),
    ...getAutoTableOptions(margin),
  })
  // @ts-expect-error autotable
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // —— Eğitim / Atış detayları ——
  const when = pdfFormatDateTime(new Date(session.createdAt))
  const reaction = formatShotSeconds(session.summary.reactionMs ?? 0)
  const total = formatShotSeconds(session.summary.totalMs ?? 0)
  const avgSplit =
    session.summary.avgSplitMs != null ? formatShotSeconds(session.summary.avgSplitMs) : '—'

  /** @type {[string, string][]} */
  const detailRows = [
    [pdfT('atis.fields.date'), when],
    [pdfT('atis.fields.weapon'), '—'],
    [pdfT('atis.fields.drillType'), pdfT('standardShot.drillType')],
    [pdfT('atis.fields.distance'), '—'],
    [pdfT('atis.fields.roundsHits'), `${session.shotCount} / —`],
    [pdfT('atis.fields.accuracy'), '—'],
    [pdfT('atis.fields.duration'), `${total} s`],
    [pdfT('atis.fields.caliber'), '—'],
    [pdfT('atis.fields.ammo'), '—'],
    [pdfT('standardShot.fields.reaction'), `${reaction} s`],
    [pdfT('standardShot.fields.avgSplit'), avgSplit === '—' ? '—' : `${avgSplit} s`],
    [pdfT('standardShot.fields.threshold'), String(session.calibration.soundThreshold)],
    [pdfT('standardShot.fields.gForce'), session.calibration.mpuGForceRange],
    [pdfT('standardShot.fields.delay'), `${(session.delayMs / 1000).toFixed(1)} s`],
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

  // —— Split listesi ——
  y = ensureReportSpace(doc, y, pageH, 40, pageCtx)
  y = drawSectionTitle(doc, margin, pageW, pdfT('standardShot.sections.splitTimes'), y)
  const splits = buildSplitRows(session.shotTimesMs)
  const splitBody = [
    [
      pdfT('standardShot.fields.reaction'),
      formatShotSeconds(session.shotTimesMs[0]),
      String(Math.round(session.shotTimesMs[0])),
    ],
    ...splits.map((r) => [
      `Split ${r.index}`,
      formatShotSeconds(r.splitMs),
      String(Math.round(r.splitMs)),
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

  // —— Silah spesifikasyonu / sensör kalibrasyonu ——
  y = ensureReportSpace(doc, y, pageH, 35, pageCtx)
  y = drawSectionTitle(doc, margin, pageW, pdfT('common.weaponSpecs'), y)
  /** @type {[string, string][]} */
  const specRows = [
    [pdfT('standardShot.fields.threshold'), String(session.calibration.soundThreshold)],
    [pdfT('standardShot.fields.gForce'), session.calibration.mpuGForceRange],
    [
      pdfT('standardShot.fields.zeroPoint'),
      `X ${session.calibration.mpuOffsetX.toFixed(3)} · Y ${session.calibration.mpuOffsetY.toFixed(3)}`,
    ],
    [
      pdfT('standardShot.fields.brightness'),
      session.calibration.neopixelBrightness != null
        ? `%${session.calibration.neopixelBrightness}`
        : '—',
    ],
  ]
  autoTable(doc, {
    startY: y,
    head: [pdfParamValueHead()],
    body: specRows,
    ...getAutoTableOptions(margin),
  })
  // @ts-expect-error autotable
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // —— Değerlendirme notları ——
  y = ensureReportSpace(doc, y, pageH, 28, pageCtx)
  y = drawSectionTitle(doc, margin, pageW, pdfT('common.evaluationNotes'), y)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  const note = pdfT('standardShot.evaluationDefault', {
    shots: session.shotCount,
    reaction,
    total,
  })
  const noteLines = doc.splitTextToSize(note, pageW - margin * 2)
  doc.text(noteLines, margin, y)
  y += noteLines.length * 5 + 6

  // —— Split trend grafik + tablo ——
  y = ensureReportSpace(doc, y, pageH, 70, pageCtx)
  y = drawSectionTitle(doc, margin, pageW, pdfT('standardShot.sections.splitTrend'), y)
  const trendPoints = buildSplitTrendSeries(session.shotTimesMs)
  drawSplitTrendLine(doc, margin, y, pageW - 2 * margin, 36, trendPoints)
  y += 40

  autoTable(doc, {
    startY: y,
    head: [
      [
        pdfT('standardShot.tables.label'),
        pdfT('standardShot.tables.timeS'),
        pdfT('standardShot.tables.timeMs'),
        pdfT('standardShot.tables.shotNo'),
      ],
    ],
    body: trendPoints.map((p) => [
      p.name === 'R' ? pdfT('standardShot.fields.reaction') : p.name,
      formatShotSeconds(p.ms),
      String(Math.round(p.ms)),
      String(p.shot),
    ]),
    ...getAutoTableOptions(margin),
  })
  // @ts-expect-error autotable
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // —— Namlu sapma analizi ——
  if (session.mpuSamples?.length) {
    y = ensureReportSpace(doc, y, pageH, 80, pageCtx)
    y = drawSectionTitle(doc, margin, pageW, pdfT('standardShot.sections.deviation'), y)
    drawDeviationScatter(
      doc,
      margin,
      y,
      pageW - 2 * margin,
      44,
      session.mpuSamples.map((p) => ({ x: p.x, y: p.y, magnitude: p.magnitude })),
    )
    y += 48

    y = ensureReportSpace(doc, y, pageH, 40, pageCtx)
    y = drawSectionTitle(doc, margin, pageW, pdfT('standardShot.sections.sensorMatrix'), y)
    autoTable(doc, {
      startY: y,
      head: [
        [
          pdfT('standardShot.tables.sample'),
          pdfT('standardShot.tables.axisX'),
          pdfT('standardShot.tables.axisY'),
          pdfT('standardShot.tables.magnitude'),
          pdfT('standardShot.tables.timeIndex'),
        ],
      ],
      body: session.mpuSamples.map((p, i) => [
        String(i + 1),
        p.x.toFixed(4),
        p.y.toFixed(4),
        p.magnitude.toFixed(4),
        String(p.t),
      ]),
      ...getAutoTableOptions(margin),
    })
  }

  stampPdfFooters(doc, reportId)

  const stamp = new Date(session.createdAt)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')
  doc.save(pdfTacticalReportFilename(/** @type {'atis'} */ (/** @type {unknown} */ ('standardShot')), callsign, 1, stamp))
}
