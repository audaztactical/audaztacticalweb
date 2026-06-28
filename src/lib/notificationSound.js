/** @type {AudioContext | null} */
let audioContext = null

/**
 * @returns {boolean}
 */
export function isNotificationSoundEnabled() {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem('audaz_notification_sound_enabled')
  if (stored === null) return true
  return stored === '1'
}

/**
 * @param {boolean} enabled
 */
export function setNotificationSoundEnabled(enabled) {
  if (typeof window === 'undefined') return
  localStorage.setItem('audaz_notification_sound_enabled', enabled ? '1' : '0')
}

/**
 * Tarayıcı autoplay kilidini kullanıcı jestiyle açar (hata fırlatmaz).
 */
export function unlockNotificationAudio() {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!audioContext) audioContext = new Ctx()
    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {})
    }
  } catch {
    /* tarayıcı kısıtlaması — sessiz geç */
  }
}

/**
 * @param {AudioContext} ctx
 * @param {number} frequency
 * @param {number} start
 * @param {number} duration
 */
function playTone(ctx, frequency, start, duration) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'square'
  oscillator.frequency.value = frequency

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

/**
 * Askeri tarz 2 kısa bip: 440 Hz + 880 Hz (Web Audio API, harici dosya yok).
 * Autoplay engellenirse sessizce atlanır.
 */
export function playNotificationSound() {
  if (!isNotificationSoundEnabled()) return

  try {
    if (typeof window === 'undefined') return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return

    if (!audioContext) audioContext = new Ctx()
    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {})
      if (audioContext.state === 'suspended') return
    }

    const now = audioContext.currentTime
    playTone(audioContext, 440, now, 0.09)
    playTone(audioContext, 880, now + 0.14, 0.09)
  } catch {
    /* autoplay / AudioContext — sessiz geç */
  }
}
