import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { prepareAudazWritePayload } from './audazFirestoreWrite'

/** Canonical path — schema.js health_records/{uid} */
export const HEALTH_OPERATOR_PROFILE_KIND = 'operator_kunye'

/** @deprecated Legacy collection — read-only migration */
export const LEGACY_HEALTH_PROFILE_COLLECTION = 'health_profiles'

/**
 * @param {string} uid
 */
export function healthOperatorProfileRef(uid) {
  return doc(db, 'health_records', uid)
}

/**
 * @param {string} uid
 */
export function legacyHealthProfileRef(uid) {
  return doc(db, LEGACY_HEALTH_PROFILE_COLLECTION, uid)
}

/** @param {Record<string, unknown> | undefined} data */
export function mapHealthProfileFields(data) {
  if (!data || typeof data !== 'object') return null
  return {
    tıbbiRol: typeof data.tıbbiRol === 'string' ? data.tıbbiRol : '',
    alerjiler: typeof data.alerjiler === 'string' ? data.alerjiler : '',
    kronikHastalik: typeof data.kronikHastalik === 'string' ? data.kronikHastalik : '',
    duzenliIlaclar: typeof data.duzenliIlaclar === 'string' ? data.duzenliIlaclar : '',
    sonTetanozAşısı: typeof data.sonTetanozAşısı === 'string' ? data.sonTetanozAşısı : '',
    boyKilo: typeof data.boyKilo === 'string' ? data.boyKilo : '',
  }
}

/**
 * @param {string} uid
 * @param {NonNullable<ReturnType<typeof mapHealthProfileFields>>} fields
 */
export async function saveHealthOperatorProfile(uid, fields) {
  const payload = prepareAudazWritePayload({
    kind: HEALTH_OPERATOR_PROFILE_KIND,
    ownerId: uid,
    userId: uid,
    ...fields,
    updatedAt: serverTimestamp(),
  })
  await setDoc(healthOperatorProfileRef(uid), payload, { merge: true })
}

/**
 * Canonical kayıt yoksa legacy health_profiles'tan tek seferlik okur.
 * @param {string} uid
 */
export async function loadHealthOperatorProfile(uid) {
  const canonicalSnap = await getDoc(healthOperatorProfileRef(uid))
  if (canonicalSnap.exists()) {
    return mapHealthProfileFields(canonicalSnap.data())
  }

  try {
    const legacySnap = await getDoc(legacyHealthProfileRef(uid))
    if (legacySnap.exists()) {
      const mapped = mapHealthProfileFields(legacySnap.data())
      if (mapped) {
        await saveHealthOperatorProfile(uid, mapped)
        return mapped
      }
    }
  } catch {
    /* legacy collection yok / rules kapalı */
  }

  return null
}
