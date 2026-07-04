import { jsPDF } from 'jspdf'
import { preparePdfAssets, setPdfFont } from './pdfFontLoader'
import {
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

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} right
 * @param {number} y
 * @param {string} note
 * @returns {number}
 */
function drawHatNote(doc, margin, right, y, note) {
  setPdfFont(doc, 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...PDF_COLORS.muted)
  const noteText = `Not: ${note}`
  const lines = doc.splitTextToSize(noteText, right - margin - 12)
  doc.text(lines, margin + 12, y)
  return y + lines.length * 3.1 + 2
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {number} right
 * @param {number} y
 * @returns {number}
 */
function draw9LineAbbreviationsSection(doc, margin, pageW, right, y) {
  doc.setDrawColor(...PDF_COLORS.tableLine)
  doc.setLineWidth(0.2)
  doc.line(margin, y, right, y)
  y += 5
  y = drawSectionTitle(doc, margin, pageW, 'Kısaltmalar ve Protokol Notları', y)
  const items = [
    'MGRS: Military Grid Reference System (Askeri Izgara Referans Sistemi)',
    'MEDEVAC: Medical Evacuation (Tıbbi Tahliye)',
    'EPW: Enemy Prisoner of War (Düşman Savaş Esiri)',
    'Tahliye öncelikleri: A=Acil (<1 saat) · B=Öncelikli (<4 saat) · C=Rutin (<24 saat)',
    'Bu form doldurulduktan sonra telsizle okunur, kopyası taşınan personelde kalır',
  ]
  setPdfFont(doc, 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...PDF_COLORS.muted)
  for (const item of items) {
    const lines = doc.splitTextToSize(`· ${item}`, right - margin)
    doc.text(lines, margin, y)
    y += lines.length * 3.1 + 1
  }
  return y
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} right
 * @param {number} y
 * @param {number} num
 * @param {string} label
 * @param {{ note?: string, renderBody?: (doc: import('jspdf').jsPDF, margin: number, right: number, y: number) => number }} [options]
 * @returns {number}
 */
function drawHatLine(doc, margin, right, y, num, label, options = {}) {
  const { note, renderBody } = options
  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text(`Hat ${num}`, margin, y)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  const labelLines = doc.splitTextToSize(label, right - margin - 14)
  doc.text(labelLines, margin + 12, y)
  y += Math.max(labelLines.length * 4, 4) + 2
  if (note) {
    y = drawHatNote(doc, margin, right, y, note)
  }
  if (renderBody) {
    y = renderBody(doc, margin, right, y)
  } else {
    drawFormFieldLine(doc, margin, y, right - margin)
    y += 7
  }
  return y + 1
}

/** NATO 9-LINE MEDEVAC boş şablon — jsPDF */
export async function generate9LineMedevacTemplate() {
  const formId = generateReportId('9LINE')
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
    '9-LINE TAHLİYE TALEBİ · MEDEVAC',
  )

  y = drawSectionTitle(doc, margin, pageW, '9-Line Tahliye Protokolü', y)

  y = drawHatLine(doc, margin, right, y, 1, 'Koordinatlar (MGRS/GPS)', {
    note: 'Tahliye noktasının tam koordinatını girin. MGRS formatı tercih edilir. Örn: 37S NA 12345 67890',
  })
  y = drawHatLine(doc, margin, right, y, 2, 'Radyo frekansı ve çağrı işareti', {
    note: 'Tahliye aracıyla iletişim kurulacak frekans (MHz) ve çağrı işareti. Örn: 40.50 MHz · BRAVO-1',
  })
  y = drawHatLine(doc, margin, right, y, 3, 'Hasta sayısı ve taşıma önceliği', {
    note: 'A=Acil (hayati tehlike), B=Öncelikli (1 saat içinde), C=Rutin (4 saat içinde). Örn: 2A 1B',
  })
  y = drawHatLine(doc, margin, right, y, 4, 'Gerekli ekipman', {
    note: 'A=Vinç yok, B=Vinç gerekli, C=Paket vinç, D=Dalış ekipmanı, E=Diğer',
  })
  y = drawHatLine(doc, margin, right, y, 5, 'Hasta sayısı (oturur / yatar)', {
    note: 'L=Sedyede yatar, A=Oturabilir. Örn: 1L 2A',
  })
  y = drawHatLine(doc, margin, right, y, 6, 'Güvenlik', {
    note: 'N=Sıcak bölge (düşman ateşi), P=Olası tehdit, E=Soğuk bölge (güvenli), X=Silahlı eskort gerekli',
    renderBody: (d, m, r, cy) => drawCheckboxRow(d, m + 12, cy, ['N', 'P', 'E', 'X'], r),
  })
  y = drawHatLine(doc, margin, right, y, 7, 'Bölge işareti yöntemi', {
    note: 'A=Panel/bayrak, B=Piroteknik, C=Duman, D=El/kol işareti, E=Diğer. Rengi de belirtin.',
  })
  y = drawHatLine(doc, margin, right, y, 8, 'Hasta milliyeti', {
    note: 'Sivil=Sivil kişi, Askeri=Dost kuvvet, EPW=Düşman savaş esiri',
    renderBody: (d, m, r, cy) => drawCheckboxRow(d, m + 12, cy, ['Sivil', 'Askeri', 'EPW'], r),
  })
  y = drawHatLine(doc, margin, right, y, 9, 'Arazi özellikleri / engeller', {
    note: 'İniş alanındaki engeller: ağaç, tel, eğim, irtifa vb. Rüzgar yönünü de ekleyin.',
  })

  y = draw9LineAbbreviationsSection(doc, margin, pageW, right, y + 2)

  stampPdfFooters(doc, formId)
  doc.save(`AUDAZ-9Line-Medevac-${formId}.pdf`)
  return formId
}

