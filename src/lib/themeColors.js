/**
 * DOM'daki tema CSS değişkenlerini okur (canvas/SVG/inline style için).
 * @param {string} name
 * @param {string} [fallback='']
 */
export function getCssVar(name, fallback = '') {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/** @param {string} [fallback='#00ff41'] */
export function getAccentColor(fallback = '#00ff41') {
  return getCssVar('--accent-color', fallback)
}

/** @param {string} [fallback='#050505'] */
export function getBgColor(fallback = '#050505') {
  return getCssVar('--bg-color', fallback)
}

/** @param {string} [fallback='#ffffff'] */
export function getTextColor(fallback = '#ffffff') {
  return getCssVar('--text-color', fallback)
}
