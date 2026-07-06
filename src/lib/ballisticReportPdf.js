import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getBallisticTerm, TABLE_COLUMN_TERM_KEYS } from '../data/ballisticTerms.js'
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

const CHART_EXPORT_MIN_WIDTH = 120
const CHART_EXPORT_MIN_HEIGHT = 80

/**
 * @typedef {{ step: string, ok: boolean, detail?: string }} ChartCaptureDebug
 */

/**
 * PNG içinde gerçekten renkli çizgi pikseli var mı (eksens-only Recharts yakalamasını reddeder).
 * @param {string} pngDataUrl
 * @param {number} [minColoredPixels]
 * @returns {Promise<boolean>}
 */
export function chartPngHasLineContent(pngDataUrl, minColoredPixels = 350) {
  if (typeof document === 'undefined' || !pngDataUrl?.startsWith('data:image/png')) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(false)
        return
      }
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let colored = 0
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        if (r < 28 && g < 28 && b < 28) continue
        if (g > 130 && r < 130) colored += 1
        else if (r > 170 && g > 110 && b < 110) colored += 1
        else if (r > 210 && g > 60 && b < 90) colored += 1
        if (colored >= minColoredPixels) break
      }
      resolve(colored >= minColoredPixels)
    }
    img.onerror = () => resolve(false)
    img.src = pngDataUrl
  })
}

/**
 * PDF için güvenilir grafik PNG'si — önce veri tabanlı canvas, DOM yalnızca doğrulanırsa.
 * @param {import('./ballisticsEngine.js').BallisticsPointResult[]} results
 * @param {HTMLElement | null | undefined} [domContainer]
 * @returns {Promise<{ chartImageDataUrl: string | null, chartSource: string, debug: ChartCaptureDebug[] }>}
 */
export async function resolveChartImageForPdf(results, domContainer) {
  const debug = /** @type {ChartCaptureDebug[]} */ ([])

  const dataPng = buildBallisticChartPngFromResults(results)
  if (dataPng && (await chartPngHasLineContent(dataPng))) {
    debug.push({ step: 'canvas-data', ok: true, detail: 'Veri tabanlı grafik doğrulandı' })
    return { chartImageDataUrl: dataPng, chartSource: 'canvas-data', debug }
  }

  if (domContainer) {
    const domPng = await chartContainerToPngDataUrl(domContainer, { debug })
    if (domPng && (await chartPngHasLineContent(domPng))) {
      debug.push({ step: 'dom', ok: true, detail: 'DOM grafik doğrulandı' })
      return { chartImageDataUrl: domPng, chartSource: 'dom', debug }
    }
    debug.push({
      step: 'dom-reject',
      ok: false,
      detail: 'DOM PNG eksen-only (gradyan stroke rasterize edilmedi)',
    })
  }

  if (dataPng) {
    debug.push({ step: 'canvas-data-fallback', ok: true, detail: 'Doğrulama atlandı, veri PNG kullanıldı' })
    return { chartImageDataUrl: dataPng, chartSource: 'canvas-data', debug }
  }

  return { chartImageDataUrl: null, chartSource: 'none', debug }
}

/**
 * DOM yakalama — Recharts SVG (gradyan stroke PDF'te genelde boş kalır; yedek amaçlı).
 * @param {HTMLElement | null | undefined} container
 * @param {{ debug?: ChartCaptureDebug[] }} [options]
 * @returns {Promise<string | null>}
 */
