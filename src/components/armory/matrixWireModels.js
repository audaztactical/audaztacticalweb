/** @typedef {'pistol' | 'reddot' | 'cartridge'} MatrixModelVariant */

class MeshBuilder {
  constructor() {
    /** @type {[number, number, number][]} */
    this.vertices = []
    /** @type {[number, number][]} */
    this.edges = []
    /** @type Set<string> */
    this._edgeKeys = new Set()
  }

  /** @returns {number} */
  vtx(x, y, z) {
    this.vertices.push([x, y, z])
    return this.vertices.length - 1
  }

  /** @param {number} a @param {number} b */
  edge(a, b) {
    if (a === b) return
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (this._edgeKeys.has(key)) return
    this._edgeKeys.add(key)
    this.edges.push([a, b])
  }

  /**
   * @param {number} cx @param {number} cy @param {number} cz
   * @param {number} w @param {number} h @param {number} d
   */
  box(cx, cy, cz, w, h, d) {
    const hw = w / 2
    const hh = h / 2
    const hd = d / 2
    const i0 = this.vtx(cx - hw, cy - hh, cz - hd)
    const i1 = this.vtx(cx + hw, cy - hh, cz - hd)
    const i2 = this.vtx(cx + hw, cy + hh, cz - hd)
    const i3 = this.vtx(cx - hw, cy + hh, cz - hd)
    const i4 = this.vtx(cx - hw, cy - hh, cz + hd)
    const i5 = this.vtx(cx + hw, cy - hh, cz + hd)
    const i6 = this.vtx(cx + hw, cy + hh, cz + hd)
    const i7 = this.vtx(cx - hw, cy + hh, cz + hd)
    const faces = [
      [i0, i1, i2, i3],
      [i4, i5, i6, i7],
      [i0, i1, i5, i4],
      [i2, i3, i7, i6],
      [i1, i2, i6, i5],
      [i3, i0, i4, i7],
    ]
    for (const f of faces) {
      for (let i = 0; i < 4; i++) this.edge(f[i], f[(i + 1) % 4])
    }
    return [i0, i1, i2, i3, i4, i5, i6, i7]
  }

  /**
   * @param {number} cx @param {number} cy @param {number} cz
   * @param {number} r @param {number} len
   * @param {'x'|'y'|'z'} axis
   * @param {number} segs
   * @param {number} rings
   */
  cylinder(cx, cy, cz, r, len, axis = 'x', segs = 14, rings = 4) {
    const ringIdx = []
    for (let ring = 0; ring <= rings; ring++) {
      const t = ring / rings
      const ringVerts = []
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2
        const ca = Math.cos(a) * r
        const sa = Math.sin(a) * r
        let x = cx
        let y = cy
        let z = cz
        const offset = (t - 0.5) * len
        if (axis === 'x') {
          x += offset
          y += ca
          z += sa
        } else if (axis === 'y') {
          y += offset
          x += ca
          z += sa
        } else {
          z += offset
          x += ca
          y += sa
        }
        ringVerts.push(this.vtx(x, y, z))
      }
      ringIdx.push(ringVerts)
    }
    for (let ring = 0; ring < ringIdx.length; ring++) {
      const rv = ringIdx[ring]
      for (let s = 0; s < segs; s++) {
        this.edge(rv[s], rv[(s + 1) % segs])
        if (ring > 0) this.edge(ringIdx[ring - 1][s], rv[s])
      }
    }
    return ringIdx
  }

  /**
   * @param {number} cx @param {number} cy @param {number} cz
   * @param {number} r @param {number} plane
   */
  ring(cx, cy, cz, r, plane = 'xy', segs = 20) {
    const idx = []
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2
      let x = cx + Math.cos(a) * r
      let y = cy + Math.sin(a) * r
      let z = cz
      if (plane === 'xz') {
        y = cy
        x = cx + Math.cos(a) * r
        z = cz + Math.sin(a) * r
      } else if (plane === 'yz') {
        x = cx
        y = cy + Math.cos(a) * r
        z = cz + Math.sin(a) * r
      }
      idx.push(this.vtx(x, y, z))
    }
    for (let s = 0; s < segs; s++) this.edge(idx[s], idx[(s + 1) % segs])
    return idx
  }

  /** @param {number} t */
  build(variant, t) {
    this.vertices = []
    this.edges = []
    this._edgeKeys = new Set()

    if (variant === 'pistol') buildPistol(this, t)
    else if (variant === 'reddot') buildRedDot(this, t)
    else buildCartridge(this, t)

    return { vertices: this.vertices, edges: this.edges }
  }
}

