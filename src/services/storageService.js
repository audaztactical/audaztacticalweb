import imageCompression from 'browser-image-compression'
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from 'firebase/storage'
import i18n from '../i18n'
import { isFirebaseConfigured, storage } from '../lib/firebase'

const COMPRESS_THRESHOLD_BYTES = 500 * 1024
const MAX_IMAGE_DIMENSION = 1024
const COMPRESS_QUALITY = 0.8
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024

/** @type {ReadonlySet<string>} */
export const STORAGE_ERROR_CODES = new Set([
  'FIREBASE_STORAGE_NOT_CONFIGURED',
  'INVALID_STORAGE_PATH',
  'USER_ID_REQUIRED',
  'INVALID_FORUM_STORAGE_PATH',
  'FILE_REQUIRED',
  'FILE_TOO_LARGE',
  'UPLOAD_BUSY',
  'INVALID_THREAD',
  'IMAGES_ONLY',
  'SESSION_REQUIRED',
  'UNAUTHORIZED',
  'UNAUTHENTICATED',
  'CANCELED',
  'RETRY_LIMIT',
  'INVALID_ARGUMENT',
  'OBJECT_NOT_FOUND',
  'INVALID_URL',
  'QUOTA_EXCEEDED',
  'BUCKET_NOT_FOUND',
  'PROJECT_NOT_FOUND',
  'UNKNOWN',
  'SERVER_FILE_WRONG_SIZE',
  'INVALID_CHECKSUM',
  'CANNOT_SLICE_BLOB',
  'NO_DEFAULT_BUCKET',
  'INVALID_FORMAT',
  'INVALID_EVENT_NAME',
  'INVALID_ROOT_OPERATION',
  'APP_DELETED',
  'FAULT',
])

/** @type {Record<string, string>} */
const FIREBASE_STORAGE_CODE_MAP = {
  'storage/unauthorized': 'UNAUTHORIZED',
  'storage/unauthenticated': 'UNAUTHENTICATED',
  'storage/canceled': 'CANCELED',
  'storage/retry-limit-exceeded': 'RETRY_LIMIT',
  'storage/invalid-argument': 'INVALID_ARGUMENT',
  'storage/object-not-found': 'OBJECT_NOT_FOUND',
  'storage/invalid-url': 'INVALID_URL',
  'storage/quota-exceeded': 'QUOTA_EXCEEDED',
  'storage/bucket-not-found': 'BUCKET_NOT_FOUND',
  'storage/project-not-found': 'PROJECT_NOT_FOUND',
  'storage/unknown': 'UNKNOWN',
  'storage/server-file-wrong-size': 'SERVER_FILE_WRONG_SIZE',
  'storage/invalid-checksum': 'INVALID_CHECKSUM',
  'storage/cannot-slice-blob': 'CANNOT_SLICE_BLOB',
  'storage/no-default-bucket': 'NO_DEFAULT_BUCKET',
  'storage/invalid-format': 'INVALID_FORMAT',
  'storage/invalid-event-name': 'INVALID_EVENT_NAME',
  'storage/invalid-root-operation': 'INVALID_ROOT_OPERATION',
  'storage/app-deleted': 'APP_DELETED',
  'failed-precondition': 'FIREBASE_STORAGE_NOT_CONFIGURED',
  'invalid-argument': 'INVALID_ARGUMENT',
  'unauthenticated': 'SESSION_REQUIRED',
  'upload-busy': 'UPLOAD_BUSY',
}

/**
 * @param {string} audazCode
 * @param {string} [firebaseCode]
 * @param {Record<string, unknown>} [params]
 * @returns {never}
 */
export function throwStorageError(audazCode, firebaseCode = 'failed-precondition', params) {
  const e = new Error(audazCode)
  e.code = firebaseCode
  e.__audazCode = audazCode
  if (params && typeof params === 'object') {
    e.__audazParams = params
  }
  throw e
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function resolveStorageErrorCode(err) {
  const audaz =
    err && typeof err === 'object' && '__audazCode' in err
      ? String(/** @type {{ __audazCode?: string }} */ (err).__audazCode ?? '').trim()
      : ''
  if (STORAGE_ERROR_CODES.has(audaz)) return audaz

  const message = err instanceof Error ? String(err.message ?? '').trim() : ''
  if (STORAGE_ERROR_CODES.has(message)) return message

  const code =
    err && typeof err === 'object' && 'code' in err
      ? String(/** @type {{ code?: string }} */ (err).code ?? '')
      : ''

  if (FIREBASE_STORAGE_CODE_MAP[code]) return FIREBASE_STORAGE_CODE_MAP[code]
  if (code.startsWith('storage/')) return 'FAULT'

  return 'FAULT'
}

/**
 * Storage hatalarını kullanıcı dilinde gösterir (Batch F).
 * @param {unknown} err
 * @returns {string}
 */
export function formatStorageErrorDisplay(err) {
  const audazCode = resolveStorageErrorCode(err)
  const params =
    err && typeof err === 'object' && '__audazParams' in err
      ? /** @type {{ __audazParams?: Record<string, unknown> }} */ (err).__audazParams ?? {}
      : {}

  return i18n.t(`storage.errors.codes.${audazCode}`, {
    ns: 'common',
    defaultValue: i18n.t('storage.errors.codes.FAULT', { ns: 'common' }),
    ...params,
  })
}

/**
 * OPERASYONEL NOT — Depolama katmanı hatalarını HUD uyumlu operatör mesajına çevirir.
 * @param {unknown} err
 * @returns {string}
 */
export function mapStorageError(err) {
  return formatStorageErrorDisplay(err)
}

/**
 * @param {unknown} err
 * @returns {Error}
 */
function toStorageError(err) {
  if (err && typeof err === 'object' && '__audazCode' in err) {
    return /** @type {Error} */ (err)
  }

  const audazCode = resolveStorageErrorCode(err)
  const wrapped = new Error(audazCode)
  wrapped.__audazCode = audazCode
  const code = /** @type {{ code?: string }} */ (err)?.code
  if (code) wrapped.code = code
  else if (audazCode === 'FIREBASE_STORAGE_NOT_CONFIGURED') wrapped.code = 'failed-precondition'
  else if (audazCode === 'UPLOAD_BUSY') wrapped.code = 'upload-busy'
  else wrapped.code = 'storage/unknown'

  const params = /** @type {{ __audazParams?: Record<string, unknown> }} */ (err)?.__audazParams
  if (params) wrapped.__audazParams = params

  return wrapped
}

/**
 * @returns {import('firebase/storage').FirebaseStorage}
 */
function requireStorage() {
  if (!isFirebaseConfigured() || !storage) {
    throwStorageError('FIREBASE_STORAGE_NOT_CONFIGURED', 'failed-precondition')
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
    throwStorageError('INVALID_STORAGE_PATH', 'invalid-argument')
  }
  if (dir.includes('..') || name.includes('..') || name.includes('/')) {
    throwStorageError('INVALID_STORAGE_PATH', 'invalid-argument')
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
    throwStorageError('USER_ID_REQUIRED', 'invalid-argument')
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
    throwStorageError('INVALID_FORUM_STORAGE_PATH', 'invalid-argument')
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
    throwStorageError('FILE_REQUIRED', 'invalid-argument')
  }

  try {
    const bucket = requireStorage()
    const prepared = file.type.startsWith('image/') ? await compressImageIfNeeded(file) : file

    if (prepared.size > MAX_UPLOAD_BYTES) {
      throwStorageError('FILE_TOO_LARGE', 'invalid-argument', { maxMb: 6 })
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
