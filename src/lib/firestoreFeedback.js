import { addDoc, collection, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { prepareAudazWritePayload } from './audazFirestoreWrite'
import { auth, db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot } from './firestoreSnapshot'

/** @readonly */
export const FEEDBACK_ISSUE_TYPES = /** @type {const} */ (['Hata', 'Öneri', 'Bug'])

/** @typedef {(typeof FEEDBACK_ISSUE_TYPES)[number]} FeedbackIssueType */

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
    createdAt: data.createdAt ?? null,
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
 * @param {(rows: FeedbackRecord[]) => void} onData
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
        .map((d) => mapFeedbackDoc(d.data(), d.id))
        .filter(Boolean)
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {import('firebase/firestore').Timestamp | null | undefined} ts
 */
export function formatFeedbackTimestamp(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  try {
    return ts.toDate().toLocaleString('tr-TR', {
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
