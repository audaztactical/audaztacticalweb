import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatAtisDateCell,
  formatAtisDurationCell,
  formatAtisFilterSummary,
  formatWeaponSpecsBlock,
  getAtisAccuracyPercent,
  getAtisAmmoName,
  getAtisCaliberLabel,
  getAtisDistanceM,
  getAtisDrillName,
  getAtisOperationNote,
  getAtisRoundsAndHits,
  getAtisShotDistribution,
  getAtisTimingDetails,
  getAtisWeaponLabel,
  isAtisTimed,
} from './atisLogRegistry'
import { formatMeteoOverviewRows, getLogMeteoData } from './meteoDataCapture'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import { formatAmmoCostTry, resolveLogAmmoCost } from './ammoCost'
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
function drawTacticalOverview(doc, startY, margin, pageW, log) {
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
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} hits
 * @param {number} misses
 */
function drawHitRatioChart(doc, x, y, width, height, hits, misses) {
  const total = Math.max(1, hits + misses)
  const hitWidth = (width * hits) / total

  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text('İsabet oranı grafiği', x, y - 2)

  doc.setFillColor(...PDF_COLORS.hitBar)
  doc.rect(x, y, hitWidth, height, 'F')
  doc.setFillColor(...PDF_COLORS.missBar)
  doc.rect(x + hitWidth, y, width - hitWidth, height, 'F')

  doc.setDrawColor(...PDF_COLORS.formBorder)
  doc.setLineWidth(0.2)
  doc.rect(x, y, width, height, 'S')

  doc.setTextColor(...PDF_COLORS.accent)
  doc.text(`İsabet ${hits}`, x + 2, y + height + 5)
  setPdfFont(doc, 'normal')
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`Kaçırma ${misses}`, x + width * 0.55, y + height + 5)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text(`%${Math.round((hits / total) * 1000) / 10}`, x + width - 18, y + height + 5)
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {Record<string, unknown>} log
 * @param {number} startY
 * @param {Record<string, unknown>[]} [inventory]
 */