export async function chartContainerToPngDataUrl(container, options = {}) {
  const debug = options.debug ?? []

  if (!container) {
    debug.push({ step: 'container', ok: false, detail: 'Element bulunamadı' })
    return null
  }

  const rect = container.getBoundingClientRect()
  if (rect.width < CHART_EXPORT_MIN_WIDTH || rect.height < CHART_EXPORT_MIN_HEIGHT) {
    debug.push({
      step: 'dimensions',
      ok: false,
      detail: `Boyut yetersiz: ${Math.round(rect.width)}x${Math.round(rect.height)}`,
    })
    return null
  }

  const svg =
    container.querySelector('svg.recharts-surface') ??
    container.querySelector('.recharts-wrapper svg') ??
    container.querySelector('svg')
  if (!svg) {
    debug.push({ step: 'svg', ok: false, detail: 'SVG bulunamadı' })
    return null
  }

  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const clone = /** @type {SVGSVGElement} */ (svg.cloneNode(true))
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  const svgString = new XMLSerializer().serializeToString(clone)
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('SVG image decode failed'))
      image.src = dataUrl
    })

    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      debug.push({ step: 'canvas', ok: false, detail: '2D context alınamadı' })
      return null
    }

    ctx.scale(scale, scale)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const png = canvas.toDataURL('image/png')
    const ok = png.startsWith('data:image/png') && png.length > 1200
    debug.push({
      step: 'png',
      ok,
      detail: ok ? `PNG ${Math.round(png.length / 1024)}KB` : `PNG geçersiz (${png.length} byte)`,
    })
    return ok ? png : null
  } catch (err) {
    debug.push({
      step: 'render',
      ok: false,
      detail: err instanceof Error ? err.message : 'Bilinmeyen hata',
    })
    return null
  }
}

/**
 * DOM yakalama başarısız olursa motor sonuçlarından canvas grafik üretir.
 * @param {import('./ballisticsEngine.js').BallisticsPointResult[]} results
 * @param {number} [width]
 * @param {number} [height]
 * @returns {string | null}
 */
