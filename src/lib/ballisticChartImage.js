/**
 * Balistik grafik PNG üretimi ve şekil doğrulaması (PDF export + test).
 */

/** @typedef {import('./ballisticsEngine.js').BallisticsPointResult} BallisticsPointResult */

/**
 * @param {BallisticsPointResult[]} results
 * @param {number} [width]
 * @param {number} [height]
 */
export function computeBallisticChartLayout(results, width = 960, height = 320) {
  const pad = { l: 52, r: 52, t: 28, b: 40 }
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b

  const maxDist = Math.max(...results.map((r) => r.distance), 1)
  const maxDrop = Math.max(...results.map((r) => Math.abs(r.dropCm)), 1)
  const maxVel = Math.max(...results.map((r) => r.velocityRemaining))
  const minVel = Math.min(...results.map((r) => r.velocityRemaining))
  const velSpan = Math.max(1, maxVel - minVel)

  /** Recharts: 0 altta, max üstte — drop arttıkça çizgi YUKARI */
  const xAt = (d) => pad.l + (d / maxDist) * plotW
  const yDrop = (drop) => pad.t + plotH - (Math.abs(drop) / maxDrop) * plotH
  /** Recharts sağ eksen: yüksek fps üstte, düşük fps altta */
  const yVel = (v) => pad.t + plotH - ((v - minVel) / velSpan) * plotH

  return {
    width,
    height,
    pad,
    plotW,
    plotH,
    maxDist,
    maxDrop,
    minVel,
    maxVel,
    xAt,
    yDrop,
    yVel,
  }
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} x
 * @param {number} y
 */
function pixelAt(data, width, x, y) {
  const xi = Math.max(0, Math.min(width - 1, Math.round(x)))
  const yi = Math.max(0, Math.round(y))
  const i = (yi * width + xi) * 4
  return { r: data[i], g: data[i + 1], b: data[i + 2] }
}

/**
 * @param {{ r: number, g: number, b: number }} px
 * @param {'drop' | 'velocity'} kind
 */
function isLinePixel(px, kind) {
  if (px.r < 28 && px.g < 28 && px.b < 28) return false
  if (kind === 'drop') {
    if (px.g > 100 && px.r < 180) return true
    if (px.r > 160 && px.g > 70 && px.b < 110) return true
    if (px.r > 200 && px.g < 110 && px.b < 110) return true
    return false
  }
  return px.r > 170 && px.g > 110 && px.b < 110
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {'drop' | 'velocity'} kind
 * @param {number} [hintY]
 */
function findLineYNearX(data, width, height, x, kind, hintY = null) {
  const yMin = hintY != null ? Math.max(0, Math.round(hintY) - 18) : 0
  const yMax = hintY != null ? Math.min(height - 1, Math.round(hintY) + 18) : height - 1
  let bestY = null
  let bestScore = 0
  for (let y = yMin; y <= yMax; y += 1) {
    let hits = 0
    for (let dx = -3; dx <= 3; dx += 1) {
      const px = pixelAt(data, width, x + dx, y)
      if (isLinePixel(px, kind)) hits += 1
    }
    if (hits > bestScore) {
      bestScore = hits
      bestY = y
    }
  }
  return bestY
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} x
 * @param {number} y
 * @param {'drop' | 'velocity'} kind
 * @param {number} radius
 */
function hasLineColorNear(data, width, x, y, kind, radius = 10) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy > radius * radius) continue
      if (isLinePixel(pixelAt(data, width, x + dx, y + dy), kind)) return true
    }
  }
  return false
}

/**
 * @param {string} pngDataUrl
 * @returns {Promise<{ data: Uint8ClampedArray, width: number, height: number } | null>}
 */
export function loadPngImageData(pngDataUrl) {
  if (typeof document === 'undefined' || !pngDataUrl?.startsWith('data:image/png')) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      resolve({ data: imageData.data, width: canvas.width, height: canvas.height })
    }
    img.onerror = () => resolve(null)
    img.src = pngDataUrl
  })
}

/**
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} loaded
 * @param {BallisticsPointResult[]} results
 * @param {number} [layoutWidth]
 * @param {number} [layoutHeight]
 * @param {{ mode?: 'strict' | 'dom' }} [options]
 */
