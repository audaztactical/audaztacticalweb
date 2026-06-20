import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'

const HEARTBEAT_MIN_INTERVAL_MS = 25_000
/** @type {Record<string, number>} */
const lastTouchByUid = {}

/**
 * @param {string} uid
 * @param {Record<string, unknown>} fields
 */
async function writePresenceFields(uid, fields) {
  if (!isFirebaseConfigured() || !db) return
  const id = String(uid ?? '').trim()
  if (!id) return

  const current = auth?.currentUser
  if (!current || current.uid !== id) return

  try {
    await setDoc(doc(db, 'users', id), fields, { merge: true })
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
    if (import.meta.env.DEV && code !== 'permission-denied') {
      console.warn('[firestorePresence]', err)
    }
  }
}

/**
 * @param {string} uid
 */
export async function touchUserPresence(uid) {
  const id = String(uid ?? '').trim()
  if (!id) return

  const now = Date.now()
  const last = lastTouchByUid[id] ?? 0
  if (now - last < HEARTBEAT_MIN_INTERVAL_MS) return
  lastTouchByUid[id] = now

  await writePresenceFields(id, {
    lastSeenAt: serverTimestamp(),
    isOnline: true,
  })
}

/**
 * @param {string} uid
 */
export async function setUserPresenceOffline(uid) {
  const id = String(uid ?? '').trim()
  if (!id) return

  delete lastTouchByUid[id]

  await writePresenceFields(id, {
    isOnline: false,
    lastSeenAt: serverTimestamp(),
  })
}
