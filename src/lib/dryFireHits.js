/**
 * Kuru Tetik — isabet / flinch yardımcıları.
 * Kalibrasyon offset'i yalnızca hesapta kullanılır; hedef UI'da gösterilmez.
 */

import { mapSensorToAimAxes } from './mpuAimAxes'

/** @typedef {import('./timerCalibrationSettings').MpuGForceRange} MpuGForceRange */

/**
 * @typedef {Object} DryFireHit
 * @property {string} id
 * @property {number} index
 * @property {number} x  -1…1 referans (7 m) düzlemi
 * @property {number} y
 * @property {string} color
 * @property {number} triggerPressMs
 * @property {number} flinchScore 0…100
 * @property {number} deviationX
 * @property {number} deviationY
 * @property {number} deviationMag
 * @property {number} createdAt
 * @property {number} [distanceM] kayıt anındaki mesafe (opsiyonel)
 * @property {number} [reactionMs] go sinyalinden mutlak süre (ms)
 */

/** Referans mesafe — Scale = REF / Distance */
export const DRY_FIRE_REF_DISTANCE_M = 7

/** @type {readonly number[]} */
export const DRY_FIRE_DISTANCE_PRESETS = Object.freeze([5, 7, 10, 15, 25])

export const DRY_FIRE_DISTANCE_MIN_M = 1
export const DRY_FIRE_DISTANCE_MAX_M = 50

export const DRY_FIRE_HIT_COLORS = [
  '#facc15',
  '#34d399',
  '#60a5fa',
  '#f472b6',
  '#fb923c',
  '#a78bfa',
  '#f87171',
  '#2dd4bf',
  '#eab308',
  '#38bdf8',
]

/**
 * @param {number} index 0-based
 */
export function hitColorForIndex(index) {
  return DRY_FIRE_HIT_COLORS[Math.abs(index) % DRY_FIRE_HIT_COLORS.length]
}

/**
 * @param {number} min
 * @param {number} max
 * @param {number} n
 */
