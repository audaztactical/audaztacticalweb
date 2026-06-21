import { uploadFile } from '../services/storageService'

const MAX_FEEDBACK_IMAGES = 5

/**
 * Geri bildirim ekran görüntüsü — Storage feedback/{uid}/…
 * @param {File} file
 * @param {string} uid
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<string>}
 */
export async function uploadFeedbackImage(file, uid, onProgress) {
  const owner = String(uid ?? '').trim()
  if (!owner) {
    const err = new Error('Oturum gerekli')
    err.code = 'unauthenticated'
    throw err
  }
  const safeName = String(file.name ?? 'screenshot.jpg')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 80)
  const fileName = `${Date.now()}-${safeName}`
  return uploadFile(file, `feedback/${owner}`, fileName, { onProgress })
}

export { MAX_FEEDBACK_IMAGES }
