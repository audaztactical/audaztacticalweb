import { doc, getDoc, deleteDoc, serverTimestamp, runTransaction, setDoc } from 'firebase/firestore'
import { safeOnSnapshot } from './firestoreSnapshot'
import { auth, db, isFirebaseConfigured } from './firebase'
import { callCompletePremiumUpgrade, callRegisterOperatorProfile, isCloudFunctionUnavailableError } from './cloudFunctions'
import { normalizeUserRole, normalizeAccountStatus } from './authRoles'
import { coerceFeedbackTimestamp } from './firestoreFeedback'
import {
  clearPendingOperatorProfile,
  readPendingOperatorProfile,
} from './pendingOperatorProfile'

/** Firestore'da kayıt yoksa veya hata durumunda AuthContext varsayılanları */
export const GUEST_PROFILE = {
  callsign: 'GUEST',
  bloodType: 'GUEST',
  status: 'GUEST',
}

/** Görünen ad → usernames/{key} anahtarı */
export function normalizeUsername(raw) {
  if (typeof raw !== 'string') return ''
  let s = raw.trim().toLowerCase().replace(/\s+/g, '_')
  s = s.replace(/[^a-z0-9_]/g, '')
  return s
}

/** @param {string} key normalize edilmiş */
export function isValidUsernameNormalized(key) {
  return typeof key === 'string' && key.length >= 3 && key.length <= 24 && /^[a-z0-9_]+$/.test(key)
}

/**
 * Kayıt için müsaitlik; mevcut kullanıcı kendi adını tutuyorsa veya kayıt yetimse müsait sayılır.
 * @param {string} normalizedKey
 * @param {string | null} [forUid]
 */
export async function isUsernameAvailable(normalizedKey, forUid = null) {
  if (!isFirebaseConfigured() || !db || !normalizedKey) return false
  const snap = await getDoc(doc(db, 'usernames', normalizedKey))
  if (!snap.exists()) return true
  const ownerUid = typeof snap.data()?.uid === 'string' ? snap.data().uid : ''
  if (forUid && ownerUid === forUid) return true
  if (!ownerUid) return true
  const ownerProfile = await getDoc(doc(db, 'users', ownerUid))
  if (!ownerProfile.exists()) return true
  return false
}

/**
 * Başarısız kayıt sonrası yetim usernames/{key} (users/{uid} yok) temizliği.
 * @param {string} uid
 * @param {string} normalizedKey
 */
export async function releaseUsernameIfOrphaned(uid, normalizedKey) {
  if (!isFirebaseConfigured() || !db || !uid || !normalizedKey) return
  try {
    const nameRef = doc(db, 'usernames', normalizedKey)
    const userRef = doc(db, 'users', uid)
    const [nameSnap, userSnap] = await Promise.all([getDoc(nameRef), getDoc(userRef)])
    if (
      nameSnap.exists() &&
      nameSnap.data()?.uid === uid &&
      !userSnap.exists()
    ) {
      await deleteDoc(nameRef)
    }
  } catch {
    /* ignore — kayıt geri alımı en iyi çaba */
  }
}

/**
 * @param {import('firebase/firestore').DocumentData | undefined} d
 */
