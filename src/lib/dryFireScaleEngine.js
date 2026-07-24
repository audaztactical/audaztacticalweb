/**
 * Kuru Tetik — Final Scale Matrix (MOA / retina açısı).
 *
 * engagement Scale_D = REF_D / D
 * eye factor: göz–ekran mesafesi E
 * Nihai ekran boyutu (küçük açı): face_cm ≈ PAPER_CM × (E / D)
 * → aynı görsel açı (MOA) hem atış mesafesinde hem retina’da korunur.
 */

import {
  clampDryFireDistanceM,
  DRY_FIRE_REF_DISTANCE_M,
  dryFireDistanceScale,
} from './dryFireHits'

/** @typedef {'landscape' | 'portrait'} ScreenOrientationMode */

/**
 * @typedef {Object} FinalScaleMatrix
 * @property {number} engagementScale  REF/D
 * @property {number} eyeFactor        E / E_ref
 * @property {number} moaScale         retina eşleme çarpanı (E/D relatif)
 * @property {number} finalScale       board içi yüz ölçeği 0…1
 * @property {number} sx               X eksen düzeltmesi (kare → 1)
 * @property {number} sy               Y eksen düzeltmesi
 * @property {number} moaOuter         dış halka açısal boyutu (MOA @ D)
 * @property {number} idealFacePx
 * @property {number} boardPx
 * @property {number} facePx
 */

/**
 * Standart hedef kâğıdı halka çapları (fiziksel, cm).
 * @type {readonly { id: string, label: string, diameterCm: number, svgR: number }[]}
 */
export const DRY_FIRE_TARGET_RINGS = Object.freeze([
  { id: 'X', label: 'X', diameterCm: 5, svgR: 11 },
  { id: '10', label: '10', diameterCm: 10, svgR: 22 },
  { id: '9', label: '9', diameterCm: 20, svgR: 38 },
  { id: '8', label: '8', diameterCm: 30, svgR: 56 },
  { id: '7', label: '7', diameterCm: 40, svgR: 74 },
  { id: '6', label: '6', diameterCm: 50, svgR: 92 },
])

export const DRY_FIRE_TARGET_VIEWBOX = 200
export const DRY_FIRE_PAPER_DIAMETER_CM = 50

/** Referans göz–ekran mesafesi (m) — eyeFactor paydası */
export const DRY_FIRE_REF_EYE_DISTANCE_M = 1

/** @type {readonly number[]} */
export const EYE_SCREEN_DISTANCE_PRESETS = Object.freeze([0.5, 1, 2, 3])

export const EYE_SCREEN_DISTANCE_MIN_M = 0.3
export const EYE_SCREEN_DISTANCE_MAX_M = 5

/** 1 radyan = 3437.74677 MOA */
const RAD_TO_MOA = (180 * 60) / Math.PI

/**
 * @param {unknown} raw
 * @returns {ScreenOrientationMode}
 */
