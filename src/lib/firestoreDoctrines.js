import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { assertCanManageAdminContent } from '../config/admin'
import { broadcastAcademyNotification } from '../services/notificationService'
import { auth, db, isFirebaseConfigured } from './firebase'

/**
 * Herkese açık doktrin yayınında tüm kullanıcılara Akademi bildirimi gönderir.
 * @param {string} title
 * @param {string} [senderId]
 */
async function notifyAcademyDoctrinePublished(title, senderId = '') {
  if (!isFirebaseConfigured() || !db) return

  const snap = await getDocs(collection(db, 'users'))
  const recipientIds = snap.docs.map((d) => d.id).filter((id) => id && id !== senderId)
  await broadcastAcademyNotification(recipientIds, { title, senderId })
}

/** @typedef {{
 *   id: string
 *   title: string
 *   teaser: string
 *   isPublic: boolean
 *   createdAt: import('firebase/firestore').Timestamp | null
 * }} PublicDoctrineTeaser */

/**
 * Landing Page için herkese açık doktrin önizlemeleri.
 * Firestore kuralı: `resource.data.isPublic == true` (oturum gerekmez).
 * Sorgu, kural ile uyumlu olmak için `where('isPublic', '==', true)` zorunludur.
 *
 * @param {number} [maxDocs=8] — döndürülecek maksimum kayıt
 * @returns {Promise<PublicDoctrineTeaser[]>}
 */
export async function fetchPublicDoctrineTeasers(maxDocs = 8) {
  if (!isFirebaseConfigured() || !db) return []

  const q = query(
    collection(db, 'doktrinler'),
    where('isPublic', '==', true),
    orderBy('createdAt', 'desc'),
    limit(maxDocs),
  )
  const snap = await getDocs(q)

  return snap.docs.map((docSnap) => {
    const data = docSnap.data()
    const teaser = data.teaser ?? data.summary ?? ''
    return {
      id: docSnap.id,
      title: typeof data.title === 'string' ? data.title : 'Başlıksız doktrin',
      teaser: typeof teaser === 'string' ? teaser : '',
      isPublic: data.isPublic === true,
      createdAt: data.createdAt ?? null,
    }
  })
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
  await assertCanManageAdminContent(auth?.currentUser ?? null)

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

  if (payload.isPublic) {
    await notifyAcademyDoctrinePublished(payload.title, auth?.currentUser?.uid ?? '')
  }

  return ref.id
}

/**
 * @param {string} id
 * @param {Partial<{ title: string, teaser: string, body: string, isPublic: boolean, category: string }>} data
 */
export async function updateDoctrine(id, data) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const existingSnap = await getDoc(doc(db, 'doktrinler', id))
  const wasPublic = existingSnap.exists() && existingSnap.data()?.isPublic === true

  const patch = { updatedAt: serverTimestamp() }
  if (data.title !== undefined) patch.title = data.title.trim()
  if (data.teaser !== undefined) patch.teaser = data.teaser.trim()
  if (data.body !== undefined) patch.body = data.body
  if (data.isPublic !== undefined) patch.isPublic = !!data.isPublic
  if (data.category !== undefined) patch.category = (data.category ?? 'Genel').trim() || 'Genel'

  await updateDoc(doc(db, 'doktrinler', id), patch)

  const nowPublic = data.isPublic !== undefined ? !!data.isPublic : wasPublic
  const title = data.title !== undefined ? data.title.trim() : String(existingSnap.data()?.title ?? 'Doktrin')
  if (!wasPublic && nowPublic) {
    await notifyAcademyDoctrinePublished(title, auth?.currentUser?.uid ?? '')
  }
}

export async function deleteDoctrine(id) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  await assertCanManageAdminContent(auth?.currentUser ?? null)
  await deleteDoc(doc(db, 'doktrinler', id))
}