/** CASEVAC MIST boş şablon — jsPDF */
export async function generateCasevacMistTemplate() {
  const formId = generateReportId('CASEVAC-MIST')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin
  const right = pageW - margin

  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  let y = initBlankFormPage(doc, margin, pageW, pageH, formId, logoDataUrl, logoDims, 'CASEVAC MIST RAPORU')

  y = drawSectionTitle(doc, margin, pageW, 'Hasta Bilgileri', y)
  y = drawLabeledField(doc, margin, y, 'Hasta adı / callsign', 90)
  y = drawLabeledField(doc, margin + 98, y - 6, 'Zaman', right - margin - 98)
  y = drawLabeledField(doc, margin, y, 'Koordinat (MGRS/GPS)', right - margin)
  y += 2

  y = drawSectionTitle(doc, margin, pageW, 'MIST Protokolü', y)

  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text('M (Mekanizma)', margin, y)
  y += 5
  y = drawCheckboxRow(doc, margin + 2, y, ['Ateşli', 'Patlama', 'Düşme', 'Diğer'], right)
  drawFormFieldLine(doc, margin + 72, y - 4, right - margin - 72)
  y += 4

  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text('I (Yaralanma)', margin, y)
  y += 5
  drawFormFieldLine(doc, margin, y + 2, right - margin)
  y += 10

  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text('S (Semptomlar / Bulgular)', margin, y)
  y += 5
  y = drawLabeledField(doc, margin, y, 'Nabız', 35)
  y = drawLabeledField(doc, margin + 42, y - 6, 'SpO2', 30)
  y = drawLabeledField(doc, margin + 80, y - 6, 'Bilinç', right - margin - 80)
  y += 2

  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text('T (Yapılan Tedavi)', margin, y)
  y += 5
  y = drawCheckboxRow(doc, margin + 2, y, ['Turnike', 'Hava yolu', 'IV'], right)
  y += 4

  y = drawSectionTitle(doc, margin, pageW, 'Ek Notlar', y)
  for (let i = 0; i < 3; i++) {
    drawFormFieldLine(doc, margin, y + 4, right - margin)
    y += 8
  }

  stampPdfFooters(doc, formId)
  doc.save(`AUDAZ-CASEVAC-MIST-${formId}.pdf`)
  return formId
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