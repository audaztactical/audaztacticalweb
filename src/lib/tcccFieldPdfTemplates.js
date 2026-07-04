import { jsPDF } from 'jspdf'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import {
  buildPdfHtmlBaseStyles,
  PDF_COLORS,
  PDF_FONT_SIZE,
  PDF_LAYOUT,
  drawEmptyFormBox,
  drawFormFieldLine,
  drawPdfHeader,
  drawSectionTitle,
  generateReportId,
  paintPdfPage,
  stampPdfFooters,
} from './pdfDesignTokens'

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @param {number} [boxSize]
 */
function drawCheckboxLabel(doc, x, y, label, boxSize = 3.5) {
  drawEmptyFormBox(doc, x, y - boxSize + 1, boxSize)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text(label, x + boxSize + 1.5, y)
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} y
 * @param {string[]} items
 * @param {number} maxX
 * @returns {number}
 */
function drawCheckboxRow(doc, margin, y, items, maxX) {
  let x = margin
  const lineH = 5
  for (const item of items) {
    const itemW = doc.getTextWidth(item) + 8
    if (x + itemW > maxX && x > margin) {
      x = margin
      y += lineH
    }
    drawCheckboxLabel(doc, x, y, item)
    x += itemW + 2
  }
  return y + lineH + 1
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @param {number} lineW
 * @returns {number}
 */
function drawLabeledField(doc, x, y, label, lineW) {
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(label, x, y)
  const labelW = doc.getTextWidth(label) + 2
  drawFormFieldLine(doc, x + labelW, y + 0.5, lineW - labelW)
  return y + 6
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {string} formId
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @returns {number}
 */
function initBlankFormPage(doc, margin, pageW, pageH, formId, logoDataUrl, logoDims, reportTitle) {
  paintPdfPage(doc, pageW, pageH)
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, reportTitle)
  let y = PDF_LAYOUT.headerHeight + 4
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`Form ID: ${formId} · Boş şablon · Kalemle doldurun`, margin, y)
  return y + 8
}

/** DD FORM 1380 boş taktik saha kartı — jsPDF */
export async function generateDD1380BlankTemplate() {
  const formId = generateReportId('DD1380')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin
  const right = pageW - margin

  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  let y = initBlankFormPage(
    doc,
    margin,
    pageW,
    pageH,
    formId,
    logoDataUrl,
    logoDims,
    'DD FORM 1380 · TAKTİK SAHA KARTI',
  )

  y = drawSectionTitle(doc, margin, pageW, 'Hasta Bilgileri', y)
  y = drawLabeledField(doc, margin, y, 'Ad Soyad', 85)
  y = drawLabeledField(doc, margin + 92, y - 6, 'Rütbe', right - margin - 92)
  y = drawLabeledField(doc, margin, y, 'Kan Grubu', 40)
  y = drawLabeledField(doc, margin + 48, y - 6, 'Tarih / Saat', right - margin - 48)
  y += 2

  y = drawSectionTitle(doc, margin, pageW, 'Yaralanma Mekanizması', y)
  y = drawCheckboxRow(
    doc,
    margin,
    y,
    ['Ateşli silah', 'Patlama', 'Künt travma', 'Yanık', 'Diğer'],
    right,
  )
  y += 2

  y = drawSectionTitle(doc, margin, pageW, 'MARCH Değerlendirmesi', y)
  const marchLines = [
    ['M (Masif Kanama):', ['Turnike', 'Yara bandajı', 'Hemostatik ajan']],
    ['A (Hava Yolu):', ['Açık', 'NPA', 'Çene itiş', 'Krikotirotomi']],
    ['R (Solunum):', ['Normal', 'Gergin pnömotoraks', 'Göğüs mühürü']],
    ['C (Dolaşım):', ['IV/IO erişim', 'Sıvı', 'Kan ürünü']],
    ['H (Hipotermi):', ['Battaniye', 'Isıtıcı']],
  ]
  for (const [phase, opts] of marchLines) {
    setPdfFont(doc, 'bold')
    doc.setFontSize(PDF_FONT_SIZE.small)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text(phase, margin, y)
    y = drawCheckboxRow(doc, margin + 2, y + 4, opts, right)
  }
  y += 2

  y = drawSectionTitle(doc, margin, pageW, 'Hayati Bulgular', y)
  y = drawLabeledField(doc, margin, y, 'Nabız', 35)
  y = drawLabeledField(doc, margin + 42, y - 6, 'SpO2', 30)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text('Bilinç (AVPU):', margin + 80, y - 5.5)
  y = drawCheckboxRow(doc, margin + 108, y - 1, ['A', 'V', 'P', 'U'], right)
  y += 2

  y = drawSectionTitle(doc, margin, pageW, 'Yapılan İşlemler', y)
  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.tableHeadText)
  doc.setFillColor(...PDF_COLORS.tableHeadBg)
  doc.rect(margin, y, right - margin, 6, 'F')
  doc.text('İşlem', margin + 2, y + 4)
  doc.text('Tarih / Saat', margin + 95, y + 4)
  y += 8
  setPdfFont(doc, 'normal')
  doc.setTextColor(...PDF_COLORS.text)
  for (let i = 0; i < 4; i++) {
    doc.setDrawColor(...PDF_COLORS.tableLine)
    doc.rect(margin, y, right - margin, 8, 'S')
    drawFormFieldLine(doc, margin + 2, y + 5, 88)
    drawFormFieldLine(doc, margin + 95, y + 5, right - margin - 97)
    y += 8
  }
  y += 2

  y = drawSectionTitle(doc, margin, pageW, 'Taşıma Öncesi Notlar', y)
  for (let i = 0; i < 3; i++) {
    drawFormFieldLine(doc, margin, y + 4, right - margin)
    y += 8
  }
  y += 2

  y = drawSectionTitle(doc, margin, pageW, 'Gözlemci İmzası', y)
  drawLabeledField(doc, margin, y, 'İmza', 70)
  drawLabeledField(doc, margin + 78, y, 'Tarih', 40)

  stampPdfFooters(doc, formId)
  doc.save(`AUDAZ-DD1380-Sablon-${formId}.pdf`)
  return formId
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} title
 */
