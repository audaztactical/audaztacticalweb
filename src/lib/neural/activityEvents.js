/**
 * Operatör Beyni — istemci activity_events yazımı (fire-and-forget).
 */

import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase'
import { istanbulDayKey } from './neuralEngine'

/**
 * @param {'INTEL_READ'|'GUIDE_READ'|'BALLISTIC_CALC'} type
 * @param {string} refId
 * @param {string} [docId] — verilirse setDoc id (idempotent create-only)
 */
export async function logActivityEvent(type, refId, docId) {
  try {
    if (!isFirebaseConfigured() || !db || !auth) return
    const uid = auth.currentUser?.uid
    if (!uid) return
    const rid = String(refId || '').slice(0, 128)
    if (!rid) return
    if (!['INTEL_READ', 'GUIDE_READ', 'BALLISTIC_CALC'].includes(type)) return

    const id =
      docId ||
      `${type}_${rid}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 700)
    const ref = doc(db, 'users', uid, 'activity_events', id)
    await setDoc(ref, {
      type,
      refId: rid,
      createdAt: serverTimestamp(),
    })
  } catch {
    /* rules reddi / ağ — sessiz */
  }
}

/**
 * INTEL_READ — kullanıcı başına refId bir kez.
 * @param {string} refId
 */
export function logIntelRead(refId) {
  const id = `INTEL_${String(refId)}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 700)
  void logActivityEvent('INTEL_READ', refId, id)
}

/**
 * GUIDE_READ — bölüm + gün.
 * @param {string} sectionId
 */
export function logGuideRead(sectionId) {
  const day = istanbulDayKey(Date.now())
  const id = `GUIDE_${sectionId}_${day}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 700)
  void logActivityEvent('GUIDE_READ', sectionId, id)
}

const BCALC_KEY = 'audaz-neural-bcalc'

/**
 * BALLISTIC_CALC — günde en fazla 3 (localStorage sayaç).
 */
export function logBallisticCalc() {
  try {
    const day = istanbulDayKey(Date.now())
    const raw = localStorage.getItem(BCALC_KEY)
    /** @type {{ day: string; n: number }} */
    let st = { day, n: 0 }
    if (raw) {
      try {
        st = JSON.parse(raw)
      } catch {
        st = { day, n: 0 }
      }
    }
    if (st.day !== day) st = { day, n: 0 }
    if (st.n >= 3) return
    st.n += 1
    localStorage.setItem(BCALC_KEY, JSON.stringify(st))
    const id = `BCALC_${day}_${st.n}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 700)
    void logActivityEvent('BALLISTIC_CALC', `calc_${st.n}`, id)
  } catch {
    /* private mode */
  }
}
