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
import { healthPdfT, pdfFilenameSegment } from './pdfReportText'

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
 * @param {number} pageH
 * @param {string} formId
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @returns {number}
 */
function initBlankFormPage(doc, margin, pageW, pageH, formId, logoDataUrl, logoDims, reportTitle) {
  paintPdfPage(doc, pageW, pageH)
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, reportTitle)
  let y = PDF_LAYOUT.headerHeight + 4
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(healthPdfT('common.blankTemplateHint', { id: formId }), margin, y)
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
  const noteText = healthPdfT('common.notePrefix', { note })
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
 * @param {string[]} items
 * @returns {number}
 */
function drawAbbreviationsSection(doc, margin, pageW, right, y, items) {
  doc.setDrawColor(...PDF_COLORS.tableLine)
  doc.setLineWidth(0.2)
  doc.line(margin, y, right, y)
  y += 5
  y = drawSectionTitle(doc, margin, pageW, healthPdfT('common.abbreviationsTitle'), y)
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
 * @param {number} pageW
 * @param {number} right
 * @param {number} y
 * @returns {number}
 */
function draw9LineAbbreviationsSection(doc, margin, pageW, right, y) {
  const items = /** @type {string[]} */ (healthPdfT('nineLine.abbreviations', { returnObjects: true }))
  return drawAbbreviationsSection(doc, margin, pageW, right, y, Array.isArray(items) ? items : [])
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} right
 * @param {number} y
 * @param {string} title
 * @param {string} note
 * @param {(doc: import('jspdf').jsPDF, margin: number, right: number, y: number) => number} renderBody
 * @returns {number}
 */
function drawMistSection(doc, margin, right, y, title, note, renderBody) {
  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text(title, margin, y)
  y += 5
  y = drawHatNote(doc, margin, right, y, note)
  y = renderBody(doc, margin, right, y)
  return y + 1
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
  doc.text(healthPdfT('common.line', { num }), margin, y)
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

/** @param {string} slugKey */
function healthPdfFilename(slugKey, formId) {
  const brand = pdfFilenameSegment(healthPdfT('fileNaming.brand'))
  const slug = pdfFilenameSegment(healthPdfT(`fileNaming.${slugKey}`))
  return `${brand}-${slug}-${formId}.pdf`
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
    healthPdfT('titles.nineLine'),
  )

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('nineLine.sectionTitle'), y)

  for (const num of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const lineKey = `nineLine.lines.${num}`
    /** @type {{ note?: string, renderBody?: (doc: import('jspdf').jsPDF, margin: number, right: number, y: number) => number }} */
    const opts = { note: healthPdfT(`${lineKey}.note`) }
    if (num === 6) {
      opts.renderBody = (d, m, r, cy) => drawCheckboxRow(d, m + 12, cy, ['N', 'P', 'E', 'X'], r)
    }
    if (num === 8) {
      opts.renderBody = (d, m, r, cy) =>
        drawCheckboxRow(
          d,
          m + 12,
          cy,
          [
            healthPdfT('nineLine.lines.8.options.civilian'),
            healthPdfT('nineLine.lines.8.options.military'),
            healthPdfT('nineLine.lines.8.options.epw'),
          ],
          r,
        )
    }
    y = drawHatLine(doc, margin, right, y, num, healthPdfT(`${lineKey}.label`), opts)
  }

  y = draw9LineAbbreviationsSection(doc, margin, pageW, right, y + 2)

  stampPdfFooters(doc, formId)
  doc.save(healthPdfFilename('nineLine', formId))
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
  let y = initBlankFormPage(
    doc,
    margin,
    pageW,
    pageH,
    formId,
    logoDataUrl,
    logoDims,
    healthPdfT('titles.casevacMist'),
  )

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('casevacMist.patientInfo'), y)
  y = drawLabeledField(doc, margin, y, healthPdfT('casevacMist.patientName'), right - margin)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(healthPdfT('casevacMist.time'), margin, y)
  y += 4
  y = drawHatNote(doc, margin, right, y, healthPdfT('casevacMist.timeNote'))
  drawFormFieldLine(doc, margin, y, right - margin)
  y += 7

  doc.text(healthPdfT('casevacMist.coord'), margin, y)
  y += 4
  y = drawHatNote(doc, margin, right, y, healthPdfT('casevacMist.coordNote'))
  drawFormFieldLine(doc, margin, y, right - margin)
  y += 9

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('casevacMist.mistTitle'), y)

  y = drawMistSection(
    doc,
    margin,
    right,
    y,
    healthPdfT('casevacMist.m.title'),
    healthPdfT('casevacMist.m.note'),
    (d, m, r, cy) => {
      let ny = drawCheckboxRow(
        d,
        m + 2,
        cy,
        [
          healthPdfT('casevacMist.m.options.gsw'),
          healthPdfT('casevacMist.m.options.blast'),
          healthPdfT('casevacMist.m.options.fall'),
          healthPdfT('casevacMist.m.options.other'),
        ],
        r,
      )
      drawFormFieldLine(d, m + 72, ny - 4, r - m - 72)
      return ny + 4
    },
  )

  y = drawMistSection(
    doc,
    margin,
    right,
    y,
    healthPdfT('casevacMist.i.title'),
    healthPdfT('casevacMist.i.note'),
    (d, m, r, cy) => {
      drawFormFieldLine(d, m, cy + 2, r - m)
      return cy + 10
    },
  )

  y = drawMistSection(
    doc,
    margin,
    right,
    y,
    healthPdfT('casevacMist.s.title'),
    healthPdfT('casevacMist.s.note'),
    (d, m, r, cy) => {
      let ny = drawLabeledField(d, m, cy, healthPdfT('casevacMist.s.pulse'), 35)
      ny = drawLabeledField(d, m + 42, ny - 6, healthPdfT('casevacMist.s.spo2'), 30)
      ny = drawLabeledField(d, m + 80, ny - 6, healthPdfT('casevacMist.s.consciousness'), r - m - 80)
      return ny + 2
    },
  )

  y = drawMistSection(
    doc,
    margin,
    right,
    y,
    healthPdfT('casevacMist.t.title'),
    healthPdfT('casevacMist.t.note'),
    (d, m, r, cy) =>
      drawCheckboxRow(
        d,
        m + 2,
        cy,
        [
          healthPdfT('casevacMist.t.options.tourniquet'),
          healthPdfT('casevacMist.t.options.airway'),
          healthPdfT('casevacMist.t.options.iv'),
        ],
        r,
      ) + 4,
  )

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('casevacMist.extraNotes'), y)
  for (let i = 0; i < 3; i++) {
    drawFormFieldLine(doc, margin, y + 4, right - margin)
    y += 8
  }

  const mistAbbr = /** @type {string[]} */ (healthPdfT('casevacMist.abbreviations', { returnObjects: true }))
  y = drawAbbreviationsSection(doc, margin, pageW, right, y + 2, Array.isArray(mistAbbr) ? mistAbbr : [])

  stampPdfFooters(doc, formId)
  doc.save(healthPdfFilename('casevacMist', formId))
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
    healthPdfT('titles.dd1380Blank'),
  )

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('dd1380Blank.patientInfo'), y)
  y = drawLabeledField(doc, margin, y, healthPdfT('dd1380Blank.fullName'), 85)
  y = drawLabeledField(doc, margin + 92, y - 6, healthPdfT('dd1380Blank.rank'), right - margin - 92)
  y = drawLabeledField(doc, margin, y, healthPdfT('dd1380Blank.bloodType'), 40)
  y = drawLabeledField(doc, margin + 48, y - 6, healthPdfT('dd1380Blank.dateTime'), right - margin - 48)
  y += 2

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('dd1380Blank.moi'), y)
  y = drawCheckboxRow(
    doc,
    margin,
    y,
    [
      healthPdfT('dd1380Blank.moiOptions.gsw'),
      healthPdfT('dd1380Blank.moiOptions.blast'),
      healthPdfT('dd1380Blank.moiOptions.blunt'),
      healthPdfT('dd1380Blank.moiOptions.burn'),
      healthPdfT('dd1380Blank.moiOptions.other'),
    ],
    right,
  )
  y += 2

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('dd1380Blank.marchAssessment'), y)
  for (const key of ['M', 'A', 'R', 'C', 'H']) {
    const opts = /** @type {string[]} */ (healthPdfT(`dd1380Blank.march.${key}.opts`, { returnObjects: true }))
    setPdfFont(doc, 'bold')
    doc.setFontSize(PDF_FONT_SIZE.small)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text(healthPdfT(`dd1380Blank.march.${key}.label`), margin, y)
    y = drawCheckboxRow(doc, margin + 2, y + 4, Array.isArray(opts) ? opts : [], right)
  }
  y += 2

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('dd1380Blank.vitals'), y)
  y = drawLabeledField(doc, margin, y, healthPdfT('dd1380Blank.pulse'), 35)
  y = drawLabeledField(doc, margin + 42, y - 6, healthPdfT('dd1380Blank.spo2'), 30)
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(healthPdfT('dd1380Blank.avpu'), margin + 80, y - 5.5)
  y = drawCheckboxRow(doc, margin + 108, y - 1, ['A', 'V', 'P', 'U'], right)
  y += 2

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('dd1380Blank.procedures'), y)
  setPdfFont(doc, 'bold')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.tableHeadText)
  doc.setFillColor(...PDF_COLORS.tableHeadBg)
  doc.rect(margin, y, right - margin, 6, 'F')
  doc.text(healthPdfT('dd1380Blank.procedureCol'), margin + 2, y + 4)
  doc.text(healthPdfT('dd1380Blank.dateTimeCol'), margin + 95, y + 4)
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

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('dd1380Blank.preTransport'), y)
  for (let i = 0; i < 3; i++) {
    drawFormFieldLine(doc, margin, y + 4, right - margin)
    y += 8
  }
  y += 2

  y = drawSectionTitle(doc, margin, pageW, healthPdfT('dd1380Blank.observerSig'), y)
  drawLabeledField(doc, margin, y, healthPdfT('dd1380Blank.signature'), 70)
  drawLabeledField(doc, margin + 78, y, healthPdfT('dd1380Blank.date'), 40)

  stampPdfFooters(doc, formId)
  doc.save(healthPdfFilename('dd1380Blank', formId))
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
  let cy = y
  for (const key of ['M', 'A', 'R', 'C', 'H']) {
    const opts = /** @type {string[]} */ (healthPdfT(`tcccFieldCard.march.${key}.opts`, { returnObjects: true }))
    setPdfFont(doc, 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text(`${key} · ${healthPdfT(`tcccFieldCard.march.${key}.label`)}`, x + 1, cy)
    cy += 3.5
    let ox = x + 1
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    for (const opt of Array.isArray(opts) ? opts : []) {
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
  drawPdfHeader(doc, pageW, logoDataUrl, logoDims, healthPdfT('titles.tcccFieldCard'))

  let y = PDF_LAYOUT.headerHeight + 4
  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.small)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(healthPdfT('common.fieldCardHint', { id: formId }), margin, y)
  y += 10

  const cardW = (pageW - margin * 2 - 6) / 2
  const cardH = 118
  const cardY = y

  for (let i = 0; i < 2; i++) {
    const cx = margin + i * (cardW + 6)
    drawFieldCardFrame(doc, cx, cardY, cardW, cardH, healthPdfT('tcccFieldCard.cardTitle'))
    let innerY = cardY + 11

    innerY = drawCompactMarchBlock(doc, cx + 2, innerY, cardW - 4)

    setPdfFont(doc, 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text(healthPdfT('tcccFieldCard.criticalDoses'), cx + 2, innerY)
    innerY += 4
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.muted)
    const drugs = /** @type {string[]} */ (healthPdfT('tcccFieldCard.drugs', { returnObjects: true }))
    for (const line of Array.isArray(drugs) ? drugs : []) {
      doc.text(line, cx + 2, innerY)
      innerY += 3.5
    }
    innerY += 1

    setPdfFont(doc, 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text(healthPdfT('tcccFieldCard.nineLineSummary'), cx + 2, innerY)
    innerY += 4
    setPdfFont(doc, 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...PDF_COLORS.muted)
    const nineLines = [
      healthPdfT('tcccFieldCard.nineLineFields.coord'),
      healthPdfT('tcccFieldCard.nineLineFields.freq'),
      healthPdfT('tcccFieldCard.nineLineFields.urgency'),
      healthPdfT('tcccFieldCard.nineLineFields.lz'),
    ]
    for (const nl of nineLines) {
      doc.text(nl, cx + 2, innerY)
      drawFormFieldLine(doc, cx + 18, innerY + 0.3, cardW - 22)
      innerY += 4.5
    }

    setPdfFont(doc, 'normal')
    doc.setFontSize(5)
    doc.setTextColor(...PDF_COLORS.footerText)
    doc.text(healthPdfT('tcccFieldCard.observer'), cx + 2, cardY + cardH - 3)
    doc.text(healthPdfT('tcccFieldCard.time'), cx + cardW - 22, cardY + cardH - 3)
  }

  stampPdfFooters(doc, formId)
  doc.save(healthPdfFilename('tcccFieldCard', formId))
  return formId
}
