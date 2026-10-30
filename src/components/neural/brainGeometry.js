/**
 * Operatör Beyni — path geometrisi + lobeAt (prototipten).
 * Path2D / hit-test; bir kez modül yükünde hazırlanır.
 */

import { LOBE_META } from './lobeMeta.js'

export const OUTLINE =
  'M 82 214 C 66 168, 84 114, 132 84 C 176 56, 236 44, 296 44 C 360 44, 420 58, 464 92 C 506 124, 530 168, 528 214 C 527 246, 512 270, 488 282 C 462 294, 432 290, 408 298 C 384 306, 368 318, 340 322 C 304 328, 262 330, 228 322 C 196 314, 172 300, 160 284 C 150 272, 152 262, 146 256 C 128 252, 104 244, 92 234 C 86 228, 84 222, 82 214 Z'
export const CBL =
  'M 392 300 C 404 284, 462 278, 497 291 C 524 302, 522 346, 492 361 C 456 377, 406 366, 391 346 C 381 331, 383 313, 392 300 Z'
export const STEM =
  'M 296 318 C 328 324, 341 330, 344 346 C 347 362, 350 395, 351 434 L 368 434 C 369 400, 372 368, 380 352 C 386 340, 392 320, 392 300 L 330 300 Z'
export const STEM_SIDES =
  'M 296 318 C 328 324, 341 330, 344 346 C 347 362, 350 395, 351 434 M 386 336 C 383 344, 381 348, 380 352 C 372 368, 369 400, 368 434'
export const HIPPO =
  'M 250 280 C 280 270, 330 268, 360 278 C 372 283, 372 294, 360 296 C 330 292, 290 294, 262 298 C 248 298, 244 286, 250 280 Z'

/** @param {number[][]} p */
const poly = (p) => 'M ' + p.map((q) => q.join(' ')).join(' L ') + ' Z'

const SHAPES = {
  frontal: poly([
    [0, 0],
    [266, 0],
    [262, 48],
    [215, 225],
    [175, 250],
    [140, 262],
    [0, 262],
  ]),
  motor: poly([
    [266, 0],
    [304, 0],
    [300, 45],
    [252, 218],
    [215, 225],
    [262, 48],
  ]),
  parietal: poly([
    [304, 0],
    [440, 0],
    [448, 150],
    [455, 250],
    [400, 215],
    [252, 218],
    [300, 45],
  ]),
  occipital: poly([
    [440, 0],
    [600, 0],
    [600, 300],
    [470, 300],
    [455, 250],
    [448, 150],
  ]),
  temporal: poly([
    [0, 262],
    [140, 262],
    [175, 250],
    [215, 225],
    [252, 218],
    [400, 215],
    [455, 250],
    [470, 300],
    [470, 420],
    [0, 420],
  ]),
  hippocampus: HIPPO,
  cerebellum: CBL,
  stem: STEM,
}

