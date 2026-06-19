import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

const HEARTBEAT_MIN_INTERVAL_MS = 25_000
/** @type {Record<string, number>} */
const lastTouchByUid = {}

/**
 * @param {string} uid
 */
export async function touchUserPresence(uid) {
  if (!isFirebaseConfigured() || !db) return
  const id = String(uid ?? '').trim()
  if (!id) return

  const now = Date.now()
  const last = lastTouchByUid[id] ?? 0
  if (now - last < HEARTBEAT_MIN_INTERVAL_MS) return
  lastTouchByUid[id] = now

  await setDoc(
    doc(db, 'users', id),
    {
      lastSeenAt: serverTimestamp(),
      isOnline: true,
    },
    { merge: true },
  )
}

/**
 * @param {string} uid
 */
export async function setUserPresenceOffline(uid) {
  if (!isFirebaseConfigured() || !db) return
  const id = String(uid ?? '').trim()
  if (!id) return

  delete lastTouchByUid[id]

  await setDoc(
    doc(db, 'users', id),
    {
      isOnline: false,
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  )
}
