/**
 * Dış balistik motoru — nokta kütle (point-mass), G1/G7 drag, RK4 entegrasyonu.
 * G1 drag: McCoy Siacci G(M) tablosu (Tablo 3.3). G7 drag: BRL Cd(Mach) + F = ½ρv²CdA·(SD/BC)/m (JBM/modern solver uyumu).
 * Atmosfer: ICAO standart + sıcaklık/basınç/nem/rakım yoğunluk düzeltmesi.
 *
 * @module ballisticsEngine
 */

import {
  FPS_PER_MPS,
  MPS_PER_FPS,
  JOULE_PER_FT_LB,
  YARD_PER_METER,
  convertLength,
  convertRange,
  convertVelocity,
  convertWeight,
  kineticEnergy,
  linearDropToMoa,
  linearDropToMrad,
  linearWindageToMoa,
  linearWindageToMrad,
  moaToClicks,
  mradToClicks,
  velocityToMach,
} from './ballisticsUnits.js'

/** @typedef {'G1' | 'G7'} BcModel */
/** @typedef {'fps' | 'mps'} VelocityUnit */
/** @typedef {'grain' | 'gram'} WeightUnit */
/** @typedef {'inch' | 'cm' | 'mm'} LengthUnit */
/** @typedef {'yard' | 'meter'} RangeUnit */
/** @typedef {'ftlb' | 'joule'} EnergyUnit */

/**
 * @typedef {'station' | 'sea-level'} PressureType
 * station — girilen basınç o rakımdaki gerçek istasyon basıncı (JBM cor_prs=OFF)
 * sea-level — deniz seviyesi düzeltilmiş basınç / QNH (JBM cor_prs=ON)
 */

/**
 * @typedef {Object} BallisticsAtmosphere
 * @property {number} temperatureC
 * @property {number} pressureHpa
 * @property {number} humidityPercent
 * @property {number} [altitudeM=0]
 * @property {PressureType} [pressureType='station']
 */

/**
 * @typedef {Object} BallisticsCoriolis
 * @property {boolean} enabled
 * @property {number} latitude — derece (+ kuzey)
 * @property {number} azimuthDegrees — atış yönü (0=kuzey, 90=doğu)
 */

/**
 * @typedef {Object} BallisticsEngineInput
 * @property {number} muzzleVelocity
 * @property {VelocityUnit} [velocityUnit='fps']
 * @property {number} ballisticCoefficient
 * @property {BcModel} bcModel
 * @property {number} bulletWeight
 * @property {WeightUnit} [weightUnit='grain']
 * @property {number} [bulletDiameter=0.308] — G7 Cd drag için kalibre (inch varsayılan birim)
 * @property {LengthUnit} [bulletDiameterUnit='inch']
 * @property {number} sightHeight
 * @property {LengthUnit} [sightHeightUnit='cm']
 * @property {number} zeroDistance
 * @property {RangeUnit} [zeroUnit='meter']
 * @property {number} [shootingAngle=0] — derece (+ yukarı)
 * @property {number} [windSpeed=0]
 * @property {VelocityUnit} [windSpeedUnit='mps'] — fps | mps | mph
 * @property {number} [windAngleDegrees=90] — rüzgarın geldiği yön (90=tam yan rüzgar)
 * @property {BallisticsAtmosphere} [atmospheric]
 * @property {BallisticsCoriolis} [coriolis]
 * @property {number[]} targetDistances
 * @property {RangeUnit} [targetUnit='meter']
 * @property {number} [timeStep=0.0005] — RK4 dt (saniye)
 * @property {number} [clickValueMoa] — MOA/click (ör. 0.25)
 * @property {number} [clickValueMrad] — MRAD/click (ör. 0.1)
 * @property {EnergyUnit} [energyUnit='joule']
 */

/**
 * @typedef {Object} BallisticsPointResult
 * @property {number} distance — hedef birimi (targetUnit)
 * @property {number} dropCm
 * @property {number} dropMOA
 * @property {number} dropMRAD
 * @property {number | null} dropClicksMoa
 * @property {number | null} dropClicksMrad
 * @property {number} windageCm — pozitif = sağ sapma (crosswind soldan)
 * @property {number} windageMOA
 * @property {number} windageMRAD
 * @property {number | null} windageClicksMoa
 * @property {number | null} windageClicksMrad
 * @property {number} timeOfFlightSeconds
 * @property {number} velocityRemaining — muzzleVelocity birimi
 * @property {number} energyRemaining
 * @property {number} machNumber
 */

/**
 * @typedef {Object} BallisticsEngineOutput
 * @property {BallisticsPointResult[]} results
 * @property {number} launchAngleDegrees — sıfırlama sonrası namlu açısı
 * @property {number} airDensityRatio
 * @property {number} speedOfSoundMps
 * @property {number} bulletMassKg
 * @property {number} bcUsed
 * @property {BcModel} bcModelUsed
 */

const GRAVITY_FPS2 = 32.17404856
/** ICAO deniz seviyesi hava kütle yoğunluğu (lb/ft³) — Cd tabanlı G7 drag için. */
const STD_AIR_DENSITY_LB_FT3 = 0.07647
const STD_PRESSURE_HPA = 1013.25
const STD_TEMP_C = 15
const EARTH_OMEGA_RAD_S = 7.2921159e-5
const MAX_INTEGRATION_SECONDS = 15
const ZERO_PATH_TOLERANCE_FT = 1e-6
const ZERO_SEARCH_MAX_ITERATIONS = 64

