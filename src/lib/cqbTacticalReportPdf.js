import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  countCqbTacticalErrors,
  formatCqbClearanceTime,
  formatCqbDateCell,
  formatCqbFilterSummary,
  getCqbAccuracyScore,
  getCqbBreachingType,
  getCqbDoorState,
  getCqbEntryMethod,
  getCqbOperationNote,
  getCqbRoomTopology,
  getCqbSafetyViolations,
  getCqbSuccessPercent,
  getCqbTacticalDecision,
  getCqbTacticalErrorsGrouped,
  getCqbTeamSize,
  getCqbThreatNeutralized,
} from './cqbLogRegistry'
import { formatMeteoOverviewRows, getLogMeteoData } from './meteoDataCapture'
import { PDF_FONT_FAMILY, preparePdfAssets, setPdfFont } from './pdfFontLoader'

/** @typedef {{ callsign?: string, username?: string, email?: string, bloodType?: string }} OperatorInfo */

const COLORS = {
  bg: [10, 10, 10],
  text: [203, 213, 225],
  muted: [100, 116, 139],
  accent: [255, 180, 0],
  green: [0, 255, 65],
  slate: [71, 85, 105],
  amber: [245, 158, 11],
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
  doc.setFontSize(13)
  doc.setTextColor(...COLORS.accent)
  doc.text('CQB TACTICAL ASSESSMENT', textX, 17)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.green)
  doc.text('AUDAZ TACTICAL · Close Quarters Battle', textX, 22)

  doc.setTextColor(...COLORS.muted)
  doc.text(`Rapor üretim: ${new Date().toLocaleString('tr-TR')}`, textX, 27)
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
  doc.text('Operatör kimliği', margin, 36)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Çağrı işareti: ${callsign}`, margin, 42)
  doc.text(`E-posta: ${email}`, margin, 47)
  doc.text(`Kan grubu: ${blood}`, margin, 52)

  return callsign
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} startY
 * @param {number} margin
 * @param {Record<string, unknown>} log
 */
function drawEnvironmentalConditions(doc, startY, margin, log) {
  const meteo = getLogMeteoData(log)

  setPdfFont(doc, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.green)
  doc.text('Çevresel koşullar · Meteo-Data', margin, startY)

  autoTable(doc, {
    startY: startY + 4,
    margin: { left: margin, right: margin },
    head: [['Parametre', 'Değer']],
    body: formatMeteoOverviewRows(meteo),
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
  return (doc.lastAutoTable?.finalY ?? startY + 20) + 8
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {Record<string, unknown>} log
 * @param {number} startY
 */
function drawLogDetailSection(doc, margin, pageW, log, startY) {
  const { threats, neutralized } = getCqbThreatNeutralized(log)
  const errorGroups = getCqbTacticalErrorsGrouped(log)
  const errorCount = countCqbTacticalErrors(log)
  const note = getCqbOperationNote(log)

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
    head: [['Parametre', 'Değer']],
    body: [
      ['Tarih', formatCqbDateCell(log)],
      ['Oda topolojisi', getCqbRoomTopology(log)],
      ['Giriş metodu', getCqbEntryMethod(log)],
      ['Kırma tipi', getCqbBreachingType(log)],
      ['Kapı durumu', getCqbDoorState(log)],
      ['Takım boyutu', getCqbTeamSize(log)],
      ['Tehdit / Etkisiz', `${threats} / ${neutralized}`],
      ['Clearance Time', formatCqbClearanceTime(log)],
      ['Accuracy Score', `%${getCqbAccuracyScore(log).toLocaleString('tr-TR')}`],
      ['Safety Violations', String(getCqbSafetyViolations(log))],
      ['Tactical Decision', getCqbTacticalDecision(log)],
      ['Başarı oranı', `%${getCqbSuccessPercent(log).toLocaleString('tr-TR')}`],
    ],
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
  let cursorY = (doc.lastAutoTable?.finalY ?? startY) + 8

  if (errorCount > 0) {
    setPdfFont(doc, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.amber)
    doc.text(`Taktik hatalar · ${errorCount} kayıt`, margin, cursorY)
    cursorY += 5

    const errorRows = errorGroups.flatMap((group) =>
      group.labels.map((label) => [group.phaseTitle, label])
    )

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Faz', 'Hata']],
      body: errorRows,
      theme: 'plain',
      styles: { ...TABLE_STYLES, fontSize: 7 },
      headStyles: {
        fillColor: [20, 14, 4],
        textColor: COLORS.amber,
        fontStyle: 'bold',
        font: PDF_FONT_FAMILY,
      },
      alternateRowStyles: {
        fillColor: [15, 12, 8],
      },
    })

    // @ts-expect-error jspdf-autotable plugin
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8
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
 * @param {Record<string, unknown>[]} logs
 * @param {boolean} filterActive
 * @param {string} filterLabel
 */
function drawBulkSummaryPage(doc, margin, logs, filterActive, filterLabel) {
  const avgAccuracy =
    logs.length > 0
      ? Math.round(
          (logs.reduce((sum, row) => sum + getCqbAccuracyScore(row), 0) / logs.length) * 10
        ) / 10
      : 0
  const totalViolations = logs.reduce((sum, row) => sum + getCqbSafetyViolations(row), 0)

  setPdfFont(doc, 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.accent)
  doc.text('Toplu CQB Raporu — Özet', margin, 60)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Kayıt sayısı: ${logs.length}`, margin, 66)
  doc.text(`Ortalama isabet skoru: %${avgAccuracy.toLocaleString('tr-TR')}`, margin, 71)
  doc.text(`Toplam güvenlik ihlali: ${totalViolations}`, margin, 76)
  doc.text(
    filterActive ? `Filtre: ${filterLabel}` : 'Filtre: Yok — tüm kayıtlar',
    margin,
    81
  )

  autoTable(doc, {
    startY: 88,
    margin: { left: margin, right: margin },
    head: [['Tarih', 'Topoloji', 'Clearance', 'İsabet %', 'İhlal', 'Karar', 'Başarı %']],
    body: logs.map((row) => [
      formatCqbDateCell(row),
      getCqbRoomTopology(row),
      formatCqbClearanceTime(row),
      `%${getCqbAccuracyScore(row).toLocaleString('tr-TR')}`,
      String(getCqbSafetyViolations(row)),
      getCqbTacticalDecision(row),
      `%${getCqbSuccessPercent(row).toLocaleString('tr-TR')}`,
    ]),
    theme: 'plain',
    styles: { ...TABLE_STYLES, fontSize: 7 },
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
}

/**
 * @param {Record<string, unknown>[]} logs
 * @param {string} callsign
 */
function buildPdfFilename(logs, callsign) {
  const safeCallsign = callsign.replace(/[^\w-]+/g, '_').slice(0, 24)
  if (logs.length === 1) {
    const logMs = formatCqbDateCell(logs[0]).replace(/[^\d]/g, '').slice(0, 12) || 'rapor'
    return `AUDAZ-CQB-${safeCallsign}-${logMs}.pdf`
  }
  const stamp = new Date().toISOString().slice(0, 10)
  return `AUDAZ-CQB-Toplu-${safeCallsign}-${logs.length}kayit-${stamp}.pdf`
}

/**
 * @param {{
 *   logs: Record<string, unknown>[],
 *   operator?: OperatorInfo | null,
 *   filterActive?: boolean,
 *   filterLabel?: string,
 * }} params
 */
export async function generateCqbTacticalReportPdf({
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
  const margin = 14
  const isBulk = rows.length > 1

  paintPage(doc, pageW, pageH)
  drawReportHeader(doc, logoDataUrl, logoDims, margin)
  const callsign = drawOperatorBlock(doc, margin, operator)

  if (isBulk) {
    drawBulkSummaryPage(doc, margin, rows, filterActive, filterLabel)
  }

  rows.forEach((log, index) => {
    if (isBulk) {
      doc.addPage()
      paintPage(doc, pageW, pageH)
      drawReportHeader(doc, logoDataUrl, logoDims, margin)

      setPdfFont(doc, 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...COLORS.text)
      doc.text(`Kayıt ${index + 1} / ${rows.length}`, margin, 36)
    }

    const overviewStart = isBulk ? 42 : 58
    let cursorY = drawEnvironmentalConditions(doc, overviewStart, margin, log)
    drawLogDetailSection(doc, margin, pageW, log, cursorY)
  })

  doc.save(buildPdfFilename(rows, callsign))
}
