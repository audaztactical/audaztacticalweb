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
import { PDF_FONT_FAMILY, preparePdfAssets, setPdfFont } from './pdfFontLoader'
import { formatAmmoCostTry, resolveLogAmmoCost } from './ammoCost'

/** @typedef {{ callsign?: string, username?: string, email?: string, bloodType?: string }} OperatorInfo */

const COLORS = {
  bg: [10, 10, 10],
  text: [203, 213, 225],
  muted: [100, 116, 139],
  accent: [255, 180, 0],
  green: [0, 255, 65],
  slate: [71, 85, 105],
}

const TABLE_STYLES = {
  font: PDF_FONT_FAMILY,
  fontSize: 8,
  textColor: COLORS.text,
  fillColor: COLORS.bg,
  lineColor: [51, 65, 85],
  lineWidth: 0.1,
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 */
function paintPage(doc, pageW, pageH) {
  doc.setFillColor(...COLORS.bg)
  doc.rect(0, 0, pageW, pageH, 'F')
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {number} margin
 */
function drawReportHeader(doc, logoDataUrl, logoDims, margin) {
  const logoY = 11
  const textX = margin + logoDims.widthMm + 5

  doc.addImage(logoDataUrl, 'PNG', margin, logoY, logoDims.widthMm, logoDims.heightMm)

  setPdfFont(doc, 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...COLORS.accent)
  doc.text('AUDAZ TACTICAL — Atış Analizi', textX, 18)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Rapor üretim: ${new Date().toLocaleString('tr-TR')}`, textX, 24)
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {OperatorInfo | null | undefined} operator
 */
function drawOperatorBlock(doc, margin, operator) {
  const callsign = operator?.callsign || operator?.username || 'Operatör'
  const email = operator?.email || '—'
  const blood = operator?.bloodType || '—'

  setPdfFont(doc, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.text('Operatör kimliği', margin, 34)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Çağrı işareti: ${callsign}`, margin, 40)
  doc.text(`E-posta: ${email}`, margin, 45)
  doc.text(`Kan grubu: ${blood}`, margin, 50)

  return callsign
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} startY
 * @param {number} margin
 * @param {number} pageW
 * @param {Record<string, unknown>} log
 */
function drawTacticalOverview(doc, startY, margin, pageW, log) {
  const meteo = getLogMeteoData(log)

  setPdfFont(doc, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.accent)
  doc.text('Tactical Overview — Meteo-Data', margin, startY)

  autoTable(doc, {
    startY: startY + 4,
    margin: { left: margin, right: margin },
    head: [['Parametre', 'Değer']],
    body: formatMeteoOverviewRows(meteo),
    theme: 'plain',
    styles: TABLE_STYLES,
    headStyles: {
      fillColor: [8, 8, 8],
      textColor: COLORS.green,
      fontStyle: 'bold',
      font: PDF_FONT_FAMILY,
    },
    alternateRowStyles: {
      fillColor: [15, 17, 21],
    },
    tableLineColor: [51, 65, 85],
  })

  // @ts-expect-error jspdf-autotable plugin
  return (doc.lastAutoTable?.finalY ?? startY + 20) + 8
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
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text('İsabet oranı grafiği', x, y - 2)

  doc.setFillColor(...COLORS.green)
  doc.rect(x, y, hitWidth, height, 'F')
  doc.setFillColor(...COLORS.slate)
  doc.rect(x + hitWidth, y, width - hitWidth, height, 'F')

  doc.setDrawColor(...COLORS.accent)
  doc.setLineWidth(0.2)
  doc.rect(x, y, width, height, 'S')

  doc.setTextColor(...COLORS.green)
  doc.text(`İsabet ${hits}`, x + 2, y + height + 5)
  setPdfFont(doc, 'normal')
  doc.setTextColor(...COLORS.muted)
  doc.text(`Kaçırma ${misses}`, x + width * 0.55, y + height + 5)
  doc.setTextColor(...COLORS.accent)
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

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
    head: [['Parametre', 'Değer']],
    body: detailRows,
    theme: 'plain',
    styles: TABLE_STYLES,
    headStyles: {
      fillColor: [8, 8, 8],
      textColor: COLORS.accent,
      fontStyle: 'bold',
      font: PDF_FONT_FAMILY,
    },
    alternateRowStyles: {
      fillColor: [15, 17, 21],
    },
    tableLineColor: [51, 65, 85],
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? startY) + 10

  drawHitRatioChart(doc, margin, cursorY, pageW - margin * 2, 10, dist.hits, dist.misses)
  cursorY += 22

  if (isAtisTimed(log) && timing) {
    setPdfFont(doc, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.accent)
    doc.text('Süre analizi', margin, cursorY)
    cursorY += 6
    setPdfFont(doc, 'normal')
    doc.setTextColor(...COLORS.text)
    doc.text(`İlk atış: ${timing.firstShot} · Split: ${timing.split} · Toplam: ${timing.total}`, margin, cursorY)
    cursorY += 8
  }

  const specLines = formatWeaponSpecsBlock(log)
  if (specLines.length > 0) {
    setPdfFont(doc, 'bold')
    doc.setTextColor(...COLORS.accent)
    doc.text('Silah spesifikasyonu', margin, cursorY)
    cursorY += 6
    setPdfFont(doc, 'normal')
    doc.setTextColor(...COLORS.muted)
    specLines.forEach((line) => {
      doc.text(line, margin, cursorY)
      cursorY += 5
    })
    cursorY += 4
  }

  setPdfFont(doc, 'bold')
  doc.setTextColor(...COLORS.accent)
  doc.text('Antrenman notu', margin, cursorY)
  cursorY += 6
  setPdfFont(doc, 'normal')
  doc.setTextColor(...COLORS.text)

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
function drawBulkSummaryPage(doc, margin, pageW, logs, filterActive, filterLabel, inventory = []) {
  const totalRounds = logs.reduce((sum, row) => sum + getAtisRoundsAndHits(row).totalRoundsFired, 0)
  const totalHits = logs.reduce((sum, row) => sum + getAtisRoundsAndHits(row).totalHits, 0)
  const totalCost = logs.reduce((sum, row) => sum + (resolveLogAmmoCost(row, inventory)?.totalCost ?? 0), 0)
  const avgAccuracy =
    logs.length > 0
      ? Math.round(
          (logs.reduce((sum, row) => sum + getAtisAccuracyPercent(row), 0) / logs.length) * 10
        ) / 10
      : 0

  setPdfFont(doc, 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.accent)
  doc.text('Toplu Atış Raporu — Özet', margin, 58)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Kayıt sayısı: ${logs.length}`, margin, 64)
  doc.text(`Toplam atım / isabet: ${totalRounds} / ${totalHits}`, margin, 69)
  doc.text(`Ortalama isabet: %${avgAccuracy.toLocaleString('tr-TR')}`, margin, 74)
  if (totalCost > 0) {
    doc.text(`Toplam mühimmat maliyeti: ${formatAmmoCostTry(totalCost)}`, margin, 79)
  }
  doc.text(
    filterActive ? `Filtre: ${filterLabel}` : 'Filtre: Yok — tüm kayıtlar',
    margin,
    totalCost > 0 ? 84 : 79
  )

  autoTable(doc, {
    startY: totalCost > 0 ? 91 : 86,
    margin: { left: margin, right: margin },
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
    theme: 'plain',
    styles: { ...TABLE_STYLES, fontSize: 7 },
    headStyles: {
      fillColor: [8, 8, 8],
      textColor: COLORS.accent,
      fontStyle: 'bold',
      font: PDF_FONT_FAMILY,
    },
    alternateRowStyles: {
      fillColor: [15, 17, 21],
    },
    tableLineColor: [51, 65, 85],
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
  const margin = 14
  const isBulk = rows.length > 1

  paintPage(doc, pageW, pageH)
  drawReportHeader(doc, logoDataUrl, logoDims, margin)
  const callsign = drawOperatorBlock(doc, margin, operator)

  if (isBulk) {
    drawBulkSummaryPage(doc, margin, pageW, rows, filterActive, filterLabel, inventory)
  }

  rows.forEach((log, index) => {
    if (isBulk) {
      doc.addPage()
      paintPage(doc, pageW, pageH)
      drawReportHeader(doc, logoDataUrl, logoDims, margin)

      setPdfFont(doc, 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...COLORS.text)
      doc.text(`Kayıt ${index + 1} / ${rows.length}`, margin, 34)
    }

    const overviewStart = isBulk ? 40 : 56
    let cursorY = drawTacticalOverview(doc, overviewStart, margin, pageW, log)
    drawLogDetailSection(doc, margin, pageW, log, cursorY, inventory)
  })

  doc.save(buildPdfFilename(rows, callsign))
}