/**
 * McCoy Tablo 3.3 — G1 referans drag fonksiyonu G(M), fps/s, BC=1 lb/in², standart hava.
 * @type {readonly [number, number][]}
 */
const G1_GM_TABLE = [
  [0.05, 0.0],
  [0.1, 0.0],
  [0.2, 0.0],
  [0.25, 1.9],
  [0.3, 3.5],
  [0.35, 5.3],
  [0.4, 7.1],
  [0.45, 9.0],
  [0.5, 11.0],
  [0.55, 13.2],
  [0.6, 15.5],
  [0.65, 18.0],
  [0.7, 20.7],
  [0.75, 23.7],
  [0.775, 25.3],
  [0.8, 27.0],
  [0.825, 28.9],
  [0.85, 30.9],
  [0.875, 33.0],
  [0.9, 35.3],
  [0.925, 37.8],
  [0.95, 40.5],
  [0.975, 43.4],
  [1.0, 46.5],
  [1.025, 49.8],
  [1.05, 53.4],
  [1.075, 57.2],
  [1.1, 61.3],
  [1.125, 65.7],
  [1.15, 70.4],
  [1.175, 75.4],
  [1.2, 80.7],
  [1.225, 86.3],
  [1.25, 92.2],
  [1.275, 98.4],
  [1.3, 104.9],
  [1.325, 111.7],
  [1.35, 118.8],
  [1.375, 126.2],
  [1.4, 133.9],
  [1.425, 141.9],
  [1.45, 150.2],
  [1.475, 158.8],
  [1.5, 167.7],
  [1.525, 176.9],
  [1.55, 186.4],
  [1.575, 196.2],
  [1.6, 206.3],
  [1.625, 216.7],
  [1.65, 227.4],
  [1.675, 238.4],
  [1.7, 249.7],
  [1.725, 261.3],
  [1.75, 273.2],
  [1.775, 285.4],
  [1.8, 297.9],
  [1.825, 310.7],
  [1.85, 323.8],
  [1.875, 337.2],
  [1.9, 350.9],
  [1.925, 364.9],
  [1.95, 379.2],
  [1.975, 393.8],
  [2.0, 408.7],
  [2.025, 423.9],
  [2.05, 439.4],
  [2.075, 455.2],
  [2.1, 471.3],
  [2.125, 487.7],
  [2.15, 504.4],
  [2.175, 521.4],
  [2.2, 538.7],
  [2.225, 556.3],
  [2.25, 574.2],
  [2.275, 592.4],
  [2.3, 610.9],
  [2.325, 629.7],
  [2.35, 648.8],
  [2.375, 668.2],
  [2.4, 687.9],
  [2.425, 707.9],
  [2.45, 728.2],
  [2.475, 748.8],
  [2.5, 769.7],
  [2.525, 790.9],
  [2.55, 812.4],
  [2.575, 834.2],
  [2.6, 856.3],
  [2.625, 878.7],
  [2.65, 901.4],
  [2.675, 924.4],
  [2.7, 947.7],
  [2.725, 971.3],
  [2.75, 995.2],
  [2.775, 1019.4],
  [2.8, 1043.9],
  [2.825, 1068.7],
  [2.85, 1093.8],
  [2.875, 1119.2],
  [2.9, 1144.9],
  [2.925, 1170.9],
  [2.95, 1197.2],
  [2.975, 1223.8],
  [3.0, 1250.7],
  [3.1, 1337.3],
  [3.2, 1426.9],
  [3.3, 1519.4],
  [3.4, 1614.8],
  [3.5, 1713.0],
  [3.6, 1814.0],
  [3.7, 1917.7],
  [3.8, 2024.1],
  [3.9, 2133.2],
  [4.0, 2245.0],
  [4.2, 2476.8],
  [4.4, 2720.0],
  [4.6, 2974.6],
  [4.8, 3240.6],
  [5.0, 3518.0],
]

/**
 * McCoy Siacci G(M) tablosu — yalnızca referans/diagnostic; G7 yörünge Cd tablosu kullanır.
 * @type {readonly [number, number][]}
 */