export function mapUserDocToProfile(d) {
  if (!d || typeof d !== 'object') return null
  const roleRaw =
    typeof d.role === 'string'
      ? d.role
      : typeof d.userRole === 'string'
        ? d.userRole
        : 'member'
  return {
    username: typeof d.username === 'string' ? d.username : '',
    callsign: typeof d.callsign === 'string' ? d.callsign : d.displayName ?? '',
    bloodType: typeof d.bloodType === 'string' ? d.bloodType : '',
    status: typeof d.status === 'string' ? d.status : '',
    email: typeof d.email === 'string' ? d.email : '',
    enrolledAt: d.enrolledAt ?? null,
    role: normalizeUserRole(roleRaw),
    accountStatus: normalizeAccountStatus(d.accountStatus),
    premiumPaymentId: typeof d.premiumPaymentId === 'string' ? d.premiumPaymentId : '',
    premiumUpgradedAt: d.premiumUpgradedAt ?? null,
    suspendedUntil: coerceFeedbackTimestamp(d.suspendedUntil),
    suspensionReason: typeof d.suspensionReason === 'string' ? d.suspensionReason : '',
    allergies: typeof d.allergies === 'string' ? d.allergies : '',
    drugSensitivity: typeof d.drugSensitivity === 'string' ? d.drugSensitivity : '',
    importantNotes: typeof d.importantNotes === 'string' ? d.importantNotes : '',
    groupId: typeof d.groupId === 'string' && d.groupId.trim() ? d.groupId.trim() : null,
    group:
      typeof d.group === 'string' && d.group.trim()
        ? d.group.trim()
        : typeof d.groupId === 'string' && d.groupId.trim()
          ? d.groupId.trim()
          : null,
    instructorId: typeof d.instructorId === 'string' && d.instructorId.trim() ? d.instructorId.trim() : null,
    agreedToTerms: d.agreedToTerms === true,
    termsAgreedAt: d.termsAgreedAt ?? null,
    photoURL:
      typeof d.photoURL === 'string' && d.photoURL.trim()
        ? d.photoURL.trim()
        : typeof d.avatarUrl === 'string' && d.avatarUrl.trim()
          ? d.avatarUrl.trim()
          : '',
  }
}

/**
 * users/{uid} belgesini okur; yoksa null döner.
 */
export async function fetchUserProfile(uid) {
  if (!isFirebaseConfigured() || !db || !uid) return null
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return mapUserDocToProfile(snap.data())
}

/**
 * Canlı profil dinleyicisi — Firestore role güncellemelerini anında yansıtır.
 * @param {string} uid
 * @param {(profile: NonNullable<ReturnType<typeof mapUserDocToProfile>>) => void} onProfile
 * @param {(error: unknown) => void} [onError]
 */
export function subscribeUserProfile(uid, onProfile, onError) {
  if (!isFirebaseConfigured() || !db || !uid) return () => {}
  return safeOnSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onProfile(null)
        return
      }
      const mapped = mapUserDocToProfile(snap.data())
      onProfile(mapped)
    },
    (err) => onError?.(err),
  )
}

/** @type {Map<string, Promise<void>>} */
const profileCreateInflight = new Map()

/**
 * Operatör profili — users/{uid} + usernames/{key} (transaction)
 * @param {string} uid
 * @param {{ email?: string, callsign: string, username: string, bloodType: string, status: string, role?: string, accountStatus?: string, premiumPaymentId?: string }} payload
 */
export async function createOperatorProfile(uid, payload) {
  const key = normalizeUsername(payload.username)
  const inflightKey = `${uid}::${key}`
  const existing = profileCreateInflight.get(inflightKey)
  if (existing) return existing
  const work = createOperatorProfileImpl(uid, payload)
  profileCreateInflight.set(inflightKey, work)
  try {
    await work
  } finally {
    profileCreateInflight.delete(inflightKey)
  }
}

/**
 * @param {string} uid
 * @param {{ email?: string, callsign: string, username: string, bloodType: string, status: string, role?: string, accountStatus?: string, premiumPaymentId?: string }} payload
 */
