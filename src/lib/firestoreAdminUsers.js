import {
  collection,
  deleteField,
  doc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { normalizeAccountStatus, normalizeUserRole } from './authRoles'
import { coerceFeedbackTimestamp, formatFeedbackTimestamp } from './firestoreFeedback'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot } from './firestoreSnapshot'

/** @typedef {{
 *   id: string
 *   email: string
 *   callsign: string
 *   username: string
 *   role: string
 *   accountStatus: string
 *   suspendedUntil: import('firebase/firestore').Timestamp | Date | null
 *   suspensionReason: string
 *   premiumPaymentId: string
 *   premiumUpgradedAt: import('firebase/firestore').Timestamp | Date | null
 *   enrolledAt: import('firebase/firestore').Timestamp | Date | null
 * }} AdminUserRecord */

/** @readonly */
export const SUSPENSION_DURATION_OPTIONS = /** @type {const} */ ([
  { id: '1d', label: '1 Gün', days: 1 },
  { id: '3d', label: '3 Gün', days: 3 },
  { id: '7d', label: '7 Gün', days: 7 },
  { id: '30d', label: '30 Gün', days: 30 },
  { id: 'indefinite', label: 'Süresiz', days: null },
])

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {import('firebase/firestore').DocumentData} data
 * @param {string} id
 * @returns {AdminUserRecord}
 */
export function mapAdminUserDoc(data, id) {
  const d = data ?? {}
  return {
    id,
    email: typeof d.email === 'string' ? d.email : '',
    callsign: typeof d.callsign === 'string' ? d.callsign : '',
    username: typeof d.username === 'string' ? d.username : '',
    role: normalizeUserRole(d.role ?? d.userRole),
    accountStatus: normalizeAccountStatus(d.accountStatus),
    suspendedUntil: coerceFeedbackTimestamp(d.suspendedUntil),
    suspensionReason: typeof d.suspensionReason === 'string' ? d.suspensionReason : '',
    premiumPaymentId: typeof d.premiumPaymentId === 'string' ? d.premiumPaymentId : '',
    premiumUpgradedAt: coerceFeedbackTimestamp(d.premiumUpgradedAt),
    enrolledAt: coerceFeedbackTimestamp(d.enrolledAt),
  }
}

/**
 * @param {AdminUserRecord} row
 */
export function formatAdminUserDisplayName(row) {
  return row.callsign.trim() || row.username.trim() || row.email || row.id.slice(0, 8)
}

/**
 * @param {AdminUserRecord} row
 */
export function formatMembershipLabel(row) {
  if (row.role === 'admin') return 'Yönetici'
  if (row.role === 'instructor') return 'Eğitmen'
  if (row.role === 'premium_member' || row.premiumPaymentId) return 'Premium'
  return 'Ücretsiz'
}

/**
 * @param {AdminUserRecord} row
 */
export function formatAccountStatusLabel(row) {
  if (row.accountStatus === 'suspended') return 'Askıda'
  if (row.accountStatus === 'locked') return 'Kilitli'
  return 'Aktif'
}

/**
 * @param {import('firebase/firestore').Timestamp | Date | null | undefined} ts
 */
export function formatAdminUserDate(ts) {
  return formatFeedbackTimestamp(ts)
}

/**
 * @param {(rows: AdminUserRecord[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeUsersForAdmin(onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }

  return safeOnSnapshot(
    collection(db, 'users'),
    (snap) => {
      const rows = snap.docs
        .map((d) => mapAdminUserDoc(d.data(), d.id))
        .sort((a, b) => formatAdminUserDisplayName(a).localeCompare(formatAdminUserDisplayName(b), 'tr'))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {string} uid
 * @param {{ days: number | null; reason?: string }} options
 */
export async function suspendUserAccount(uid, { days, reason = '' }) {
  assertDb()
  const id = String(uid ?? '').trim()
  if (!id) throw new Error('Kullanıcı kimliği gerekli')

  /** @type {Record<string, unknown>} */
  const patch = {
    accountStatus: 'suspended',
    suspensionReason: String(reason ?? '').trim().slice(0, 500),
  }

  if (days == null) {
    patch.suspendedUntil = null
  } else {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    patch.suspendedUntil = Timestamp.fromDate(until)
  }

  await updateDoc(doc(db, 'users', id), patch)
}

/**
 * @param {string} uid
 */
export async function unsuspendUserAccount(uid) {
  assertDb()
  const id = String(uid ?? '').trim()
  if (!id) throw new Error('Kullanıcı kimliği gerekli')

  await updateDoc(doc(db, 'users', id), {
    accountStatus: 'active',
    suspendedUntil: deleteField(),
    suspensionReason: deleteField(),
  })
}

/**
 * Premium alanlarını temizler, role → member.
 * @param {string} uid
 */
export async function downgradeUserMembership(uid) {
  assertDb()
  const id = String(uid ?? '').trim()
  if (!id) throw new Error('Kullanıcı kimliği gerekli')

  await updateDoc(doc(db, 'users', id), {
    role: 'member',
    userRole: deleteField(),
    premiumPaymentId: deleteField(),
    premiumUpgradedAt: deleteField(),
  })
}
