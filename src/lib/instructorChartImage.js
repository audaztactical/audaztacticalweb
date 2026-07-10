/**
 * Canvas chart PNGs for instructor analytics PDF (avoids empty Recharts captures).
 */

/**
 * @param {number} w
 * @param {number} h
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} draw
 */
function canvasToPng(w, h, draw) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, w, h)
  draw(ctx, w, h)
  const png = canvas.toDataURL('image/png')
  return png.startsWith('data:image/png') && png.length > 800 ? png : null
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} title
 * @param {number} w
 */
function drawTitle(ctx, title, w) {
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 18px monospace'
  ctx.fillText(title, 24, 28)
  ctx.strokeStyle = 'rgba(52,211,153,0.25)'
  ctx.beginPath()
  ctx.moveTo(24, 36)
  ctx.lineTo(w - 24, 36)
  ctx.stroke()
}

/**
 * Group performance curve (area-style polyline).
 * @param {{ label: string; value: number; callsign?: string }[]} points
 * @param {string} [title]
 */
export function buildGroupPerformanceCurvePng(points, title = 'GROUP PERFORMANCE CURVE') {
  const series = Array.isArray(points) ? points : []
  return canvasToPng(960, 360, (ctx, w, h) => {
    drawTitle(ctx, title, w)
    const padL = 48
    const padR = 24
    const padT = 56
    const padB = 48
    const plotW = w - padL - padR
    const plotH = h - padT - padB
    ctx.strokeStyle = 'rgba(148,163,184,0.2)'
    ctx.strokeRect(padL, padT, plotW, plotH)
    if (series.length === 0) {
      ctx.fillStyle = '#475569'
      ctx.font = '14px monospace'
      ctx.fillText('NO DATA', padL + plotW / 2 - 40, padT + plotH / 2)
      return
    }
    const n = series.length
    /** @type {{ x: number; y: number }[]} */
    const pts = series.map((s, i) => {
      const x = padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
      const y = padT + plotH - (Math.min(100, Math.max(0, s.value)) / 100) * plotH
      return { x, y }
    })
    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.lineTo(pts[pts.length - 1].x, padT + plotH)
    ctx.lineTo(pts[0].x, padT + plotH)
    ctx.closePath()
    ctx.fillStyle = 'rgba(52,211,153,0.25)'
    ctx.fill()
    ctx.strokeStyle = '#34d399'
    ctx.lineWidth = 3
    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
    for (const p of pts) {
      ctx.fillStyle = '#34d399'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#64748b'
    ctx.font = '10px monospace'
    series.forEach((s, i) => {
      if (i % Math.ceil(n / 8) !== 0 && i !== n - 1) return
      ctx.fillText(String(s.label), pts[i].x - 8, h - 18)
    })
  })
}

/**
 * Horizontal operator success bars.
 * @param {{ fullName: string; overall: number; drills: number }[]} rows
 * @param {string} [title]
 */
export function buildOperatorSuccessComparisonPng(rows, title = 'OPERATOR SUCCESS COMPARISON') {
  const items = (rows ?? []).slice(0, 12)
  const rowH = 28
  const h = Math.max(280, 60 + items.length * rowH + 24)
  return canvasToPng(960, h, (ctx, w, canvasH) => {
    drawTitle(ctx, title, w)
    const padL = 140
    const padR = 48
    const padT = 52
    const barMax = w - padL - padR
    if (items.length === 0) {
      ctx.fillStyle = '#475569'
      ctx.font = '14px monospace'
      ctx.fillText('NO DATA', 40, canvasH / 2)
      return
    }
    items.forEach((item, i) => {
      const y = padT + i * rowH
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 12px monospace'
      ctx.fillText(String(item.fullName).slice(0, 14), 24, y + 16)
      const bw = Math.max(4, (Math.min(100, item.overall) / 100) * barMax)
      ctx.fillStyle = '#34d399'
      ctx.fillRect(padL, y + 4, bw, 16)
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '11px monospace'
      ctx.fillText(`${Math.round(item.overall)}%`, padL + bw + 8, y + 16)
    })
  })
}

/**
 * @param {string} pngDataUrl
 * @param {number} [minColored]
 */
export function instructorChartPngHasContent(pngDataUrl, minColored = 200) {
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
        if (data[i] > 40 || data[i + 1] > 40 || data[i + 2] > 40) {
          colored += 1
          if (colored >= minColored) break
        }
      }
      resolve(colored >= minColored)
    }
    img.onerror = () => resolve(false)
    img.src = pngDataUrl
  })
}
