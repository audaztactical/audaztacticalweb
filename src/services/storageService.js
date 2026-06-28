import imageCompression from 'browser-image-compression'
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from 'firebase/storage'
import { isFirebaseConfigured, storage } from '../lib/firebase'

const COMPRESS_THRESHOLD_BYTES = 500 * 1024
const MAX_IMAGE_DIMENSION = 1024
const COMPRESS_QUALITY = 0.8
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024

/**
 * OPERASYONEL NOT — Depolama katmanı hatalarını HUD uyumlu operatör mesajına çevirir.
 * @param {unknown} err
 * @returns {string}
 */
export function mapStorageError(err) {
  const code = /** @type {{ code?: string }} */ (err)?.code

  if (code === 'storage/unauthorized') return 'İZİN RED · STORAGE_WRITE_DENIED'
  if (code === 'storage/canceled') return 'YÜKLEME İPTAL · OPERATÖR_ABORT'
  if (code === 'storage/retry-limit-exceeded') return 'AĞ ZAMAN AŞIMI · TEKRAR DENE'
  if (code === 'storage/invalid-argument') return 'GEÇERSİZ DOSYA · PARAMETRE_HATASI'
  if (code === 'storage/object-not-found') return 'DOSYA BULUNAMADI · NODE_NULL'
  if (code === 'storage/invalid-url') return 'GEÇERSİZ URL · HARİCİ_KAYNAK'
  if (code === 'failed-precondition') return 'STORAGE OFFLINE · YAPILANDIRMA_EKSİK'
  if (code === 'invalid-argument') return 'GEÇERSİZ PARAMETRE · PATH_FAULT'
  if (code === 'upload-busy') return 'PARALEL YÜKLEME · BEKLEYİN'

  if (err instanceof Error && err.message.trim()) return err.message.trim()
  return 'STORAGE_FAULT · YÜKLEME_BAŞARISIZ'
}

/**
 * @param {unknown} err
 * @returns {Error}
 */
function toStorageError(err) {
  const wrapped = new Error(mapStorageError(err))
  const code = /** @type {{ code?: string }} */ (err)?.code
  if (code) wrapped.code = code
  return wrapped
}

/**
 * @returns {import('firebase/storage').FirebaseStorage}
 */
function requireStorage() {
  if (!isFirebaseConfigured() || !storage) {
    const err = new Error('Firebase Storage yapılandırılmadı.')
    err.code = 'failed-precondition'
    throw err
  }
  return storage
}

/**
 * OPERASYONEL NOT — Klasör + dosya adından tam Storage yolu üretir.
 * @param {string} path
 * @param {string} fileName
 * @returns {string}
 */
export function buildStorageFullPath(path, fileName) {
  const dir = String(path ?? '').trim().replace(/^\/+|\/+$/g, '')
  const name = String(fileName ?? '').trim().replace(/^\/+/, '')
  if (!dir || !name) {
    const err = new Error('Geçersiz depolama yolu.')
    err.code = 'invalid-argument'
    throw err
  }
  if (dir.includes('..') || name.includes('..') || name.includes('/')) {
    const err = new Error('Geçersiz depolama yolu.')
    err.code = 'invalid-argument'
    throw err
  }
  return `${dir}/${name}`
}

/**
 * OPERASYONEL NOT — Operatör profil görselleri için standart klasör yolu.
 * @param {string} uid
 * @returns {string}
 */
export function userStoragePath(uid) {
  const id = String(uid ?? '').trim()
  if (!id) {
    const err = new Error('Kullanıcı kimliği gerekli.')
    err.code = 'invalid-argument'
    throw err
  }
  return `users/${id}`
}

/**
 * OPERASYONEL NOT — Forum görsel yüklemeleri için klasör yolu.
 * @param {string} segment postId veya uid
 * @returns {string}
 */
export function forumStoragePath(segment) {
  const seg = String(segment ?? '').trim().replace(/^\/+|\/+$/g, '')
  if (!seg || seg.includes('..') || seg.includes('/')) {
    const err = new Error('Geçersiz forum depolama yolu.')
    err.code = 'invalid-argument'
    throw err
  }
  return `forum/${seg}`
}

/**
 * OPERASYONEL NOT — >500KB görselleri 1024px / %80 kaliteye sıkıştırır.
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function compressImageIfNeeded(file) {
  if (!file.type.startsWith('image/')) return file
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file

  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: MAX_IMAGE_DIMENSION,
      initialQuality: COMPRESS_QUALITY,
      useWebWorker: true,
    })

    return compressed instanceof File ? compressed : new File([compressed], file.name, { type: compressed.type })
  } catch (err) {
    throw toStorageError(err)
  }
}

/**
 * @param {import('firebase/storage').StorageReference} storageRef
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<string>}
 */