export function normalizeScreenOrientation(raw) {
  return raw === 'portrait' ? 'portrait' : 'landscape'
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampScreenDiagonalInches(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 6.5
  return Math.min(40, Math.max(4, Math.round(n * 10) / 10))
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampEyeScreenDistanceM(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return DRY_FIRE_REF_EYE_DISTANCE_M
  return Math.min(
    EYE_SCREEN_DISTANCE_MAX_M,
    Math.max(EYE_SCREEN_DISTANCE_MIN_M, Math.round(n * 100) / 100),
  )
}

/**
 * @param {number} widthPx
 * @param {number} heightPx
 * @param {number} diagonalInches
 */
export function estimatePxPerInch(widthPx, heightPx, diagonalInches) {
  const w = Math.max(1, widthPx)
  const h = Math.max(1, heightPx)
  const diagPx = Math.hypot(w, h)
  return diagPx / clampScreenDiagonalInches(diagonalInches)
}

/**
 * Fiziksel çapın (m) verilen mesafede MOA karşılığı.
 * @param {number} sizeM
 * @param {number} distanceM
 */
export function sizeToMoa(sizeM, distanceM) {
  const d = Math.max(0.01, distanceM)
  const s = Math.max(0, sizeM)
  return (2 * Math.atan(s / (2 * d))) * RAD_TO_MOA
}

/**
 * Retina eşlemeli ideal ekran yüz çapı (cm).
 * Küçük açı: face_cm = paper_cm × (eye_m / engagement_m)
 * @param {number} engagementDistanceM
 * @param {number} eyeScreenDistanceM
 * @param {number} [paperDiameterCm]
 */
export function idealScreenFaceCm(engagementDistanceM, eyeScreenDistanceM, paperDiameterCm = DRY_FIRE_PAPER_DIAMETER_CM) {
  const D = Math.max(0.01, clampDryFireDistanceM(engagementDistanceM))
  const E = clampEyeScreenDistanceM(eyeScreenDistanceM)
  return paperDiameterCm * (E / D)
}

/**
 * Final Scale Matrix + kare board geometrisi (aspect kilitli).
 *
 * @param {{
 *   distanceM: number
 *   eyeScreenDistanceM?: number
 *   screenOrientation: ScreenOrientationMode
 *   screenDiagonalInches: number
 *   viewportWidthPx: number
 *   viewportHeightPx: number
 *   containerWidthPx?: number
 *   containerHeightPx?: number
 *   fullscreen?: boolean
 * }} input
 */
export function resolveTargetScaleGeometry(input) {
  const distanceM = clampDryFireDistanceM(input.distanceM)
  const eyeM = clampEyeScreenDistanceM(input.eyeScreenDistanceM ?? DRY_FIRE_REF_EYE_DISTANCE_M)
  const engagementScale = dryFireDistanceScale(distanceM)
  const eyeFactor = eyeM / DRY_FIRE_REF_EYE_DISTANCE_M
  const orientation = normalizeScreenOrientation(input.screenOrientation)
  const diagonalIn = clampScreenDiagonalInches(input.screenDiagonalInches)
  const fullscreen = Boolean(input.fullscreen)

  const vw = Math.max(1, input.viewportWidthPx || 1)
  const vh = Math.max(1, input.viewportHeightPx || 1)
  const cw = Math.max(1, input.containerWidthPx || vw)
  const ch = Math.max(1, input.containerHeightPx || (fullscreen ? vh : cw))

  const pxPerInch = estimatePxPerInch(vw, vh, diagonalIn)

  // Kullanılabilir kare alan — en-boy asla bozulmaz (min kenar)
  let pad = fullscreen ? 0.94 : orientation === 'landscape' ? 0.88 : 0.96
  let maxBoardPx = Math.min(cw, ch) * pad
  if (!fullscreen) {
    if (orientation === 'landscape') {
      maxBoardPx = Math.min(cw * 0.72, ch * 0.88, maxBoardPx)
    } else {
      maxBoardPx = Math.min(cw * 0.96, ch * 0.72, maxBoardPx)
    }
  }
  // Tam ekranda üst sınırı konteynere bırak (büyük panellerde isabetler net kalsın)
  const boardCap = fullscreen ? Math.max(cw, ch) : 720
  const boardPx = Math.max(140, Math.min(maxBoardPx, boardCap))

  // MOA / retina: ekranda görünmesi gereken fiziksel yüz (cm → px)
  const idealFaceCm = idealScreenFaceCm(distanceM, eyeM)
  const idealFacePx = (idealFaceCm / 2.54) * pxPerInch

  // Board içine sığdır — oran korunarak
  const facePx = Math.max(boardPx * 0.22, Math.min(boardPx * 0.96, idealFacePx))
  const finalScale = facePx / boardPx

  // moaScale: E/D göreli (ref: 1m göz / 7m atış)
  const moaScale =
    (eyeM / distanceM) / (DRY_FIRE_REF_EYE_DISTANCE_M / DRY_FIRE_REF_DISTANCE_M)

  const paperDiameterM = DRY_FIRE_PAPER_DIAMETER_CM / 100
  const moaOuter = sizeToMoa(paperDiameterM, distanceM)

  // İsabet: yüz katmanı içinde dış halkaya normalize (% face)
  const outerSvgR = DRY_FIRE_TARGET_RINGS[DRY_FIRE_TARGET_RINGS.length - 1].svgR
  /** Dış halka yarıçapı — yüz merkezinden % (viewBox 100 ≈ %50) */
  const faceHitRadiusPct = (outerSvgR / 100) * 50
  /** Board merkezinden % (yüz ölçeği dahil) — geri uyumluluk */
  const hitRadiusPct = faceHitRadiusPct * finalScale

  const faceScreenCm = (facePx / pxPerInch) * 2.54

  /** @type {FinalScaleMatrix} */
  const matrix = {
    engagementScale,
    eyeFactor,
    moaScale,
    finalScale,
    sx: 1,
    sy: 1,
    moaOuter: Math.round(moaOuter * 10) / 10,
    idealFacePx,
    boardPx,
    facePx,
  }

  return {
    distanceM,
    eyeScreenDistanceM: eyeM,
    distanceScale: engagementScale,
    orientation,
    diagonalInches: diagonalIn,
    pxPerInch,
    boardPx,
    facePx,
    faceScreenCm: Math.round(faceScreenCm * 10) / 10,
    idealFaceCm: Math.round(idealFaceCm * 10) / 10,
    correctX: matrix.sx,
    correctY: matrix.sy,
    hitRadiusPct,
    faceHitRadiusPct,
    outerSvgR,
    finalScale,
    matrix,
    rings: DRY_FIRE_TARGET_RINGS.map((r) => ({
      ...r,
      screenDiameterCm:
        Math.round(((r.diameterCm / DRY_FIRE_PAPER_DIAMETER_CM) * faceScreenCm) * 10) / 10,
      moa: Math.round(sizeToMoa(r.diameterCm / 100, distanceM) * 10) / 10,
    })),
    cmPerSvgUnit: DRY_FIRE_PAPER_DIAMETER_CM / (outerSvgR * 2),
    refDistanceM: DRY_FIRE_REF_DISTANCE_M,
    refEyeDistanceM: DRY_FIRE_REF_EYE_DISTANCE_M,
  }
}

/**
 * @param {number} svgR
 */
export function ringDiameterCmForSvgR(svgR) {
  const hit = DRY_FIRE_TARGET_RINGS.find((r) => r.svgR === svgR)
  if (hit) return hit.diameterCm
  const outer = DRY_FIRE_TARGET_RINGS[DRY_FIRE_TARGET_RINGS.length - 1]
  return (svgR / outer.svgR) * outer.diameterCm
}