function clamp(min, max, n) {
  return Math.min(max, Math.max(min, n))
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampDryFireDistanceM(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return DRY_FIRE_REF_DISTANCE_M
  return clamp(DRY_FIRE_DISTANCE_MIN_M, DRY_FIRE_DISTANCE_MAX_M, Math.round(n * 10) / 10)
}

/**
 * Scale = 7 / Distance — mesafe arttıkça hedef küçülür.
 * @param {number} distanceM
 * @returns {number}
 */
export function dryFireDistanceScale(distanceM) {
  const d = clampDryFireDistanceM(distanceM)
  return DRY_FIRE_REF_DISTANCE_M / d
}

/**
 * Referans sapmayı seçilen mesafeye göre görüntü koordinatına çevir.
 * Daha uzun mesafe → Scale küçülür → ekran sapması büyür (zorluk ↑).
 * @param {number} x
 * @param {number} y
 * @param {number} distanceM
 */
export function scaleHitCoordsForDistance(x, y, distanceM) {
  const scale = dryFireDistanceScale(distanceM)
  return {
    scale,
    x: x / scale,
    y: y / scale,
    deviationX: Math.round((x / scale) * 1000) / 1000,
    deviationY: Math.round((y / scale) * 1000) / 1000,
    deviationMag: Math.round((Math.hypot(x, y) / scale) * 1000) / 1000,
  }
}

/**
 * İsabeti hedef yüzeyi (%) içine yerleştir — SVG halkaları ile aynı koordinat sistemi.
 * @param {number} x referans düzlem
 * @param {number} y
 * @param {number} distanceM
 * @param {number} [faceHitRadiusPct] dış halka yarıçapı (% yüz) — varsayılan 46 (svgR 92)
 * @returns {{ leftPct: number, topPct: number, mappedX: number, mappedY: number }}
 */
export function mapHitToFacePercent(x, y, distanceM, faceHitRadiusPct = 46) {
  const mapped = scaleHitCoordsForDistance(x, y, distanceM)
  const r = Number.isFinite(faceHitRadiusPct) && faceHitRadiusPct > 0 ? faceHitRadiusPct : 46
  // Mesafe ölçeği sapmayı büyütür; yüz dışında kalanları kenara kıstır (overflow:hidden ile kaybolmasın)
  const mappedX = clamp(-1, 1, mapped.x)
  const mappedY = clamp(-1, 1, mapped.y)
  return {
    leftPct: 50 + mappedX * r,
    topPct: 50 + mappedY * r,
    mappedX,
    mappedY,
  }
}

/**
 * Marker çapı (px) — board/yüz boyutuna göre okunabilir kalsın.
 * @param {number} facePx
 * @param {boolean} [fullscreen]
 */
export function resolveHitMarkerSizePx(facePx, fullscreen = false) {
  const base = Math.max(1, Number(facePx) || 200)
  const ratio = fullscreen ? 0.055 : 0.08
  // Mobilde okunabilir min; büyük yüzlerde tavan
  const minPx = fullscreen ? 16 : 12
  const maxPx = fullscreen ? 40 : 26
  return Math.round(Math.min(maxPx, Math.max(minPx, base * ratio)))
}

/**
 * ±2G / ±8G → tam ölçek (g).
 * @param {MpuGForceRange | string} [range]
 */
export function gForceFullScale(range) {
  const m = String(range ?? '').match(/(\d+)/)
  const n = m ? Number(m[1]) : 8
  return Number.isFinite(n) && n > 0 ? n : 8
}

/** Yaw/Pitch ölçeği (isabet tahtası) — daha geniş = daha az sıkıştırma */
export const YAW_AIM_FULL_SCALE_DEG = 90
export const PITCH_AIM_FULL_SCALE_DEG = 90

/**
 * realX/realY (g) → hedef düzlemi (−1…1) — recoil / flinch için.
 * @param {number} real
 * @param {number} fullScale
 */
function residualToPlane(real, fullScale) {
  const sens = Math.max(0.5, fullScale * 0.5)
  return clamp(-1, 1, real / sens)
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function readFiniteNumber(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Açı farkını −180…180 aralığına sar (yaw / pitch).
 * @param {number} angleDeg
 * @param {number} [offsetDeg]
 */
export function normalizeAngleDeltaDeg(angleDeg, offsetDeg = 0) {
  let d = (Number(angleDeg) || 0) - (Number(offsetDeg) || 0)
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

/** @deprecated normalizeAngleDeltaDeg kullanın */
export function normalizeYawDeltaDeg(yawDeg, offsetYawDeg = 0) {
  return normalizeAngleDeltaDeg(yawDeg, offsetYawDeg)
}

/**
 * Relatif yaw (°) → yatay nişan (−1…1). Pozitif → sağ.
 * Yumuşak kenar; dar ±45 sıkıştırması yok.
 * @param {number} yawRelDeg
 * @param {number} [fullScaleDeg]
 */
export function yawToAimPlaneX(yawRelDeg, fullScaleDeg = YAW_AIM_FULL_SCALE_DEG) {
  const raw = Number(yawRelDeg)
  if (!Number.isFinite(raw)) return 0
  const sens = Math.max(1, Number(fullScaleDeg) || YAW_AIM_FULL_SCALE_DEG)
  return clamp(-1, 1, raw / sens)
}

/**
 * Relatif pitch (°) → dikey nişan (−1…1).
 * Pozitif elevation → ekranda yukarı (negatif planeY).
 * @param {number} pitchRelDeg
 * @param {number} [fullScaleDeg]
 */
export function pitchToAimPlaneY(pitchRelDeg, fullScaleDeg = PITCH_AIM_FULL_SCALE_DEG) {
  const raw = Number(pitchRelDeg)
  if (!Number.isFinite(raw)) return 0
  const sens = Math.max(1, Number(fullScaleDeg) || PITCH_AIM_FULL_SCALE_DEG)
  return clamp(-1, 1, -raw / sens)
}

/**
 * Ateş anı nişan + sarsıntı örneklemesi.
 * Konum: YALNIZCA aim.yaw (X) + aim.pitch (Y) — mapSensorToAimAxes sonrası.
 * Roll/cant isabeti kaydırmaz.
 * İvme: flinch / recoil için ayrı tutulur.
 *
 * @param {{
 *   telemetry?: { ax?: number, ay?: number, yaw?: number, pitch?: number, roll?: number, fresh?: boolean } | null
 *   yaw?: number | null
 *   pitch?: number | null
 *   roll?: number | null
 *   accelX?: number | null
 *   accelY?: number | null
 * }} input
 * @returns {{
 *   yaw: number | null
 *   pitch: number | null
 *   accelX: number | null
 *   accelY: number | null
 *   source: 'telemetry' | 'trigger' | 'none'
 * }}
 */
export function resolveDryFireShotAim(input) {
  const tel = input?.telemetry
  /** @type {number | null} */
  let yaw = null
  /** @type {number | null} */
  let pitch = null
  /** @type {number | null} */
  let accelX = null
  /** @type {number | null} */
  let accelY = null
  /** @type {'telemetry' | 'trigger' | 'none'} */
  let source = 'none'

  if (tel && tel.fresh) {
    const aim = mapSensorToAimAxes(tel)
    const hasYaw = Number.isFinite(Number(tel.yaw))
    const hasPitch = Number.isFinite(Number(tel.pitch))
    if (hasYaw) {
      yaw = aim.yaw
      source = 'telemetry'
    }
    // aim.pitch = sensör pitch (gy) → hedef dikey; roll yalnızca cant
    if (hasPitch) pitch = aim.pitch
    const ax = Number(tel.ax)
    const ay = Number(tel.ay)
    if (Number.isFinite(ax)) accelX = ax
    if (Number.isFinite(ay)) accelY = ay
  }

  // Trigger fallback: ham sensör yaw/pitch/roll → aynı 1:1 map
  if (yaw == null || pitch == null) {
    const hasSensorAngles =
      readFiniteNumber(input?.yaw) != null ||
      readFiniteNumber(input?.pitch) != null ||
      readFiniteNumber(input?.roll) != null
    if (hasSensorAngles) {
      const aim = mapSensorToAimAxes({
        yaw: input?.yaw,
        pitch: input?.pitch,
        roll: input?.roll,
      })
      if (yaw == null && Number.isFinite(Number(input?.yaw))) {
        yaw = aim.yaw
        if (source === 'none') source = 'trigger'
      }
      if (pitch == null && Number.isFinite(Number(input?.pitch))) {
        pitch = aim.pitch
        if (source === 'none') source = 'trigger'
      }
    }
  }

  if (accelX == null) accelX = readFiniteNumber(input?.accelX)
  if (accelY == null) accelY = readFiniteNumber(input?.accelY)

  return { yaw, pitch, accelX, accelY, source }
}

/**
 * @deprecated Nişan yaw/pitch tabanlı — resolveDryFireShotAim kullanın.
 * @param {{
 *   telemetry?: { ax?: number, ay?: number, yaw?: number, pitch?: number, fresh?: boolean } | null
 *   accelX?: number | null
 *   accelY?: number | null
 *   yaw?: number | null
 *   pitch?: number | null
 * }} input
 */
export function resolveDryFireShotAccel(input) {
  const aim = resolveDryFireShotAim(input)
  return { accelX: aim.accelX, accelY: aim.accelY, source: aim.source }
}

/**
 * Yeni kuru tetik isabeti — konum YALNIZCA yaw (X) + pitch (Y).
 * Roll/cant isabet noktasını kaydırmaz (stabilite metriği ayrı).
 * İvme yalnızca flinch/recoil. Açı yoksa merkez (0,0).
 * @param {{
 *   index: number
 *   offsetX?: number  accel zero (flinch)
 *   offsetY?: number
 *   offsetYaw?: number  yaw sıfır ofseti (°)
 *   offsetPitch?: number  pitch sıfır ofseti (°)
 *   mpuGForceRange?: MpuGForceRange | string
 *   distanceM?: number
 *   reactionMs?: number
 *   flinchScore?: number
 *   yaw?: number | null
 *   pitch?: number | null
 *   accelX?: number | null
 *   accelY?: number | null
 * }} opts
 * @returns {DryFireHit}
 */
export function createDryFireHit(opts) {
  const index = Math.max(0, Number(opts.index) || 0)
  const zeroX = Number(opts.offsetX) || 0
  const zeroY = Number(opts.offsetY) || 0
  const zeroYaw = Number(opts.offsetYaw) || 0
  const zeroPitch = Number(opts.offsetPitch) || 0
  const distanceM = clampDryFireDistanceM(opts.distanceM ?? DRY_FIRE_REF_DISTANCE_M)
  const fullScale = gForceFullScale(opts.mpuGForceRange)

  const yaw = readFiniteNumber(opts.yaw)
  const pitch = readFiniteNumber(opts.pitch)
  const ax = readFiniteNumber(opts.accelX)
  const ay = readFiniteNumber(opts.accelY)

  let x = 0
  let y = 0
  if (yaw != null) {
    x = yawToAimPlaneX(normalizeAngleDeltaDeg(yaw, zeroYaw))
  }
  if (pitch != null) {
    y = pitchToAimPlaneY(normalizeAngleDeltaDeg(pitch, zeroPitch))
  }

  const deviationX = Math.round(x * 1000) / 1000
  const deviationY = Math.round(y * 1000) / 1000
  const deviationMag = Math.round(Math.hypot(deviationX, deviationY) * 1000) / 1000
  const scaled = scaleHitCoordsForDistance(x, y, distanceM)

  // İvme → sarsıntı / geri tepme (nişan konumundan bağımsız)
  let recoilMag = 0
  if (ax != null && ay != null) {
    const realX = /** @type {number} */ (ax) - zeroX
    const realY = /** @type {number} */ (ay) - zeroY
    recoilMag = Math.hypot(residualToPlane(realX, fullScale), residualToPlane(realY, fullScale))
  }

  const sensorFlinch =
    opts.flinchScore != null && Number.isFinite(Number(opts.flinchScore))
      ? clamp(0, 100, Math.round(Number(opts.flinchScore)))
      : null

  const flinchScore =
    sensorFlinch != null
      ? sensorFlinch
      : clamp(
          0,
          100,
          Math.round(
            (recoilMag > 0 ? recoilMag * 90 : deviationMag * 85) +
              Math.abs(x) * 6 +
              Math.abs(y) * 6 +
              (1 - scaled.scale) * 8,
          ),
        )

  const triggerPressMs = Math.round(
    100 + (recoilMag > 0 ? recoilMag : deviationMag) * 180 + Math.abs(x) * 30 + Math.abs(y) * 30,
  )

  const reactionMs =
    opts.reactionMs != null && Number.isFinite(Number(opts.reactionMs))
      ? Math.max(0, Math.round(Number(opts.reactionMs)))
      : undefined

  const idSeed = `${Date.now().toString(36)}-${index}-${deviationX}-${deviationY}`

  return {
    id: `df-${idSeed}`,
    index: index + 1,
    x,
    y,
    color: hitColorForIndex(index),
    triggerPressMs,
    flinchScore,
    deviationX,
    deviationY,
    deviationMag,
    createdAt: Date.now(),
    distanceM,
    ...(reactionMs != null ? { reactionMs } : {}),
  }
}

/**
 * @param {DryFireHit[]} hits
 */
export function summarizeDryFireHits(hits) {
  if (!hits.length) {
    return {
      count: 0,
      avgFlinch: null,
      avgTriggerMs: null,
      avgDeviation: null,
      groupRadius: null,
    }
  }
  const n = hits.length
  const avgFlinch = hits.reduce((s, h) => s + h.flinchScore, 0) / n
  const avgTriggerMs = hits.reduce((s, h) => s + h.triggerPressMs, 0) / n
  const avgDeviation = hits.reduce((s, h) => s + h.deviationMag, 0) / n
  const cx = hits.reduce((s, h) => s + h.x, 0) / n
  const cy = hits.reduce((s, h) => s + h.y, 0) / n
  const groupRadius =
    hits.reduce((s, h) => s + Math.hypot(h.x - cx, h.y - cy), 0) / n

  return {
    count: n,
    avgFlinch: Math.round(avgFlinch * 10) / 10,
    avgTriggerMs: Math.round(avgTriggerMs),
    avgDeviation: Math.round(avgDeviation * 1000) / 1000,
    groupRadius: Math.round(groupRadius * 1000) / 1000,
  }
}

/**
 * İki isabet arası split (ms) — reactionMs farkı veya createdAt.
 * @param {DryFireHit} from
 * @param {DryFireHit} to
 */
export function resolveShotSplitMs(from, to) {
  if (
    from?.reactionMs != null &&
    to?.reactionMs != null &&
    Number.isFinite(from.reactionMs) &&
    Number.isFinite(to.reactionMs)
  ) {
    return Math.max(0, Math.round(to.reactionMs - from.reactionMs))
  }
  const a = Number(from?.createdAt)
  const b = Number(to?.createdAt)
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return Math.max(0, Math.round(b - a))
  }
  return 0
}

/**
 * @typedef {Object} DryFireShotLink
 * @property {string} id
 * @property {number} fromIndex
 * @property {number} toIndex
 * @property {DryFireHit} from
 * @property {DryFireHit} to
 * @property {number} distance  düzlem mesafesi (−1…1 ölçeği)
 * @property {number} splitMs
 */

/**
 * Ardışık atışlar arası vektör bağlantıları.
 * @param {DryFireHit[]} hits
 * @returns {DryFireShotLink[]}
 */
export function buildShotToShotLinks(hits) {
  if (!Array.isArray(hits) || hits.length < 2) return []
  const ordered = [...hits].sort((a, b) => a.index - b.index || a.createdAt - b.createdAt)
  /** @type {DryFireShotLink[]} */
  const links = []
  for (let i = 1; i < ordered.length; i += 1) {
    const from = ordered[i - 1]
    const to = ordered[i]
    const distance = Math.round(Math.hypot(to.x - from.x, to.y - from.y) * 1000) / 1000
    links.push({
      id: `link-${from.id}-${to.id}`,
      fromIndex: from.index,
      toIndex: to.index,
      from,
      to,
      distance,
      splitMs: resolveShotSplitMs(from, to),
    })
  }
  return links
}

/**
 * Grafik serileri — havuz panelleri için (tür-özel görünümler).
 * @param {DryFireHit[]} hits
 */
export function buildDryFireGraphSeries(hits) {
  const ordered = Array.isArray(hits)
    ? [...hits].sort((a, b) => a.index - b.index || a.createdAt - b.createdAt)
    : []
  const links = buildShotToShotLinks(ordered)

  /** @type {readonly string[]} */
  const RADAR_DIRS = Object.freeze(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'])

  /** Yön kutusu (0…7) — atan2 */
  const dirBucket = (x, y) => {
    const ang = Math.atan2(-y, x) // ekran Y aşağı
    const deg = ((ang * 180) / Math.PI + 360) % 360
    return Math.round(deg / 45) % 8
  }

  /** Flinch radar — yön başına ort. flinch + örnek sayısı */
  const radarAcc = RADAR_DIRS.map((dir) => ({ dir, sum: 0, n: 0 }))
  for (const h of ordered) {
    const b = dirBucket(h.x, h.y)
    radarAcc[b].sum += h.flinchScore
    radarAcc[b].n += 1
  }
  const flinchRadar = radarAcc.map((r) => ({
    dir: r.dir,
    flinch: r.n ? Math.round((r.sum / r.n) * 10) / 10 : 0,
    count: r.n,
  }))

  const flinch = ordered.map((h) => ({
    name: String(h.index),
    flinch: h.flinchScore,
    trigger: h.triggerPressMs,
  }))

  /** Namlu izi — helezon/trace noktaları (SVG) */
  const barrelTrace = ordered.map((h, i) => {
    const t = ordered.length <= 1 ? 0 : i / (ordered.length - 1)
    const angle = i * 0.85 + Math.atan2(h.y, h.x)
    const radius = 18 + t * 62 + h.deviationMag * 28
    return {
      index: h.index,
      color: h.color,
      stability: clamp(0, 100, Math.round(100 - h.deviationMag * 90)),
      x: Math.round((100 + Math.cos(angle) * radius) * 10) / 10,
      y: Math.round((100 + Math.sin(angle) * radius + t * 12) * 10) / 10,
      deviation: h.deviationMag,
    }
  })

  const barrel = ordered.map((h, i) => {
    const prev = i > 0 ? ordered[i - 1] : null
    const jump = prev ? Math.hypot(h.x - prev.x, h.y - prev.y) : 0
    const stability = clamp(0, 100, Math.round(100 - h.deviationMag * 90 - jump * 40))
    return {
      name: String(h.index),
      stability,
      jump: Math.round(jump * 1000) / 1000,
      deviation: h.deviationMag,
    }
  })

  /** EKG tarzı jerk dalga formu */
  /** @type {{ t: number, v: number, shot?: number }[]} */
  const jerkEcg = []
  ordered.forEach((h, i) => {
    const prev = i > 0 ? ordered[i - 1] : null
    const delta = prev ? Math.abs(h.triggerPressMs - prev.triggerPressMs) : h.triggerPressMs * 0.15
    const amp = Math.max(8, Math.min(100, delta * 0.35 + h.flinchScore * 0.25))
    const base = i * 12
    jerkEcg.push({ t: base, v: 0 })
    jerkEcg.push({ t: base + 1, v: -amp * 0.18 })
    jerkEcg.push({ t: base + 2, v: amp })
    jerkEcg.push({ t: base + 3, v: -amp * 0.42 })
    jerkEcg.push({ t: base + 4, v: amp * 0.12 })
    jerkEcg.push({ t: base + 5, v: 0, shot: h.index })
    jerkEcg.push({ t: base + 8, v: 0 })
  })

  const jerk = ordered.map((h, i) => {
    const prev = i > 0 ? ordered[i - 1] : null
    const delta = prev ? Math.abs(h.triggerPressMs - prev.triggerPressMs) : 0
    return {
      name: String(h.index),
      trigger: h.triggerPressMs,
      jerk: delta,
    }
  })

  const split = links.map((l) => ({
    name: `${l.fromIndex}→${l.toIndex}`,
    splitMs: l.splitMs,
    distance: l.distance,
  }))

  const axial = ordered.map((h) => ({
    x: h.deviationX,
    y: h.deviationY,
    fill: h.color,
    index: h.index,
    flinch: h.flinchScore,
  }))

  const shotVectors = links.map((l) => ({
    name: `${l.fromIndex}→${l.toIndex}`,
    fromIndex: l.fromIndex,
    toIndex: l.toIndex,
    distance: l.distance,
    splitMs: l.splitMs,
    fromColor: l.from.color,
    toColor: l.to.color,
  }))

  return {
    flinch,
    flinchRadar,
    barrel,
    barrelTrace,
    jerk,
    jerkEcg,
    split,
    axial,
    shotVectors,
    links,
  }
}

/** @typedef {'flinch' | 'barrel' | 'jerk' | 'split' | 'axial' | 'shotVectors'} DryFireGraphId */

/** @type {readonly DryFireGraphId[]} */
export const DRY_FIRE_GRAPH_IDS = Object.freeze([
  'flinch',
  'barrel',
  'jerk',
  'split',
  'axial',
  'shotVectors',
])

/**
 * Eşit grid sütun/satır — açık grafik sayısına göre.
 * @param {number} count
 * @returns {{ cols: number, rows: number }}
 */
export function resolveEqualGraphGrid(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (n <= 0) return { cols: 1, rows: 1 }
  if (n === 1) return { cols: 1, rows: 1 }
  if (n === 2) return { cols: 2, rows: 1 }
  if (n === 3) return { cols: 3, rows: 1 }
  if (n === 4) return { cols: 2, rows: 2 }
  if (n === 5 || n === 6) return { cols: 3, rows: 2 }
  const cols = Math.ceil(Math.sqrt(n))
  return { cols, rows: Math.ceil(n / cols) }
}
