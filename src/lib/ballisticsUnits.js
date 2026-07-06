/**
 * Dış balistik birim dönüşümleri — saf fonksiyonlar, yan etkisiz.
 * @module ballisticsUnits
 */

/** @typedef {'fps' | 'mps' | 'mph'} VelocityUnit */
/** @typedef {'grain' | 'gram'} WeightUnit */
/** @typedef {'inch' | 'cm' | 'mm'} LengthUnit */
/** @typedef {'yard' | 'meter'} RangeUnit */
/** @typedef {'ftlb' | 'joule'} EnergyUnit */

export const GRAIN_PER_GRAM = 15.432358352941431
export const GRAMS_PER_GRAIN = 1 / GRAIN_PER_GRAM
export const FPS_PER_MPS = 3.2808398950131235
export const MPS_PER_FPS = 1 / FPS_PER_MPS
export const MPH_TO_MPS = 0.44704
export const MPS_TO_MPH = 1 / MPH_TO_MPS
export const INCH_PER_CM = 0.3937007874015748
export const CM_PER_INCH = 2.54
export const MM_PER_INCH = 25.4
export const YARD_PER_METER = 1.0936132983376778
export const METER_PER_YARD = 1 / YARD_PER_METER
export const MOA_PER_MRAD = 180 * 60 / (Math.PI * 200)
export const MRAD_PER_MOA = 1 / MOA_PER_MRAD
export const FT_LB_PER_JOULE = 0.73756214927727
export const JOULE_PER_FT_LB = 1 / FT_LB_PER_JOULE

/**
 * @param {number} value
 * @param {VelocityUnit} unit
 * @returns {number} m/s
 */
export function velocityToMps(value, unit) {
  switch (unit) {
    case 'fps':
      return value * MPS_PER_FPS
    case 'mps':
      return value
    case 'mph':
      return value * MPH_TO_MPS
    default:
      throw new Error(`Unsupported velocity unit: ${String(unit)}`)
  }
}

/**
 * @param {number} mps
 * @param {VelocityUnit} unit
 * @returns {number}
 */
export function mpsToVelocity(mps, unit) {
  switch (unit) {
    case 'fps':
      return mps * FPS_PER_MPS
    case 'mps':
      return mps
    case 'mph':
      return mps * MPS_TO_MPH
    default:
      throw new Error(`Unsupported velocity unit: ${String(unit)}`)
  }
}

/**
 * @param {number} value
 * @param {VelocityUnit} from
 * @param {VelocityUnit} to
 */
export function convertVelocity(value, from, to) {
  if (from === to) return value
  return mpsToVelocity(velocityToMps(value, from), to)
}

/**
 * @param {number} value
 * @param {WeightUnit} from
 * @param {WeightUnit} to
 */
export function convertWeight(value, from, to) {
  if (from === to) return value
  const grams = from === 'grain' ? value * GRAMS_PER_GRAIN : value
  return to === 'grain' ? grams * GRAIN_PER_GRAM : grams
}

/**
 * @param {number} value
 * @param {LengthUnit} from
 * @param {LengthUnit} to
 */
export function convertLength(value, from, to) {
  if (from === to) return value
  let inches = value
  if (from === 'cm') inches = value * INCH_PER_CM
  else if (from === 'mm') inches = value / MM_PER_INCH
  if (to === 'inch') return inches
  if (to === 'cm') return inches * CM_PER_INCH
  return inches * MM_PER_INCH
}

/**
 * @param {number} value
 * @param {RangeUnit} from
 * @param {RangeUnit} to
 */
export function convertRange(value, from, to) {
  if (from === to) return value
  const meters = from === 'yard' ? value * METER_PER_YARD : value
  return to === 'yard' ? meters * YARD_PER_METER : meters
}

/**
 * @param {number} inches
 */
export function inchesToCm(inches) {
  return inches * CM_PER_INCH
}

/**
 * @param {number} cm
 */
export function cmToInches(cm) {
  return cm * INCH_PER_CM
}

/**
 * @param {number} mrad
 */
export function mradToMoa(mrad) {
  return mrad * MOA_PER_MRAD
}

/**
 * @param {number} moa
 */
export function moaToMrad(moa) {
  return moa * MRAD_PER_MOA
}

/**
 * Yatay mesafe (m) ve düşüş (m) → MOA.
 * @param {number} dropMeters — pozitif = hedef hattının altında
 * @param {number} rangeMeters
 */
export function linearDropToMoa(dropMeters, rangeMeters) {
  if (!rangeMeters) return 0
  const radians = Math.atan2(dropMeters, rangeMeters)
  return (radians * 180) / Math.PI * 60
}

/**
 * @param {number} drop
 * @param {number} rangeMeters
 */
export function linearDropToMrad(drop, rangeMeters) {
  if (!rangeMeters) return 0
  return Math.atan2(drop, rangeMeters) * 1000
}

/**
 * @param {number} windage
 * @param {number} rangeMeters
 */
export function linearWindageToMoa(windage, rangeMeters) {
  return linearDropToMoa(windage, rangeMeters)
}

/**
 * @param {number} windage
 * @param {number} rangeMeters
 */
export function linearWindageToMrad(windage, rangeMeters) {
  return linearDropToMrad(windage, rangeMeters)
}

/**
 * MOA/MRAD click sayısı (yuvarlanmış ondalık).
 * @param {number} angleMoa
 * @param {number | undefined} clickValueMoa
 */
export function moaToClicks(angleMoa, clickValueMoa) {
  if (!clickValueMoa || clickValueMoa <= 0) return null
  return angleMoa / clickValueMoa
}

/**
 * @param {number} angleMrad
 * @param {number | undefined} clickValueMrad
 */
export function mradToClicks(angleMrad, clickValueMrad) {
  if (!clickValueMrad || clickValueMrad <= 0) return null
  return angleMrad / clickValueMrad
}

/**
 * @param {number} velocityMps
 * @param {number} massKg
 * @param {EnergyUnit} [unit='joule']
 */
export function kineticEnergy(velocityMps, massKg, unit = 'joule') {
  const joules = 0.5 * massKg * velocityMps * velocityMps
  return unit === 'ftlb' ? joules * FT_LB_PER_JOULE : joules
}

/**
 * @param {number} velocityMps
 * @param {number} tempC
 */
export function velocityToMach(velocityMps, tempC = 15) {
  const speedOfSound = 331.3 + 0.606 * tempC
  return velocityMps / speedOfSound
}
