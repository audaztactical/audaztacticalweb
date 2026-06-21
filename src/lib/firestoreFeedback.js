import { addDoc, collection, doc, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { prepareAudazWritePayload } from './audazFirestoreWrite'
import { auth, db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot } from './firestoreSnapshot'

/** @readonly */
export const FEEDBACK_ISSUE_TYPES = /** @type {const} */ (['Hata', 'Öneri', 'Bug'])

/** @readonly */
export const OPERATOR_FEEDBACK_TYPES = /** @type {const} */ (['complaint', 'suggestion'])

/** @type {Record<(typeof OPERATOR_FEEDBACK_TYPES)[number], string>} */
export const OPERATOR_FEEDBACK_TYPE_LABELS = {
  complaint: 'Şikayet',
  suggestion: 'Öneri',
}

/** @readonly */
export const FEEDBACK_STATUS_VALUES = /** @type {const} */ (['new', 'reviewed', 'resolved'])

/** @type {Record<(typeof FEEDBACK_STATUS_VALUES)[number], string>} */
export const FEEDBACK_STATUS_LABELS = {
  new: 'Yeni',
  reviewed: 'İncelendi',
  resolved: 'Çözüldü',
}

/** @typedef {(typeof FEEDBACK_STATUS_VALUES)[number]} FeedbackStatusValue */

/** @typedef {'legacy' | 'operator'} FeedbackSchemaKind */

/** @typedef {{
 *   id: string
 *   schema: FeedbackSchemaKind
 *   typeKey: string
 *   typeLabel: string
 *   operatorName: string
 *   userEmail: string
 *   userId: string
 *   callsign: string
 *   subject: string
 *   message: string
 *   imageUrls: string[]
 *   status: string
 *   createdAt: import('firebase/firestore').Timestamp | Date | null
 * }} UnifiedFeedbackRecord */

/** @typedef {(typeof FEEDBACK_ISSUE_TYPES)[number]} FeedbackIssueType */
/** @typedef {(typeof OPERATOR_FEEDBACK_TYPES)[number]} OperatorFeedbackType */

/** @typedef {{
 *   id: string
 *   issueType: FeedbackIssueType
 *   description: string
 *   screenshotURL: string
 *   userId: string
 *   userEmail: string
 *   callsign: string
 *   createdAt: import('firebase/firestore').Timestamp | null
 * }} FeedbackRecord */

/** @typedef {{
 *   id: string
 *   type: OperatorFeedbackType
 *   fullName: string
 *   subject: string
 *   message: string
 *   imageUrls: string[]
 *   userId: string
 *   userEmail: string
 *   callsign: string
 *   status: string
 *   createdAt: import('firebase/firestore').Timestamp | null
 * }} OperatorFeedbackRecord */

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
 * @returns {FeedbackRecord | null}
 */
export function mapFeedbackDoc(data, id) {
  const issueType = String(data.issueType ?? '')
  if (!FEEDBACK_ISSUE_TYPES.includes(/** @type {FeedbackIssueType} */ (issueType))) return null

  return {
    id,
    issueType: /** @type {FeedbackIssueType} */ (issueType),
    description: String(data.description ?? ''),
    screenshotURL: typeof data.screenshotURL === 'string' ? data.screenshotURL : '',
    userId: String(data.userId ?? ''),
    userEmail: String(data.userEmail ?? ''),
    callsign: String(data.callsign ?? ''),
    createdAt: coerceFeedbackTimestamp(data.createdAt),
  }
}

/**
 * @param {{
 *   issueType: FeedbackIssueType
 *   description: string
 *   screenshotURL?: string
 *   userId: string
 *   userEmail?: string
 *   callsign?: string
 * }} input
 * @returns {Promise<string>} feedbackId
 */
export async function submitFeedback({
  issueType,
  description,
  screenshotURL = '',
  userId,
  userEmail = '',
  callsign = '',
}) {
  assertDb()

  const uid = String(userId ?? '').trim()
  const body = String(description ?? '').trim()
  if (!uid) {
    const e = new Error('Oturum gerekli')
    e.code = 'unauthenticated'
    throw e
  }
  if (!FEEDBACK_ISSUE_TYPES.includes(issueType)) {
    const e = new Error('Geçersiz bildirim türü')
    e.code = 'invalid-argument'
    throw e
  }
  if (!body) {
    const e = new Error('Açıklama boş olamaz')
    e.code = 'invalid-argument'
    throw e
  }

  const screenshot = String(screenshotURL ?? '').trim()
  const payload = prepareAudazWritePayload({
    issueType,
    description: body,
    userId: uid,
    userEmail: String(userEmail ?? auth?.currentUser?.email ?? '').trim(),
    callsign: String(callsign ?? '').trim(),
    createdAt: serverTimestamp(),
    ...(screenshot ? { screenshotURL: screenshot } : {}),
  })

  const ref = await addDoc(collection(db, 'feedback'), payload)
  return ref.id
}

/**
 * Şikayet & öneri — yeni şema (type / fullName / subject / message / imageUrls).
 * @param {{
 *   type: OperatorFeedbackType
 *   fullName: string
 *   subject: string
 *   message: string
 *   imageUrls?: string[]
 *   userId: string
 *   userEmail?: string
 *   callsign?: string
 * }} input
 * @returns {Promise<string>} feedbackId
 */
export async function submitOperatorFeedback({
  type,
  fullName,
  subject,
  message,
  imageUrls = [],
  userId,
  userEmail = '',
  callsign = '',
}) {
  assertDb()

  const uid = String(userId ?? '').trim()
  const name = String(fullName ?? '').trim()
  const subj = String(subject ?? '').trim()
  const body = String(message ?? '').trim()
  const urls = Array.isArray(imageUrls)
    ? imageUrls.map((u) => String(u ?? '').trim()).filter(Boolean).slice(0, 5)
    : []

  if (!uid) {
    const e = new Error('Oturum gerekli')
    e.code = 'unauthenticated'
    throw e
  }
  if (!OPERATOR_FEEDBACK_TYPES.includes(type)) {
    const e = new Error('Geçersiz bildirim türü')
    e.code = 'invalid-argument'
    throw e
  }
  if (!name || name.length > 120) {
    const e = new Error('Ad soyad 1–120 karakter olmalı')
    e.code = 'invalid-argument'
    throw e
  }
  if (!subj || subj.length > 200) {
    const e = new Error('Konu başlığı 1–200 karakter olmalı')
    e.code = 'invalid-argument'
    throw e
  }
  if (!body || body.length > 4000) {
    const e = new Error('Mesaj 1–4000 karakter olmalı')
    e.code = 'invalid-argument'
    throw e
  }

  const payload = prepareAudazWritePayload({
    type,
    fullName: name,
    subject: subj,
    message: body,
    imageUrls: urls,
    userId: uid,
    userEmail: String(userEmail ?? auth?.currentUser?.email ?? '').trim(),
    callsign: String(callsign ?? '').trim(),
    status: 'new',
    createdAt: serverTimestamp(),
  })

  const ref = await addDoc(collection(db, 'feedback'), payload)
  return ref.id
}

/**
 * @param {import('firebase/firestore').DocumentData} data
 * @param {string} id
 * @returns {OperatorFeedbackRecord | null}
 */
export function mapOperatorFeedbackDoc(data, id) {
  const type = String(data.type ?? '')
  if (!OPERATOR_FEEDBACK_TYPES.includes(/** @type {OperatorFeedbackType} */ (type))) return null

  const rawUrls = data.imageUrls
  const imageUrls = Array.isArray(rawUrls)
    ? rawUrls.map((u) => String(u ?? '').trim()).filter(Boolean)
    : []

  return {
    id,
    type: /** @type {OperatorFeedbackType} */ (type),
    fullName: String(data.fullName ?? ''),
    subject: String(data.subject ?? ''),
    message: String(data.message ?? ''),
    imageUrls,
    userId: String(data.userId ?? ''),
    userEmail: String(data.userEmail ?? ''),
    callsign: String(data.callsign ?? ''),
    status: String(data.status ?? 'new'),
    createdAt: coerceFeedbackTimestamp(data.createdAt),
  }
}

/**
 * Legacy + yeni şemayı tek satır modeline indirger.
 * @param {import('firebase/firestore').DocumentData} data
 * @param {string} id
 * @returns {UnifiedFeedbackRecord | null}
 */
export function mapUnifiedFeedbackDoc(data, id) {
  const operator = mapOperatorFeedbackDoc(data, id)
  if (operator) {
    return {
      id,
      schema: 'operator',
      typeKey: operator.type,
      typeLabel: OPERATOR_FEEDBACK_TYPE_LABELS[operator.type] ?? operator.type,
      operatorName: operator.fullName.trim() || operator.callsign.trim() || '—',
      userEmail: operator.userEmail,
      userId: operator.userId,
      callsign: operator.callsign,
      subject: operator.subject,
      message: operator.message,
      imageUrls: operator.imageUrls,
      status: operator.status || 'new',
      createdAt: operator.createdAt,
    }
  }

  const legacy = mapFeedbackDoc(data, id)
  if (!legacy) return null

  const legacyStatus = String(data.status ?? '').trim()
  return {
    id,
    schema: 'legacy',
    typeKey: legacy.issueType,
    typeLabel: legacy.issueType,
    operatorName: legacy.callsign.trim() || '—',
    userEmail: legacy.userEmail,
    userId: legacy.userId,
    callsign: legacy.callsign,
    subject: '',
    message: legacy.description,
    imageUrls: legacy.screenshotURL ? [legacy.screenshotURL] : [],
    status: legacyStatus || 'legacy',
    createdAt: coerceFeedbackTimestamp(legacy.createdAt ?? data.createdAt),
  }
}

/**
 * @param {unknown} raw
 * @returns {import('firebase/firestore').Timestamp | Date | null}
 */
export function coerceFeedbackTimestamp(raw) {
  if (raw == null) return null
  if (typeof raw === 'object' && raw !== null && typeof /** @type {{ toDate?: () => Date }} */ (raw).toDate === 'function') {
    try {
      return /** @type {import('firebase/firestore').Timestamp} */ (raw)
    } catch {
      return null
    }
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof raw === 'string') {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof raw === 'object' && raw !== null) {
    const sec =
      /** @type {{ seconds?: number; _seconds?: number; nanoseconds?: number }} */ (raw).seconds ??
      /** @type {{ _seconds?: number }} */ (raw)._seconds
    if (typeof sec === 'number' && Number.isFinite(sec)) {
      return new Date(sec * 1000)
    }
  }
  return null
}

/**
 * @param {UnifiedFeedbackRecord[]} rows
 */
export function summarizeFeedbackRows(rows) {
  let complaints = 0
  let suggestions = 0
  let fresh = 0

  for (const row of rows) {
    if (row.typeKey === 'complaint' || row.typeKey === 'Hata' || row.typeKey === 'Bug') {
      complaints += 1
    } else if (row.typeKey === 'suggestion' || row.typeKey === 'Öneri') {
      suggestions += 1
    }
    if (row.status === 'new' || row.status === 'legacy') fresh += 1
  }

  return {
    total: rows.length,
    complaints,
    suggestions,
    fresh,
  }
}

/**
 * Admin — geri bildirim durumu güncelle (isContentAdmin Firestore kuralı).
 * @param {string} feedbackId
 * @param {FeedbackStatusValue} status
 */
export async function updateFeedbackStatus(feedbackId, status) {
  assertDb()
  const id = String(feedbackId ?? '').trim()
  if (!id) {
    const e = new Error('Kayıt kimliği gerekli')
    e.code = 'invalid-argument'
    throw e
  }
  if (!FEEDBACK_STATUS_VALUES.includes(status)) {
    const e = new Error('Geçersiz durum')
    e.code = 'invalid-argument'
    throw e
  }
  await updateDoc(doc(db, 'feedback', id), { status })
}

/**
 * @param {(rows: UnifiedFeedbackRecord[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeFeedbackForAdmin(onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }

  const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapUnifiedFeedbackDoc(d.data(), d.id))
        .filter(Boolean)
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {import('firebase/firestore').Timestamp | Date | null | undefined | unknown} ts
 */
export function formatFeedbackTimestamp(ts) {
  const coerced = coerceFeedbackTimestamp(ts)
  if (!coerced) return '—'

  /** @type {Date | null} */
  let date = coerced instanceof Date ? coerced : null
  if (!date && typeof /** @type {{ toDate?: () => Date }} */ (coerced).toDate === 'function') {
    try {
      date = /** @type {{ toDate: () => Date }} */ (coerced).toDate()
    } catch {
      return '—'
    }
  }

  if (!date || Number.isNaN(date.getTime())) return '—'

  try {
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}
