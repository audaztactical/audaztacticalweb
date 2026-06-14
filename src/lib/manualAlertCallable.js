import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, isFirebaseConfigured } from './firebase'

/**
 * Admin: manuel erken uyarı — news_feed + asayis_ikaz FCM topic.
 * @param {{ title: string, message: string }} input
 * @returns {Promise<{ success: boolean, docId?: string, topic?: string }>}
 */
export async function sendManualAlert(input) {
  if (!isFirebaseConfigured() || !app) {
    throw new Error('Firebase yapılandırılmadı.')
  }

  const title = String(input?.title ?? '').trim()
  const message = String(input?.message ?? '').trim()
  if (!title || !message) {
    throw new Error('Başlık ve mesaj zorunludur.')
  }

  const functions = getFunctions(app)
  const callable = httpsCallable(functions, 'sendManualAlert')
  const result = await callable({ title, message })
  const data = /** @type {{ success?: boolean, docId?: string, topic?: string }} */ (
    result.data ?? {}
  )

  if (!data.success) {
    throw new Error('İkaz gönderilemedi.')
  }

  return data
}
