import { onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { audazCollectionRef } from './dataManager'
import { isFirebaseConfigured } from './firebase'
import { emitFirebaseError } from './firebaseErrorBus'

/** @typedef {import('./dataManager').AudazDataDomain} AudazDataDomain */

/** @typedef {{ items: Record<string, unknown>[]; loading: boolean; error: unknown | null }} CollectionState */

/** @type {Map<string, { state: CollectionState; listeners: Set<(s: CollectionState) => void>; unsubscribe: () => void }>} */
const stores = new Map()

/**
 * @param {string} uid
 * @param {AudazDataDomain} domain
 */
function storeKey(uid, domain) {
  return `${uid}:${domain}`
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} uid
 */
function docBelongsToUser(data, uid) {
  const userId = typeof data?.userId === 'string' ? data.userId.trim() : ''
  const ownerId = typeof data?.ownerId === 'string' ? data.ownerId.trim() : ''
  if (userId) return userId === uid
  if (ownerId) return ownerId === uid
  return true
}

/**
 * @param {string} uid
 * @param {AudazDataDomain} domain
 * @param {string} orderField
 */
function ensureStore(uid, domain, orderField) {
  const key = storeKey(uid, domain)
  const existing = stores.get(key)
  if (existing) return existing

  /** @type {CollectionState} */
  const state = { items: [], loading: true, error: null }
  const listeners = new Set()

  const notify = () => {
    for (const listener of listeners) {
      listener(state)
    }
  }

  let unsub = () => {}

  if (isFirebaseConfigured()) {
    try {
      const base = audazCollectionRef(domain, uid)
      const q =
        domain === 'missions' || domain === 'trainings'
          ? query(base, where('ownerId', '==', uid), orderBy(orderField, 'desc'))
          : query(base, orderBy(orderField, 'desc'))

      const filterPersonal =
        domain === 'trainings' ||
        domain === 'range_logs' ||
        domain === 'vbss_logs' ||
        domain === 'tccc_logs' ||
        domain === 'ballistic_profiles'

      unsub = onSnapshot(
        q,
        (snap) => {
          state.error = null
          state.items = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((row) => (filterPersonal ? docBelongsToUser(row, uid) : true))
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
 * Paylaşımlı koleksiyon dinleyicisi — aynı uid+domain için tek onSnapshot.
 * @param {string} uid
 * @param {AudazDataDomain} domain
 * @param {string} orderField
 * @param {(state: CollectionState) => void} listener
 */
export function subscribeAudazCollection(uid, domain, orderField, listener) {
  const store = ensureStore(uid, domain, orderField)
  store.listeners.add(listener)
  listener(store.state)

  return () => {
    store.listeners.delete(listener)
    if (store.listeners.size === 0) {
      store.unsubscribe()
      stores.delete(storeKey(uid, domain))
    }
  }
}
