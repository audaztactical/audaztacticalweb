import { onSnapshot } from 'firebase/firestore'

/**
 * React StrictMode / HMR sırasında onSnapshot teardown hatalarını yutar.
 * @param {import('firebase/firestore').Query} q
 * @param {(snap: import('firebase/firestore').QuerySnapshot) => void} onNext
 * @param {(err: unknown) => void} [onError]
 */
export function safeOnSnapshot(q, onNext, onError) {
  let unsub = () => {}

  try {
    unsub = onSnapshot(
      q,
      (snap) => {
        try {
          onNext(snap)
        } catch (err) {
          onError?.(err)
        }
      },
      (err) => onError?.(err),
    )
  } catch (err) {
    onError?.(err)
    return () => {}
  }

  return () => {
    // StrictMode unmount sırasında watch stream ile çakışmayı azaltır
    queueMicrotask(() => {
      try {
        unsub()
      } catch {
        /* Firestore SDK teardown — ignore */
      }
    })
  }
}

/**
 * @param {unknown} ts Firestore Timestamp | Date | number | null
 */
export function timestampToMs(ts) {
  if (ts == null) return 0
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts && typeof ts.toMillis === 'function') {
    return ts.toMillis()
  }
  if (ts instanceof Date) return ts.getTime()
  const n = Number(ts)
  return Number.isFinite(n) ? n : 0
}