/** @param {MeshBuilder} m @param {number} t */
function buildPistol(m, t) {
  const pulse = Math.sin(t * 1.2) * 0.008
  m.box(-0.08, -0.02 + pulse, 0, 0.52, 0.14, 0.12)
  m.box(0.22, 0.06 + pulse, 0, 0.38, 0.1, 0.1)
  m.cylinder(0.52, 0.04, 0, 0.045, 0.42, 'x', 16, 5)
  m.box(-0.32, -0.22, 0, 0.14, 0.32, 0.1)
  m.box(-0.38, -0.08, 0, 0.1, 0.12, 0.11)

  const guard = []
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.15 + (i / 10) * Math.PI * 0.75
    guard.push(m.vtx(-0.02 + Math.cos(a) * 0.1, -0.12 + Math.sin(a) * 0.08, 0.02))
  }
  for (let i = 0; i < guard.length - 1; i++) m.edge(guard[i], guard[i + 1])

  m.box(0.08, 0.12, 0, 0.04, 0.05, 0.04)
  m.box(0.42, 0.11, 0, 0.03, 0.04, 0.03)
  m.box(-0.28, -0.38, 0, 0.1, 0.14, 0.08)
  m.cylinder(-0.28, -0.46, 0, 0.055, 0.04, 'y', 12, 1)

  for (let i = 0; i < 6; i++) {
    const x = -0.35 + i * 0.04
    m.vtx(x, -0.14, 0.065)
    m.vtx(x, -0.14, -0.065)
    m.edge(m.vertices.length - 2, m.vertices.length - 1)
  }

  const slideDetail = []
  for (let i = 0; i < 8; i++) {
    const x = 0.05 + i * 0.05
    slideDetail.push(m.vtx(x, 0.1, 0.055), m.vtx(x, 0.1, -0.055))
    m.edge(slideDetail[slideDetail.length - 2], slideDetail[slideDetail.length - 1])
  }
  for (let i = 0; i < slideDetail.length - 2; i += 2) {
    m.edge(slideDetail[i], slideDetail[i + 2])
  }

  m.ring(0.72, 0.04, 0, 0.052, 'yz', 18)
  m.ring(-0.36, -0.02, 0, 0.09, 'xy', 14)

  const trigger = m.vtx(-0.04, -0.14, 0.03)
  const guardMid = guard[5]
  if (guardMid !== undefined) m.edge(trigger, guardMid)
}

/** @param {MeshBuilder} m @param {number} t */
function buildRedDot(m, t) {
  const wobble = Math.sin(t * 0.9) * 0.01
  m.box(0, -0.08 + wobble, 0, 0.42, 0.08, 0.14)
  for (let i = -3; i <= 3; i++) {
    m.box(i * 0.055, -0.16, 0, 0.03, 0.04, 0.1)
  }
  m.box(0, 0.02 + wobble, 0, 0.5, 0.22, 0.2)
  m.box(0.22, 0.04, 0, 0.12, 0.18, 0.16)
  m.cylinder(-0.18, 0.18, 0.08, 0.05, 0.08, 'y', 10, 2)
  m.cylinder(0.18, 0.18, 0.08, 0.05, 0.08, 'y', 10, 2)

  const lensZ = 0.14 + Math.sin(t * 0.5) * 0.01
  m.ring(0.22, 0.04, lensZ, 0.14, 'yz', 24)
  m.ring(0.22, 0.04, lensZ, 0.09, 'yz', 16)
  m.ring(0.22, 0.04, lensZ, 0.04, 'yz', 12)

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.35
    const lx = 0.22 + Math.cos(a) * 0.06
    const ly = 0.04 + Math.sin(a) * 0.06
    const inner = m.vtx(lx, ly, lensZ)
    const outer = m.vtx(0.22, 0.04, lensZ)
    m.edge(inner, outer)
  }

  m.cylinder(0, 0.04, -0.12, 0.08, 0.06, 'z', 14, 2)
  const window = []
  for (let i = 0; i <= 6; i++) {
    const y = -0.02 + (i / 6) * 0.12
    window.push(m.vtx(-0.05, y, 0.12), m.vtx(0.12, y, 0.12))
    if (i > 0) {
      m.edge(window[window.length - 4], window[window.length - 2])
      m.edge(window[window.length - 3], window[window.length - 1])
    }
  }

  for (let layer = 0; layer < 3; layer++) {
    const z = -0.08 - layer * 0.04
    m.ring(0, 0, z, 0.2 - layer * 0.03, 'xy', 18)
  }

  const hudArc = []
  for (let i = 0; i <= 14; i++) {
    const a = -Math.PI / 2 + (i / 14) * Math.PI
    hudArc.push(m.vtx(0.22 + Math.cos(a) * 0.2, 0.04 + Math.sin(a) * 0.2, 0.02))
  }
  for (let i = 0; i < hudArc.length - 1; i++) m.edge(hudArc[i], hudArc[i + 1])
}

