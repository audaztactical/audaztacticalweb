import { doc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { emitFirebaseError } from './firebaseErrorBus'
import { parseOperatorPresenceFromUserDoc } from './operatorPresence'
import { safeOnSnapshot } from './firestoreSnapshot'

/** @typedef {import('./operatorPresence').OperatorPresenceSnapshot} OperatorPresenceSnapshot */

/** @type {Map<string, {
 *   state: OperatorPresenceSnapshot
 *   listeners: Set<(s: OperatorPresenceSnapshot) => void>
 *   unsubscribe: () => void
 * }>} */
const stores = new Map()

const EMPTY_PRESENCE = { lastSeenMs: 0, isOnlineFlag: false }

/**
 * @param {string} uid
 */
function ensurePresenceStore(uid) {
  const id = String(uid ?? '').trim()
  if (!id) return null

  const existing = stores.get(id)
  if (existing) return existing

  /** @type {OperatorPresenceSnapshot} */
  let state = { ...EMPTY_PRESENCE }
  const listeners = new Set()

  const notify = () => {
    for (const listener of listeners) {
      listener(state)
    }
  }

  let unsub = () => {}

  if (isFirebaseConfigured() && db) {
    unsub = safeOnSnapshot(
      doc(db, 'users', id),
      (snap) => {
        state = snap.exists() ? parseOperatorPresenceFromUserDoc(snap.data()) : { ...EMPTY_PRESENCE }
        notify()
      },
      (err) => emitFirebaseError(err),
    )
  }

  const entry = {
    state,
    listeners,
    unsubscribe: () => {
      try {
        unsub()
      } catch {
        /* teardown */
      }
    },
  }

  stores.set(id, entry)
  return entry
}

/**
 * @param {string} uid
 * @param {(snapshot: OperatorPresenceSnapshot) => void} listener
 */
export function subscribeOperatorPresence(uid, listener) {
  const entry = ensurePresenceStore(uid)
  if (!entry) {
    listener({ ...EMPTY_PRESENCE })
    return () => {}
  }

  entry.listeners.add(listener)
  listener(entry.state)

  return () => {
    entry.listeners.delete(listener)
    if (entry.listeners.size === 0) {
      entry.unsubscribe()
      stores.delete(String(uid ?? '').trim())
    }
  }
}
