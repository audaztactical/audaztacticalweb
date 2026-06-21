import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot } from './firestoreSnapshot'
import { mapForumPostSnapshot, mapForumReplyDoc } from './firestoreForum'

/** @readonly */
export const FORUM_REPORT_REASONS = /** @type {const} */ ({
  spam: 'Spam',
  harassment: 'Taciz/Hakaret',
  inappropriate: 'Uygunsuz İçerik',
  other: 'Diğer',
})

/** @readonly */
export const FORUM_REPORT_STATUS_VALUES = /** @type {const} */ (['pending', 'reviewed', 'dismissed'])

/** @type {Record<(typeof FORUM_REPORT_STATUS_VALUES)[number], string>} */
export const FORUM_REPORT_STATUS_LABELS = {
  pending: 'Bekleyen',
  reviewed: 'İncelendi',
  dismissed: 'Reddedildi',
}

/** @typedef {(typeof FORUM_REPORT_REASONS extends Record<string, string> ? keyof typeof FORUM_REPORT_REASONS : never)} ForumReportReasonKey */
/** @typedef {'post' | 'comment'} ForumReportTargetType */
/** @typedef {(typeof FORUM_REPORT_STATUS_VALUES)[number]} ForumReportStatus */

/** @typedef {{
 *   id: string
 *   reporterId: string
 *   reporterCallsign: string
 *   targetType: ForumReportTargetType
 *   targetId: string
 *   parentPostId: string | null
 *   reason: ForumReportReasonKey
 *   description: string
 *   status: ForumReportStatus
 *   createdAt: unknown
 * }} ForumReportRecord */

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {ForumReportTargetType} targetType
 * @param {string} targetId
 * @param {string | null} parentPostId
 * @param {string} reporterId
 */
export function buildForumReportId(targetType, targetId, parentPostId, reporterId) {
  const tid = String(targetId ?? '').trim()
  const rid = String(reporterId ?? '').trim()
  if (!tid || !rid) return ''

  if (targetType === 'post') {
    return `post_${tid}_${rid}`
  }

  const pid = String(parentPostId ?? '').trim()
  if (!pid) return ''
  return `comment_${pid}_${tid}_${rid}`
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} snap
 * @returns {ForumReportRecord}
 */
function mapForumReportDoc(snap) {
  const d = snap.data()
  const reason = String(d.reason ?? 'other')
  const validReason = reason in FORUM_REPORT_REASONS ? reason : 'other'
  const statusRaw = String(d.status ?? 'pending')
  const status = FORUM_REPORT_STATUS_VALUES.includes(statusRaw) ? statusRaw : 'pending'

  return {
    id: snap.id,
    reporterId: typeof d.reporterId === 'string' ? d.reporterId : '',
    reporterCallsign: typeof d.reporterCallsign === 'string' ? d.reporterCallsign : 'OPERATÖR',
    targetType: d.targetType === 'comment' ? 'comment' : 'post',
    targetId: typeof d.targetId === 'string' ? d.targetId : '',
    parentPostId: typeof d.parentPostId === 'string' ? d.parentPostId : null,
    reason: /** @type {ForumReportReasonKey} */ (validReason),
    description: typeof d.description === 'string' ? d.description : '',
    status: /** @type {ForumReportStatus} */ (status),
    createdAt: d.createdAt ?? null,
  }
}

/**
 * @param {{
 *   targetType: ForumReportTargetType
 *   targetId: string
 *   parentPostId?: string | null
 *   reason: ForumReportReasonKey
 *   description?: string
 *   reporterId: string
 *   reporterCallsign?: string
 * }} payload
 */
export async function createForumReport(payload) {
  assertDb()

  const reporterId = String(payload.reporterId ?? '').trim()
  const targetId = String(payload.targetId ?? '').trim()
  const targetType = payload.targetType
  const parentPostId = targetType === 'comment' ? String(payload.parentPostId ?? '').trim() : null

  if (!reporterId || !targetId) {
    const e = new Error('Şikayet gönderilemedi — oturum gerekli.')
    e.code = 'invalid-argument'
    throw e
  }
  if (targetType === 'comment' && !parentPostId) {
    const e = new Error('Yorum şikayeti için gönderi kimliği gerekli.')
    e.code = 'invalid-argument'
    throw e
  }
  if (!(payload.reason in FORUM_REPORT_REASONS)) {
    const e = new Error('Geçersiz şikayet kategorisi.')
    e.code = 'invalid-argument'
    throw e
  }

  const reportId = buildForumReportId(targetType, targetId, parentPostId, reporterId)
  if (!reportId) {
    const e = new Error('Şikayet kimliği oluşturulamadı.')
    e.code = 'invalid-argument'
    throw e
  }

  const ref = doc(db, 'forum_reports', reportId)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    const e = new Error('Bu içeriği zaten şikayet ettiniz.')
    e.code = 'already-exists'
    throw e
  }

  await setDoc(ref, {
    reporterId,
    reporterCallsign: String(payload.reporterCallsign ?? 'OPERATÖR').trim() || 'OPERATÖR',
    targetType,
    targetId,
    parentPostId: targetType === 'comment' ? parentPostId : null,
    reason: payload.reason,
    description: String(payload.description ?? '').trim().slice(0, 500),
    status: 'pending',
    createdAt: serverTimestamp(),
  })

  return reportId
}

