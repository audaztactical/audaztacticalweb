import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { assertCanManageAdminContent } from '../config/admin'
import { callFunctionViaHttp } from './cloudFunctions'
import { writeManualAlertBroadcastLog } from './firestoreManualAlertBroadcasts'
import { auth, db, isFirebaseConfigured } from './firebase'

const MANUAL_SOURCE = 'AUDAZ KOMUTA MERKEZİ'

/**
 * @param {string} title
 * @param {string} message
 */
function buildManualAlertDocId(title, message) {
  const seed = `${title}|${message}|${Date.now()}|${Math.random().toString(36).slice(2)}`
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return `manual_${hash.toString(16).padStart(8, '0')}${Date.now().toString(36).slice(-4)}`
}

/**
 * Zorunlu ikaz — önce Firestore (tüm oturumlar overlay görür), sonra isteğe bağlı FCM.
 * @param {{ title: string; message: string }} input
 */
export async function publishManualSystemAlert(input) {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase yapılandırılmadı.')
  }

  const title = String(input?.title ?? '').trim()
  const message = String(input?.message ?? '').trim()
  if (!title || !message) {
    throw new Error('Başlık ve mesaj zorunludur.')
  }

  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const docId = buildManualAlertDocId(title, message)
  const createdBy = String(auth?.currentUser?.uid ?? '').trim()
  const publishedAtMs = Date.now()

  await setDoc(doc(db, 'system_alerts', docId), {
    title,
    message,
    active: true,
    mandatory: true,
    source: MANUAL_SOURCE,
    createdAt: serverTimestamp(),
    createdBy,
  })

  let fcmSent = false
  try {
    const pushResult = await callFunctionViaHttp('pushManualAlertFcm', {
      title,
      message,
      docId,
    })
    fcmSent = Boolean(pushResult?.fcmSent)
  } catch {
    /* FCM / callable başarısız — uygulama içi ikaz yine de aktif */
  }

  await writeManualAlertBroadcastLog({
    broadcastId: docId,
    title,
    message,
    systemAlertId: docId,
    fcmSent,
    publishedAtMs,
  })

  return {
    success: true,
    docId,
    fcmSent,
    mandatoryInApp: true,
  }
}