async function createOperatorProfileImpl(
  uid,
  {
    email,
    callsign,
    username,
    bloodType,
    status,
    role = 'member',
    accountStatus = 'active',
    premiumPaymentId = '',
  },
) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  if (!uid) throw new Error('Kullanıcı yok')

  const key = normalizeUsername(username)
  if (!isValidUsernameNormalized(key)) {
    const e = new Error('Geçersiz kullanıcı adı (3–24 karakter; a-z, 0-9, alt çizgi).')
    e.code = 'username-invalid'
    throw e
  }

  const existingProfile = await fetchUserProfile(uid)
  if (existingProfile?.username === key) {
    return
  }

  const invokeCloudProfile = async () => {
    if (auth?.currentUser?.uid === uid) {
      await auth.currentUser.getIdToken(true)
    }
    try {
      await callRegisterOperatorProfile({
        email: email ?? null,
        username: key,
        callsign: callsign ?? '',
        bloodType: bloodType ?? '',
        status: status ?? 'Sivil',
        role,
        accountStatus,
        premiumPaymentId,
      })
    } catch (err) {
      const code = String(/** @type {{ code?: string }} */ (err)?.code ?? '')
      if (code === 'functions/already-exists') {
        const after = await fetchUserProfile(uid)
        if (after?.username === key) return
        const e = new Error('Bu kullanıcı adı zaten kullanılıyor.')
        e.code = 'username-already-in-use'
        throw e
      }
      throw err
    }
  }

  try {
    await invokeCloudProfile()
  } catch (err) {
    let recovered = await fetchUserProfile(uid)
    if (recovered?.username === key) return

    if (isCloudFunctionUnavailableError(err)) {
      await new Promise((resolve) => setTimeout(resolve, 450))
      recovered = await fetchUserProfile(uid)
      if (recovered?.username === key) return
      await invokeCloudProfile()
      return
    }

    console.error('Firestore Yazma Hatası:', err)
    throw err
  }
}

/**
 * Oturum açık ama profil eksik — kayıt sırasında saklanan veri ile tamamlar.
 * @param {string} uid
 */
export async function repairPendingOperatorProfile(uid) {
  const pending = readPendingOperatorProfile()
  if (!pending?.username || !uid) return false
  try {
    await createOperatorProfile(uid, {
      email: pending.email ?? '',
      username: pending.username,
      callsign: pending.callsign ?? '',
      bloodType: pending.bloodType ?? '',
      status: pending.status ?? 'Sivil',
      role: pending.role ?? 'member',
      accountStatus: pending.accountStatus ?? 'active',
    })
    clearPendingOperatorProfile()
    return true
  } catch {
    return false
  }
}

/**
 * Google ile ilk giriş — users/{uid}, benzersiz username transaction ile
 * @param {import('firebase/auth').User} user
 */
export async function createGoogleOperatorProfile(user) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  if (!user?.uid) throw new Error('Kullanıcı yok')

  const uid = user.uid
  const name = user.displayName?.trim() || 'Operatör'
  const email = user.email ?? null

  let base = normalizeUsername(name.replace(/\s+/g, '_'))
  if (!isValidUsernameNormalized(base)) {
    base = normalizeUsername(`op_${uid.slice(0, 10)}`)
  }
  if (!isValidUsernameNormalized(base)) {
    base = `op_${uid.slice(0, 12)}`.toLowerCase().replace(/[^a-z0-9_]/g, '')
  }

  let candidates = [
    base.slice(0, 24),
    `${base.slice(0, 16)}_${uid.slice(-6)}`,
    `op_${uid.slice(0, 12)}`,
  ]
    .map((c) => normalizeUsername(c))
    .filter((k) => isValidUsernameNormalized(k))

  candidates = [...new Set(candidates)]

  if (candidates.length === 0) {
    const fallback = normalizeUsername(`op_${uid.replace(/-/g, '').slice(0, 22)}`)
    if (isValidUsernameNormalized(fallback)) candidates.push(fallback)
  }

  let lastErr = /** @type {Error | null} */ (null)
  for (const key of candidates) {
    if (!isValidUsernameNormalized(key)) continue
    try {
      await callRegisterOperatorProfile({
        email,
        username: key,
        callsign: name,
        bloodType: 'BELİRTİLMEDİ',
        status: 'Sivil',
        role: 'member',
        accountStatus: 'active',
      })
      return
    } catch (error) {
      const code = String(/** @type {{ code?: string }} */ (error)?.code ?? '')
      if (code === 'functions/already-exists') {
        lastErr = error
        continue
      }
      if (isCloudFunctionUnavailableError(error)) {
        break
      }
      console.error('Firestore Yazma Hatası (Google):', error)
      throw error
    }
  }

  if (lastErr && candidates.length > 0) {
    for (const key of candidates) {
      if (!isValidUsernameNormalized(key)) continue
      try {
        await runTransaction(db, async (tx) => {
          const nameRef = doc(db, 'usernames', key)
          const userRef = doc(db, 'users', uid)
          const ns = await tx.get(nameRef)
          if (ns.exists()) throw Object.assign(new Error('collision'), { code: '__collision__' })
          tx.set(nameRef, { uid })
          tx.set(userRef, {
            email,
            username: key,
            callsign: name,
            displayName: name,
            bloodType: 'BELİRTİLMEDİ',
            status: 'Sivil',
            role: 'member',
            accountStatus: 'active',
            enrolledAt: serverTimestamp(),
            agreedToTerms: false,
            updatedAt: serverTimestamp(),
          })
        })
        return
      } catch (error) {
        if (/** @type {any} */ (error)?.code === '__collision__') {
          lastErr = error
          continue
        }
        console.error('Firestore Yazma Hatası (Google):', error)
        throw error
      }
    }
  }
  console.error('username claim failed after retries:', lastErr)
  throw lastErr ?? new Error('Kullanıcı adı oluşturulamadı')
}

