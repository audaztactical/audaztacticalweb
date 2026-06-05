/** @type {Set<(err: unknown) => void>} */
const subscribers = new Set()

/**
 * @param {(err: unknown) => void} fn
 * @returns {() => void}
 */
export function subscribeFirebaseErrors(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function emitFirebaseError(err) {
  subscribers.forEach((fn) => {
    try {
      fn(err)
    } catch {
      /* ignore subscriber failures */
    }
  })
}
