import { throwStorageError, uploadFile } from '../services/storageService'

/**
 * @param {string} threadId chatId veya channelId
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<string>} downloadURL
 */
export async function uploadMuhabereChatImage(threadId, file, onProgress) {
  const tid = String(threadId ?? '').trim()
  if (!tid) {
    throwStorageError('INVALID_THREAD', 'invalid-argument')
  }

  if (!file.type.startsWith('image/')) {
    throwStorageError('IMAGES_ONLY', 'invalid-argument')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${safeExt}`

  return uploadFile(file, `messages/${tid}`, fileName, { onProgress })
}
