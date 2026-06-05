import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

/** @readonly */
export const INSTRUCTOR_TOKEN_INVALID_MESSAGE =
  '• [🚨 GEÇERSİZ KOD]: Girdiğiniz eğitmen kodu geçersizdir veya daha önce kullanılmıştır!'

const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * AUDAZ-XXXX-XXXX (8 güvenli rastgele karakter, toplam 12 alfanümerik gövde)
 */
export function generateInstructorInviteToken() {
  const seg = (len) => {
    const bytes = new Uint8Array(len)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join('')
  }
  return `AUDAZ-${seg(4)}-${seg(4)}`
}

/**
 * @param {string} raw
 */
export function normalizeInstructorInviteToken(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {string} token
 */
function tokenDocRef(token) {
  assertDb()
  return doc(db, 'instructor_tokens', token)
}

/**
 * @returns {Promise<{ token: string, docId: string }>}
 */
export async function createInstructorInviteToken() {
  assertDb()
  let token = generateInstructorInviteToken()
  let attempts = 0
  while (attempts < 8) {
    const ref = tokenDocRef(token)
    const existing = await getDoc(ref)
    if (!existing.exists()) {
      await setDoc(ref, {
        token,
        isUsed: false,
        usedBy: null,
        createdAt: serverTimestamp(),
      })
      return { token, docId: token }
    }
    token = generateInstructorInviteToken()
    attempts += 1
  }
  throw new Error('Davetiye kodu üretilemedi — tekrar deneyin.')
}

/**
 * Kayıt öncesi doğrulama — belge yoksa veya kullanılmışsa geçersiz.
 * @param {string} rawCode
 * @returns {Promise<{ valid: boolean, token: string, ref: import('firebase/firestore').DocumentReference | null }>}
 */
export async function validateInstructorInviteToken(rawCode) {
  const token = normalizeInstructorInviteToken(rawCode)
  if (!token || token.length < 8) {
    return { valid: false, token, ref: null }
  }

  assertDb()
  const ref = tokenDocRef(token)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    return { valid: false, token, ref: null }
  }

  const data = snap.data()
  if (data.isUsed === true) {
    return { valid: false, token, ref: null }
  }

  if (typeof data.token === 'string' && normalizeInstructorInviteToken(data.token) !== token) {
    return { valid: false, token, ref: null }
  }

  return { valid: true, token, ref }
}

/**
 * Tek kullanımlık yakma — transaction ile çift kullanım engellenir.
 * @param {import('firebase/firestore').DocumentReference} tokenRef
 * @param {string} uid
 */
export async function burnInstructorInviteToken(tokenRef, uid) {
  assertDb()
  if (!tokenRef || !uid) {
    const e = new Error(INSTRUCTOR_TOKEN_INVALID_MESSAGE)
    e.code = 'instructor-token-invalid'
    throw e
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tokenRef)
    if (!snap.exists() || snap.data()?.isUsed === true) {
      const e = new Error(INSTRUCTOR_TOKEN_INVALID_MESSAGE)
      e.code = 'instructor-token-invalid'
      throw e
    }
    tx.update(tokenRef, {
      isUsed: true,
      usedBy: uid,
      usedAt: serverTimestamp(),
    })
  })
}