/** @param {number} s */
export function rng(s) {
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const perm = new Uint8Array(512)
{
  const p = [...Array(256).keys()]
  let s = 7
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a, b, t) => a + t * (b - a)
function grad(h, x, y, z) {
  h &= 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z
  return ((h & 1 ? -u : u) + (h & 2 ? -v : v))
}
export function noise(x, y, z) {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  const Z = Math.floor(z) & 255
  x -= Math.floor(x)
  y -= Math.floor(y)
  z -= Math.floor(z)
  const u = fade(x)
  const v = fade(y)
  const w = fade(z)
  const A = perm[X] + Y
  const AA = perm[A] + Z
  const AB = perm[A + 1] + Z
  const B = perm[X + 1] + Y
  const BA = perm[B] + Z
  const BB = perm[B + 1] + Z
  return lerp(
    lerp(
      lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
      lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
      v,
    ),
    lerp(
      lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
      v,
    ),
    w,
  )
}

const hitCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null

export const P_OUT = new Path2D(OUTLINE)
export const P_CBL = new Path2D(CBL)
export const P_STEM = new Path2D(STEM)
export const P_HIP = new Path2D(HIPPO)

/**
 * @typedef {{
 *   id: string
 *   name: string
 *   func: string
 *   col: string
 *   kind: string
 *   shape: string
 *   p2: Path2D
 *   targets: number[][]
 *   cen: number[]
 *   size: number
 *   neur: object[]
 *   mods: unknown[]
 * }} BrainLobe
 */

/** @type {BrainLobe[]} */
export const LOBES = LOBE_META.map((m) => ({
  id: m.id,
  name: m.name,
  func: m.func,
  col: m.col,
  kind: m.kind,
  shape: SHAPES[m.id],
  p2: new Path2D(SHAPES[m.id]),
  mods: m.mods,
  targets: /** @type {number[][]} */ ([]),
  cen: [300, 235],
  size: 90,
  neur: /** @type {object[]} */ ([]),
}))

export const BY = Object.fromEntries(LOBES.map((l) => [l.id, l]))

/**
 * @param {number} bx
 * @param {number} by
 * @returns {BrainLobe|null}
 */
export function lobeAt(bx, by) {
  if (!hitCtx) return null
  if (hitCtx.isPointInPath(P_HIP, bx, by)) return BY.hippocampus
  if (hitCtx.isPointInPath(P_OUT, bx, by)) {
    for (const L of LOBES) {
      if (L.kind === 'c' && L.id !== 'hippocampus' && hitCtx.isPointInPath(L.p2, bx, by)) return L
    }
  }
  if (hitCtx.isPointInPath(P_CBL, bx, by)) return BY.cerebellum
  if (hitCtx.isPointInPath(P_STEM, bx, by)) return BY.stem
  return null
}

// Hedef noktaları + merkez (bir kez)
LOBES.forEach((L, i) => {
  const r = rng(31 + i * 97)
  const pts = []
  let g = 0
  while (pts.length < 40 && g++ < 30000) {
    const x = 40 + r() * 500
    const y = 30 + r() * 400
    if (lobeAt(x, y) === L) pts.push([x, y])
  }
  L.targets = pts
  let x0 = 1e9
  let y0 = 1e9
  let x1 = -1e9
  let y1 = -1e9
  let cx = 0
  let cy = 0
  pts.forEach((p) => {
    cx += p[0]
    cy += p[1]
    x0 = Math.min(x0, p[0])
    y0 = Math.min(y0, p[1])
    x1 = Math.max(x1, p[0])
    y1 = Math.max(y1, p[1])
  })
  if (pts.length) {
    L.cen = [cx / pts.length, cy / pts.length]
    L.size = Math.max(x1 - x0, y1 - y0, 90)
  }
})

/** Kıvrım ızgarası (masaüstü varsayılan; mobil renderer cs büyütür) */
export function buildCurlGrid(cs = 3.5) {
  const G = {
    x0: 60,
    y0: 30,
    cs,
    nx: Math.ceil(480 / cs) + 1,
    ny: Math.ceil(395 / cs) + 1,
    id: /** @type {Int8Array} */ (new Int8Array(0)),
    val: /** @type {Float32Array} */ (new Float32Array(0)),
  }
  G.id = new Int8Array(G.nx * G.ny)
  G.val = new Float32Array(G.nx * G.ny)
  for (let j = 0; j < G.ny; j++) {
    for (let i = 0; i < G.nx; i++) {
      const L = lobeAt(G.x0 + i * G.cs, G.y0 + j * G.cs)
      G.id[j * G.nx + i] = L ? LOBES.indexOf(L) : -1
    }
  }
  return G
}

export const MAT = LOBES.map((L) => (L.kind === 'c' ? 0 : L.kind === 'b' ? 1 : 2))

export const STEM_TAB = [
  [300, 362, 30],
  [330, 362, 22],
  [346, 362, 17],
  [362, 361, 14],
  [380, 360, 11],
  [400, 360, 9.5],
  [434, 359.5, 8.5],
]

export function stemAt(y) {
  for (let i = 1; i < STEM_TAB.length; i++) {
    const a = STEM_TAB[i - 1]
    const b = STEM_TAB[i]
    if (y <= b[0]) {
      const t = (y - a[0]) / (b[0] - a[0])
      const s = t * t * (3 - 2 * t)
      return [a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s]
    }
  }
  return [359, 7]
}

/** Beyincik folia / arbor merkezi — örneklenen geometrik merkeze hizalı */
export const HUB = /** @type {[number, number]} */ ([
  BY.cerebellum?.cen?.[0] ?? 457,
  BY.cerebellum?.cen?.[1] ?? 328,
])

export function cblVal(X, Y, z) {
  const dx = X - HUB[0]
  const dy = Y - HUB[1]
  const r = Math.hypot(dx, dy)
  const a = Math.atan2(dy, dx)
  return (
    Math.sin(r * 0.46 + noise(a * 1.7, r * 0.02, z) * 2.2 + Math.sin(a * 15 + z * 1.6) * 0.28) * 0.5
  )
}

/** Arbor vitae dalları (HUB beyincik merkezinde) */
export const ARBOR = (() => {
  /** @type {{ x: number; y: number; x2: number; y2: number; d: number; cx: number; cy: number }[]} */
  const out = []
  const r = rng(77)
  function br(x, y, ang, len, d) {
    const x2 = x + Math.cos(ang) * len
    const y2 = y + Math.sin(ang) * len
    out.push({
      x,
      y,
      x2,
      y2,
      d,
      cx: (x + x2) / 2 + Math.cos(ang + 1.57) * len * 0.18 * (r() - 0.5),
      cy: (y + y2) / 2 + Math.sin(ang + 1.57) * len * 0.18 * (r() - 0.5),
    })
    if (d >= 6) return
    const k = d < 2 ? 3 : 2
    for (let i = 0; i < k; i++) {
      const sp = k === 3 ? (i - 1) * 0.62 : i ? 0.42 : -0.42
      br(x2, y2, ang + sp + (r() - 0.5) * 0.25, len * (0.7 + r() * 0.12), d + 1)
    }
  }
  // Kısa gövde + daha geniş açı yayılımı — sağ yarıyı da doldurur
  br(HUB[0], HUB[1], -0.35, 22, 0)
  br(HUB[0], HUB[1], 0.55, 20, 0)
  br(HUB[0], HUB[1], 1.45, 16, 0)
  return out
})()

const POOL = {
  frontal: 24,
  motor: 13,
  parietal: 22,
  occipital: 16,
  temporal: 24,
  hippocampus: 6,
  cerebellum: 7,
  stem: 5,
}

export const ADJ = [
  ['frontal', 'motor'],
  ['frontal', 'temporal'],
  ['frontal', 'parietal'],
  ['motor', 'parietal'],
  ['motor', 'temporal'],
  ['parietal', 'occipital'],
  ['parietal', 'temporal'],
  ['occipital', 'temporal'],
  ['temporal', 'hippocampus'],
  ['parietal', 'hippocampus'],
  ['occipital', 'cerebellum'],
  ['cerebellum', 'stem'],
  ['stem', 'temporal'],
]

// Nöron havuzu
LOBES.forEach((L, li) => {
  const r = rng(500 + li * 13)
  const pts = []
  const N = POOL[L.id]
  const md = L.id === 'hippocampus' ? 12 : 17
  let g = 0
  while (pts.length < N && g++ < 40000) {
    const x = 40 + r() * 500
    const y = 30 + r() * 400
    if (lobeAt(x, y) !== L) continue
    if (
      lobeAt(x + 6, y) !== L ||
      lobeAt(x - 6, y) !== L ||
      lobeAt(x, y + 6) !== L ||
      lobeAt(x, y - 6) !== L
    )
      continue
    if (pts.some((p) => Math.hypot(p.x - x, p.y - y) < md)) continue
    pts.push({
      x,
      y,
      L,
      li,
      i: pts.length,
      den: Array.from({ length: 3 + Math.floor(r() * 3) }, () => [r() * 6.28, 3 + r() * 4]),
      ph: r() * 6.28,
      born: -1,
      fire: 0,
    })
  }
  L.neur = pts
})

export const TH = [0, -0.28, 0.28, -0.14, 0.14, -0.42, 0.42, -0.07, 0.07, -0.21, 0.21, -0.35, 0.35, -0.49, 0.49]