function drawFieldCardFrame(doc, x, y, w, h, title) {
  doc.setDrawColor(...PDF_COLORS.formBorder)
  doc.setLineWidth(0.3)
  doc.rect(x, y, w, h, 'S')
  doc.setFillColor(...PDF_COLORS.headerBg)
  doc.rect(x, y, w, 8, 'F')
  doc.setFillColor(...PDF_COLORS.accent)
  doc.rect(x, y, 1.5, 8, 'F')
  setPdfFont(doc, 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...PDF_COLORS.headerText)
  doc.text(title, x + 3, y + 5.5)
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @returns {number}
 */
function drawCompactMarchBlock(doc, x, y, w) {
  const phases = [
    { key: 'M', label: 'Masif kanama', opts: ['Turnike', 'Bandaj', 'Hemostatik'] },
    { key: 'A', label: 'Hava yolu', opts: ['NPA', 'Çene', 'Cric'] },
    { key: 'R', label: 'Solunum', opts: ['Normal', 'Mühür', 'İğne dek.'] },
    { key: 'C', label: 'Dolaşım', opts: ['IV/IO', 'Sıvı', 'TXA'] },
    { key: 'H', label: 'Hipotermi', opts: ['Battaniye', 'Isıtıcı'] },
  ]
  let cy = y
  for (const phase of phases) {
    setPdfFont(doc, 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text(`${phase.key} · ${phase.label}`, x + 1, cy)
    cy += 3.5
    let ox = x + 1
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    for (const opt of phase.opts) {
      const tw = doc.getTextWidth(opt) + 6
      if (ox + tw > x + w - 1) {
        ox = x + 1
        cy += 4
      }
      drawCheckboxLabel(doc, ox, cy, opt, 2.8)
      ox += tw + 1
    }
    cy += 5
  }
  return cy
}

/** TCCC saha kartı — A4 üzerinde 2 kompakt kart */
export async function generateTcccFieldCardTemplate() {
  const formId = generateReportId('TCCC-CARD')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin

  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  paintPdfPage(doc, pageW, pageH)
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, 'TCCC SAHA KARTI · MARCH PROTOKOLÜ')

  let y = PDF_LAYOUT.headerHeight + 4
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`Form ID: ${formId} · Cep referansı · Kes — katla — taşı`, margin, y)
  y += 10

  const cardW = (pageW - margin * 2 - 6) / 2
  const cardH = 118
  const cardY = y

  for (let i = 0; i < 2; i++) {
    const cx = margin + i * (cardW + 6)
    drawFieldCardFrame(doc, cx, cardY, cardW, cardH, 'TCCC SAHA KARTI · MARCH')
    let innerY = cardY + 11

    innerY = drawCompactMarchBlock(doc, cx + 2, innerY, cardW - 4)

    setPdfFont(doc, 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text('KRİTİK İLAÇ DOZLARI', cx + 2, innerY)
    innerY += 4
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.muted)
    const drugs = [
      'Morfin: ___ mg IV',
      'Ketamin: ___ mg IV/IO',
      'TXA: 1g IV (10 dk)',
    ]
    for (const line of drugs) {
      doc.text(line, cx + 2, innerY)
      innerY += 3.5
    }
    innerY += 1

    setPdfFont(doc, 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text('9-LINE ÖZET', cx + 2, innerY)
    innerY += 4
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.muted)
    const nineLines = ['Koordinat:', 'Frekans:', 'Aciliyet:', 'LZ:']
    for (const nl of nineLines) {
      doc.text(nl, cx + 2, innerY)
      drawFormFieldLine(doc, cx + 18, innerY + 0.3, cardW - 22)
      innerY += 4.5
    }

    setPdfFont(doc, 'normal')
    doc.setFontSize(5)
    doc.setTextColor(...PDF_COLORS.footerText)
    doc.text('Gözlemci: ___________', cx + 2, cardY + cardH - 3)
    doc.text('Saat: __:__', cx + cardW - 22, cardY + cardH - 3)
  }

  stampPdfFooters(doc, formId)
  doc.save(`AUDAZ-TCCC-Saha-Karti-${formId}.pdf`)
  return formId
}

