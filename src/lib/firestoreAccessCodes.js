import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

/** @readonly */
export const ACCESS_CODE_PLANS = /** @type {const} */ ([
  { id: 'premium', label: 'Premium' },
  { id: 'pro_instructor', label: 'Pro-Eğitmen' },
])

const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * @param {number} len
 */
function randomSegment(len) {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join('')
}

/**
 * @param {'premium' | 'pro_instructor'} plan
 */
export function generateAccessCode(plan) {
  const prefix = plan === 'pro_instructor' ? 'PROE' : 'PREM'
  return `${prefix}-${randomSegment(4)}-${randomSegment(4)}`
}

/**
 * @param {string} raw
 */
export function normalizeAccessCode(raw) {
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
 * @typedef {'active' | 'depleted' | 'revoked' | 'expired'} AccessCodeStatus
 */

/**
 * @typedef {{
 *   id: string
 *   code: string
 *   plan: 'premium' | 'pro_instructor'
 *   maxUses: number
 *   usedCount: number
 *   status: AccessCodeStatus
 *   note: string
 *   expiresAt: import('firebase/firestore').Timestamp | null
 *   createdAt: import('firebase/firestore').Timestamp | null
 *   createdBy: string
 *   revokedAt: import('firebase/firestore').Timestamp | null
 * }} AccessCodeRecord
 */

/**
 * @param {import('firebase/firestore').DocumentSnapshot | import('firebase/firestore').QueryDocumentSnapshot} snap
 * @returns {AccessCodeRecord}
 */
export function mapAccessCodeDoc(snap) {
  const d = snap.data() ?? {}
  const expiresAt = d.expiresAt ?? null
  let status = typeof d.status === 'string' ? d.status : 'active'
  const usedCount = Number(d.usedCount ?? 0)
  const maxUses = Number(d.maxUses ?? 0)

  if (status !== 'revoked' && expiresAt && typeof expiresAt.toMillis === 'function') {
    if (expiresAt.toMillis() <= Date.now()) status = 'expired'
  }
  if (status !== 'revoked' && usedCount >= maxUses && maxUses > 0) {
    status = 'depleted'
  }

  return {
    id: snap.id,
    code: typeof d.code === 'string' ? d.code : snap.id,
    plan: d.plan === 'pro_instructor' ? 'pro_instructor' : 'premium',
    maxUses,
    usedCount,
    status: /** @type {AccessCodeStatus} */ (status),
    note: typeof d.note === 'string' ? d.note : '',
    expiresAt,
    createdAt: d.createdAt ?? null,
    createdBy: typeof d.createdBy === 'string' ? d.createdBy : '',
    revokedAt: d.revokedAt ?? null,
  }
}

/**
 * @param {AccessCodeRecord} row
 */
export function formatAccessCodePlanLabel(row) {
  return row.plan === 'pro_instructor' ? 'Pro-Eğitmen' : 'Premium'
}

/**
 * @param {AccessCodeRecord} row
 */
export function formatAccessCodeStatusLabel(row) {
  const map = {
    active: 'Aktif',
    depleted: 'Dolu',
    revoked: 'İptal',
    expired: 'Süresi doldu',
  }
  return map[row.status] ?? row.status
}

/**
 * @param {{
 *   plan: 'premium' | 'pro_instructor'
 *   maxUses: number
 *   expiresAt?: Date | null
 *   note?: string
 *   createdBy: string
 * }} opts
 */
export async function createAccessCode(opts) {
  assertDb()
  const maxUses = Math.max(1, Math.floor(Number(opts.maxUses) || 1))
  const plan = opts.plan === 'pro_instructor' ? 'pro_instructor' : 'premium'
  const note = String(opts.note ?? '').trim()

  let code = generateAccessCode(plan)
  let attempts = 0
  while (attempts < 8) {
    const ref = doc(db, 'access_codes', code)
    const existing = await getDoc(ref)
    if (!existing.exists()) {
      /** @type {Record<string, unknown>} */
      const payload = {
        code,
        plan,
        maxUses,
        usedCount: 0,
        status: 'active',
        note,
        createdBy: opts.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        revokedAt: null,
        revokedBy: null,
      }
      if (opts.expiresAt instanceof Date && !Number.isNaN(opts.expiresAt.getTime())) {
        payload.expiresAt = opts.expiresAt
      }
      await setDoc(ref, payload)
      return { code, docId: code }
    }
    code = generateAccessCode(plan)
    attempts += 1
  }
  throw new Error('Erişim kodu üretilemedi — tekrar deneyin.')
}

/**
 * @param {string} codeId
 * @param {string} adminUid
 */
export async function revokeAccessCode(codeId, adminUid) {
  assertDb()
  const ref = doc(db, 'access_codes', normalizeAccessCode(codeId))
  await updateDoc(ref, {
    status: 'revoked',
    revokedAt: serverTimestamp(),
    revokedBy: adminUid,
    updatedAt: serverTimestamp(),
  })
}

/**
 * @param {(rows: AccessCodeRecord[]) => void} onRows
 * @param {(error: unknown) => void} [onError]
 */
export function subscribeAccessCodesForAdmin(onRows, onError) {
  if (!isFirebaseConfigured() || !db) return () => {}

  const q = query(collection(db, 'access_codes'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      onRows(snap.docs.map(mapAccessCodeDoc))
    },
    (err) => onError?.(err),
  )
}