/**
 * TCCC / sağlık paneli alanları — users/{uid} (merge)
 * @param {string} uid
 * @param {{ allergies?: string; drugSensitivity?: string; importantNotes?: string }} fields
 */
export async function updateUserMedicalProfile(uid, fields) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  if (!uid) throw new Error('Oturum gerekli')

  const ref = doc(db, 'users', uid)
  await setDoc(
    ref,
    {
      allergies: typeof fields.allergies === 'string' ? fields.allergies : '',
      drugSensitivity: typeof fields.drugSensitivity === 'string' ? fields.drugSensitivity : '',
      importantNotes: typeof fields.importantNotes === 'string' ? fields.importantNotes : '',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Callsign (kod adı) — users/{uid} + displayName alanı (Auth profili ile uyum)
 */
export async function updateUserCallsign(uid, callsign) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  if (!uid) throw new Error('Oturum gerekli')

  const trimmed = typeof callsign === 'string' ? callsign.trim() : ''
  if (!trimmed) throw new Error('Callsign boş olamaz')

  const ref = doc(db, 'users', uid)
  await setDoc(
    ref,
    {
      callsign: trimmed,
      displayName: trimmed,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Kan grubu — users/{uid} (merge)
 * @param {string} uid
 * @param {string} bloodType
 */
export async function updateUserBloodType(uid, bloodType) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  if (!uid) throw new Error('Oturum gerekli')

  const ref = doc(db, 'users', uid)
  await setDoc(
    ref,
    {
      bloodType: typeof bloodType === 'string' ? bloodType.trim().slice(0, 16) : '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * Profil görseli — users/{uid} + Auth photoURL ile uyumlu alanlar
 * @param {string} uid
 * @param {string} photoURL
 */
export async function updateUserAvatarUrl(uid, photoURL) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  if (!uid) throw new Error('Oturum gerekli')

  const url = typeof photoURL === 'string' ? photoURL.trim() : ''
  if (!url) throw new Error('Geçersiz görsel URL.')

  const ref = doc(db, 'users', uid)
  await setDoc(
    ref,
    {
      photoURL: url,
      avatarUrl: url,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * Operasyonel ve Hukuki Protokol onayı — users/{uid}.agreedToTerms
 * @param {string} uid
 */
export async function updateUserAgreedToTerms(uid) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  if (!uid) throw new Error('Oturum gerekli')

  const ref = doc(db, 'users', uid)
  await setDoc(
    ref,
    {
      agreedToTerms: true,
      termsAgreedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * Mock / Stripe ödeme sonrası premium yükseltme — users/{uid}
 * @param {string} uid
 * @param {string} paymentIntentId
 */
export async function completePremiumUpgrade(uid, paymentIntentId) {
  if (!isFirebaseConfigured()) throw new Error('Firebase yapılandırılmadı')
  if (!uid) throw new Error('Oturum gerekli')
  if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_mock_')) {
    throw new Error('Geçersiz ödeme referansı')
  }

  await callCompletePremiumUpgrade(paymentIntentId)
}
