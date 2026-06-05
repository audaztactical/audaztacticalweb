import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { assertCanManageAdminContent } from '../config/admin'
import { auth, db, isFirebaseConfigured } from './firebase'

export async function fetchTrainingVideos() {
  if (!isFirebaseConfigured() || !db) return []
  try {
    const q = query(collection(db, 'egitim_videolari'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const x = d.data()
      return {
        id: d.id,
        title: typeof x.title === 'string' ? x.title : '',
        url: typeof x.url === 'string' ? x.url : '',
        createdAt: x.createdAt,
      }
    })
  } catch {
    const snap = await getDocs(collection(db, 'egitim_videolari'))
    return snap.docs.map((d) => {
      const x = d.data()
      return {
        id: d.id,
        title: typeof x.title === 'string' ? x.title : '',
        url: typeof x.url === 'string' ? x.url : '',
        createdAt: x.createdAt,
      }
    })
  }
}

export async function addTrainingVideo({ title, url }) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  assertCanManageAdminContent(auth?.currentUser ?? null)
  await addDoc(collection(db, 'egitim_videolari'), {
    title: title.trim(),
    url: url.trim(),
    createdAt: serverTimestamp(),
  })
}

export async function deleteTrainingVideo(id) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  assertCanManageAdminContent(auth?.currentUser ?? null)
  await deleteDoc(doc(db, 'egitim_videolari', id))
}