const G7_GM_TABLE = [
  [0.05, 0.0],
  [0.1, 0.0],
  [0.2, 0.0],
  [0.25, 1.9],
  [0.3, 3.5],
  [0.35, 5.0],
  [0.4, 6.4],
  [0.45, 7.7],
  [0.5, 8.9],
  [0.55, 10.0],
  [0.6, 11.0],
  [0.65, 11.9],
  [0.7, 12.7],
  [0.75, 13.4],
  [0.775, 13.7],
  [0.8, 14.0],
  [0.825, 14.3],
  [0.85, 14.6],
  [0.875, 14.9],
  [0.9, 15.2],
  [0.925, 15.5],
  [0.95, 15.8],
  [0.975, 16.1],
  [1.0, 16.4],
  [1.025, 17.0],
  [1.05, 17.7],
  [1.075, 18.5],
  [1.1, 19.4],
  [1.125, 20.4],
  [1.15, 21.5],
  [1.175, 22.7],
  [1.2, 24.0],
  [1.225, 25.4],
  [1.25, 26.9],
  [1.275, 28.5],
  [1.3, 30.2],
  [1.325, 32.0],
  [1.35, 33.9],
  [1.375, 35.9],
  [1.4, 38.0],
  [1.425, 40.2],
  [1.45, 42.5],
  [1.475, 44.9],
  [1.5, 47.4],
  [1.525, 50.0],
  [1.55, 52.7],
  [1.575, 55.5],
  [1.6, 58.4],
  [1.625, 61.4],
  [1.65, 64.5],
  [1.675, 67.7],
  [1.7, 71.0],
  [1.725, 74.4],
  [1.75, 77.9],
  [1.775, 81.5],
  [1.8, 85.2],
  [1.825, 89.0],
  [1.85, 92.9],
  [1.875, 96.9],
  [1.9, 101.0],
  [1.925, 105.2],
  [1.95, 109.5],
  [1.975, 113.9],
  [2.0, 118.4],
  [2.025, 123.0],
  [2.05, 127.7],
  [2.075, 132.5],
  [2.1, 137.4],
  [2.125, 142.4],
  [2.15, 147.5],
  [2.175, 152.7],
  [2.2, 158.0],
  [2.225, 163.4],
  [2.25, 168.9],
  [2.275, 174.5],
  [2.3, 180.2],
  [2.325, 186.0],
  [2.35, 191.9],
  [2.375, 197.9],
  [2.4, 204.0],
  [2.425, 210.2],
  [2.45, 216.5],
  [2.475, 222.9],
  [2.5, 229.4],
  [2.525, 236.0],
  [2.55, 242.7],
  [2.575, 249.5],
  [2.6, 256.4],
  [2.625, 263.4],
  [2.65, 270.5],
  [2.675, 277.7],
  [2.7, 285.0],
  [2.725, 292.4],
  [2.75, 299.9],
  [2.775, 307.5],
  [2.8, 315.2],
  [2.825, 323.0],
  [2.85, 330.9],
  [2.875, 338.9],
  [2.9, 347.0],
  [2.925, 355.2],
  [2.95, 363.5],
  [2.975, 371.9],
  [3.0, 380.4],
  [3.1, 414.7],
  [3.2, 450.2],
  [3.3, 486.9],
  [3.4, 524.8],
  [3.5, 563.9],
  [3.6, 604.2],
  [3.7, 645.7],
  [3.8, 688.4],
  [3.9, 732.3],
  [4.0, 777.4],
  [4.2, 871.5],
  [4.4, 970.6],
  [4.6, 1074.7],
  [4.8, 1183.8],
  [5.0, 1297.9],
]

/**
 * BRL / McCoy G7 standart mermi Cd(Mach) — pyballistics & JBM ile aynı kaynak.
 * @type {readonly [number, number][]}
 */
const G7_CD_TABLE = [
  [0, 0.1198],
  [0.05, 0.1197],
  [0.1, 0.1196],
  [0.15, 0.1194],
  [0.2, 0.1193],
  [0.25, 0.1194],
  [0.3, 0.1194],
  [0.35, 0.1194],
  [0.4, 0.1193],
  [0.45, 0.1193],
  [0.5, 0.1194],
  [0.55, 0.1193],
  [0.6, 0.1194],
  [0.65, 0.1197],
  [0.7, 0.1202],
  [0.725, 0.1207],
  [0.75, 0.1215],
  [0.775, 0.1226],
  [0.8, 0.1242],
  [0.825, 0.1266],
  [0.85, 0.1306],
  [0.875, 0.1368],
  [0.9, 0.1464],
  [0.925, 0.166],
  [0.95, 0.2054],
  [0.975, 0.2993],
  [1, 0.3803],
  [1.025, 0.4015],
  [1.05, 0.4043],
  [1.075, 0.4034],
  [1.1, 0.4014],
  [1.125, 0.3987],
  [1.15, 0.3955],
  [1.2, 0.3884],
  [1.25, 0.381],
  [1.3, 0.3732],
  [1.35, 0.3657],
  [1.4, 0.358],
  [1.5, 0.344],
  [1.55, 0.3376],
  [1.6, 0.3315],
  [1.65, 0.326],
  [1.7, 0.3209],
  [1.75, 0.316],
  [1.8, 0.3117],
  [1.85, 0.3078],
  [1.9, 0.3042],
  [1.95, 0.301],
  [2, 0.298],
  [2.05, 0.2951],
  [2.1, 0.2922],
  [2.15, 0.2892],
  [2.2, 0.2864],
  [2.25, 0.2835],
  [2.3, 0.2807],
  [2.35, 0.2779],
  [2.4, 0.2752],
  [2.45, 0.2725],
  [2.5, 0.2697],
  [2.55, 0.267],
  [2.6, 0.2643],
  [2.65, 0.2615],
  [2.7, 0.2588],
  [2.75, 0.2561],
  [2.8, 0.2533],
  [2.85, 0.2506],
  [2.9, 0.2479],
  [2.95, 0.2451],
  [3, 0.2424],
  [3.1, 0.2368],
  [3.2, 0.2313],
  [3.3, 0.2258],
  [3.4, 0.2205],
  [3.5, 0.2154],
  [3.6, 0.2106],
  [3.7, 0.206],
  [3.8, 0.2017],
  [3.9, 0.1975],
  [4, 0.1935],
  [4.2, 0.1861],
  [4.4, 0.1793],
  [4.6, 0.173],
  [4.8, 0.1672],
  [5, 0.1618],
]

