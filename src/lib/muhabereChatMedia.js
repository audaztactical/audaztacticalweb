import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { isFirebaseConfigured, storage } from './firebase'

/**
 * @param {string} threadId chatId veya channelId
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<string>} downloadURL
 */
export async function uploadMuhabereChatImage(threadId, file, onProgress) {
  if (!isFirebaseConfigured() || !storage) {
    const e = new Error('Firebase Storage yapılandırılmadı.')
    e.code = 'failed-precondition'
    throw e
  }

  const tid = String(threadId ?? '').trim()
  if (!tid) {
    const e = new Error('Sohbet kanalı geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  if (!file.type.startsWith('image/')) {
    const e = new Error('Yalnızca görsel dosyaları desteklenir.')
    e.code = 'invalid-argument'
    throw e
  }

  if (file.size > 6 * 1024 * 1024) {
    const e = new Error('Görsel 6MB altında olmalı.')
    e.code = 'invalid-argument'
    throw e
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `chat_images/${tid}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${safeExt}`
  const ref = storageRef(storage, path)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref, file, { contentType: file.type })

    task.on(
      'state_changed',
      (snap) => {
        if (snap.totalBytes > 0) {
          onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100))
        }
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve(url)
        } catch (err) {
          reject(err)
        }
      },
    )
  })
}
