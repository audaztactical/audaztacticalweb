const INTRO_SHOWN_KEY = 'introShown'

/** @returns {boolean} */
export function hasIntroBeenShown() {
  try {
    return localStorage.getItem(INTRO_SHOWN_KEY) === 'true'
  } catch {
    return false
  }
}

export function markIntroAsShown() {
  try {
    localStorage.setItem(INTRO_SHOWN_KEY, 'true')
  } catch {
    /* localStorage kullanılamıyorsa yoksay */
  }
}

/**
 * @param {boolean} [skipIntro]
 * @returns {boolean}
 */
export function shouldShowIntro(skipIntro = false) {
  return !hasIntroBeenShown() && !skipIntro
}