/**
 * @typedef {Object} G7DragPhysics
 * @property {number} formFactor — SD/BC (i)
 * @property {number} areaFt2 — πd²/4
 * @property {number} massSlug — m/g
 */

/** @type {G7DragPhysics | null} */
let activeG7Physics = null

/**
 * G7 Cd tabanlı drag için mermi geometrisi (BC lb/in², çap inch, ağırlık lb).
 * @param {number} bulletWeightLb
 * @param {number} bulletDiameterIn
 * @param {number} bc
 * @returns {G7DragPhysics}
 */
export function buildG7DragPhysics(bulletWeightLb, bulletDiameterIn, bc) {
  const sd = bulletWeightLb / (bulletDiameterIn * bulletDiameterIn)
  const diameterFt = bulletDiameterIn / 12
  return {
    formFactor: sd / Math.max(0.01, bc),
    areaFt2: (Math.PI * diameterFt * diameterFt) / 4,
    massSlug: bulletWeightLb / GRAVITY_FPS2,
  }
}

/** @param {readonly [number, number][]} table @param {number} mach */
function interpolateDragG(table, mach) {
  const m = Math.max(table[0][0], Math.min(table[table.length - 1][0], mach))
  for (let i = 0; i < table.length - 1; i += 1) {
    const [m0, g0] = table[i]
    const [m1, g1] = table[i + 1]
    if (m >= m0 && m <= m1) {
      const t = (m - m0) / (m1 - m0)
      return g0 + t * (g1 - g0)
    }
  }
  return table[table.length - 1][1]
}

/**
 * @param {number} velocityFps
 * @param {BcModel} model
 * @param {number} [speedOfSoundFps=1116.45]
 */
function dragFunctionG(velocityFps, model, speedOfSoundFps = 1116.45) {
  const mach = Math.max(0, velocityFps / Math.max(1, speedOfSoundFps))
  return interpolateDragG(model === 'G7' ? G7_GM_TABLE : G1_GM_TABLE, mach)
}

/**
 * ICAO barometrik lapse — deniz seviyesi basıncından rakımdaki istasyon basıncına.
 * @param {number} altitudeM
 * @param {number} [referenceTempK=288.15]
 */
function stationPressureRatioFromSeaLevel(altitudeM, referenceTempK = STD_TEMP_C + 273.15) {
  if (altitudeM <= 0) return 1
  return Math.pow(1 - 0.0065 * altitudeM / referenceTempK, 5.255876)
}

/**
 * ICAO + nem + rakım yoğunluk oranı.
 * @param {BallisticsAtmosphere | undefined} atm
 */
export function computeAtmosphericFactors(atm) {
  const temperatureC = atm?.temperatureC ?? STD_TEMP_C
  const pressureHpa = atm?.pressureHpa ?? STD_PRESSURE_HPA
  const humidityPercent = Math.min(100, Math.max(0, atm?.humidityPercent ?? 0))
  const altitudeM = Math.max(0, atm?.altitudeM ?? 0)
  const pressureType = atm?.pressureType ?? 'station'

  const tempK = temperatureC + 273.15
  const stdTempK = STD_TEMP_C + 273.15

  let pressurePa = pressureHpa * 100
  if (pressureType === 'sea-level') {
    pressurePa *= stationPressureRatioFromSeaLevel(altitudeM, stdTempK)
  }

  const pressureRatio = pressurePa / (STD_PRESSURE_HPA * 100)

  const saturationVaporPa = 611.657 * Math.exp((17.625 * temperatureC) / (temperatureC + 243.04))
  const vaporPressurePa = (humidityPercent / 100) * saturationVaporPa
  const virtualTempK = tempK / (1 - (vaporPressurePa / pressurePa) * (1 - 0.378))

  const densityRatio = (pressureRatio * stdTempK) / virtualTempK
  const tempRankine = tempK * (9 / 5)
  const speedOfSoundFps = 49.0223 * Math.sqrt(tempRankine)
  const speedOfSoundMps = speedOfSoundFps * MPS_PER_FPS

  return {
    densityRatio: Math.max(0.5, densityRatio),
    speedOfSoundFps,
    speedOfSoundMps,
    temperatureC,
  }
}

/**
 * Rifleman's rule — yatay etkili menzil (feet).
 * @param {number} slantRangeFt
 * @param {number} angleDeg
 */
export function riflemanEffectiveRangeFt(slantRangeFt, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return slantRangeFt * Math.cos(rad)
}

/**
 * @param {number} windSpeedFps
 * @param {number} windAngleDegrees — rüzgarın geldiği yön; 90° = tam yan (sağdan)
 */
export function crosswindComponentFps(windSpeedFps, windAngleDegrees) {
  const rad = (windAngleDegrees * Math.PI) / 180
  return windSpeedFps * Math.sin(rad)
}

