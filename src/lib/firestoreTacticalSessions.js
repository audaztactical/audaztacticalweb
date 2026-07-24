/**
 * users/{uid}/tacticalSessions/{sessionId} — Standart Atış oturumları (Firestore).
 */

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { emitFirebaseError } from './firebaseErrorBus'
import { sanitizeForFirestore } from './firestoreSanitize'
import {
  DRY_FIRE_SESSIONS_KEY,
  loadLocalDryFireSessions,
  normalizeDryFireSession,
} from './dryFireSessionStore'
import {
  loadStandardShotSessions,
  normalizeSession,
  STANDARD_SHOT_SESSIONS_KEY,
} from './standardShotSessionStore'

/**
 * @param {string} uid
 */
function sessionsCol(uid) {
  return collection(db, 'users', uid, 'tacticalSessions')
}

/**
 * @param {string} uid
 * @param {string} sessionId
 */
function sessionRef(uid, sessionId) {
  return doc(db, 'users', uid, 'tacticalSessions', sessionId)
}

/**
 * @param {import('./standardShotSessionStore').StandardShotSession} session
 * @param {string} uid
 */
function toFirestorePayload(session, uid) {
  const { id, ...rest } = session
  const payload = /** @type {Record<string, unknown>} */ (
    sanitizeForFirestore({
      ...rest,
      ownerId: uid,
      userId: uid,
      status: 'active',
    })
  )
  // FieldValue sentinel — sanitize içine koyma
  payload.updatedAt = serverTimestamp()
  return payload
}

/**
 * Oturumu Firestore'a yazar (setDoc — id istemci tarafında üretilir).
 * @param {string} uid
 * @param {import('./standardShotSessionStore').StandardShotSession} session
 */
export async function saveTacticalSessionToFirestore(uid, session) {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
  if (!uid) {
    const e = new Error('Oturum gerekli')
    e.code = 'unauthenticated'
    throw e
  }
  const normalized = normalizeSession(session)
  if (!normalized) {
    const e = new Error('Geçersiz seans')
    e.code = 'invalid-argument'
    throw e
  }

  try {
    await setDoc(sessionRef(uid, normalized.id), toFirestorePayload(normalized, uid), {
      merge: true,
    })
    return normalized
  } catch (err) {
    emitFirebaseError(err)
    throw err
  }
}

/**
 * @param {string} uid
 * @param {string} sessionId
 */
export async function deleteTacticalSessionFromFirestore(uid, sessionId) {
  if (!isFirebaseConfigured() || !db || !uid || !sessionId) return
  try {
    await deleteDoc(sessionRef(uid, sessionId))
  } catch (err) {
    emitFirebaseError(err)
    throw err
  }
}

/**
 * Real-time dinleyici — createdAt desc.
 * @param {string} uid
 * @param {(sessions: import('./standardShotSessionStore').StandardShotSession[]) => void} onData
 * @param {(err: Error) => void} [onError]
 * @returns {() => void}
 */
export function subscribeTacticalSessions(uid, onData, onError) {
  if (!uid || !isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }

  const q = query(sessionsCol(uid), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => normalizeSession({ id: d.id, ...d.data() }))
        .filter(Boolean)
      onData(/** @type {import('./standardShotSessionStore').StandardShotSession[]} */ (rows))
    },
    (err) => {
      emitFirebaseError(err)
      onError?.(err instanceof Error ? err : new Error(String(err)))
      onData([])
    },
  )
}

/**
 * localStorage → Firestore tek seferlik taşıma (bulut boşsa).
 * @param {string} uid
 * @returns {Promise<number>} taşınan adet
 */
export async function migrateLocalTacticalSessionsToFirestore(uid) {
  if (!uid || !isFirebaseConfigured() || !db) return 0
  const local = loadStandardShotSessions()
  if (local.length === 0) return 0

  let migrated = 0
  for (const session of local) {
    try {
      await saveTacticalSessionToFirestore(uid, session)
      migrated += 1
    } catch {
      /* tek kayıt hatası — devam */
    }
  }

  try {
    if (typeof localStorage !== 'undefined' && migrated > 0) {
      localStorage.removeItem(STANDARD_SHOT_SESSIONS_KEY)
    }
  } catch {
    /* ignore */
  }

  return migrated
}

/**
 * @param {import('./dryFireSessionStore').DryFireSession} session
 * @param {string} uid
 */
function toDryFireFirestorePayload(session, uid) {
  const { id, ...rest } = session
  const payload = /** @type {Record<string, unknown>} */ (
    sanitizeForFirestore({
      ...rest,
      mode: 'dry-fire',
      ownerId: uid,
      userId: uid,
      status: 'active',
    })
  )
  payload.updatedAt = serverTimestamp()
  return payload
}

/**
 * Kuru Tetik seansını Firestore'a yazar.
 * @param {string} uid
 * @param {import('./dryFireSessionStore').DryFireSession} session
 */
export async function saveDryFireSessionToFirestore(uid, session) {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
  if (!uid) {
    const e = new Error('Oturum gerekli')
    e.code = 'unauthenticated'
    throw e
  }
  const normalized = normalizeDryFireSession(session)
  if (!normalized) {
    const e = new Error('Geçersiz seans')
    e.code = 'invalid-argument'
    throw e
  }

  try {
    await setDoc(sessionRef(uid, normalized.id), toDryFireFirestorePayload(normalized, uid), {
      merge: true,
    })
    return normalized
  } catch (err) {
    emitFirebaseError(err)
    throw err
  }
}

/**
 * Real-time dinleyici — yalnızca mode: dry-fire.
 * @param {string} uid
 * @param {(sessions: import('./dryFireSessionStore').DryFireSession[]) => void} onData
 * @param {(err: Error) => void} [onError]
 * @returns {() => void}
 */
export function subscribeDryFireSessions(uid, onData, onError) {
  if (!uid || !isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }

  const q = query(sessionsCol(uid), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => normalizeDryFireSession({ id: d.id, ...d.data() }))
        .filter(Boolean)
      onData(/** @type {import('./dryFireSessionStore').DryFireSession[]} */ (rows))
    },
    (err) => {
      emitFirebaseError(err)
      onError?.(err instanceof Error ? err : new Error(String(err)))
      onData([])
    },
  )
}

/**
 * localStorage → Firestore (kuru tetik).
 * @param {string} uid
 * @returns {Promise<number>}
 */
export async function migrateLocalDryFireSessionsToFirestore(uid) {
  if (!uid || !isFirebaseConfigured() || !db) return 0
  const local = loadLocalDryFireSessions()
  if (local.length === 0) return 0

  let migrated = 0
  for (const session of local) {
    try {
      await saveDryFireSessionToFirestore(uid, session)
      migrated += 1
    } catch {
      /* devam */
    }
  }

  try {
    if (typeof localStorage !== 'undefined' && migrated > 0) {
      localStorage.removeItem(DRY_FIRE_SESSIONS_KEY)
    }
  } catch {
    /* ignore */
  }

  return migrated
}