function drawLogDetailSection(doc, margin, pageW, log, startY, inventory = []) {
  const accuracy = getAtisAccuracyPercent(log)
  const dist = getAtisShotDistribution(log)
  const duration = formatAtisDurationCell(log)
  const timing = getAtisTimingDetails(log)
  const note = getAtisOperationNote(log)
  const ammoCost = resolveLogAmmoCost(log, inventory)

  /** @type {[string, string][]} */
  const detailRows = [
    ['Tarih', formatAtisDateCell(log)],
    ['Silah', getAtisWeaponLabel(log)],
    ['Atış türü', getAtisDrillName(log)],
    ['Mesafe', `${getAtisDistanceM(log)} m`],
    ['Atım / İsabet', `${dist.total} / ${dist.hits}`],
    ['İsabet oranı', `%${accuracy.toLocaleString('tr-TR')}`],
    ['Süre', duration.label],
    ['Kalibre', getAtisCaliberLabel(log)],
    ['Mühimmat', getAtisAmmoName(log)],
  ]
  if (ammoCost) {
    detailRows.push(
      ['Birim fiyat', formatAmmoCostTry(ammoCost.unitPrice)],
      ['Toplam maliyet', formatAmmoCostTry(ammoCost.totalCost)]
    )
  }

  const detailStart = drawSectionTitle(doc, margin, pageW, 'Eğitim Detayları', startY)
  autoTable(doc, {
    startY: detailStart,
    head: [['Parametre', 'Değer']],
    body: detailRows,
    ...getAutoTableOptions(margin),
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? detailStart) + 10

  drawHitRatioChart(doc, margin, cursorY, pageW - margin * 2, 10, dist.hits, dist.misses)
  cursorY += 22

  if (isAtisTimed(log) && timing) {
    cursorY = drawSectionTitle(doc, margin, pageW, 'Süre Analizi', cursorY)
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.body)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text(`İlk atış: ${timing.firstShot} · Split: ${timing.split} · Toplam: ${timing.total}`, margin, cursorY)
    cursorY += 8
  }

  const specLines = formatWeaponSpecsBlock(log)
  if (specLines.length > 0) {
    cursorY = drawSectionTitle(doc, margin, pageW, 'Silah Spesifikasyonu', cursorY)
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.body)
    doc.setTextColor(...PDF_COLORS.muted)
    specLines.forEach((line) => {
      doc.text(line, margin, cursorY)
      cursorY += 5
    })
    cursorY += 4
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
 * @param {Record<string, unknown>[]} logs
 * @param {boolean} filterActive
 * @param {string} filterLabel
 * @param {Record<string, unknown>[]} [inventory]
 */
function drawBulkSummaryPage(doc, margin, pageW, startY, logs, filterActive, filterLabel, inventory = []) {
  const totalRounds = logs.reduce((sum, row) => sum + getAtisRoundsAndHits(row).totalRoundsFired, 0)
  const totalHits = logs.reduce((sum, row) => sum + getAtisRoundsAndHits(row).totalHits, 0)
  const totalCost = logs.reduce((sum, row) => sum + (resolveLogAmmoCost(row, inventory)?.totalCost ?? 0), 0)
  const avgAccuracy =
    logs.length > 0
      ? Math.round(
          (logs.reduce((sum, row) => sum + getAtisAccuracyPercent(row), 0) / logs.length) * 10
        ) / 10
      : 0

  let y = drawSectionTitle(doc, margin, pageW, 'Performans Özeti', startY)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`Kayıt sayısı: ${logs.length}`, margin, y)
  y += 5
  doc.text(`Toplam atım / isabet: ${totalRounds} / ${totalHits}`, margin, y)
  y += 5
  doc.text(`Ortalama isabet: %${avgAccuracy.toLocaleString('tr-TR')}`, margin, y)
  y += 5
  if (totalCost > 0) {
    doc.text(`Toplam mühimmat maliyeti: ${formatAmmoCostTry(totalCost)}`, margin, y)
    y += 5
  }
  doc.text(filterActive ? `Filtre: ${filterLabel}` : 'Filtre: Yok — tüm kayıtlar', margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Tarih', 'Silah', 'Atış türü', 'Mesafe', 'Atım/İsabet', 'Skor %', 'Maliyet']],
    body: logs.map((row) => {
      const { totalRoundsFired, totalHits } = getAtisRoundsAndHits(row)
      const cost = resolveLogAmmoCost(row, inventory)
      return [
        formatAtisDateCell(row),
        getAtisWeaponLabel(row),
        getAtisDrillName(row),
        `${getAtisDistanceM(row)} m`,
        `${totalRoundsFired}/${totalHits}`,
        `%${getAtisAccuracyPercent(row).toLocaleString('tr-TR')}`,
        cost ? formatAmmoCostTry(cost.totalCost) : '—',
      ]
    }),
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
    const logMs = formatAtisDateCell(logs[0]).replace(/[^\d]/g, '').slice(0, 12) || 'rapor'
    return `AUDAZ-Atis-${safeCallsign}-${logMs}.pdf`
  }
  const stamp = new Date().toISOString().slice(0, 10)
  return `AUDAZ-Atis-Toplu-${safeCallsign}-${logs.length}kayit-${stamp}.pdf`
}

/**
 * @param {{
 *   logs: Record<string, unknown>[],
 *   operator?: OperatorInfo | null,
 *   filterActive?: boolean,
 *   filterLabel?: string,
 *   inventory?: Record<string, unknown>[],
 * }} params
 */
export async function generateAtisShootingReportPdf({
  logs,
  operator,
  filterActive = false,
  filterLabel = '',
  inventory = [],
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
    'atis',
    operator,
  )

  if (isBulk) {
    drawBulkSummaryPage(doc, margin, pageW, contentStartY, rows, filterActive, filterLabel, inventory)
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

    let cursorY = drawTacticalOverview(doc, startY, margin, pageW, log)
    drawLogDetailSection(doc, margin, pageW, log, cursorY, inventory)
  })

  stampPdfFooters(doc, reportId)
  doc.save(buildPdfFilename(rows, callsign))
}
