import { PDF_FONT_FAMILY, setPdfFont } from './pdfFontLoader'

/** @typedef {{ callsign?: string, username?: string, email?: string, bloodType?: string, displayName?: string }} OperatorInfo */

/** Baskı dostu açık tema — RGB tuple'ları jsPDF için */
export const PDF_COLORS = {
  pageBg: [255, 255, 255],
  text: [26, 26, 46],
  muted: [74, 85, 104],
  headerBg: [26, 26, 46],
  headerText: [255, 255, 255],
  headerSubtext: [200, 200, 210],
  accent: [200, 148, 10],
  tableHeadBg: [45, 55, 72],
  tableHeadText: [255, 255, 255],
  tableAltRow: [247, 248, 250],
  tableLine: [203, 213, 224],
  footerText: [113, 128, 150],
  formBorder: [74, 85, 104],
  error: [185, 28, 28],
  errorBg: [254, 242, 242],
  errorAltRow: [254, 248, 248],
  hitBar: [200, 148, 10],
  missBar: [203, 213, 224],
}

export const PDF_FONT_SIZE = {
  body: 8.5,
  table: 7.5,
  section: 10,
  reportTitle: 14,
  subtitle: 9,
  footer: 7,
  brand: 11,
  brandSub: 7,
  small: 7,
}

export const PDF_LAYOUT = {
  margin: 14,
  headerHeight: 26,
  sectionBarWidth: 2,
  sectionBarHeight: 7,
  logoHeightMm: 16,
}

export const PDF_REPORT_TITLES = {
  atis: 'ATIŞ TAKTİK PERFORMANS RAPORU',
  cqb: 'CQB TAKTİK DEĞERLENDİRME RAPORU',
  fof: 'FOF KUVVET KARŞILAŞMASI RAPORU',
  vbss: 'VBSS GEMİ OPERASYON RAPORU',
  tccc: 'TCCC TAKTİK SAĞLIK RAPORU',
  dd1380: 'DD-1380 YARALI OPERASYON KAYDI',
  tcccObsForm: 'TCCC MARCH GÖZLEM FORMU',
  vbssObsForm: 'VBSS GÖZLEM FORMU',
}

/** HTML yazdırma şablonları için hex renkler */
export const PDF_HTML_THEME = {
  pageBg: '#FFFFFF',
  text: '#1A1A2E',
  muted: '#4A5568',
  headerBg: '#1A1A2E',
  headerText: '#FFFFFF',
  headerSubtext: '#C8C8D2',
  accent: '#C8940A',
  tableHeadBg: '#2D3748',
  border: '#CBD5E0',
  formBorder: '#4A5568',
  footerText: '#718096',
  altRow: '#F7F8FA',
}

/**
 * @param {string} [prefix]
 */