/**
 * @param {'nine_line' | 'casevac_mist'} templateId
 */
export function openTcccFieldPdfTemplate(templateId) {
  const html =
    templateId === 'casevac_mist' ? buildCasevacMistTemplateHtml() : buildNineLineTemplateHtml()
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  win.onload = () => {
    win.print()
  }
}

function buildHtmlHeader(title) {
  const now = new Date().toLocaleString('tr-TR')
  return `<div class="header-bar">
  <div class="header-left">
    <div class="brand">AUDAZ TACTICAL</div>
    <div class="sub">Operasyonel Kayıt Sistemi</div>
  </div>
  <div class="header-right">
    <div class="title">${title}</div>
    <div class="date">${now}</div>
  </div>
</div>`
}

function buildNineLineTemplateHtml() {
  const styles = buildPdfHtmlBaseStyles()
  const header = buildHtmlHeader('NATO 9-LINE MEDEVAC TAHLİYE TALEBİ · BOŞ ŞABLON')
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>9-LINE MEDEVAC ŞABLONU</title>
<style>${styles}</style>
</head>
<body>
${header}
<div class="page">
<p class="line"><strong>HAT 1 · KOORDİNAT (MGRS):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 2 · FREKANS / ÇAĞRI ADI:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 3 · ACİLİYET (A/B/C/D/E):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 4 · ÖZEL EKİPMAN:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 5 · TAŞIMA TİPİ (L/A):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 6 · LZ GÜVENLİK (N/P/E/X):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 7 · İŞARETLEME:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 8 · UYRUK / STATÜ:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 9 · KBRN / ARAZİ:</strong><div class="blank"></div></p>
<div class="footer"><span>AUDAZ TACTICAL · TCCC PDF ŞABLON MERKEZİ</span><span>YAZDIR → PDF OLARAK KAYDET</span></div>
</div>
</body>
</html>`
}

function buildCasevacMistTemplateHtml() {
  const styles = buildPdfHtmlBaseStyles()
  const header = buildHtmlHeader('CASEVAC · MIST PROTOKOLÜ · SICAK BÖLGE TAHLİYE ŞABLONU')
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>CASEVAC MIST ŞABLONU</title>
<style>${styles}</style>
</head>
<body>
${header}
<div class="page">
<p class="line"><strong>TOPLAM YARALI SAYISI:</strong><div class="blank"></div></p>
<p class="line"><strong>M — METRIC / YARALANMA TİPİ:</strong><div class="blank"></div>
<span class="opts">□ Kurşun yarası &nbsp; □ Şarapnel &nbsp; □ Amputasyon &nbsp; □ Yanık</span></p>
<p class="line"><strong>I — INJURY / YARANIN YERİ:</strong><div class="blank"></div>
<span class="opts">□ Baş/Boyun &nbsp; □ Göğüs &nbsp; □ Batın &nbsp; □ Uzuvlar</span></p>
<p class="line"><strong>S — SIGNS / VİTAL:</strong><div class="blank"></div>
<span class="opts">□ Bilinç Açık &nbsp; □ Bilinç Kapalı &nbsp; □ Şok VAR &nbsp; □ Şok YOK</span></p>
<p class="line"><strong>T — TREATMENT / MÜDAHALE:</strong><div class="blank"></div>
<span class="opts">□ Turnike &nbsp; □ Göğüs Mührü &nbsp; □ Hava Yolu &nbsp; □ Morfin</span></p>
<p class="line"><strong>SICAK BÖLGE ÇAĞRI / FREKANS:</strong><div class="blank"></div></p>
<div class="footer"><span>AUDAZ TACTICAL · CASEVAC MIST ŞABLONU · 30 SN İLETİM PENCERESİ</span><span>YAZDIR → PDF</span></div>
</div>
</body>
</html>`
}