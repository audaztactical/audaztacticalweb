/** Landing AuthModal akışı sürerken RootGate yönlendirmesin. */
const KEY = 'audaz-auth-flow'

export function beginLandingAuthFlow() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* private mode / quota */
  }
}

export function endLandingAuthFlow() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function isLandingAuthFlowActive() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
