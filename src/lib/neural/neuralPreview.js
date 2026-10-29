/**
 * Operatör Beyni Dashboard önizlemesi.
 * DEV'de her zaman açık; production'da localStorage "audaz-neural-preview"="1".
 */
export function isNeuralPreviewEnabled() {
  if (import.meta.env.DEV) return true
  try {
    return localStorage.getItem('audaz-neural-preview') === '1'
  } catch {
    return false
  }
}