export function buildBallisticChartPngFromResults(results, width = 960, height = 320) {
  if (typeof document === 'undefined' || !results?.length) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const pad = { l: 52, r: 52, t: 28, b: 40 }
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b

  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, width, height)

  const maxDist = Math.max(...results.map((r) => r.distance), 1)
  const maxDrop = Math.max(...results.map((r) => Math.abs(r.dropCm)), 1)
  const maxVel = Math.max(...results.map((r) => r.velocityRemaining))
  const minVel = Math.min(...results.map((r) => r.velocityRemaining))
  const velSpan = Math.max(1, maxVel - minVel)

  const xAt = (d) => pad.l + (d / maxDist) * plotW
  const yDrop = (drop) => pad.t + (Math.abs(drop) / maxDrop) * plotH
  const yVel = (v) => pad.t + plotH - ((v - minVel) / velSpan) * plotH

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i += 1) {
    const gy = pad.t + (plotH / 4) * i
    ctx.beginPath()
    ctx.moveTo(pad.l, gy)
    ctx.lineTo(pad.l + plotW, gy)
    ctx.stroke()
  }

  const dropGradient = ctx.createLinearGradient(pad.l, 0, pad.l + plotW, 0)
  dropGradient.addColorStop(0, '#22c55e')
  dropGradient.addColorStop(0.5, '#eab308')
  dropGradient.addColorStop(1, '#ef4444')

  ctx.strokeStyle = dropGradient
  ctx.lineWidth = 2.5
  ctx.beginPath()
  results.forEach((r, i) => {
    const x = xAt(r.distance)
    const y = yDrop(r.dropCm)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  ctx.strokeStyle = '#fbbf24'
  ctx.lineWidth = 2
  ctx.beginPath()
  results.forEach((r, i) => {
    const x = xAt(r.distance)
    const y = yVel(r.velocityRemaining)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  ctx.fillStyle = 'rgba(148,163,184,0.85)'
  ctx.font = '10px monospace'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i += 1) {
    const frac = i / 4
    const dropVal = Math.round(maxDrop * frac)
    const y = pad.t + plotH - frac * plotH
    ctx.fillText(String(dropVal), pad.l - 6, y + 3)
  }

  ctx.textAlign = 'left'
  for (let i = 0; i <= 4; i += 1) {
    const frac = i / 4
    const velVal = Math.round(minVel + velSpan * (1 - frac))
    const y = pad.t + frac * plotH
    ctx.fillText(String(velVal), pad.l + plotW + 8, y + 3)
  }

  ctx.textAlign = 'center'
  const tickDistances = [results[0].distance, results[Math.floor(results.length / 2)].distance, results[results.length - 1].distance]
  tickDistances.forEach((d) => {
    const x = xAt(d)
    ctx.fillText(`${d}m`, x, height - 22)
  })

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(34,197,94,0.9)'
  ctx.fillText('Drop (cm)', pad.l, height - 8)
  ctx.fillStyle = 'rgba(251,191,36,0.9)'
  ctx.fillText('Velocity (fps)', pad.l + plotW - 110, height - 8)

  ctx.strokeStyle = 'rgba(148,163,184,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.l, pad.t)
  ctx.lineTo(pad.l, pad.t + plotH)
  ctx.lineTo(pad.l + plotW, pad.t + plotH)
  ctx.stroke()

  const png = canvas.toDataURL('image/png')
  return png.startsWith('data:image/png') && png.length > 800 ? png : null
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @param {number} y
 * @param {number} [needed]
 * @returns {number}
 */
function ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, needed = 20) {
  if (y + needed <= pageH - PDF_LAYOUT.margin) return y
  doc.addPage()
  return setupReportContinuationPage(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, 'Devam')
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} margin
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} logoDataUrl
 * @param {{ widthMm: number, heightMm: number }} logoDims
 * @param {string} reportTitle
 * @param {number} startY
 * @param {string[]} layoutLog
 */
function drawTermGlossarySection(
  doc,
  margin,
  pageW,
  pageH,
  logoDataUrl,
  logoDims,
  reportTitle,
  startY,
  layoutLog,
) {
  let y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, startY, 24)
  layoutLog.push(`Sayfa ${doc.getNumberOfPages()}: TERİM AÇIKLAMALARI (y=${y.toFixed(1)})`)
  y = drawSectionTitle(doc, margin, pageW, 'TERİM AÇIKLAMALARI', y)

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  const contentW = pageW - margin * 2

  for (const termKey of TABLE_COLUMN_TERM_KEYS) {
    const term = getBallisticTerm(termKey)
    if (!term) continue

    y = ensureSpace(doc, pageW, pageH, logoDataUrl, logoDims, reportTitle, y, 28)

    setPdfFont(doc, 'bold')
    doc.setFontSize(PDF_FONT_SIZE.body)
    doc.setTextColor(...PDF_COLORS.text)
    doc.text(`${term.termTr} (${term.termEn})`, margin, y)
    y += 5

    setPdfFont(doc, 'normal')
    doc.setFontSize(PDF_FONT_SIZE.small)
    doc.setTextColor(...PDF_COLORS.text)

    const definitionLines = doc.splitTextToSize(term.definition, contentW)
    doc.text(definitionLines, margin, y)
    y += definitionLines.length * 4.2 + 2

    if (term.actionAdvice) {
      setPdfFont(doc, 'bold')
      doc.setTextColor(...PDF_COLORS.muted)
      doc.text('Ne yapmalı?', margin, y)
      y += 4
      setPdfFont(doc, 'normal')
      doc.setTextColor(...PDF_COLORS.text)
      const adviceLines = doc.splitTextToSize(term.actionAdvice, contentW)
      doc.text(adviceLines, margin, y)
      y += adviceLines.length * 4.2 + 4
    } else {
      y += 3
    }
  }

  return y
}

/**
 * @param {import('./ballisticsEngine.js').BallisticsEngineOutput} output
 * @param {{ profileName?: string, chartImageDataUrl?: string | null, saveTo?: string }} meta
 * @returns {Promise<{ pageCount: number, layoutLog: string[], chartSource: string }>}
 */