/**
 * Mann / Didion lag kuralı — JBM ve klasik dış balistik windage.
 * Sapma = crosswind × (TOF − menzil / namlu hızı).
 * @param {number} crosswindFps
 * @param {number} timeOfFlightSeconds
 * @param {number} rangeFt — yatay menzil
 * @param {number} muzzleVelocityFps
 */
export function mannDidionWindageFt(crosswindFps, timeOfFlightSeconds, rangeFt, muzzleVelocityFps) {
  const lagSeconds = Math.max(0, timeOfFlightSeconds - rangeFt / Math.max(1, muzzleVelocityFps))
  return crosswindFps * lagSeconds
}

/**
 * @param {number} velocityFps
 * @param {number} bc
 * @param {BcModel} model
 * @param {number} densityRatio
 * @param {number} speedOfSoundFps
 */
function dragRetardationFps2(velocityFps, bc, model, densityRatio, speedOfSoundFps) {
  const v = Math.max(1, Math.abs(velocityFps))
  if (model === 'G7' && activeG7Physics) {
    const mach = v / Math.max(1, speedOfSoundFps)
    const cd = interpolateDragG(G7_CD_TABLE, mach)
    const rhoSlug = (STD_AIR_DENSITY_LB_FT3 * densityRatio) / GRAVITY_FPS2
    return (
      (0.5 * rhoSlug * cd * v * v * activeG7Physics.areaFt2 * activeG7Physics.formFactor) /
      Math.max(1e-9, activeG7Physics.massSlug)
    )
  }
  const g = dragFunctionG(v, model, speedOfSoundFps)
  return (g * densityRatio) / Math.max(0.01, bc)
}

/**
 * @typedef {Object} TrajectoryState
 * @property {number} x — downrange (ft)
 * @property {number} y — vertical (ft, + up)
 * @property {number} z — crossrange windage (ft, + right)
 * @property {number} vx
 * @property {number} vy
 * @property {number} vz
 * @property {number} t
 */

/**
 * @param {TrajectoryState} state
 * @param {number} dt
 * @param {number} launchAngleRad
 * @param {number} bc
 * @param {BcModel} model
 * @param {number} densityRatio
 * @param {number} windXfps — crosswind (ft/s, + right)
 * @param {number} gravityAlongFtS2
 * @param {BallisticsCoriolis | undefined} coriolis
 * @param {number} speedOfSoundFps
 */
function computeDerivatives(
  state,
  launchAngleRad,
  bc,
  model,
  densityRatio,
  windXfps,
  gravityAlongFtS2,
  coriolis,
  speedOfSoundFps,
) {
  const relVx = state.vx
  const relVy = state.vy
  const relVz = state.vz - windXfps
  const v = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz)
  const drag = dragRetardationFps2(v, bc, model, densityRatio, speedOfSoundFps)
  const axDrag = v > 1 ? (-drag * relVx) / v : 0
  const ayDrag = v > 1 ? (-drag * relVy) / v : 0
  const azDrag = v > 1 ? (-drag * relVz) / v : 0

  let axCor = 0
  let ayCor = 0
  let azCor = 0
  if (coriolis?.enabled) {
    const latRad = (coriolis.latitude * Math.PI) / 180
    const azRad = (coriolis.azimuthDegrees * Math.PI) / 180
    const omega = EARTH_OMEGA_RAD_S
    const vxM = state.vx * MPS_PER_FPS
    const vyM = state.vy * MPS_PER_FPS
    const vzM = state.vz * MPS_PER_FPS
    const axM =
      2 * omega * (Math.sin(latRad) * vzM - Math.cos(latRad) * Math.sin(azRad) * vyM)
    const ayM = 2 * omega * Math.cos(latRad) * Math.sin(azRad) * vxM
    const azM = -2 * omega * Math.sin(latRad) * vxM
    axCor = axM * FPS_PER_MPS
    ayCor = ayM * FPS_PER_MPS
    azCor = azM * FPS_PER_MPS
  }

  return {
    dx: state.vx,
    dy: state.vy,
    dz: state.vz,
    dvx: axDrag + axCor,
    dvy: ayDrag + ayCor - gravityAlongFtS2,
    dvz: azDrag + azCor,
    dt: 1,
  }
}

/**
 * @param {TrajectoryState} state
 * @param {number} dt
 * @param {number} launchAngleRad
 * @param {number} bc
 * @param {BcModel} model
 * @param {number} densityRatio
 * @param {number} windXfps
 * @param {number} gravityAlongFtS2
 * @param {BallisticsCoriolis | undefined} coriolis
 * @param {number} speedOfSoundFps
 */
