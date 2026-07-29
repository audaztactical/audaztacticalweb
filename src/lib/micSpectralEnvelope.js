/**
 * Cihaz LVL (0–100) → log-frekans spektral zarf modeli.
 * Firmware FFT göndermediği için eşik lab görselleştirmesi;
 * tarayıcı mic FFT yolu ayrı (gerçek spektrum).
 */

export const MIC_SPECTRUM_BAND_COUNT = 64
export const MIC_SPECTRUM_F_MIN = 20
export const MIC_SPECTRUM_F_MAX = 20000

/**
 * @param {number} i
 * @param {number} n
 * @param {number} fMin
 * @param {number} fMax
 */
export function bandCenterHz(i, n = MIC_SPECTRUM_BAND_COUNT, fMin = MIC_SPECTRUM_F_MIN, fMax = MIC_SPECTRUM_F_MAX) {
  const t = (i + 0.5) / n
  return fMin * Math.pow(fMax / fMin, t)
}

/**
 * @param {number} hz
 * @param {number} fMin
 * @param {number} fMax
 */
export function hzToLogNorm(hz, fMin = MIC_SPECTRUM_F_MIN, fMax = MIC_SPECTRUM_F_MAX) {
  const lo = Math.log(fMin)
  const hi = Math.log(fMax)
  return (Math.log(Math.max(fMin, Math.min(fMax, hz))) - lo) / (hi - lo)
}

/**
 * Mod bazlı spektral şekil (0…1 ağırlık).
 * @param {import('./micThresholdTestSettings').MicTestModeId} mode
 * @param {number} n
 * @returns {Float32Array}
 */
export function buildModeSpectralShape(mode, n = MIC_SPECTRUM_BAND_COUNT) {
  const shape = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const hz = bandCenterHz(i, n)
    const x = Math.log10(hz)
    let w = 0.15
    if (mode === 'dryFire') {
      // Click: 1.5–5 kHz
      w = Math.exp(-Math.pow((x - Math.log10(2800)) / 0.35, 2)) * 0.95 + 0.08
    } else if (mode === 'airsoft') {
      // Mid burst ~800–4k
      w = Math.exp(-Math.pow((x - Math.log10(1600)) / 0.42, 2)) * 0.9 + 0.1
      w += Math.exp(-Math.pow((x - Math.log10(4500)) / 0.5, 2)) * 0.35
    } else {
      // Live: broadband + bass thump + HF crack
      w = 0.22 + 0.35 * Math.exp(-Math.pow((x - Math.log10(120)) / 0.4, 2))
      w += 0.55 * Math.exp(-Math.pow((x - Math.log10(900)) / 0.55, 2))
      w += 0.7 * Math.exp(-Math.pow((x - Math.log10(3500)) / 0.45, 2))
      w += 0.4 * Math.exp(-Math.pow((x - Math.log10(9000)) / 0.5, 2))
    }
    shape[i] = Math.min(1, Math.max(0.05, w))
  }
  return shape
}

/**
 * @returns {{
 *   bands: Float32Array
 *   smooth: Float32Array
 *   peakHold: Float32Array
 *   freqs: Float32Array
 *   shape: Float32Array
 *   mode: string
 * }}
 */
export function createMicSpectralState(mode = 'liveFire') {
  const n = MIC_SPECTRUM_BAND_COUNT
  const freqs = new Float32Array(n)
  for (let i = 0; i < n; i++) freqs[i] = bandCenterHz(i, n)
  return {
    bands: new Float32Array(n),
    smooth: new Float32Array(n),
    peakHold: new Float32Array(n),
    freqs,
    shape: buildModeSpectralShape(/** @type {any} */ (mode), n),
    mode: String(mode),
  }
}

/**
 * @param {ReturnType<typeof createMicSpectralState>} state
 * @param {import('./micThresholdTestSettings').MicTestModeId} mode
 */
export function setMicSpectralMode(state, mode) {
  if (state.mode === mode) return
  state.mode = mode
  state.shape = buildModeSpectralShape(mode)
}

/**
 * LVL tick → band enerjisi (0…1).
 * @param {ReturnType<typeof createMicSpectralState>} state
 * @param {number} lvl 0–100
 * @param {{ attack?: number, decay?: number, smooth?: number, peakDecay?: number }} [opts]
 */
export function tickMicSpectralFromLvl(state, lvl, opts = {}) {
  const attack = opts.attack ?? 0.55
  const decay = opts.decay ?? 0.88
  const smoothK = opts.smooth ?? 0.12
  const peakDecay = opts.peakDecay ?? 0.992
  const energy = Math.min(1, Math.max(0, Number(lvl) || 0) / 100)
  const n = state.bands.length
  const noiseFloor = 0.02 + energy * 0.04

  for (let i = 0; i < n; i++) {
    const jitter = 0.92 + Math.random() * 0.16
    const target = noiseFloor + state.shape[i] * energy * jitter
    const prev = state.bands[i]
    const next = target >= prev ? prev + (target - prev) * attack : prev * decay
    state.bands[i] = next
    state.smooth[i] += (next - state.smooth[i]) * smoothK
    state.peakHold[i] = Math.max(next, state.peakHold[i] * peakDecay)
  }
}

/**
 * Web Audio AnalyserByteFrequencyData → log bantlara indirge.
 * @param {ReturnType<typeof createMicSpectralState>} state
 * @param {Uint8Array} freqBytes
 * @param {number} sampleRate
 * @param {{ smooth?: number, peakDecay?: number }} [opts]
 */
export function tickMicSpectralFromAnalyser(state, freqBytes, sampleRate, opts = {}) {
  const smoothK = opts.smooth ?? 0.18
  const peakDecay = opts.peakDecay ?? 0.994
  const n = state.bands.length
  const nyquist = sampleRate / 2
  const binCount = freqBytes.length

  for (let i = 0; i < n; i++) {
    const f0 = i === 0 ? MIC_SPECTRUM_F_MIN : bandCenterHz(i - 0.5, n)
    const f1 = bandCenterHz(i + 0.5, n)
    const i0 = Math.max(0, Math.floor((f0 / nyquist) * binCount))
    const i1 = Math.min(binCount - 1, Math.ceil((f1 / nyquist) * binCount))
    let sum = 0
    let c = 0
    for (let b = i0; b <= i1; b++) {
      sum += freqBytes[b]
      c++
    }
    const mag = c > 0 ? sum / (c * 255) : 0
    // Byte frequency ≈ linear magnitude; soft log feel
    const target = Math.min(1, Math.pow(mag, 0.75) * 1.15)
    state.bands[i] = target
    state.smooth[i] += (target - state.smooth[i]) * smoothK
    state.peakHold[i] = Math.max(target, state.peakHold[i] * peakDecay)
  }
}

/**
 * @param {Float32Array} bands
 * @returns {{ peakHz: number, peakDb: number }}
 */
export function estimateSpectralPeak(bands) {
  let maxI = 0
  let maxV = 0
  for (let i = 0; i < bands.length; i++) {
    if (bands[i] > maxV) {
      maxV = bands[i]
      maxI = i
    }
  }
  const peakHz = bandCenterHz(maxI, bands.length)
  const peakDb = maxV <= 1e-6 ? -60 : 20 * Math.log10(maxV)
  return { peakHz, peakDb: Math.max(-60, Math.min(0, peakDb)) }
}
