import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscribeUserProfile } from '../lib/firestoreUsers'

/**
 * Operatör profil görseli — Firestore users/{uid} canlı dinleme.
 * Kendi profilinizde Auth photoURL önceliklidir (anında güncelleme).
 * @param {string | null | undefined} uid
 */
export function useOperatorPhoto(uid) {
  const { user, userData } = useAuth()
  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    const id = String(uid ?? '').trim()
    if (!id) {
      setPhotoUrl('')
      return undefined
    }

    const isSelf = user?.uid === id
    const selfPhoto = (user?.photoURL || userData?.photoURL || '').trim()

    if (isSelf && selfPhoto) {
      setPhotoUrl(selfPhoto)
    }

    const unsub = subscribeUserProfile(
      id,
      (profile) => {
        const fromDoc = (profile?.photoURL || '').trim()
        if (isSelf) {
          setPhotoUrl((user?.photoURL || fromDoc || userData?.photoURL || '').trim())
        } else {
          setPhotoUrl(fromDoc)
        }
      },
      () => {
        if (!isSelf) setPhotoUrl('')
      },
    )

    return unsub
  }, [uid, user?.uid, user?.photoURL, userData?.photoURL])

  return photoUrl
}