export function generateReportId(prefix = 'RPT') {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-8)}`
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 */
export function paintPdfPage(doc, pageW, pageH) {
  doc.setFillColor(...PDF_COLORS.pageBg)
  doc.rect(0, 0, pageW, pageH, 'F')
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @returns {number}
 */
export function drawPdfHeader(doc, pageW, logoDataUrl, logoDims, reportTitle) {
  const h = PDF_LAYOUT.headerHeight
  doc.setFillColor(...PDF_COLORS.headerBg)
  doc.rect(0, 0, pageW, h, 'F')

  const logoY = (h - logoDims.heightMm) / 2
  doc.addImage(logoDataUrl, 'PNG', PDF_LAYOUT.margin, logoY, logoDims.widthMm, logoDims.heightMm)

  const brandX = PDF_LAYOUT.margin + logoDims.widthMm + 4
  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.brand)
  doc.setTextColor(...PDF_COLORS.headerText)
  doc.text('AUDAZ TACTICAL', brandX, logoY + 5.5)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.brandSub)
  doc.setTextColor(...PDF_COLORS.headerSubtext)
  doc.text('Operasyonel Kayıt Sistemi', brandX, logoY + 10.5)

  const now = new Date().toLocaleString('tr-TR')
  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.subtitle)
  doc.setTextColor(...PDF_COLORS.headerText)
  doc.text(reportTitle, pageW - PDF_LAYOUT.margin, logoY + 5, { align: 'right' })
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.brandSub)
  doc.text(now, pageW - PDF_LAYOUT.margin, logoY + 11, { align: 'right' })

  return h
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {OperatorInfo | null | undefined} operator
 * @param {string} reportId
 */
export function drawPdfOperatorBlock(doc, pageW, operator, reportId) {
  const margin = PDF_LAYOUT.margin
  let y = PDF_LAYOUT.headerHeight + 5

  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.section)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text('Operatör Bilgileri', margin, y)
  y += 6

  const callsign = operator?.callsign || operator?.username || operator?.displayName || 'Operatör'
  const blood = operator?.bloodType || '—'
  const created = new Date().toLocaleString('tr-TR')

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`Çağrı adı: ${callsign}`, margin, y)
  doc.text(`Kan grubu: ${blood}`, pageW / 2, y)
  y += 5
  doc.text(`Rapor ID: ${reportId}`, margin, y)
  doc.text(`Oluşturma: ${created}`, pageW / 2, y)
  y += 4

  doc.setDrawColor(...PDF_COLORS.accent)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  return { callsign, contentStartY: y }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {string} title
 * @param {number} y
 * @returns {number}
 */
export function drawSectionTitle(doc, margin, pageW, title, y) {
  const barH = PDF_LAYOUT.sectionBarHeight
  const barW = pageW - margin * 2
  doc.setFillColor(...PDF_COLORS.headerBg)
  doc.rect(margin, y, barW, barH, 'F')
  doc.setFillColor(...PDF_COLORS.accent)
  doc.rect(margin, y, PDF_LAYOUT.sectionBarWidth, barH, 'F')
  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.section)
  doc.setTextColor(...PDF_COLORS.headerText)
  doc.text(title, margin + PDF_LAYOUT.sectionBarWidth + 3, y + 5)
  return y + barH + 4
}

/**
 * @param {Record<string, unknown>} [overrides]
 */
export function getAutoTableStyles(overrides = {}) {
  return {
    font: PDF_FONT_FAMILY,
    fontSize: PDF_FONT_SIZE.table,
    textColor: PDF_COLORS.text,
    fillColor: PDF_COLORS.pageBg,
    lineColor: PDF_COLORS.tableLine,
    lineWidth: 0.1,
    ...overrides,
  }
}

/**
 * @param {Record<string, unknown>} [overrides]
 */
export function getAutoTableHeadStyles(overrides = {}) {
  return {
    fillColor: PDF_COLORS.tableHeadBg,
    textColor: PDF_COLORS.tableHeadText,
    fontStyle: 'bold',
    font: PDF_FONT_FAMILY,
    ...overrides,
  }
}

/**
 * @param {number} margin
 * @param {Record<string, unknown>} [overrides]
 */
export function getAutoTableOptions(margin, overrides = {}) {
  const { styles: styleOverrides, headStyles: headOverrides, alternateRowStyles: altOverrides, ...rest } =
    overrides
  return {
    theme: 'plain',
    styles: getAutoTableStyles(styleOverrides),
    headStyles: getAutoTableHeadStyles(headOverrides),
    alternateRowStyles: { fillColor: PDF_COLORS.tableAltRow, ...altOverrides },
    tableLineColor: PDF_COLORS.tableLine,
    margin: { left: margin, right: margin },
    ...rest,
  }
}

/**
 * @param {number} margin
 * @param {Record<string, unknown>} [overrides]
 */
export function getErrorTableOptions(margin, overrides = {}) {
  return getAutoTableOptions(margin, {
    headStyles: {
      fillColor: PDF_COLORS.errorBg,
      textColor: PDF_COLORS.error,
      fontStyle: 'bold',
      font: PDF_FONT_FAMILY,
    },
    alternateRowStyles: { fillColor: PDF_COLORS.errorAltRow },
    ...overrides,
  })
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {string} reportId
 */
export function stampPdfFooters(doc, reportId) {
  const total = doc.getNumberOfPages()
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    const y = pageH - 8
    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.footer)
    doc.setTextColor(...PDF_COLORS.footerText)
    doc.text('AUDAZ TACTICAL — Gizli / Operasyonel Kullanım', PDF_LAYOUT.margin, y)
    doc.text(reportId, pageW / 2, y, { align: 'center' })
    doc.text(`Sayfa ${i} / ${total}`, pageW - PDF_LAYOUT.margin, y, { align: 'right' })
  }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {string} label
 * @param {number} startY
 * @returns {number}
 */
export function drawPdfContinuationLabel(doc, margin, label, startY) {
  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.subtitle)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text(label, margin, startY)
  return startY + 8
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {keyof typeof PDF_REPORT_TITLES | string} reportTitleKey
 * @param {OperatorInfo | null | undefined} operator
 */
export function setupReportFirstPage(doc, pageW, pageH, logoDataUrl, logoDims, reportTitleKey, operator) {
  paintPdfPage(doc, pageW, pageH)
  const reportId = generateReportId()
  const reportTitle = PDF_REPORT_TITLES[reportTitleKey] ?? reportTitleKey
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, reportTitle)
  const { callsign, contentStartY } = drawPdfOperatorBlock(doc, pageW, operator, reportId)
  return { reportId, callsign, contentStartY, reportTitle }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @param {string} [recordLabel]
 * @returns {number}
 */
export function setupReportContinuationPage(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, recordLabel) {
  paintPdfPage(doc, pageW, pageH)
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, reportTitle)
  let y = PDF_LAYOUT.headerHeight + 6
  if (recordLabel) {
    y = drawPdfContinuationLabel(doc, PDF_LAYOUT.margin, recordLabel, y)
  }
  return y
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} [size]
 */
export function drawEmptyFormBox(doc, x, y, size = 4) {
  doc.setDrawColor(...PDF_COLORS.formBorder)
  doc.setLineWidth(0.2)
  doc.rect(x, y, size, size)
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} width
 */
export function drawFormFieldLine(doc, x, y, width) {
  doc.setDrawColor(...PDF_COLORS.formBorder)
  doc.setLineWidth(0.2)
  doc.line(x, y, x + width, y)
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @param {string} formId
 * @param {string} versionLabel
 */
export function drawObservationFormHeader(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, formId, versionLabel) {
  paintPdfPage(doc, pageW, pageH)
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, reportTitle)
  const margin = PDF_LAYOUT.margin
  let y = PDF_LAYOUT.headerHeight + 4
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`Form ID: ${formId} · ${versionLabel}`, margin, y)
  return y + 6
}

export function buildPdfHtmlBaseStyles() {
  const t = PDF_HTML_THEME
  return `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
  * { box-sizing: border-box; }
  body { font-family: Roboto, Arial, sans-serif; margin: 0; padding: 0; color: ${t.text}; background: ${t.pageBg}; font-size: 11px; }
  .page { padding: 0 24px 24px; }
  .header-bar { display: flex; justify-content: space-between; align-items: center; background: ${t.headerBg}; color: ${t.headerText}; padding: 14px 24px; margin-bottom: 20px; }
  .header-left .brand { font-weight: 700; font-size: 14px; letter-spacing: 0.04em; }
  .header-left .sub { font-size: 9px; color: ${t.headerSubtext}; margin-top: 2px; }
  .header-right { text-align: right; }
  .header-right .title { font-weight: 700; font-size: 12px; }
  .header-right .date { font-size: 9px; color: ${t.headerSubtext}; margin-top: 4px; }
  .section-title { font-size: 10px; font-weight: 700; color: ${t.headerText}; background: ${t.headerBg}; padding: 6px 10px 6px 8px; border-left: 3px solid ${t.accent}; margin: 16px 0 10px; }
  .line { margin: 12px 0; font-size: 11px; }
  .line strong { color: ${t.text}; }
  .blank { border: 1px solid ${t.formBorder}; border-top: none; border-left: none; border-right: none; min-height: 20px; margin-top: 4px; background: ${t.pageBg}; }
  .opts { font-size: 10px; color: ${t.muted}; margin-top: 6px; line-height: 1.6; }
  .footer { margin-top: 32px; padding-top: 8px; border-top: 1px solid ${t.border}; font-size: 9px; color: ${t.footerText}; display: flex; justify-content: space-between; }
  `
}
