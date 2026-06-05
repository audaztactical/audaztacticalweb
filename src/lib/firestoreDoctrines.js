import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { assertCanManageAdminContent } from '../config/admin'
import { auth, db, isFirebaseConfigured } from './firebase'

/**
 * Landing için: `doktrinler` koleksiyonunda isPublic === true olan belgeler.
 * Önerilen alanlar: title, teaser (veya summary), body, isPublic, category, createdAt
 */
export async function fetchPublicDoctrineTeasers(maxDocs = 8) {
  if (!isFirebaseConfigured() || !db) return []

  const q = query(collection(db, 'doktrinler'), where('isPublic', '==', true), limit(maxDocs))
  const snap = await getDocs(q)

  const rows = snap.docs.map((docSnap) => {
    const data = docSnap.data()
    const teaser = data.teaser ?? data.summary ?? ''
    return {
      id: docSnap.id,
      title: typeof data.title === 'string' ? data.title : 'Başlıksız doktrin',
      teaser: typeof teaser === 'string' ? teaser : '',
      isPublic: data.isPublic === true,
      createdAt: data.createdAt,
    }
  })

  rows.sort((a, b) => {
    const ma = a.createdAt?.toMillis?.() ?? 0
    const mb = b.createdAt?.toMillis?.() ?? 0
    return mb - ma
  })

  return rows
}

/** Admin tablosu: tüm doktrinler (tam alanlar) */
export async function fetchAllDoctrinesForAdmin() {
  if (!isFirebaseConfigured() || !db) return []

  const snap = await getDocs(collection(db, 'doktrinler'))
  const rows = snap.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      title: typeof data.title === 'string' ? data.title : '',
      teaser:
        typeof (data.teaser ?? data.summary) === 'string' ? String(data.teaser ?? data.summary) : '',
      body: typeof data.body === 'string' ? data.body : '',
      isPublic: data.isPublic === true,
      category: typeof data.category === 'string' ? data.category : 'Genel',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  })

  rows.sort((a, b) => {
    const ma = a.createdAt?.toMillis?.() ?? 0
    const mb = b.createdAt?.toMillis?.() ?? 0
    return mb - ma
  })

  return rows
}

/**
 * @param {{ title: string, teaser: string, body?: string, isPublic: boolean, category?: string }} data
 */
export async function addDoctrine(data) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  assertCanManageAdminContent(auth?.currentUser ?? null)

  const payload = {
    title: data.title.trim(),
    teaser: data.teaser.trim(),
    body: typeof data.body === 'string' ? data.body : '',
    isPublic: !!data.isPublic,
    category: (data.category ?? 'Genel').trim() || 'Genel',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, 'doktrinler'), payload)
  return ref.id
}

/**
 * @param {string} id
 * @param {Partial<{ title: string, teaser: string, body: string, isPublic: boolean, category: string }>} data
 */
export async function updateDoctrine(id, data) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  assertCanManageAdminContent(auth?.currentUser ?? null)

  const patch = { updatedAt: serverTimestamp() }
  if (data.title !== undefined) patch.title = data.title.trim()
  if (data.teaser !== undefined) patch.teaser = data.teaser.trim()
  if (data.body !== undefined) patch.body = data.body
  if (data.isPublic !== undefined) patch.isPublic = !!data.isPublic
  if (data.category !== undefined) patch.category = (data.category ?? 'Genel').trim() || 'Genel'

  await updateDoc(doc(db, 'doktrinler', id), patch)
}

export async function deleteDoctrine(id) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  assertCanManageAdminContent(auth?.currentUser ?? null)
  await deleteDoc(doc(db, 'doktrinler', id))
}
