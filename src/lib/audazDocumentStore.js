import { doc, onSnapshot } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { emitFirebaseError } from './firebaseErrorBus'

/** @typedef {{ data: Record<string, unknown> | null; loading: boolean; error: unknown | null; exists: boolean }} DocumentState */

/** @type {Map<string, { state: DocumentState; listeners: Set<(s: DocumentState) => void>; unsubscribe: () => void }>} */
const stores = new Map()

/**
 * @param {string} uid
 * @param {string} subcollection
 * @param {string} docId
 */
function storeKey(uid, subcollection, docId) {
  return `${uid}:${subcollection}:${docId}`
}

/**
 * @param {string} uid
 * @param {string} subcollection
 * @param {string} docId
 */
function ensureStore(uid, subcollection, docId) {
  const key = storeKey(uid, subcollection, docId)
  const existing = stores.get(key)
  if (existing) return existing

  /** @type {DocumentState} */
  const state = { data: null, loading: true, error: null, exists: false }
  const listeners = new Set()

  const notify = () => {
    for (const listener of listeners) {
      listener(state)
    }
  }

  let unsub = () => {}

  if (isFirebaseConfigured() && db) {
    try {
      const ref = doc(db, 'users', uid, subcollection, docId)
      unsub = onSnapshot(
        ref,
        (snap) => {
          state.error = null
          state.exists = snap.exists()
          state.data = snap.exists() ? snap.data() : null
          state.loading = false
          notify()
        },
        (err) => {
          emitFirebaseError(err)
          state.error = err
          state.loading = false
          notify()
        },
      )
    } catch (err) {
      emitFirebaseError(err)
      state.error = err
      state.loading = false
    }
  } else {
    state.loading = false
  }

  const entry = {
    state,
    listeners,
    unsubscribe: () => {
      try {
        unsub()
      } catch {
        /* teardown race */
      }
    },
  }

  stores.set(key, entry)
  return entry
}

/**
 * Paylaşımlı belge dinleyicisi — aynı uid+subcollection+docId için tek onSnapshot.
 * @param {string} uid
 * @param {string} subcollection
 * @param {string} docId
 * @param {(state: DocumentState) => void} listener
 */
export function subscribeAudazUserDoc(uid, subcollection, docId, listener) {
  const store = ensureStore(uid, subcollection, docId)
  store.listeners.add(listener)
  listener(store.state)

  return () => {
    store.listeners.delete(listener)
    if (store.listeners.size === 0) {
      store.unsubscribe()
      stores.delete(storeKey(uid, subcollection, docId))
    }
  }
}
