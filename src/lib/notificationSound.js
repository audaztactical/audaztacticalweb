import notificationSoundUrl from '../assets/notification-sound.mp3'

/** @type {HTMLAudioElement | null} */
let audioElement = null

/**
 * @returns {HTMLAudioElement | null}
 */
function getNotificationAudio() {
  if (typeof window === 'undefined') return null
  if (!audioElement) {
    audioElement = new Audio(notificationSoundUrl)
    audioElement.preload = 'auto'
  }
  return audioElement
}

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
    const audio = getNotificationAudio()
    if (audio) void audio.load()
  } catch {
    /* tarayıcı kısıtlaması — sessiz geç */
  }
}

/**
 * Bildirim zil sesi (notification-sound.mp3).
 * Autoplay engellenirse sessizce atlanır.
 */
export function playNotificationSound() {
  if (!isNotificationSoundEnabled()) return

  try {
    if (typeof window === 'undefined') return
    const audio = getNotificationAudio()
    if (!audio) return

    audio.currentTime = 0
    void audio.play().catch(() => {})
  } catch {
    /* autoplay — sessiz geç */
  }
}
