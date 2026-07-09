/**
 * Canvas-drawn Progress HUD chart PNGs for PDF export (avoids empty Recharts captures).
 */

/**
 * @param {number} w
 * @param {number} h
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} draw
 * @returns {string | null}
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
 * Tactical Character Matrix — reaction (x) vs accuracy (y) scatter.
 * @param {{ points: { reaction: number; accuracy: number; tag: string }[]; maxReaction: number }} matrix
 * @param {string} [title]
 */
export function buildCharacterMatrixChartPng(matrix, title = 'TACTICAL CHARACTER MATRIX') {
  const points = matrix?.points ?? []
  const maxR = Math.max(0.5, matrix?.maxReaction ?? 3)
  return canvasToPng(960, 420, (ctx, w, h) => {
    drawTitle(ctx, title, w)
    const padL = 56
    const padR = 24
    const padT = 52
    const padB = 44
    const plotW = w - padL - padR
    const plotH = h - padT - padB

    ctx.strokeStyle = 'rgba(148,163,184,0.2)'
    ctx.strokeRect(padL, padT, plotW, plotH)
    for (let i = 1; i < 4; i++) {
      const y = padT + (plotH * i) / 4
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(padL + plotW, y)
      ctx.stroke()
    }

    ctx.fillStyle = '#64748b'
    ctx.font = '12px monospace'
    ctx.fillText('0%', padL - 36, padT + plotH)
    ctx.fillText('100%', padL - 44, padT + 12)
    ctx.fillText('0s', padL, h - 16)
    ctx.fillText(`${maxR.toFixed(1)}s`, padL + plotW - 40, h - 16)

    const tagColor = {
      ATIS: '#38bdf8',
      CQB: '#f59e0b',
      TCCC: '#fb7185',
      FOF: '#a78bfa',
      VBSS: '#60a5fa',
      OTHER: '#94a3b8',
    }

    if (points.length === 0) {
      ctx.fillStyle = '#475569'
      ctx.font = '14px monospace'
      ctx.fillText('NO DATA POINTS', padL + plotW / 2 - 60, padT + plotH / 2)
      return
    }

    for (const p of points) {
      const x = padL + (Math.min(maxR, Math.max(0, p.reaction)) / maxR) * plotW
      const y = padT + plotH - (Math.min(100, Math.max(0, p.accuracy)) / 100) * plotH
      ctx.fillStyle = tagColor[/** @type {keyof typeof tagColor} */ (p.tag)] ?? tagColor.OTHER
      ctx.beginPath()
      ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.stroke()
    }
  })
}

/**
 * Chronic Error Radar — horizontal frequency bars.
 * @param {{ items: { code: string; label: string; count: number }[]; maxCount: number }} radar
 * @param {string} [title]
 */
export function buildChronicErrorRadarChartPng(radar, title = 'CHRONIC ERROR RADAR') {
  const items = (radar?.items ?? []).slice(0, 10)
  const maxCount = Math.max(1, radar?.maxCount ?? 1)
  const rowH = 34
  const h = Math.max(280, 60 + items.length * rowH + 24)
  return canvasToPng(960, h, (ctx, w, canvasH) => {
    drawTitle(ctx, title, w)
    const padL = 200
    const padR = 48
    const padT = 52
    const barMax = w - padL - padR

    if (items.length === 0) {
      ctx.fillStyle = '#475569'
      ctx.font = '14px monospace'
      ctx.fillText('NO ERROR CODES', 40, canvasH / 2)
      return
    }

    items.forEach((item, i) => {
      const y = padT + i * rowH
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 13px monospace'
      const label = String(item.code || item.label || 'ERR').slice(0, 22)
      ctx.fillText(label, 24, y + 18)
      const bw = Math.max(4, (item.count / maxCount) * barMax)
      const grad = ctx.createLinearGradient(padL, 0, padL + bw, 0)
      grad.addColorStop(0, '#f43f5e')
      grad.addColorStop(1, '#fb7185')
      ctx.fillStyle = grad
      ctx.fillRect(padL, y + 4, bw, 20)
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '12px monospace'
      ctx.fillText(String(item.count), padL + bw + 8, y + 18)
    })
  })
}

/**
 * Stress-Performance Wave — polyline of session values.
 * @param {{ activeSessions: { value: number; label?: string }[]; dayLabel?: string }} wave
 * @param {string} [title]
 */
export function buildStressPerformanceWaveChartPng(wave, title = 'STRESS-PERFORMANCE WAVE') {
  const sessions = wave?.activeSessions ?? []
  return canvasToPng(960, 360, (ctx, w, h) => {
    drawTitle(ctx, title, w)
    const padL = 48
    const padR = 24
    const padT = 56
    const padB = 40
    const plotW = w - padL - padR
    const plotH = h - padT - padB

    ctx.strokeStyle = 'rgba(148,163,184,0.2)'
    ctx.strokeRect(padL, padT, plotW, plotH)
    for (let i = 1; i < 4; i++) {
      const y = padT + (plotH * i) / 4
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(padL + plotW, y)
      ctx.stroke()
    }

    ctx.fillStyle = '#64748b'
    ctx.font = '12px monospace'
    ctx.fillText('100%', padL - 40, padT + 12)
    ctx.fillText('0%', padL - 28, padT + plotH)

    if (sessions.length === 0) {
      ctx.fillStyle = '#475569'
      ctx.fillText('NO WAVE DATA', padL + plotW / 2 - 50, padT + plotH / 2)
      return
    }

    const n = sessions.length
    /** @type {{ x: number; y: number }[]} */
    const pts = sessions.map((s, i) => {
      const x = padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
      const y = padT + plotH - (Math.min(100, Math.max(0, s.value)) / 100) * plotH
      return { x, y }
    })

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

    if (wave?.dayLabel) {
      ctx.fillStyle = '#64748b'
      ctx.font = '11px monospace'
      ctx.fillText(String(wave.dayLabel), padL, h - 14)
    }
  })
}

/**
 * Analytic TCCC Reaction Wave — efficiency bars/line.
 * @param {{ id?: string; efficiency: number; timestamp?: string }[]} points
 * @param {string} [title]
 */
export function buildTcccReactionWaveChartPng(points, title = 'ANALYTIC TCCC REACTION WAVE') {
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
      ctx.fillText('NO TCCC SIM DATA', padL + plotW / 2 - 60, padT + plotH / 2)
      return
    }

    const n = series.length
    const gap = 8
    const barW = Math.max(10, (plotW - gap * (n + 1)) / n)

    series.forEach((pt, i) => {
      const v = Math.min(100, Math.max(0, Number(pt.efficiency) || 0))
      const bh = (v / 100) * plotH
      const x = padL + gap + i * (barW + gap)
      const y = padT + plotH - bh
      const grad = ctx.createLinearGradient(0, y, 0, y + bh)
      grad.addColorStop(0, '#fb7185')
      grad.addColorStop(1, '#be123c')
      ctx.fillStyle = grad
      ctx.fillRect(x, y, barW, Math.max(2, bh))
      ctx.fillStyle = '#64748b'
      ctx.font = '10px monospace'
      const label = String(pt.timestamp || `#${i + 1}`).slice(0, 10)
      ctx.fillText(label, x, h - 18)
    })
  })
}

/**
 * Count non-near-black pixels — proves chart is not blank.
 * @param {string} pngDataUrl
 * @param {number} [minColored]
 */
export function progressChartPngHasContent(pngDataUrl, minColored = 200) {
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
        if (r > 40 || g > 40 || b > 40) {
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
