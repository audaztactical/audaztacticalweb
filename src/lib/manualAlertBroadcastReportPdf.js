import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatManualAlertBroadcastTime } from './firestoreManualAlertBroadcasts'
import { PDF_FONT_FAMILY, preparePdfAssets, setPdfFont } from './pdfFontLoader'

/** @typedef {import('./firestoreManualAlertBroadcasts').ManualAlertBroadcastRecord} ManualAlertBroadcastRecord */

const COLORS = {
  bg: [10, 10, 10],
  text: [203, 213, 225],
  muted: [100, 116, 139],
  accent: [255, 180, 0],
  green: [0, 255, 65],
}

const TABLE_STYLES = {
  font: PDF_FONT_FAMILY,
  fontSize: 7,
  textColor: COLORS.text,
  fillColor: COLORS.bg,
  lineColor: [51, 65, 85],
  lineWidth: 0.1,
  cellPadding: 2.5,
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
 * @param {number} totalCount
 */
function drawReportHeader(doc, logoDataUrl, logoDims, margin, totalCount) {
  const textX = margin + logoDims.widthMm + 5
  doc.addImage(logoDataUrl, 'PNG', margin, 10, logoDims.widthMm, logoDims.heightMm)

  setPdfFont(doc, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.accent)
  doc.text('MANUEL İKAZ YAYIN GÜNLÜĞÜ', textX, 16)

  setPdfFont(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.green)
  doc.text('AUDAZ TACTICAL · KOMUTA MERKEZİ DENETİM KAYDI', textX, 21)

  doc.setTextColor(...COLORS.muted)
  const produced = new Date().toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  doc.text(`Rapor üretim: ${produced}`, textX, 26)
  doc.text(`Toplam kayıt: ${totalCount}`, textX, 31)
}

function buildPdfFilename() {
  const d = new Date()
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('')
  return `AUDAZ-IKAZ-GUNLUGU-${stamp}.pdf`
}

/**
 * @param {ManualAlertBroadcastRecord[]} rows
 */
export async function generateManualAlertBroadcastReportPdf(rows) {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : []
  if (list.length === 0) {
    throw new Error('Rapor için kayıt bulunamadı.')
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 12

  paintPage(doc, pageW, pageH)
  drawReportHeader(doc, logoDataUrl, logoDims, margin, list.length)

  const tableBody = list.map((row) => [
    formatManualAlertBroadcastTime(row.publishedAt, row.publishedAtMs),
    row.title,
    row.message,
    row.publishedByEmail || row.publishedByUid || '—',
    row.fcmSent ? 'Gönderildi' : '—',
  ])

  // @ts-expect-error jspdf-autotable plugin
  autoTable(doc, {
    startY: 38,
    margin: { left: margin, right: margin },
    head: [['Yayın zamanı', 'Başlık', 'İçerik', 'Yayınlayan', 'Push']],
    body: tableBody,
    styles: TABLE_STYLES,
    headStyles: {
      ...TABLE_STYLES,
      fillColor: [30, 30, 30],
      textColor: COLORS.accent,
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 42 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 38 },
      4: { cellWidth: 18 },
    },
    theme: 'grid',
    didDrawPage: (/** @type {{ pageNumber: number }} */ data) => {
      if (data.pageNumber > 1) {
        paintPage(doc, pageW, pageH)
      }
      setPdfFont(doc, 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.muted)
      doc.text(
        `Sayfa ${data.pageNumber}`,
        pageW - margin,
        pageH - 6,
        { align: 'right' },
      )
    },
  })

  doc.save(buildPdfFilename())
}
