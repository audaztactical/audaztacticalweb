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
import { PDF_FONT_FAMILY, preparePdfAssets, setPdfFont } from './pdfFontLoader'

/** @typedef {{ callsign?: string, username?: string, email?: string, bloodType?: string }} OperatorInfo */

const COLORS = {
  bg: [10, 10, 10],
  text: [203, 213, 225],
  muted: [100, 116, 139],
  accent: [255, 180, 0],
  green: [0, 255, 65],
}

const TABLE_STYLES = {
  font: PDF_FONT_FAMILY,
  fontSize: 8,
  textColor: COLORS.text,
  fillColor: COLORS.bg,
  lineColor: [51, 65, 85],
  lineWidth: 0.1,
}

function paintPage(doc, pageW, pageH) {
  doc.setFillColor(...COLORS.bg)
  doc.rect(0, 0, pageW, pageH, 'F')
}

function drawReportHeader(doc, logoDataUrl, logoDims, margin) {
  const logoY = 11
  const textX = margin + logoDims.widthMm + 5

  doc.addImage(logoDataUrl, 'PNG', margin, logoY, logoDims.widthMm, logoDims.heightMm)

  setPdfFont(doc, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.accent)
  doc.text('VBSS TACTICAL LOG', textX, 17)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.green)
  doc.text('AUDAZ TACTICAL · Deniz Operasyonları', textX, 22)

  doc.setTextColor(...COLORS.muted)
  doc.text(`Rapor üretim: ${new Date().toLocaleString('tr-TR')}`, textX, 27)
}

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
    alternateRowStyles: { fillColor: [15, 17, 21] },
    tableLineColor: [51, 65, 85],
  })

  // @ts-expect-error jspdf-autotable plugin
  return (doc.lastAutoTable?.finalY ?? startY + 20) + 8
}

function drawVbssSummary(doc, margin, pageW, log, startY) {
  setPdfFont(doc, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.accent)
  doc.text('VBSS Operasyon Özeti', margin, startY)

  autoTable(doc, {
    startY: startY + 4,
    margin: { left: margin, right: margin },
    head: [['Parametre', 'Değer']],
    body: [
      ['Tarih', formatVbssDateCell(log)],
      ['Boarding Point', getVbssBoardingPoint(log)],
      ['Vessel Type', getVbssVesselType(log)],
      ['Search Duration', formatVbssSearchDuration(log)],
      ['Threat Level', getVbssThreatLevel(log)],
      ['Deniz durumu', getVbssSeaState(log)],
      ['Gemi hızı', formatVbssVesselSpeed(log)],
      ['Gemiye çıkış', formatVbssBoardingTime(log)],
      ['Köprüüstü kontrol', formatVbssBridgeControlTime(log)],
      ['Makine dairesi', formatVbssEngineRoomControlTime(log)],
      ['Emniyete alma', formatVbssContainmentTime(log)],
      ['Başarı oranı', `%${getVbssSuccessPercent(log).toLocaleString('tr-TR')}`],
    ],
    theme: 'plain',
    styles: TABLE_STYLES,
    headStyles: {
      fillColor: [8, 8, 8],
      textColor: COLORS.green,
      fontStyle: 'bold',
      font: PDF_FONT_FAMILY,
    },
    alternateRowStyles: { fillColor: [15, 17, 21] },
    tableLineColor: [51, 65, 85],
  })

  // @ts-expect-error jspdf-autotable plugin
  let cursorY = (doc.lastAutoTable?.finalY ?? startY) + 8

  setPdfFont(doc, 'bold')
  doc.setTextColor(...COLORS.accent)
  doc.text('Operasyon Notu', margin, cursorY)
  cursorY += 6
  setPdfFont(doc, 'normal')
  doc.setTextColor(...COLORS.text)

  const noteLines = doc.splitTextToSize(getVbssOperationNote(log), pageW - margin * 2)
  doc.text(noteLines, margin, cursorY)

  return cursorY + noteLines.length * 5
}

function drawBulkSummaryPage(doc, margin, logs, filterActive, filterLabel) {
  const avgSuccess =
    logs.length > 0
      ? Math.round((logs.reduce((sum, row) => sum + getVbssSuccessPercent(row), 0) / logs.length) * 10) /
        10
      : 0

  setPdfFont(doc, 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.accent)
  doc.text('Toplu VBSS Raporu — Özet', margin, 60)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Kayıt sayısı: ${logs.length}`, margin, 66)
  doc.text(`Ortalama başarı: %${avgSuccess.toLocaleString('tr-TR')}`, margin, 71)
  doc.text(
    filterActive ? `Filtre: ${filterLabel}` : 'Filtre: Yok — tüm kayıtlar',
    margin,
    76
  )

  autoTable(doc, {
    startY: 88,
    margin: { left: margin, right: margin },
    head: [['Tarih', 'Giriş Noktası', 'Gemi Tipi', 'Arama Süresi', 'Tehdit', 'Başarı %']],
    body: logs.map((row) => [
      formatVbssDateCell(row),
      getVbssBoardingPoint(row),
      getVbssVesselType(row),
      formatVbssSearchDuration(row),
      getVbssThreatLevel(row),
      `%${getVbssSuccessPercent(row).toLocaleString('tr-TR')}`,
    ]),
    theme: 'plain',
    styles: { ...TABLE_STYLES, fontSize: 7 },
    headStyles: {
      fillColor: [8, 8, 8],
      textColor: COLORS.green,
      fontStyle: 'bold',
      font: PDF_FONT_FAMILY,
    },
    alternateRowStyles: { fillColor: [15, 17, 21] },
    tableLineColor: [51, 65, 85],
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

    const meteoStart = isBulk ? 42 : 58
    let cursorY = drawEnvironmentalConditions(doc, meteoStart, margin, log)
    drawVbssSummary(doc, margin, pageW, log, cursorY)
  })

  doc.save(buildPdfFilename(rows, callsign))
}
