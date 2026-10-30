/**
 * Operatör Beyni — Canvas 2D çizim döngüsü (React render dışı).
 * XP/seviye motor çıktısından okunur; burada yeniden hesaplanmaz.
 */

import {
  ADJ,
  ARBOR,
  BY,
  LOBES,
  MAT,
  P_CBL,
  P_HIP,
  P_OUT,
  P_STEM,
  STEM_SIDES,
  TH,
  buildCurlGrid,
  cblVal,
  lobeAt,
  noise,
  rng,
  stemAt,
} from './brainGeometry.js'

/**
 * @typedef {{
 *   canvas: HTMLCanvasElement
 *   getLevels: () => Record<string, number>
 *   getEffectiveXp: () => Record<string, number>
 *   getSel: () => string
 *   getZoom: () => boolean
 *   getPorts: () => Record<string, number[][]>
 *   getPaused: () => boolean
 *   getReduceMotion: () => boolean
 *   getGuidePulseId: () => string|null
 *   getViewRect: () => { x: number; y: number; w: number; h: number }|null
 * }} BrainRendererOpts
 */

/**
 * @param {BrainRendererOpts} opts
 */
export function createBrainRenderer(opts) {
  const cv = opts.canvas
  const ctx = cv.getContext('2d')
  if (!ctx) {
    return {
      start() {},
      stop() {},
      layout() {},
      rebuildWires() {},
      invalidatePorts() {},
      screenToBrain() {
        return null
      },
      destroy() {},
      getMetrics: () => ({ W: 0, H: 0, mobile: false, base: 1 }),
    }
  }

  let W = 0
  let H = 0
  let viewX = 0
  let viewY = 0
  let viewW = 0
  let viewH = 0
  let DPR = 1
  let base = 1
  let mobile = false
  let lightMode = false
  let frozen = false
  let S = 1
  let OX = 0
  let OY = 0
  const cam = { s: 1, cx: 300, cy: 235 }
  const camT = { s: 1, cx: 300, cy: 235 }
  let layoutDone = false
  let raf = 0
  let lastT = 0
  let lastDrawMs = 0
  let running = false
  let portsDirty = true
  let staticDirty = true
  let lastLevelsKey = ''
  let lastLayoutW = 0
  let lastLayoutH = 0
  let bootMs = 0
  /** @type {number[]} */
  const frameSamples = []
  /** @type {HTMLCanvasElement|null} */
  let offscreen = null
  /** @type {Record<string, number[][]>} */
  let portsCache = {}

  const MAX_PIXELS = 1_200_000
  const AB = 8
  const SB = 5

  let G = buildCurlGrid(3.5)
  let NV = G.nx * G.ny
  let LVB = new Float32Array(NV)
  let SELB = new Float32Array(NV)

  /** @type {object[]} */
  let wires = []
  /** @type {object[]} */
  let ambient = []
  /** @type {object[]} */
  let pulses = []
  /** @type {Record<string, number>} */
  const flash = {}

  const NET = new Map()

  function preferLightDevice() {
    if (typeof window === 'undefined') return false
    if (W > 0 && W < 768) return true
    try {
      return window.matchMedia('(pointer: coarse)').matches
    } catch {
      return false
    }
  }

  function contourStep() {
    if (lightMode || preferLightDevice()) return 8.5
    if (mobile) return 5.5
    return 3.5
  }

  function levelsKey() {
    const L = levels()
    return `${LOBES.map((l) => L[l.id] ?? 1).join(',')}|${opts.getSel()}|${opts.getZoom() ? 1 : 0}|${lightMode ? 1 : 0}|${Math.round(viewW)}x${Math.round(viewH)}`
  }

  function markStaticDirty() {
    staticDirty = true
  }

  function levels() {
    return opts.getLevels() || {}
  }
  function lvOf(id) {
    const L = levels()
    return Math.max(1, Math.min(10, L[id] ?? 1))
  }

  function blur(src, R) {
    const { nx, ny } = G
    const tmp = new Float32Array(NV)
    const out = new Float32Array(NV)
    for (let j = 0; j < ny; j++) {
      let acc = 0
      let c = 0
      for (let i = -R; i < nx; i++) {
        if (i + R < nx) {
          acc += src[j * nx + i + R]
          c++
        }
        if (i - R - 1 >= 0) {
          acc -= src[j * nx + i - R - 1]
          c--
        }
        if (i >= 0) tmp[j * nx + i] = acc / c
      }
    }
    for (let i = 0; i < nx; i++) {
      let acc = 0
      let c = 0
      for (let j = -R; j < ny; j++) {
        if (j + R < ny) {
          acc += tmp[(j + R) * nx + i]
          c++
        }
        if (j - R - 1 >= 0) {
          acc -= tmp[(j - R - 1) * nx + i]
          c--
        }
        if (j >= 0) out[j * nx + i] = acc / c
      }
    }
    return out
  }

  function updateBlend() {
    const lvl = LOBES.map((L) => lvOf(L.id))
    const si = LOBES.findIndex((L) => L.id === opts.getSel())
    const v = new Float32Array(NV)
    const s = new Float32Array(NV)
    const m = new Float32Array(NV)
    for (let k = 0; k < NV; k++) {
      const L = G.id[k]
      if (L < 0) continue
      m[k] = 1
      v[k] = lvl[L]
      s[k] = L === si ? 1 : 0
    }
    const bm = blur(blur(m, 7), 4)
    const bv = blur(blur(v, 7), 4)
    const bs = blur(blur(s, 7), 4)
    for (let k = 0; k < NV; k++) {
      const w = bm[k] || 1e-6
      LVB[k] = bv[k] / w
      SELB[k] = bs[k] / w
    }
  }

  function visN(L) {
    return L.neur.slice(0, Math.max(2, Math.round(L.neur.length * lvOf(L.id) / 10)))
  }

  function ek(a, b) {
    const p = a.li + ':' + a.i
    const q = b.li + ':' + b.i
    return p < q ? p + '|' + q : q + '|' + p
  }

  function syncNet() {
    const now = performance.now() / 1000
    const want = new Map()
    LOBES.forEach((L) => {
      const vs = visN(L)
      const l = lvOf(L.id)
      const k = l >= 7 ? 3 : l >= 4 ? 2 : 1
      L.neur.forEach((n) => {
        const on = vs.includes(n)
        if (on && n.born < 0) n.born = now
        if (!on) n.born = -1
      })
      vs.forEach((a) =>
        vs
          .filter((b) => b !== a)
          .map((b) => [b, Math.hypot(a.x - b.x, a.y - b.y)])
          .filter((e) => e[1] < 80)
          .sort((p, q) => p[1] - q[1])
          .slice(0, k)
          .forEach(([b]) => want.set(ek(a, b), [a, b, false])),
      )
    })
    ADJ.forEach(([A, B]) => {
      const m = Math.min(lvOf(A), lvOf(B))
      if (m < 3) return
      const n = Math.floor((m - 1) / 2)
      const pairs = []
      visN(BY[A]).forEach((a) =>
        visN(BY[B]).forEach((b) => pairs.push([a, b, Math.hypot(a.x - b.x, a.y - b.y)])),
      )
      pairs.sort((p, q) => p[2] - q[2])
      const used = new Set()
      let c = 0
      for (const [a, b] of pairs) {
        if (c >= n) break
        if (used.has(a) || used.has(b)) continue
        used.add(a)
        used.add(b)
        want.set(ek(a, b), [a, b, true])
        c++
      }
    })
    want.forEach(([a, b, x], key) => {
      const e = NET.get(key)
      if (e) {
        e.die = 0
        return
      }
      let h = 0
      for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0
      const r = rng(h)
      NET.set(key, {
        a,
        b,
        x,
        born: now + (x ? 0.5 : 0) + r() * 0.6,
        die: 0,
        bend: (r() - 0.5) * (x ? 0.35 : 0.5),
      })
    })
    NET.forEach((e, key) => {
      if (!want.has(key) && !e.die) e.die = now
    })
  }

  const qp = (a, cx, cy, b, t) => {
    const m = 1 - t
    return [m * m * a.x + 2 * m * t * cx + t * t * b.x, m * m * a.y + 2 * m * t * cy + t * t * b.y]
  }

  function drawNet(time, reduce) {
    const now = performance.now() / 1000
    const selId = opts.getSel()
    ctx.lineCap = 'round'
    NET.forEach((e, key) => {
      const g = Math.max(0, Math.min(1, (now - e.born) / (reduce ? 0.01 : 1)))
      if (g <= 0) return
      let fa = 1
      if (e.die) {
        fa = 1 - (now - e.die) / 0.6
        if (fa <= 0) {
          NET.delete(key)
          return
        }
      }
      const { a, b } = e
      const dx = b.x - a.x
      const dy = b.y - a.y
      const cx = (a.x + b.x) / 2 - dy * e.bend
      const cy = (a.y + b.y) / 2 + dx * e.bend
      const sel = a.L.id === selId || b.L.id === selId
      const la = Math.max(lvOf(a.L.id), lvOf(b.L.id))
      const al = (e.x ? 0.6 : 0.3 + la * 0.035) * fa
      ctx.strokeStyle = sel
        ? `rgba(242,194,48,${Math.min(1, al + 0.2)})`
        : e.x
          ? `rgba(150,255,205,${al})`
          : `rgba(255,255,255,${al})`
      ctx.lineWidth = e.x ? 1.05 : 0.7
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      if (g >= 1) ctx.quadraticCurveTo(cx, cy, b.x, b.y)
      else {
        for (let t = 0.05; t < g; t += 0.05) {
          const p = qp(a, cx, cy, b, t)
          ctx.lineTo(p[0], p[1])
        }
        const p = qp(a, cx, cy, b, g)
        ctx.lineTo(p[0], p[1])
      }
      ctx.stroke()
      if (g < 1) {
        const p = qp(a, cx, cy, b, g)
        ctx.fillStyle = 'rgba(255,255,255,.95)'
        ctx.beginPath()
        ctx.arc(p[0], p[1], 1.7, 0, 7)
        ctx.fill()
      } else if (!reduce && !e.die) {
        if (!e.sig && Math.random() < (e.x ? 0.01 : 0.0035) * (1 + la * 0.3)) {
          e.sig = { t: 0, dir: Math.random() < 0.5, sp: 0.014 + Math.random() * 0.012 }
        }
        if (e.sig) {
          e.sig.t += e.sig.sp
          const tt = e.sig.dir ? e.sig.t : 1 - e.sig.t
          const p = qp(a, cx, cy, b, tt)
          ctx.fillStyle = sel ? 'rgba(255,226,140,.95)' : 'rgba(210,255,230,.95)'
          ctx.beginPath()
          ctx.arc(p[0], p[1], 1.5, 0, 7)
          ctx.fill()
          if (e.sig.t >= 1) {
            ;(e.sig.dir ? b : a).fire = now
            e.sig = null
          }
        }
      }
    })
    LOBES.forEach((L) => {
      const sel = L.id === selId
      const f = flash[L.id] || 0
      L.neur.forEach((n) => {
        if (n.born < 0) return
        const g = Math.min(1, (now - n.born) / (reduce ? 0.01 : 0.6))
        const fire = n.fire ? Math.max(0, 1 - (now - n.fire) / 0.5) : 0
        const pul = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(time * 2 + n.ph)
        const R = (1.5 + pul * 0.5 + fire * 1.3 + f * 1.2) * g
        ctx.strokeStyle = sel ? `rgba(242,194,48,${0.55 * g})` : `rgba(255,255,255,${0.4 * g})`
        ctx.lineWidth = 0.55
        ctx.beginPath()
        n.den.forEach(([ang, len]) => {
          const ex = n.x + Math.cos(ang) * len * g
          const ey = n.y + Math.sin(ang) * len * g
          ctx.moveTo(n.x, n.y)
          ctx.lineTo(ex, ey)
          ctx.moveTo(ex, ey)
          ctx.lineTo(ex + Math.cos(ang + 0.6) * len * 0.4 * g, ey + Math.sin(ang + 0.6) * len * 0.4 * g)
        })
        ctx.stroke()
        const h = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R * 3.4)
        h.addColorStop(
          0,
          sel ? `rgba(242,194,48,${0.5 * g + fire * 0.3})` : `rgba(170,255,210,${0.35 * g + fire * 0.45})`,
        )
        h.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = h
        ctx.beginPath()
        ctx.arc(n.x, n.y, R * 3.4, 0, 7)
        ctx.fill()
        ctx.fillStyle = sel ? '#ffe28c' : '#ffffff'
        ctx.beginPath()
        ctx.arc(n.x, n.y, R * 0.65, 0, 7)
        ctx.fill()
      })
    })
  }

  function drawStem(time, reduce) {
    const level = lvOf('stem')
    const sel = opts.getSel() === 'stem'
    const n = 5 + Math.round(level * 1.6)
    const f = flash.stem || 0
    const T = reduce ? 0 : time
    const baseC = sel ? [242, 194, 48] : [225, 245, 235]
    const hi = sel ? [255, 226, 140] : [175, 255, 215]
    ctx.save()
    ctx.clip(P_STEM)
    ctx.lineCap = 'butt'
    ctx.lineJoin = 'round'
    const g = ctx.createLinearGradient(345, 0, 380, 0)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.5, sel ? 'rgba(242,194,48,.10)' : `rgba(150,255,205,${0.04 + level * 0.008})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(330, 305, 70, 120)
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? (i / (n - 1)) * 2 - 1 : 0
      const ph = i * 2.399
      const sp = 0.55 + (i % 3) * 0.12
      const pts = []
      for (let y = 300; y <= 434; y += 2) {
        const [c, hw] = stemAt(y)
        const w = Math.sin(y * 0.075 + ph + T * sp)
        const x = c + hw * (0.62 * u + 0.33 * w)
        pts.push([x, y, Math.cos(y * 0.075 + ph + T * sp)])
      }
      for (let k = 1; k < pts.length; k++) {
        const p = pts[k - 1]
        const q = pts[k]
        const d = (p[2] + q[2]) * 0.5
        const fadeY = q[1] > 392 ? 1 - (q[1] - 392) / 40 : 1
        const a = (0.18 + level * 0.035 + f * 0.25) * (0.45 + 0.55 * (d * 0.5 + 0.5)) * fadeY
        ctx.strokeStyle = `rgba(${baseC[0]},${baseC[1]},${baseC[2]},${Math.min(0.95, a)})`
        ctx.lineWidth = 0.45 + 0.75 * (d * 0.5 + 0.5) + (i % 4 === 0 ? 0.35 : 0)
        ctx.beginPath()
        ctx.moveTo(p[0], p[1])
        ctx.lineTo(q[0], q[1])
        ctx.stroke()
      }
      if (!reduce) {
        const head = 1 - ((time * (0.18 + (i % 5) * 0.04) + i * 0.37) % 1)
        const hi0 = Math.floor(head * (pts.length - 1))
        for (let k = 0; k < 9; k++) {
          const j = hi0 + k
          if (j < 1 || j >= pts.length) continue
          const p = pts[j - 1]
          const q = pts[j]
          const a = (1 - k / 9) * (0.55 + level * 0.04) * (q[2] * 0.25 + 0.75)
          ctx.strokeStyle = `rgba(${hi[0]},${hi[1]},${hi[2]},${Math.min(1, a)})`
          ctx.lineWidth = 1.5 - k * 0.1
          ctx.beginPath()
          ctx.moveTo(p[0], p[1])
          ctx.lineTo(q[0], q[1])
          ctx.stroke()
        }
        const hp = pts[Math.max(0, Math.min(pts.length - 1, hi0))]
        const rg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 4)
        rg.addColorStop(0, `rgba(${hi[0]},${hi[1]},${hi[2]},.8)`)
        rg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.arc(hp[0], hp[1], 4, 0, 7)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  function drawArbor(time, reduce) {
    const level = lvOf('cerebellum')
    const maxD = Math.min(6, 1 + Math.floor(level / 1.6))
    const sel = opts.getSel() === 'cerebellum'
    const f = flash.cerebellum || 0
    ctx.save()
    ctx.clip(P_CBL)
    ctx.lineCap = 'round'
    const col = (a) => (sel ? `rgba(242,194,48,${a})` : `rgba(255,255,255,${a})`)
    for (const s of ARBOR) {
      if (s.d > maxD) continue
      ctx.lineWidth = Math.max(0.45, 3.4 - s.d * 0.5)
      ctx.strokeStyle = col(Math.min(1, 0.55 + level * 0.035 + f * 0.4 - s.d * 0.04))
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2)
      ctx.stroke()
    }
    if (!reduce) {
      ctx.setLineDash([3, 11])
      ctx.lineDashOffset = -time * 22
      ctx.lineWidth = 1.3
      ctx.strokeStyle = sel ? 'rgba(255,226,140,.95)' : 'rgba(180,255,215,.9)'
      ctx.beginPath()
      for (const s of ARBOR) {
        if (s.d > maxD) continue
        ctx.moveTo(s.x, s.y)
        ctx.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
    for (const s of ARBOR) {
      if (s.d !== maxD) continue
      const p = reduce ? 0.6 : 0.5 + 0.5 * Math.sin(time * 3 + s.x2 * 0.3)
      ctx.fillStyle = col(0.35 + p * 0.55)
      ctx.beginPath()
      ctx.arc(s.x2, s.y2, 1.1 + p * 0.9, 0, 7)
      ctx.fill()
    }
    ctx.restore()
  }

  function drawBrain(time, reduce) {
    const { nx, ny, id, val, cs, x0, y0 } = G
    const z = reduce ? 0 : time * 0.12
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i
        const L = id[k]
        if (L < 0) continue
        const X = x0 + i * cs
        const Y = y0 + j * cs
        const m = MAT[L]
        val[k] =
          m === 1
            ? cblVal(X, Y, z)
            : m === 2
              ? 0
              : noise(X * 0.022, Y * 0.026, z) * 0.9 + noise(X * 0.055, Y * 0.055, z * 1.4 + 9) * 0.22
      }
    }
    const thin = []
    const thick = []
    const thinB = []
    for (let b = 0; b < AB * SB; b++) {
      thin.push(new Path2D())
      thick.push(new Path2D())
      thinB.push(new Path2D())
    }
    const cblN = 1 + Math.round(lvOf('cerebellum') / 3)
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i
        const b = a + 1
        const c = a + nx + 1
        const d = a + nx
        const L = id[a]
        if (L < 0 || id[b] < 0 || id[c] < 0 || id[d] < 0) continue
        const m = MAT[L]
        if (m === 2 || MAT[id[b]] !== m || MAT[id[c]] !== m || MAT[id[d]] !== m) continue
        const lb = (LVB[a] + LVB[c]) * 0.5
        const sb = (SELB[a] + SELB[c]) * 0.5
        const n = m === 1 ? cblN : Math.min(TH.length, 2 + Math.round(lb * 1.25))
        const bi =
          Math.min(AB - 1, Math.floor((lb / 10.01) * AB)) * SB + Math.min(SB - 1, Math.round(sb * (SB - 1)))
        const v0 = val[a]
        const v1 = val[b]
        const v2 = val[c]
        const v3 = val[d]
        const X = x0 + i * cs
        const Y = y0 + j * cs
        for (let q = 0; q < n; q++) {
          const th = TH[q]
          const idx = (v0 > th ? 8 : 0) | (v1 > th ? 4 : 0) | (v2 > th ? 2 : 0) | (v3 > th ? 1 : 0)
          if (idx === 0 || idx === 15) continue
          const P = (m === 1 ? thinB : q === 0 ? thick : thin)[bi]
          const E = (e) =>
            e === 0
              ? [X + (cs * (th - v0)) / (v1 - v0), Y]
              : e === 1
                ? [X + cs, Y + (cs * (th - v1)) / (v2 - v1)]
                : e === 2
                  ? [X + (cs * (th - v3)) / (v2 - v3), Y + cs]
                  : [X, Y + (cs * (th - v0)) / (v3 - v0)]
          const seg = (e1, e2) => {
            const p = E(e1)
            const r = E(e2)
            P.moveTo(p[0], p[1])
            P.lineTo(r[0], r[1])
          }
          switch (idx) {
            case 1:
            case 14:
              seg(3, 2)
              break
            case 2:
            case 13:
              seg(2, 1)
              break
            case 3:
            case 12:
              seg(3, 1)
              break
            case 4:
            case 11:
              seg(0, 1)
              break
            case 6:
            case 9:
              seg(0, 2)
              break
            case 7:
            case 8:
              seg(3, 0)
              break
            case 5:
              seg(3, 0)
              seg(2, 1)
              break
            case 10:
              seg(3, 2)
              seg(0, 1)
              break
            default:
              break
          }
        }
      }
    }
    ctx.save()
    ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY)
    ctx.lineCap = 'round'
    const sel = BY[opts.getSel()] || null
    const glow = (clip) => {
      if (!sel) return
      const gr = ctx.createRadialGradient(sel.cen[0], sel.cen[1], 0, sel.cen[0], sel.cen[1], sel.size * 0.85)
      gr.addColorStop(0, 'rgba(242,194,48,.17)')
      gr.addColorStop(0.6, 'rgba(242,194,48,.06)')
      gr.addColorStop(1, 'rgba(242,194,48,0)')
      ctx.save()
      ctx.clip(clip)
      ctx.fillStyle = gr
      ctx.fillRect(0, 0, 620, 460)
      ctx.restore()
    }
    const strokeB = (arr, w) => {
      for (let b = 0; b < AB * SB; b++) {
        const ai = Math.floor(b / SB)
        const t = (b % SB) / (SB - 1)
        const lvl = ((ai + 0.5) / AB) * 10
        // Taban ~%35 daha parlak; seviye oranı korunur
        const al = Math.min(1, (0.09 + lvl * 0.05 + t * 0.18) * 1.35)
        ctx.strokeStyle = `rgba(${Math.round(255 - 13 * t)},${Math.round(255 - 61 * t)},${Math.round(255 - 207 * t)},${al})`
        ctx.lineWidth = w / S
        ctx.stroke(arr[b])
      }
    }
    const edge = (p) => {
      ctx.lineWidth = 2.2 / S
      ctx.strokeStyle = 'rgba(255,255,255,.92)'
      ctx.stroke(p)
    }
    const solid = (p) => {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,.9)'
      ctx.shadowBlur = 16
      ctx.fillStyle = '#040504'
      ctx.fill(p)
      ctx.restore()
    }
    const sf = ctx.createLinearGradient(0, 380, 0, 434)
    sf.addColorStop(0, 'rgba(4,5,4,1)')
    sf.addColorStop(1, 'rgba(4,5,4,0)')
    ctx.fillStyle = sf
    ctx.fill(P_STEM)
    if (sel?.id === 'stem') glow(P_STEM)
    drawStem(time, reduce)
    {
      const sg = ctx.createLinearGradient(0, 330, 0, 434)
      sg.addColorStop(0, 'rgba(255,255,255,.92)')
      sg.addColorStop(0.55, 'rgba(255,255,255,.75)')
      sg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.lineWidth = 2.2 / S
      ctx.strokeStyle = sg
      ctx.stroke(new Path2D(STEM_SIDES))
    }
    solid(P_CBL)
    if (sel?.id === 'cerebellum') glow(P_CBL)
    ctx.save()
    ctx.clip(P_CBL)
    strokeB(thinB, 1)
    ctx.restore()
    drawArbor(time, reduce)
    edge(P_CBL)
    solid(P_OUT)
    if (sel?.kind === 'c') glow(P_OUT)
    strokeB(thin, 1)
    strokeB(thick, 1.9)
    edge(P_OUT)

    // İlk açılış: en zayıf bölge nabız vurgusu
    const guideId = typeof opts.getGuidePulseId === 'function' ? opts.getGuidePulseId() : null
    if (guideId && BY[guideId]) {
      const G = BY[guideId]
      const pulse = reduce ? 0.55 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin((time * Math.PI * 2) / 2.5))
      const gr = ctx.createRadialGradient(G.cen[0], G.cen[1], 0, G.cen[0], G.cen[1], G.size * 0.9)
      const col = G.col || '#f2c230'
      const rgb = col.length === 7
        ? `${parseInt(col.slice(1, 3), 16)},${parseInt(col.slice(3, 5), 16)},${parseInt(col.slice(5, 7), 16)}`
        : '242,194,48'
      gr.addColorStop(0, `rgba(${rgb},${0.22 * pulse})`)
      gr.addColorStop(0.55, `rgba(${rgb},${0.08 * pulse})`)
      gr.addColorStop(1, 'rgba(0,0,0,0)')
      const clip = G.kind === 'b' ? P_CBL : G.kind === 's' ? P_STEM : G.id === 'hippocampus' ? P_HIP : P_OUT
      ctx.save()
      ctx.clip(clip)
      if (G.kind === 'c' && G.id !== 'hippocampus') {
        ctx.clip(G.p2)
      }
      ctx.fillStyle = gr
      ctx.fillRect(0, 0, 620, 460)
      ctx.restore()
    }
    ctx.setLineDash([4 / S, 4 / S])
    ctx.lineWidth = 1 / S
    ctx.strokeStyle = opts.getSel() === 'hippocampus' ? 'rgba(242,194,48,.8)' : 'rgba(255,255,255,.35)'
    ctx.stroke(P_HIP)
    ctx.setLineDash([])
    drawNet(time, reduce)
    ctx.restore()
  }

  function drawSkeleton() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.save()
    ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY)
    ctx.lineWidth = 1.5 / S
    ctx.strokeStyle = 'rgba(255,255,255,.22)'
    ctx.stroke(P_OUT)
    ctx.stroke(P_CBL)
    ctx.stroke(new Path2D(STEM_SIDES))
    ctx.restore()
  }

  function bez(w, time, reduce) {
    const ports = portsCache[w.L.id] || []
    const p = ports[w.pi % Math.max(1, ports.length)]
    if (!p) return null
    const [px, py] = p
    const tx = OX + w.t[0] * S
    const ty = OY + w.t[1] * S
    const cx = OX + 300 * S
    const cy = OY + 200 * S
    const sw = reduce ? 0 : Math.sin(time * w.sp + w.ph) * w.amp
    const sw2 = reduce ? 0 : Math.cos(time * w.sp * 0.8 + w.ph * 1.3) * w.amp
    const dx = tx - px
    const dy = ty - py
    return [
      px,
      py,
      px + dx * 0.35 + (px < cx ? 1 : -1) * 30 + sw * 0.6,
      py + dy * 0.15 + sw2 * 0.5,
      tx - (tx - cx) * 0.25 + sw2,
      ty - (ty - cy) * 0.25 + sw,
      tx,
      ty,
    ]
  }

  function bpt(b, t) {
    const m = 1 - t
    return [
      m * m * m * b[0] + 3 * m * m * t * b[2] + 3 * m * t * t * b[4] + t * t * t * b[6],
      m * m * m * b[1] + 3 * m * m * t * b[3] + 3 * m * t * t * b[5] + t * t * t * b[7],
    ]
  }

  function rebuildWires() {
    wires = []
    const r = rng(5)
    LOBES.forEach((L) => {
      const level = lvOf(L.id)
      const perBase = 2 + Math.floor(level * 0.7)
      const per = lightMode ? Math.max(1, Math.floor(perBase * 0.45)) : perBase
      L.mods.forEach((_m, pi) => {
        for (let k = 0; k < per; k++) {
          wires.push({
            L,
            pi,
            t: L.targets[(pi * 7 + k * 3) % Math.max(1, L.targets.length)] || L.cen,
            ph: r() * 6.28,
            amp: 12 + r() * 26,
            sp: 0.4 + r() * 0.5,
          })
        }
      })
    })
    ambient = []
    const nA = lightMode ? 36 : mobile ? 70 : 260
    for (let i = 0; i < nA; i++) {
      const L = LOBES[Math.floor(r() * 8)]
      const tl = LOBES[Math.floor(r() * 8)]
      ambient.push({
        L,
        pi: Math.floor(r() * Math.max(1, L.mods.length)),
        t: tl.targets[Math.floor(r() * Math.max(1, tl.targets.length))] || tl.cen,
        ph: r() * 6.28,
        amp: 30 + r() * 80,
        sp: 0.15 + r() * 0.35,
      })
    }
  }

  function resolveView() {
    const vr = typeof opts.getViewRect === 'function' ? opts.getViewRect() : null
    if (vr && vr.w > 0 && vr.h > 0) {
      viewX = vr.x
      viewY = vr.y
      viewW = vr.w
      viewH = vr.h
    } else {
      viewX = 0
      viewY = 0
      viewW = W
      viewH = H
    }
  }

  function camTarget() {
    if (opts.getZoom()) {
      const L = BY[opts.getSel()] || BY.motor
      const fit = mobile
        ? Math.min(viewW * 0.72, viewH * 0.7) / L.size
        : Math.min(viewW * 0.3, viewH * 0.42) / L.size
      const maxMul = mobile ? 1.8 : 3.2
      const minMul = mobile ? 1.15 : 1.7
      camT.s = Math.max(base * minMul, Math.min(base * maxMul, fit))
      camT.cx = L.cen[0]
      camT.cy = L.cen[1]
    } else {
      camT.s = base
      camT.cx = 300
      // Masaüstü: HUD üst boşluğu için hafif aşağı; mobil akışta sahne ortası
      camT.cy = mobile ? 236 : 252
    }
  }

  /**
   * @param {{ force?: boolean }} [optsIn]
   */
  function layout(optsIn) {
    const force = !!(optsIn && optsIn.force)
    const parent = cv.parentElement
    if (!parent) return
    const r = parent.getBoundingClientRect()
    const nextW = Math.max(0, r.width)
    const nextH = Math.max(0, r.height)
    if (!force && lastLayoutW > 0) {
      const dw = Math.abs(nextW - lastLayoutW)
      const dh = Math.abs(nextH - lastLayoutH)
      const hRatio = dh / Math.max(lastLayoutH, 1)
      if (dw < 1 && hRatio < 0.15) {
        W = nextW
        H = nextH
        resolveView()
        camTarget()
        return
      }
    }
    W = nextW
    H = nextH
    lastLayoutW = W
    lastLayoutH = H
    resolveView()

    const wasMobile = mobile
    const wasLight = lightMode
    mobile = W < 760
    if (!lightMode && preferLightDevice()) lightMode = true

    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const dprCap = lightMode || mobile ? 1.5 : 2
    let dpr = Math.min(dprCap, rawDpr)
    let pw = Math.max(1, Math.floor(W * dpr))
    let ph = Math.max(1, Math.floor(H * dpr))
    if (pw * ph > MAX_PIXELS) {
      const scale = Math.sqrt(MAX_PIXELS / (pw * ph))
      dpr *= scale
      pw = Math.max(1, Math.floor(W * dpr))
      ph = Math.max(1, Math.floor(H * dpr))
    }
    DPR = dpr
    if (cv.width !== pw || cv.height !== ph) {
      cv.width = pw
      cv.height = ph
      markStaticDirty()
    }

    if (wasMobile !== mobile || wasLight !== lightMode || !layoutDone) {
      G = buildCurlGrid(contourStep())
      NV = G.nx * G.ny
      LVB = new Float32Array(NV)
      SELB = new Float32Array(NV)
      markStaticDirty()
    }
    // Beyin: masaüstü ~%48 / ~%62; mobilde sahne-view alanına sığdır
    const safeW = Math.max(1, viewW)
    const safeH = Math.max(1, viewH)
    base = mobile
      ? Math.min((safeW - 24) / 470, (safeH - 16) / 380)
      : Math.min((safeW * 0.48) / 470, (safeH * 0.62) / 380)
    if (!Number.isFinite(base) || base <= 0) base = 0.5
    camTarget()
    if (!layoutDone) {
      Object.assign(cam, camT)
      layoutDone = true
    }
    rebuildWires()
    portsDirty = true
    updateBlend()
    syncNet()
    lastLevelsKey = levelsKey()
    markStaticDirty()
  }

  function refreshPorts() {
    if (!portsDirty) return
    portsCache = opts.getPorts() || {}
    portsDirty = false
  }

  function rebuildStaticLayer(time, reduce) {
    if (!offscreen) offscreen = document.createElement('canvas')
    if (offscreen.width !== cv.width || offscreen.height !== cv.height) {
      offscreen.width = cv.width
      offscreen.height = cv.height
    }
    const octx = offscreen.getContext('2d')
    if (!octx) return
    // drawBrain ana ctx kullanır — geçici olarak offscreen'e çiz
    const prev = cv
    // Ana tuvale çiz, sonra kopyala (tek ctx bağımlılığı)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.clearRect(0, 0, W, H)
    drawBrain(time, true)
    octx.setTransform(1, 0, 0, 1, 0, 0)
    octx.clearRect(0, 0, offscreen.width, offscreen.height)
    octx.drawImage(cv, 0, 0)
    void prev
    void reduce
    staticDirty = false
  }

  function enterLightMode(reason) {
    if (lightMode) return
    lightMode = true
    G = buildCurlGrid(contourStep())
    NV = G.nx * G.ny
    LVB = new Float32Array(NV)
    SELB = new Float32Array(NV)
    rebuildWires()
    updateBlend()
    markStaticDirty()
    void reason
  }

  function paintDynamic(time, reduce) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.clearRect(0, 0, W, H)

    if (offscreen && !staticDirty) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(offscreen, 0, 0)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    ctx.lineWidth = 0.6
    ctx.strokeStyle = 'rgba(255,255,255,.16)'
    ctx.beginPath()
    ambient.forEach((w) => {
      const b = bez(w, time, reduce)
      if (!b) return
      ctx.moveTo(b[0], b[1])
      ctx.bezierCurveTo(b[2], b[3], b[4], b[5], b[6], b[7])
    })
    ctx.stroke()

    const selId = opts.getSel()
    LOBES.forEach((L) => {
      const ports = portsCache[L.id]
      if (!ports?.length) return
      const level = lvOf(L.id)
      const sel = L.id === selId
      ctx.lineWidth = sel ? 1.1 : 0.5 + level * 0.06
      ctx.strokeStyle = sel ? 'rgba(242,194,48,.6)' : `rgba(255,255,255,${0.18 + level * 0.05})`
      ctx.beginPath()
      wires.forEach((w) => {
        if (w.L !== L) return
        const b = bez(w, time, reduce)
        w.b = b
        if (!b) return
        ctx.moveTo(b[0], b[1])
        ctx.bezierCurveTo(b[2], b[3], b[4], b[5], b[6], b[7])
      })
      ctx.stroke()
    })

    if (!reduce && !document.hidden && !frozen) {
      const pulseChance = lightMode ? 0.0015 : 0.004
      LOBES.forEach((L) => {
        const level = lvOf(L.id)
        if ((portsCache[L.id] || []).length && Math.random() < (pulseChance * level * level) / 3) {
          const ws = wires.filter((w) => w.L === L)
          if (ws.length) pulses.push({ w: ws[Math.floor(Math.random() * ws.length)], t: 0, sp: 0.006 + Math.random() * 0.008 })
        }
      })
    }
    pulses = pulses.filter((p) => p.t < 1)
    pulses.forEach((p) => {
      p.t += p.sp
      if (!p.w.b || p.t < 0) return
      const sel = p.w.L.id === selId
      const trail = lightMode ? 3 : 5
      for (let k2 = 0; k2 < trail; k2++) {
        const q = bpt(p.w.b, Math.max(0, p.t - k2 * 0.012))
        ctx.fillStyle = sel ? `rgba(242,194,48,${0.9 - k2 * 0.17})` : `rgba(255,255,255,${0.85 - k2 * 0.16})`
        ctx.beginPath()
        ctx.arc(q[0], q[1], 1.9 - k2 * 0.25, 0, 7)
        ctx.fill()
      }
      if (p.t >= 0.97) flash[p.w.L.id] = Math.min(1, (flash[p.w.L.id] || 0) + 0.12)
    })
    for (const f in flash) flash[f] *= 0.94
  }

  function frame(ms) {
    if (!running) return
    raf = requestAnimationFrame(frame)
    if (opts.getPaused() || frozen) return

    if (!bootMs) bootMs = ms
    const minFrameGap = lightMode || preferLightDevice() ? 33 : 0
    if (minFrameGap && ms - lastDrawMs < minFrameGap) return
    const frameCostStart = performance.now()
    lastDrawMs = ms

    const time = ms / 1000
    const dt = Math.min(0.05, time - lastT || 0.016)
    lastT = time
    const reduce = opts.getReduceMotion() || lightMode
    // Mobil/hafif: kamerayı anında oturt (önbellek OX/OY ile uyumlu)
    const k = lightMode || mobile || reduce ? 1 : 1 - Math.pow(0.0025, dt)
    camTarget()
    cam.s += (camT.s - cam.s) * k
    cam.cx += (camT.cx - cam.cx) * k
    cam.cy += (camT.cy - cam.cy) * k
    resolveView()
    S = cam.s
    OX = viewX + viewW / 2 - cam.cx * S
    OY = viewY + viewH / 2 - cam.cy * S

    refreshPorts()

    const lk = levelsKey()
    if (lk !== lastLevelsKey) {
      lastLevelsKey = lk
      updateBlend()
      syncNet()
      markStaticDirty()
    }

    const useCache = lightMode || mobile
    if (useCache) {
      if (staticDirty || !offscreen) rebuildStaticLayer(time, reduce)
      paintDynamic(time, reduce)
    } else {
      // Masaüstü: tam kalite her kare (görünüm değişmesin)
      updateBlend()
      syncNet()
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.lineWidth = 0.6
      ctx.strokeStyle = 'rgba(255,255,255,.16)'
      ctx.beginPath()
      ambient.forEach((w) => {
        const b = bez(w, time, reduce)
        if (!b) return
        ctx.moveTo(b[0], b[1])
        ctx.bezierCurveTo(b[2], b[3], b[4], b[5], b[6], b[7])
      })
      ctx.stroke()
      const selId = opts.getSel()
      LOBES.forEach((L) => {
        const ports = portsCache[L.id]
        if (!ports?.length) return
        const level = lvOf(L.id)
        const sel = L.id === selId
        ctx.lineWidth = sel ? 1.1 : 0.5 + level * 0.06
        ctx.strokeStyle = sel ? 'rgba(242,194,48,.6)' : `rgba(255,255,255,${0.18 + level * 0.05})`
        ctx.beginPath()
        wires.forEach((w) => {
          if (w.L !== L) return
          const b = bez(w, time, reduce)
          w.b = b
          if (!b) return
          ctx.moveTo(b[0], b[1])
          ctx.bezierCurveTo(b[2], b[3], b[4], b[5], b[6], b[7])
        })
        ctx.stroke()
      })
      if (!reduce && !document.hidden) {
        LOBES.forEach((L) => {
          const level = lvOf(L.id)
          if ((portsCache[L.id] || []).length && Math.random() < (0.004 * level * level) / 3) {
            const ws = wires.filter((w) => w.L === L)
            if (ws.length)
              pulses.push({
                w: ws[Math.floor(Math.random() * ws.length)],
                t: 0,
                sp: 0.006 + Math.random() * 0.008,
              })
          }
        })
      }
      pulses = pulses.filter((p) => p.t < 1)
      pulses.forEach((p) => {
        p.t += p.sp
        if (!p.w.b || p.t < 0) return
        const sel = p.w.L.id === selId
        for (let k2 = 0; k2 < 5; k2++) {
          const q = bpt(p.w.b, Math.max(0, p.t - k2 * 0.012))
          ctx.fillStyle = sel
            ? `rgba(242,194,48,${0.9 - k2 * 0.17})`
            : `rgba(255,255,255,${0.85 - k2 * 0.16})`
          ctx.beginPath()
          ctx.arc(q[0], q[1], 1.9 - k2 * 0.25, 0, 7)
          ctx.fill()
        }
        if (p.t >= 0.97) flash[p.w.L.id] = Math.min(1, (flash[p.w.L.id] || 0) + 0.12)
      })
      drawBrain(time, reduce)
      for (const f in flash) flash[f] *= 0.94
    }

    const cost = performance.now() - frameCostStart
    frameSamples.push(cost)
    if (frameSamples.length > 45) frameSamples.shift()
    if (ms - bootMs > 2000 && frameSamples.length >= 20) {
      const avg = frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length
      if (!lightMode && avg > 40) {
        enterLightMode('auto')
        frameSamples.length = 0
      } else if (lightMode && avg > 40) {
        frozen = true
        running = false
        if (raf) cancelAnimationFrame(raf)
        raf = 0
      }
    }
  }

  return {
    start() {
      if (frozen) {
        // statik kareyi bir kez çiz
        layout({ force: false })
        resolveView()
        S = cam.s
        OX = viewX + viewW / 2 - cam.cx * S
        OY = viewY + viewH / 2 - cam.cy * S
        if (staticDirty || !offscreen) rebuildStaticLayer(0, true)
        paintDynamic(0, true)
        return
      }
      if (running) return
      running = true
      bootMs = 0
      lastT = performance.now() / 1000
      raf = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    },
    layout,
    rebuildWires,
    invalidatePorts() {
      portsDirty = true
    },
    invalidateStatic: markStaticDirty,
    drawSkeleton,
    screenToBrain(clientX, clientY) {
      const r = cv.getBoundingClientRect()
      return lobeAt((clientX - r.left - OX) / S, (clientY - r.top - OY) / S)
    },
    getMetrics() {
      const avg =
        frameSamples.length > 0
          ? frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length
          : 0
      return {
        W,
        H,
        mobile,
        lightMode,
        frozen,
        dpr: DPR,
        canvasCss: { w: W, h: H },
        canvasBuf: { w: cv.width, h: cv.height },
        avgFrameMs: avg,
        base,
        camS: cam.s,
        zoomTag: opts.getZoom()
          ? `${(BY[opts.getSel()] || BY.motor).name} · ${(cam.s / base).toFixed(1)}x`
          : '',
      }
    },
    destroy() {
      this.stop()
      offscreen = null
    },
  }
}
