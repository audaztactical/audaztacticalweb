/**
 * Kuru Tetik başlangıç bipi (Web Audio).
 */

let sharedCtx = /** @type {AudioContext | null} */ (null)

function getCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || /** @type {{ webkitAudioContext?: typeof AudioContext }} */ (window).webkitAudioContext
  if (!AC) return null
  if (!sharedCtx) sharedCtx = new AC()
  return sharedCtx
}

/**
 * Kısa taktiksel başlangıç bipi (go sinyali).
 * @param {{ frequency?: number, durationMs?: number, volume?: number }} [opts]
 * @returns {Promise<void>}
 */
export async function playDryFireStartBeep(opts = {}) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') await ctx.resume()
  } catch {
    /* autoplay / policy */
  }

  const frequency = Number(opts.frequency) > 0 ? Number(opts.frequency) : 880
  const durationMs = Number(opts.durationMs) > 0 ? Number(opts.durationMs) : 120
  const volume = Math.min(1, Math.max(0.05, Number(opts.volume) || 0.35))
  const now = ctx.currentTime
  const dur = durationMs / 1000

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(frequency, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + dur + 0.02)
}
