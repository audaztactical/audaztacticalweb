import { useCallback, useMemo } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

/**
 * Firestore yazımlarında ownerId + updatedAt (+ isteğe bağlı createdAt) ekler.
 * Giriş yoksa işlem yapılmaz; hata fırlatır.
 */
export function useFirestore() {
  const { user } = useAuth()

  const requireUser = useCallback(() => {
    if (!isFirebaseConfigured() || !db) {
      throw new Error('Firebase yapılandırılmadı')
    }
    if (!user?.uid) {
      throw new Error('Oturum gerekli')
    }
    return user.uid
  }, [user])

  const enrichCreate = useCallback(
    (data, uid) => {
      const next = { ...data }
      if (next.ownerId === undefined) next.ownerId = uid
      next.updatedAt = serverTimestamp()
      if (next.createdAt === undefined) next.createdAt = serverTimestamp()
      return next
    },
    []
  )

  const enrichUpdate = useCallback((data) => {
    const next = { ...data }
    next.updatedAt = serverTimestamp()
    return next
  }, [])

  /** addDoc — yeni belge (otomatik id) */
  const addDocument = useCallback(
    async (collectionPath, data) => {
      const uid = requireUser()
      const ref = collection(db, collectionPath)
      return addDoc(ref, enrichCreate(data, uid))
    },
    [requireUser, enrichCreate]
  )

  /**
   * setDoc — pathSegments örn: ['inventory', uid] veya ['missions', missionId]
   * options.merge === true → sadece partial + updatedAt (oluşturma değil birleştirme)
   */
  const setDocument = useCallback(
    async (pathSegments, data, options = {}) => {
      const uid = requireUser()
      const ref = doc(db, ...pathSegments)
      if (options.merge) {
        return setDoc(ref, enrichUpdate(data), { merge: true })
      }
      return setDoc(ref, enrichCreate(data, uid))
    },
    [requireUser, enrichCreate, enrichUpdate]
  )

  /** updateDoc — mevcut belge; updatedAt eklenir, ownerId gönderilmezse dokunulmaz */
  const patchDocument = useCallback(
    async (pathSegments, data) => {
      requireUser()
      const ref = doc(db, ...pathSegments)
      return updateDoc(ref, enrichUpdate(data))
    },
    [requireUser, enrichUpdate]
  )

  const removeDocument = useCallback(
    async (pathSegments) => {
      requireUser()
      return deleteDoc(doc(db, ...pathSegments))
    },
    [requireUser]
  )

  return useMemo(
    () => ({
      addDocument,
      setDocument,
      patchDocument,
      removeDocument,
      /** Ham yardımcılar (transaction / batch içinde kullanım için) */
      enrichCreate,
      enrichUpdate,
      requireUser,
      ready: !!user?.uid && isFirebaseConfigured(),
    }),
    [addDocument, setDocument, patchDocument, removeDocument, enrichCreate, enrichUpdate, requireUser, user]
  )
}
