import { useCallback, useRef, useState } from 'react'
import { mapStorageError, uploadAndReplace, uploadFile } from '../services/storageService'

/**
 * Firebase Storage yükleme durumu — loading, progress, error (HUD mesajları).
 */
export function useStorage() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const activeRef = useRef(false)

  const reset = useCallback(() => {
    setLoading(false)
    setProgress(0)
    setError(null)
    activeRef.current = false
  }, [])

  const beginUpload = useCallback(() => {
    if (activeRef.current) {
      const err = new Error('Başka bir yükleme devam ediyor.')
      err.code = 'upload-busy'
      throw err
    }
    activeRef.current = true
    setLoading(true)
    setProgress(0)
    setError(null)
  }, [])

  const finishUpload = useCallback(() => {
    setLoading(false)
    activeRef.current = false
  }, [])

  const captureError = useCallback((err) => {
    const message = mapStorageError(err)
    setError(message)
    return message
  }, [])

  /**
   * @param {File} file
   * @param {string} path
   * @param {string} fileName
   * @returns {Promise<string>}
   */
  const upload = useCallback(
    async (file, path, fileName) => {
      beginUpload()
      try {
        const url = await uploadFile(file, path, fileName, {
          onProgress: (pct) => setProgress(pct),
        })
        setProgress(100)
        return url
      } catch (err) {
        captureError(err)
        throw err
      } finally {
        finishUpload()
      }
    },
    [beginUpload, captureError, finishUpload],
  )

  /**
   * Atomik yükleme + eski dosya temizliği.
   * @param {File} newFile
   * @param {string | null | undefined} oldFileUrl
   * @param {string} storagePath
   * @param {string} fileName
   * @returns {Promise<string>}
   */
  const replace = useCallback(
    async (newFile, oldFileUrl, storagePath, fileName) => {
      beginUpload()
      try {
        const url = await uploadAndReplace(newFile, oldFileUrl, storagePath, fileName, {
          onProgress: (pct) => setProgress(pct),
        })
        setProgress(100)
        return url
      } catch (err) {
        captureError(err)
        throw err
      } finally {
        finishUpload()
      }
    },
    [beginUpload, captureError, finishUpload],
  )

  return {
    upload,
    replace,
    loading,
    progress,
    error,
    reset,
  }
}