/**
 * @param {(reports: ForumReportRecord[]) => void} onNext
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeForumReportsForAdmin(onNext, onError) {
  assertDb()
  const q = query(collection(db, 'forum_reports'), orderBy('createdAt', 'desc'))
  return safeOnSnapshot(
    q,
    (snap) => onNext(snap.docs.map(mapForumReportDoc)),
    onError,
  )
}

/**
 * @param {string} reportId
 * @param {ForumReportStatus} status
 */
export async function updateForumReportStatus(reportId, status) {
  assertDb()
  const id = String(reportId ?? '').trim()
  if (!id || !FORUM_REPORT_STATUS_VALUES.includes(status)) {
    const e = new Error('Geçersiz şikayet durumu.')
    e.code = 'invalid-argument'
    throw e
  }
  await updateDoc(doc(db, 'forum_reports', id), { status })
}

/**
 * Aynı hedefe ait bekleyen şikayetleri günceller.
 * @param {ForumReportTargetType} targetType
 * @param {string} targetId
 * @param {string | null} parentPostId
 * @param {ForumReportStatus} status
 * @param {ForumReportRecord[]} [allReports]
 */
export async function updateForumReportsForTarget(targetType, targetId, parentPostId, status, allReports) {
  const tid = String(targetId ?? '').trim()
  if (!tid) return

  let rows = allReports
  if (!rows) {
    const q = query(
      collection(db, 'forum_reports'),
      where('targetType', '==', targetType),
      where('targetId', '==', tid),
    )
    const snap = await getDocs(q)
    rows = snap.docs.map(mapForumReportDoc)
  }

  const matches = rows.filter((r) => {
    if (r.targetType !== targetType || r.targetId !== tid) return false
    if (targetType === 'comment') {
      return r.parentPostId === parentPostId
    }
    return true
  })

  await Promise.all(
    matches.filter((r) => r.status === 'pending').map((r) => updateForumReportStatus(r.id, status)),
  )
}

/**
 * @param {string} postId
 * @param {string} adminUid
 * @param {string} reason
 */
export async function softRemoveForumPost(postId, adminUid, reason) {
  assertDb()
  const pid = String(postId ?? '').trim()
  const admin = String(adminUid ?? '').trim()
  if (!pid || !admin) {
    const e = new Error('Kaldırma işlemi için admin oturumu gerekli.')
    e.code = 'invalid-argument'
    throw e
  }

  await updateDoc(doc(db, 'forum_posts', pid), {
    removed: true,
    removedReason: String(reason ?? '').trim().slice(0, 500) || 'Moderasyon',
    removedBy: admin,
    removedAt: serverTimestamp(),
  })
}

/**
 * @param {string} postId
 * @param {string} replyId
 * @param {string} adminUid
 * @param {string} reason
 */
export async function softRemoveForumReply(postId, replyId, adminUid, reason) {
  assertDb()
  const pid = String(postId ?? '').trim()
  const rid = String(replyId ?? '').trim()
  const admin = String(adminUid ?? '').trim()
  if (!pid || !rid || !admin) {
    const e = new Error('Kaldırma işlemi için admin oturumu gerekli.')
    e.code = 'invalid-argument'
    throw e
  }

  await updateDoc(doc(db, 'forum_posts', pid, 'replies', rid), {
    removed: true,
    removedReason: String(reason ?? '').trim().slice(0, 500) || 'Moderasyon',
    removedBy: admin,
    removedAt: serverTimestamp(),
  })
}

/**
 * @param {ForumReportRecord} report
 */
export async function fetchForumReportTargetContent(report) {
  assertDb()

  if (report.targetType === 'post') {
    const snap = await getDoc(doc(db, 'forum_posts', report.targetId))
    const post = mapForumPostSnapshot(snap)
    return post ? { type: 'post', post, reply: null } : null
  }

  const parentId = String(report.parentPostId ?? '').trim()
  if (!parentId) return null

  const [postSnap, replySnap] = await Promise.all([
    getDoc(doc(db, 'forum_posts', parentId)),
    getDoc(doc(db, 'forum_posts', parentId, 'replies', report.targetId)),
  ])

  const post = mapForumPostSnapshot(postSnap)
  const reply = replySnap.exists() ? mapForumReplyDoc(replySnap) : null
  return post ? { type: 'comment', post, reply } : null
}

/**
 * @param {ForumReportRecord[]} reports
 */
export function groupForumReportsByTarget(reports) {
  /** @type {Map<string, { targetType: ForumReportTargetType; targetId: string; parentPostId: string | null; reports: ForumReportRecord[] }>} */
  const map = new Map()

  for (const report of reports) {
    const key = `${report.targetType}:${report.parentPostId ?? ''}:${report.targetId}`
    if (!map.has(key)) {
      map.set(key, {
        targetType: report.targetType,
        targetId: report.targetId,
        parentPostId: report.parentPostId,
        reports: [],
      })
    }
    map.get(key).reports.push(report)
  }

  return [...map.values()].map((group) => ({
    ...group,
    pendingCount: group.reports.filter((r) => r.status === 'pending').length,
    reportCount: group.reports.length,
  }))
}

/**
 * @param {unknown} ts
 */
export function formatForumReportTimestamp(ts) {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
  }
  const ms = Date.parse(String(ts ?? ''))
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}