export function chartPngValidateShapeFromImageData(
  loaded,
  results,
  layoutWidth = 960,
  layoutHeight = 320,
  options = {},
) {
  const mode = options.mode ?? 'strict'
  const layout = computeBallisticChartLayout(results, layoutWidth, layoutHeight)
  const scaleX = loaded.width / layout.width
  const scaleY = loaded.height / layout.height
  const sorted = [...results].sort((a, b) => a.distance - b.distance)
  const issues = []
  const checkpoints = []

  const xAtScaled = (d) => layout.xAt(d) * scaleX

  if (mode === 'strict') {
    for (const targetD of [100, 800, 1500]) {
      const row = sorted.reduce((best, r) =>
        Math.abs(r.distance - targetD) < Math.abs(best.distance - targetD) ? r : best,
      )
      const expectedDrop = {
        x: layout.xAt(row.distance) * scaleX,
        y: layout.yDrop(row.dropCm) * scaleY,
      }
      const expectedVel = {
        x: layout.xAt(row.distance) * scaleX,
        y: layout.yVel(row.velocityRemaining) * scaleY,
      }
      const dropHit = hasLineColorNear(
        loaded.data,
        loaded.width,
        expectedDrop.x,
        expectedDrop.y,
        'drop',
        12,
      )
      const velHit = hasLineColorNear(
        loaded.data,
        loaded.width,
        expectedVel.x,
        expectedVel.y,
        'velocity',
        12,
      )
      checkpoints.push({
        distance: row.distance,
        dropCm: Math.abs(row.dropCm),
        velocity: row.velocityRemaining,
        expectedDrop,
        expectedVel,
        dropHit,
        velHit,
      })
      if (!dropHit) {
        issues.push(`Drop rengi ${row.distance}m beklenen konumda yok`)
      }
      if (!velHit) {
        issues.push(`Velocity rengi ${row.distance}m beklenen konumda yok`)
      }
    }
  }

  const dropYs = sorted.map((r) =>
    findLineYNearX(
      loaded.data,
      loaded.width,
      loaded.height,
      xAtScaled(r.distance),
      'drop',
      layout.yDrop(r.dropCm) * scaleY,
    ),
  )
  const velYs = sorted.map((r) =>
    findLineYNearX(
      loaded.data,
      loaded.width,
      loaded.height,
      xAtScaled(r.distance),
      'velocity',
      layout.yVel(r.velocityRemaining) * scaleY,
    ),
  )

  for (let i = 1; i < dropYs.length; i += 1) {
    if (dropYs[i] == null || dropYs[i - 1] == null) continue
    if (dropYs[i] > dropYs[i - 1] + 3) {
      issues.push(`Drop eğrisi monotonik değil (index ${i - 1}→${i})`)
      break
    }
  }

  for (let i = 1; i < velYs.length; i += 1) {
    if (velYs[i] == null || velYs[i - 1] == null) continue
    if (velYs[i] < velYs[i - 1] - 3) {
      issues.push(`Velocity eğrisi monotonik değil (index ${i - 1}→${i})`)
      break
    }
  }

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const dropY0 = dropYs[0] ?? layout.yDrop(first.dropCm) * scaleY
  const velY0 = velYs[0] ?? layout.yVel(first.velocityRemaining) * scaleY
  const dropY1 = dropYs[dropYs.length - 1] ?? layout.yDrop(last.dropCm) * scaleY
  const velY1 = velYs[velYs.length - 1] ?? layout.yVel(last.velocityRemaining) * scaleY

  if (dropY0 <= velY0 + 8) {
    issues.push('100m: drop çizgisi velocity çizgisinin ALTINDA olmalı (yüksek y)')
  }
  if (dropY1 >= velY1 - 8) {
    issues.push('1500m: drop çizgisi velocity çizgisinin ÜSTÜNDE olmalı (düşük y)')
  }

  return { ok: issues.length === 0, issues, checkpoints, dropYs, velYs, mode }
}

/**
 * Koordinat + monotonik şekil doğrulaması.
 * @param {string} pngDataUrl
 * @param {BallisticsPointResult[]} results
 * @param {number} [layoutWidth]
 * @param {number} [layoutHeight]
 * @param {{ mode?: 'strict' | 'dom' }} [options]
 */
export async function chartPngValidateShape(
  pngDataUrl,
  results,
  layoutWidth = 960,
  layoutHeight = 320,
  options = {},
) {
  const loaded = await loadPngImageData(pngDataUrl)
  if (!loaded) {
    return { ok: false, issues: ['PNG okunamadı'], checkpoints: [] }
  }
  return chartPngValidateShapeFromImageData(loaded, results, layoutWidth, layoutHeight, options)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {BallisticsPointResult[]} results
 * @param {ReturnType<typeof computeBallisticChartLayout>} layout
 */
function drawBallisticChartOnContext(ctx, results, layout) {
  const { width, height, pad, plotW, plotH, maxDrop, minVel, maxVel, velSpan, xAt, yDrop, yVel } =
    layout

  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, width, height)

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
    const dropVal = Math.round(maxDrop * (1 - frac))
    const y = pad.t + frac * plotH
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
  const tickDistances = [
    results[0].distance,
    results[Math.floor(results.length / 2)].distance,
    results[results.length - 1].distance,
  ]
  tickDistances.forEach((d) => {
    ctx.fillText(`${d}m`, xAt(d), height - 22)
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
}

/**
 * @param {BallisticsPointResult[]} results
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

  const layout = computeBallisticChartLayout(results, width, height)
  drawBallisticChartOnContext(ctx, results, layout)

  const png = canvas.toDataURL('image/png')
  return png.startsWith('data:image/png') && png.length > 800 ? png : null
}

/**
 * Node test scriptleri için canvas bağımsız çizim.
 * @param {import('canvas').CanvasRenderingContext2D} ctx
 * @param {BallisticsPointResult[]} results
 * @param {number} [width]
 * @param {number} [height]
 */
export function drawBallisticChartNode(ctx, results, width = 960, height = 320) {
  const layout = computeBallisticChartLayout(results, width, height)
  drawBallisticChartOnContext(ctx, results, layout)
}
