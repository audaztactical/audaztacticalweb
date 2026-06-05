const PING_SRC = '/sounds/tactical-ping.mp3'
const PING_VOLUME = 0.4

/** @type {HTMLAudioElement | null} */
let audioInstance = null

function getAudio() {
  if (typeof window === 'undefined') return null
  if (!audioInstance) {
    audioInstance = new Audio(PING_SRC)
    audioInstance.volume = PING_VOLUME
    audioInstance.preload = 'auto'
  }
  return audioInstance
}

/** Taktik Muhabere — gelen ileti ses uyarısı (dosya: public/sounds/tactical-ping.mp3) */
export function playMuhabereTacticalPing() {
  const audio = getAudio()
  if (!audio) return
  try {
    audio.currentTime = 0
    const p = audio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        /* Dosya henüz eklenmemiş olabilir */
      })
    }
  } catch {
    /* ignore */
  }
}