function rk4Step(
  state,
  dt,
  launchAngleRad,
  bc,
  model,
  densityRatio,
  windXfps,
  gravityAlongFtS2,
  coriolis,
  speedOfSoundFps,
) {
  const k1 = computeDerivatives(
    state,
    launchAngleRad,
    bc,
    model,
    densityRatio,
    windXfps,
    gravityAlongFtS2,
    coriolis,
    speedOfSoundFps,
  )
  const s2 = {
    x: state.x + k1.dx * dt * 0.5,
    y: state.y + k1.dy * dt * 0.5,
    z: state.z + k1.dz * dt * 0.5,
    vx: state.vx + k1.dvx * dt * 0.5,
    vy: state.vy + k1.dvy * dt * 0.5,
    vz: state.vz + k1.dvz * dt * 0.5,
    t: state.t + dt * 0.5,
  }
  const k2 = computeDerivatives(
    s2,
    launchAngleRad,
    bc,
    model,
    densityRatio,
    windXfps,
    gravityAlongFtS2,
    coriolis,
    speedOfSoundFps,
  )
  const s3 = {
    x: state.x + k2.dx * dt * 0.5,
    y: state.y + k2.dy * dt * 0.5,
    z: state.z + k2.dz * dt * 0.5,
    vx: state.vx + k2.dvx * dt * 0.5,
    vy: state.vy + k2.dvy * dt * 0.5,
    vz: state.vz + k2.dvz * dt * 0.5,
    t: state.t + dt * 0.5,
  }
  const k3 = computeDerivatives(
    s3,
    launchAngleRad,
    bc,
    model,
    densityRatio,
    windXfps,
    gravityAlongFtS2,
    coriolis,
    speedOfSoundFps,
  )
  const s4 = {
    x: state.x + k3.dx * dt,
    y: state.y + k3.dy * dt,
    z: state.z + k3.dz * dt,
    vx: state.vx + k3.dvx * dt,
    vy: state.vy + k3.dvy * dt,
    vz: state.vz + k3.dvz * dt,
    t: state.t + dt,
  }
  const k4 = computeDerivatives(
    s4,
    launchAngleRad,
    bc,
    model,
    densityRatio,
    windXfps,
    gravityAlongFtS2,
    coriolis,
    speedOfSoundFps,
  )

  return {
    x: state.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    y: state.y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
    z: state.z + (dt / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz),
    vx: state.vx + (dt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx),
    vy: state.vy + (dt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy),
    vz: state.vz + (dt / 6) * (k1.dvz + 2 * k2.dvz + 2 * k3.dvz + k4.dvz),
    t: state.t + dt,
  }
}

/**
 * LOS yüksekliği (ft). Bore y=0 iken x=0'da LOS y=sightFt; x=zeroFt'te LOS y=0.
 * @param {number} xFt
 * @param {number} zeroFt
 * @param {number} sightHeightIn
 */
function lineOfSightYFt(xFt, zeroFt, sightHeightIn) {
  const sightFt = sightHeightIn / 12
  if (zeroFt <= 0) return sightFt
  return sightFt * (1 - xFt / zeroFt)
}

/**
 * @typedef {Object} ZeroSampleResult
 * @property {number} pathErrorFt — yBullet - yLos (0 = LOS üzerinde)
 * @property {number} vyFps — hedef menzilde dikey hız
 */

/**
 * @param {number} launchAngleDeg
 * @param {number} muzzleVelocityFps
 * @param {number} bc
 * @param {BcModel} model
 * @param {number} densityRatio
 * @param {number} zeroFt
 * @param {number} sightHeightIn
 * @param {number} dt
 * @param {number} shootingAngleDeg
 * @param {number} windXfps
 * @param {BallisticsCoriolis | undefined} coriolis
 * @param {number} speedOfSoundFps
 * @returns {ZeroSampleResult}
 */
function sampleZeroPathError(
  launchAngleDeg,
  muzzleVelocityFps,
  bc,
  model,
  densityRatio,
  zeroFt,
  sightHeightIn,
  dt,
  shootingAngleDeg,
  windXfps,
  coriolis,
  speedOfSoundFps,
) {
  const angleRad = (launchAngleDeg * Math.PI) / 180
  const slopeRad = (shootingAngleDeg * Math.PI) / 180
  const gravityAlong = GRAVITY_FPS2 * Math.cos(slopeRad)
  const cosSlope = Math.cos(slopeRad)
  const sinSlope = Math.sin(slopeRad)

  /** @type {TrajectoryState} */
  let state = {
    x: 0,
    y: 0,
    z: 0,
    vx: muzzleVelocityFps * Math.cos(angleRad) * cosSlope,
    vy: muzzleVelocityFps * Math.sin(angleRad) * cosSlope - muzzleVelocityFps * Math.cos(angleRad) * sinSlope,
    vz: 0,
    t: 0,
  }

  let prev = { ...state }
  while (state.x < zeroFt && state.t < MAX_INTEGRATION_SECONDS) {
    prev = state
    state = rk4Step(
      state,
      dt,
      angleRad,
      bc,
      model,
      densityRatio,
      windXfps,
      gravityAlong,
      coriolis,
      speedOfSoundFps,
    )
    if (state.y < -5000) break
  }

  const frac = zeroFt > prev.x ? (zeroFt - prev.x) / Math.max(1e-9, state.x - prev.x) : 1
  const yAtZero = prev.y + frac * (state.y - prev.y)
  const vyAtZero = prev.vy + frac * (state.vy - prev.vy)
  const losY = lineOfSightYFt(zeroFt, zeroFt, sightHeightIn)

  return {
    pathErrorFt: yAtZero - losY,
    vyFps: vyAtZero,
  }
}