function uploadRefWithProgress(storageRef, file, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type || 'application/octet-stream' })

    task.on(
      'state_changed',
      (snap) => {
        if (snap.totalBytes > 0) {
          onProgress?.(Math.min(100, Math.round((snap.bytesTransferred / snap.totalBytes) * 100)))
        }
      },
      (err) => reject(toStorageError(err)),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          onProgress?.(100)
          resolve(url)
        } catch (err) {
          reject(toStorageError(err))
        }
      },
    )
  })
}

/**
 * OPERASYONEL NOT — Firebase downloadURL'den Storage nesne yolunu çıkarır.
 * Harici URL (Google avatar vb.) için null döner.
 * @param {string} url
 * @returns {string | null}
 */
export function parseStoragePathFromUrl(url) {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname

    if (parsed.hostname.includes('firebasestorage.googleapis.com')) {
      const match = pathname.match(/\/o\/(.+)$/)
      if (match?.[1]) return decodeURIComponent(match[1])
    }

    if (parsed.hostname === 'storage.googleapis.com') {
      const segments = pathname.split('/').filter(Boolean)
      if (segments.length >= 2) return segments.slice(1).join('/')
    }

    return null
  } catch {
    return null
  }
}

/**
 * OPERASYONEL NOT — downloadURL ile Storage nesnesini imha eder.
 * Harici URL (Google avatar vb.) ve zaten silinmiş dosyalar sessizce atlanır.
 * @param {string} url Storage downloadURL
 * @returns {Promise<void>}
 */
export async function deleteFile(url) {
  const trimmed = typeof url === 'string' ? url.trim() : ''
  if (!trimmed) return

  const objectPath = parseStoragePathFromUrl(trimmed)
  if (!objectPath) return

  const bucket = requireStorage()

  try {
    await deleteObject(ref(bucket, objectPath))
  } catch (err) {
    const code = /** @type {{ code?: string }} */ (err)?.code
    if (code === 'storage/object-not-found') return
    throw toStorageError(err)
  }
}

/**
 * OPERASYONEL NOT — Dosyayı Storage'a yükler; görseller otomatik sıkıştırılır.
 * @param {File} file
 * @param {string} path Klasör yolu (ör. users/{uid}, forum, messages/{threadId})
 * @param {string} fileName Dosya adı
 * @param {{ onProgress?: (pct: number) => void }} [options]
 * @returns {Promise<string>} downloadURL
 */
export async function uploadFile(file, path, fileName, options = {}) {
  if (!file || !(file instanceof File)) {
    const err = new Error('Geçerli bir dosya gerekli.')
    err.code = 'invalid-argument'
    throw err
  }

  try {
    const bucket = requireStorage()
    const prepared = file.type.startsWith('image/') ? await compressImageIfNeeded(file) : file

    if (prepared.size > MAX_UPLOAD_BYTES) {
      const err = new Error('Dosya 6MB sınırını aşıyor.')
      err.code = 'invalid-argument'
      throw err
    }

    const fullPath = buildStorageFullPath(path, fileName)
    const storageRef = ref(bucket, fullPath)
    const { onProgress } = options

    if (onProgress) {
      return await uploadRefWithProgress(storageRef, prepared, onProgress)
    }

    await uploadBytes(storageRef, prepared, { contentType: prepared.type || 'application/octet-stream' })
    return await getDownloadURL(storageRef)
  } catch (err) {
    throw toStorageError(err)
  }
}

/**
 * OPERASYONEL NOT — Atomik görsel değişimi (Auto-Cleanup).
 * Akış: sıkıştır → yeni dosyayı yükle → başarılıysa eski URL'i sil → yeni URL döndür.
 * Yükleme hatasında eski dosya korunur; yeni dosya yüklenmez.
 *
 * @param {File} newFile Yeni görsel
 * @param {string | null | undefined} oldFileUrl Mevcut downloadURL (yoksa null)
 * @param {string} storagePath Hedef klasör (ör. users/{uid})
 * @param {string} fileName Yeni dosya adı
 * @param {{ onProgress?: (pct: number) => void }} [options]
 * @returns {Promise<string>} Yeni downloadURL
 */
export async function uploadAndReplace(newFile, oldFileUrl, storagePath, fileName, options = {}) {
  const newUrl = await uploadFile(newFile, storagePath, fileName, options)

  const oldTrimmed = typeof oldFileUrl === 'string' ? oldFileUrl.trim() : ''
  if (!oldTrimmed || oldTrimmed === newUrl) {
    return newUrl
  }

  try {
    await deleteFile(oldTrimmed)
  } catch (cleanupErr) {
    if (import.meta.env.DEV) {
      console.warn('[storage] Auto-cleanup failed after successful upload:', cleanupErr)
    }
  }

  return newUrl
}