export async function exportBallisticReportPdf(output, meta = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const { logoDataUrl, logoDims } = await preparePdfAssets(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = PDF_LAYOUT.margin
  const layoutLog = []

  const title = meta.profileName
    ? `BALİSTİK TRAJEKTORİ · ${meta.profileName}`
    : 'BALİSTİK TRAJEKTORİ RAPORU'

  const { reportId, contentStartY } = setupReportFirstPage(
    doc,
    pageW,
    pageH,
    logoDataUrl,
    logoDims,
    title,
    null,
  )

  layoutLog.push('Sayfa 1: Kapak + özet + menzil tablosu başlangıcı')

  setPdfFont(doc, 'normal')
  doc.setFontSize(PDF_FONT_SIZE.body)
  doc.setTextColor(...PDF_COLORS.text)
  let y = contentStartY
  doc.text(`Sıfırlama açısı: ${output.launchAngleDegrees.toFixed(4)}°`, margin, y)
  y += 5
  doc.text(`Hava yoğunluğu oranı: ${output.airDensityRatio.toFixed(4)}`, margin, y)
  y += 5
  doc.text(`Ses hızı: ${output.speedOfSoundMps.toFixed(1)} m/s`, margin, y)
  y += 8

  const tableStart = drawSectionTitle(doc, margin, pageW, 'Menzil tablosu', y)
  autoTable(doc, {
    startY: tableStart,
    head: [['M (m)', 'Drop (cm)', 'Wind (cm)', 'TOF (s)', 'V (fps)', 'E (ft·lb)', 'MOA', 'MRAD', 'Mach']],
    body: output.results.map((r) => [
      String(r.distance),
      Math.abs(r.dropCm).toFixed(1),
      Math.abs(r.windageCm).toFixed(1),
      r.timeOfFlightSeconds.toFixed(3),
      r.velocityRemaining.toFixed(0),
      r.energyRemaining.toFixed(0),
      r.dropMOA.toFixed(2),
      r.dropMRAD.toFixed(2),
      r.machNumber.toFixed(3),
    ]),
    ...getAutoTableOptions(margin),
  })

  layoutLog.push(
    `Sayfa ${doc.getNumberOfPages()}: Menzil tablosu bitti (finalY=${(doc.lastAutoTable?.finalY ?? tableStart).toFixed(1)})`,
  )

  let chartImageDataUrl = meta.chartImageDataUrl ?? buildBallisticChartPngFromResults(output.results)
  let chartSource = chartImageDataUrl ? 'canvas-data' : 'none'
  if (meta.chartImageDataUrl && (await chartPngHasLineContent(meta.chartImageDataUrl))) {
    chartSource = meta.chartSource ?? 'dom'
  } else if (!chartImageDataUrl) {
    chartSource = 'none'
  }

  doc.addPage()
  y = setupReportContinuationPage(doc, pageW, pageH, logoDataUrl, logoDims, title, 'Trajektori grafiği')
  layoutLog.push(`Sayfa ${doc.getNumberOfPages()}: Trajektori grafiği bölümü`)

  y = drawSectionTitle(doc, margin, pageW, 'Trajektori grafiği', y)

  if (chartImageDataUrl) {
    const imgW = pageW - margin * 2
    const imgH = 72
    doc.addImage(chartImageDataUrl, 'PNG', margin, y, imgW, imgH, undefined, 'SLOW')
    y += imgH + 8
    layoutLog.push(`Sayfa ${doc.getNumberOfPages()}: Grafik PNG gömüldü (${chartSource})`)
  } else {
    doc.setFontSize(PDF_FONT_SIZE.small)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text('Grafik görseli üretilemedi.', margin, y + 4)
    y += 10
    layoutLog.push(`Sayfa ${doc.getNumberOfPages()}: Grafik PNG üretilemedi`)
  }

  drawTermGlossarySection(doc, margin, pageW, pageH, logoDataUrl, logoDims, title, y, layoutLog)

  stampPdfFooters(doc, reportId)

  doc.save(meta.saveTo ?? `audaz-balistik-${Date.now()}.pdf`)

  return {
    pageCount: doc.getNumberOfPages(),
    layoutLog,
    chartSource,
  }
}