/** @param {MeshBuilder} m @param {number} t */
function buildCartridge(m, t) {
  const breathe = Math.sin(t * 0.7) * 0.006
  for (let ring = 0; ring <= 10; ring++) {
    const ty = 0.28 - (ring / 10) * 0.55 + breathe
    const r = 0.06 + (ring / 10) * 0.04
    const rv = []
    for (let s = 0; s < 18; s++) {
      const a = (s / 18) * Math.PI * 2 + ring * 0.15
      rv.push(m.vtx(Math.cos(a) * r, ty, Math.sin(a) * r))
    }
    for (let s = 0; s < 18; s++) m.edge(rv[s], rv[(s + 1) % 18])
    if (ring > 0) {
      const prev = m.vertices.length - 18 * 2 - 18
      for (let s = 0; s < 18; s += 2) {
        const a = prev + s
        const b = rv[s]
        if (a >= 0 && b !== undefined) m.edge(a, b)
      }
    }
  }

  m.cylinder(0, -0.32 + breathe, 0, 0.1, 0.22, 'y', 20, 4)
  m.ring(0, -0.43, 0, 0.11, 'xz', 22)
  m.ring(0, -0.44, 0, 0.06, 'xz', 14)
  m.cylinder(0, 0.32, 0, 0.035, 0.14, 'y', 14, 3)

  let prevHelix = null
  for (let helix = 0; helix < 24; helix++) {
    const a = (helix / 24) * Math.PI * 4 + t * 0.4
    const y = -0.2 + (helix / 24) * 0.35
    const r = 0.102
    const idx = m.vtx(Math.cos(a) * r, y, Math.sin(a) * r)
    if (prevHelix !== null) m.edge(prevHelix, idx)
    prevHelix = idx
  }

  const tip = m.vtx(0, 0.42, 0)
  const baseRing = []
  for (let s = 0; s < 12; s++) {
    const a = (s / 12) * Math.PI * 2
    baseRing.push(m.vtx(Math.cos(a) * 0.04, 0.36, Math.sin(a) * 0.04))
    m.edge(baseRing[baseRing.length - 1], tip)
  }
  for (let s = 0; s < 12; s++) m.edge(baseRing[s], baseRing[(s + 1) % 12])

  for (let i = 0; i < 5; i++) {
    const y = -0.38 + i * 0.03
    m.ring(0, y, 0, 0.105 - i * 0.004, 'xz', 16)
  }

  m.vtx(0, -0.46, 0)
  m.ring(0, -0.45, 0, 0.03, 'xz', 8)
}

/** @param {MatrixModelVariant} variant @param {number} t */
export function buildMatrixMesh(variant, t) {
  const builder = new MeshBuilder()
  return builder.build(variant, t)
}

/** @param {MatrixModelVariant} variant */
export function defaultAnalysisLines(variant) {
  if (variant === 'pistol') {
    return ['ÇERÇEVE_MESH', 'NAMLU_VEKTÖR', 'TETİK_GEOM', 'İZ_ANALİZ', 'STOK_SENK']
  }
  if (variant === 'reddot') {
    return ['RETİKÜL_IX', 'MONTAJ_RAY', 'LENS_TARAMA', 'TURRET_AKTİF', 'HOLO_SENK']
  }
  return ['BALİSTİK_GÖVDE', 'ÇEKİRDEK', 'KOVAN_RİNG', 'MHM_VEKTÖR', 'STOK_AKTİF']
}

/** @param {MatrixModelVariant} variant */
export function streamGlyphs(variant) {
  const base =
    variant === 'pistol'
      ? '01001001 11010011 00101101 SLK_IX'
      : variant === 'reddot'
        ? '01101100 10110010 OPT_HOLO IX'
        : '01101101 11001000 MHM_BAL IX'
  return base.split(' ')
}
