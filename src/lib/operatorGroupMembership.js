import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { fetchGroupById } from './firestoreGroups'

/**
 * @typedef {import('./trainingGroupFields').OperatorGroupMembership} OperatorGroupMembership
 */

/**
 * @param {import('firebase/firestore').DocumentData | undefined} d
 */
export function mapUserGroupFields(d) {
  if (!d || typeof d !== 'object') {
    return { groupId: null, instructorId: null }
  }
  const groupId = typeof d.groupId === 'string' && d.groupId.trim() ? d.groupId.trim() : null
  const instructorId =
    typeof d.instructorId === 'string' && d.instructorId.trim() ? d.instructorId.trim() : null
  return { groupId, instructorId }
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} snap
 */
function mapMemberGroupDoc(snap) {
  const d = snap.data()
  return {
    groupId: snap.id,
    groupName: typeof d.groupName === 'string' ? d.groupName : '',
    instructorId: typeof d.instructorId === 'string' ? d.instructorId : '',
  }
}

/**
 * @param {string} operatorUid
 */
export async function findGroupForOperator(operatorUid) {
  if (!isFirebaseConfigured() || !db || !operatorUid) return null

  const userSnap = await getDoc(doc(db, 'users', operatorUid))
  if (userSnap.exists()) {
    const { groupId } = mapUserGroupFields(userSnap.data())
    if (groupId) {
      const group = await fetchGroupById(groupId)
      if (group && group.members.includes(operatorUid)) {
        return {
          groupId: group.groupId,
          groupName: group.groupName,
          instructorId: group.instructorId,
        }
      }
    }
  }

  const q = query(collection(db, 'groups'), where('members', 'array-contains', operatorUid), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null

  const mapped = mapMemberGroupDoc(snap.docs[0])
  await syncUserGroupFields(operatorUid, mapped.groupId, mapped.instructorId)
  return mapped
}

/**
 * users/{uid} — groupId + instructorId senkronu (gruba katılım sonrası).
 * @param {string} operatorUid
 * @param {string} groupId
 * @param {string} instructorId
 */
export async function syncUserGroupFields(operatorUid, groupId, instructorId) {
  if (!isFirebaseConfigured() || !db || !operatorUid) return
  await setDoc(
    doc(db, 'users', operatorUid),
    {
      groupId: groupId || null,
      instructorId: instructorId || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