/**
 * @param {number} muzzleVelocityFps
 * @param {number} bc
 * @param {BcModel} model
 * @param {number} densityRatio
 * @param {number} zeroFt
 * @param {number} sightHeightIn
 * @param {number} dt
 * @param {number} shootingAngleDeg
 * @param {number} windXfps
 * @param {BallisticsCoriolis | undefined} coriolis
 * @param {number} speedOfSoundFps
 */
function findLaunchAngle(
  muzzleVelocityFps,
  bc,
  model,
  densityRatio,
  zeroFt,
  sightHeightIn,
  dt,
  shootingAngleDeg,
  windXfps,
  coriolis,
  speedOfSoundFps,
) {
  const sightFt = sightHeightIn / 12
  const losAngleDeg = zeroFt > 0 ? (Math.atan(sightFt / zeroFt) * 180) / Math.PI : 0
  let lo = Math.max(0, losAngleDeg * 0.35)
  let hi = Math.max(lo + 0.01, losAngleDeg * 2.5 + 0.08)

  const sample = (angleDeg) =>
    sampleZeroPathError(
      angleDeg,
      muzzleVelocityFps,
      bc,
      model,
      densityRatio,
      zeroFt,
      sightHeightIn,
      dt,
      shootingAngleDeg,
      windXfps,
      coriolis,
      speedOfSoundFps,
    )

  let fLo = sample(lo).pathErrorFt
  let fHi = sample(hi).pathErrorFt

  for (let expand = 0; expand < 8 && fLo * fHi > 0; expand += 1) {
    hi += 0.05
    fHi = sample(hi).pathErrorFt
  }

  for (let i = 0; i < ZERO_SEARCH_MAX_ITERATIONS; i += 1) {
    const mid = (lo + hi) / 2
    const midSample = sample(mid)
    const fMid = midSample.pathErrorFt

    if (Math.abs(fMid) < ZERO_PATH_TOLERANCE_FT && midSample.vyFps <= 0) return mid

    if (fLo * fMid <= 0) {
      hi = mid
      fHi = fMid
    } else {
      lo = mid
      fLo = fMid
    }
  }

  return (lo + hi) / 2
}

/**
 * @param {number} launchAngleDeg
 * @param {number} muzzleVelocityFps
 * @param {number} bc
 * @param {BcModel} model
 * @param {number} densityRatio
 * @param {number} sightHeightIn
 * @param {number} zeroFt
 * @param {number} targetFt
 * @param {number} dt
 * @param {number} shootingAngleDeg
 * @param {number} windXfps
 * @param {BallisticsCoriolis | undefined} coriolis
 * @param {number} speedOfSoundFps
 */
function simulateToTarget(
  launchAngleDeg,
  muzzleVelocityFps,
  bc,
  model,
  densityRatio,
  sightHeightIn,
  zeroFt,
  targetFt,
  dt,
  shootingAngleDeg,
  windXfps,
  coriolis,
  speedOfSoundFps,
) {
  const angleRad = (launchAngleDeg * Math.PI) / 180
  const slopeRad = (shootingAngleDeg * Math.PI) / 180
  const gravityAlong = GRAVITY_FPS2 * Math.cos(slopeRad)
  const cosSlope = Math.cos(slopeRad)
  const sinSlope = Math.sin(slopeRad)

  /** @type {TrajectoryState} */
  let state = {
    x: 0,
    y: 0,
    z: 0,
    vx: muzzleVelocityFps * Math.cos(angleRad) * cosSlope,
    vy: muzzleVelocityFps * Math.sin(angleRad) * cosSlope - muzzleVelocityFps * Math.cos(angleRad) * sinSlope,
    vz: 0,
    t: 0,
  }

  let prev = { ...state }
  while (state.x < targetFt && state.t < MAX_INTEGRATION_SECONDS && state.y > -5000) {
    prev = state
    state = rk4Step(
      state,
      dt,
      angleRad,
      bc,
      model,
      densityRatio,
      windXfps,
      gravityAlong,
      coriolis,
      speedOfSoundFps,
    )
  }

  const frac = targetFt > prev.x ? (targetFt - prev.x) / Math.max(1e-9, state.x - prev.x) : 1
  const t = prev.t + frac * (state.t - prev.t)
  const yBullet = prev.y + frac * (state.y - prev.y)
  const z = prev.z + frac * (state.z - prev.z)
  const vx = prev.vx + frac * (state.vx - prev.vx)
  const vy = prev.vy + frac * (state.vy - prev.vy)
  const vz = prev.vz + frac * (state.vz - prev.vz)
  const v = Math.sqrt(vx * vx + vy * vy + vz * vz)
  const losY = lineOfSightYFt(targetFt, zeroFt, sightHeightIn)
  const dropFt = losY - yBullet
  const windageFt = mannDidionWindageFt(windXfps, t, targetFt, muzzleVelocityFps)

  return { t, dropFt, windageFt, velocityFps: v, vx, vy, vz }
}

/**
 * Ana balistik hesap motoru.
 * @param {BallisticsEngineInput} input
 * @returns {BallisticsEngineOutput}
 */
export function calculateBallistics(input) {
  const velocityUnit = input.velocityUnit ?? 'fps'
  const weightUnit = input.weightUnit ?? 'grain'
  const sightHeightUnit = input.sightHeightUnit ?? 'cm'
  const zeroUnit = input.zeroUnit ?? 'meter'
  const targetUnit = input.targetUnit ?? 'meter'
  const windSpeedUnit = input.windSpeedUnit ?? 'mps'
  const energyUnit = input.energyUnit ?? 'joule'
  const dt = input.timeStep ?? 0.0005
  const shootingAngle = input.shootingAngle ?? 0
  const windAngleDegrees = input.windAngleDegrees ?? 90

  const muzzleVelocityFps = convertVelocity(input.muzzleVelocity, velocityUnit, 'fps')
  const bulletMassKg = convertWeight(input.bulletWeight, weightUnit, 'gram') / 1000
  const sightHeightIn = convertLength(input.sightHeight, sightHeightUnit, 'inch')
  const zeroM = convertRange(input.zeroDistance, zeroUnit, 'meter')
  const zeroFt = zeroM * YARD_PER_METER * 3
  const bc = Math.max(0.01, input.ballisticCoefficient)
  const model = input.bcModel === 'G1' ? 'G1' : 'G7'
  const bulletWeightLb = convertWeight(input.bulletWeight, weightUnit, 'grain') / 7000
  const bulletDiameterIn = convertLength(
    input.bulletDiameter ?? 0.308,
    input.bulletDiameterUnit ?? 'inch',
    'inch',
  )

  const atmo = computeAtmosphericFactors(input.atmospheric)
  const windSpeedFps = convertVelocity(input.windSpeed ?? 0, windSpeedUnit, 'fps')
  const windXfps = crosswindComponentFps(windSpeedFps, windAngleDegrees)

  activeG7Physics = model === 'G7' ? buildG7DragPhysics(bulletWeightLb, bulletDiameterIn, bc) : null
  try {
  const launchAngleDeg = findLaunchAngle(
    muzzleVelocityFps,
    bc,
    model,
    atmo.densityRatio,
    zeroFt,
    sightHeightIn,
    dt,
    shootingAngle,
    windXfps,
    input.coriolis,
    atmo.speedOfSoundFps,
  )

  /** @type {BallisticsPointResult[]} */
  const results = []
  const sortedTargets = [...(input.targetDistances ?? [])].sort((a, b) => a - b)

  for (const dist of sortedTargets) {
    const targetM = convertRange(dist, targetUnit, 'meter')
    const slantFt = targetM * YARD_PER_METER * 3
    const effectiveFt = riflemanEffectiveRangeFt(slantFt, shootingAngle)
    const sim = simulateToTarget(
      launchAngleDeg,
      muzzleVelocityFps,
      bc,
      model,
      atmo.densityRatio,
      sightHeightIn,
      zeroFt,
      effectiveFt,
      dt,
      shootingAngle,
      windXfps,
      input.coriolis,
      atmo.speedOfSoundFps,
    )

    const dropCm = sim.dropFt * 12 * 2.54
    const windageCm = sim.windageFt * 12 * 2.54
    const rangeM = effectiveFt / 3 / YARD_PER_METER
    const dropMoa = linearDropToMoa(dropCm / 100, rangeM)
    const dropMrad = linearDropToMrad(dropCm / 100, rangeM)
    const windMoa = linearWindageToMoa(windageCm / 100, rangeM)
    const windMrad = linearWindageToMrad(windageCm / 100, rangeM)
    const velocityRemaining =
      velocityUnit === 'fps' ? sim.velocityFps : sim.velocityFps * MPS_PER_FPS
    const energyRemaining =
      energyUnit === 'ftlb'
        ? kineticEnergy(sim.velocityFps * MPS_PER_FPS, bulletMassKg, 'joule') * (1 / JOULE_PER_FT_LB)
        : kineticEnergy(sim.velocityFps * MPS_PER_FPS, bulletMassKg, 'joule')
    const mach = velocityToMach(sim.velocityFps * MPS_PER_FPS, atmo.temperatureC)

    results.push({
      distance: dist,
      dropCm,
      dropMOA: dropMoa,
      dropMRAD: dropMrad,
      dropClicksMoa: moaToClicks(dropMoa, input.clickValueMoa),
      dropClicksMrad: mradToClicks(dropMrad, input.clickValueMrad),
      windageCm,
      windageMOA: windMoa,
      windageMRAD: windMrad,
      windageClicksMoa: moaToClicks(windMoa, input.clickValueMoa),
      windageClicksMrad: mradToClicks(windMrad, input.clickValueMrad),
      timeOfFlightSeconds: sim.t,
      velocityRemaining,
      energyRemaining,
      machNumber: mach,
    })
  }

  return {
    results,
    launchAngleDegrees: launchAngleDeg,
    airDensityRatio: atmo.densityRatio,
    speedOfSoundMps: atmo.speedOfSoundMps,
    bulletMassKg,
    bcUsed: bc,
    bcModelUsed: model,
  }
  } finally {
    activeG7Physics = null
  }
}

export {
  G1_GM_TABLE,
  G7_GM_TABLE,
  G7_CD_TABLE,
  dragFunctionG,
  stationPressureRatioFromSeaLevel,
  computeAtmosphericFactors as computeAtmosphere,
}
