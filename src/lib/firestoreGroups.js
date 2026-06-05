import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { safeOnSnapshot } from './firestoreSnapshot'
import { db, isFirebaseConfigured } from './firebase'
import { fetchGroupActivityLogsByGroup } from './firestoreGroupTraining'
import { buildGroupLeaderboardRowFromActivity, sortGroupLeaderboardRows } from './groupLeaderboard'
import { syncUserGroupFields } from './operatorGroupMembership'

/**
 * @typedef {{
 *   groupId: string
 *   groupName: string
 *   groupPassword: string
 *   instructorId: string
 *   members: string[]
 *   createdAt?: unknown
 * }} TacticalGroup
 */

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {string} raw
 */
export function normalizeGroupPassword(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

/**
 * @param {import('firebase/firestore').DocumentSnapshot | import('firebase/firestore').QueryDocumentSnapshot} snap
 */
function mapGroupDoc(snap) {
  const d = snap.data()
  const members = Array.isArray(d.members) ? d.members.filter((m) => typeof m === 'string') : []
  return {
    groupId: snap.id,
    groupName: typeof d.groupName === 'string' ? d.groupName : '',
    groupPassword: typeof d.groupPassword === 'string' ? d.groupPassword : '',
    instructorId: typeof d.instructorId === 'string' ? d.instructorId : '',
    members,
    createdAt: d.createdAt ?? null,
  }
}

/**
 * @param {string} instructorId
 * @param {string} groupName
 * @param {string} groupPassword
 */
export async function createTacticalGroup(instructorId, groupName, groupPassword) {
  assertDb()
  if (!instructorId) throw new Error('Eğitmen oturumu gerekli')

  const name = String(groupName ?? '').trim()
  const password = normalizeGroupPassword(groupPassword)
  if (!name) throw new Error('Grup adı zorunlu')
  if (password.length < 4) throw new Error('Grup şifresi en az 4 karakter olmalı')

  const groupRef = doc(collection(db, 'groups'))
  await setDoc(groupRef, {
    groupId: groupRef.id,
    groupName: name,
    groupPassword: password,
    instructorId,
    members: [],
    createdAt: serverTimestamp(),
  })

  return { groupId: groupRef.id, groupName: name, groupPassword: password }
}

/**
 * @param {string} instructorId
 * @param {(groups: TacticalGroup[]) => void} onGroups
 * @param {(error: unknown) => void} [onError]
 */
export function subscribeInstructorGroups(instructorId, onGroups, onError) {
  if (!isFirebaseConfigured() || !db || !instructorId) return () => {}

  const q = query(collection(db, 'groups'), where('instructorId', '==', instructorId))
  return safeOnSnapshot(
    q,
    (snap) => {
      const groups = snap.docs.map(mapGroupDoc)
      groups.sort((a, b) => String(b.groupName).localeCompare(String(a.groupName), 'tr'))
      onGroups(groups)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {string} password
 * @returns {Promise<TacticalGroup | null>}
 */
export async function findGroupByPassword(password) {
  assertDb()
  const normalized = normalizeGroupPassword(password)
  if (!normalized) return null

  const q = query(collection(db, 'groups'), where('groupPassword', '==', normalized), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return mapGroupDoc(snap.docs[0])
}

/**
 * @param {string} operatorUid
 * @param {string} password
 */
export async function joinGroupByPassword(operatorUid, password) {
  assertDb()
  if (!operatorUid) throw new Error('Oturum gerekli')

  const group = await findGroupByPassword(password)
  if (!group) {
    const e = new Error('Grup bulunamadı')
    e.code = 'group-not-found'
    throw e
  }

  if (group.members.includes(operatorUid)) {
    await syncUserGroupFields(operatorUid, group.groupId, group.instructorId)
    return { group, alreadyMember: true }
  }

  const ref = doc(db, 'groups', group.groupId)
  await updateDoc(ref, {
    members: arrayUnion(operatorUid),
  })

  await syncUserGroupFields(operatorUid, group.groupId, group.instructorId)

  return { group, alreadyMember: false }
}

/**
 * @param {TacticalGroup} group
 * @param {import('./firestoreInstructor').OperatorProfile[]} allOperators
 */
export async function buildGroupLeaderboard(group, allOperators) {
  const memberSet = new Set(group.members)
  const profiles = allOperators.filter((p) => memberSet.has(p.uid))
  const groupLogs = await fetchGroupActivityLogsByGroup(group.groupId, 300)

  const rows = profiles.map((profile) => buildGroupLeaderboardRowFromActivity(profile, groupLogs))
  return sortGroupLeaderboardRows(rows)
}

/**
 * @param {string} groupId
 */
export async function fetchGroupById(groupId) {
  assertDb()
  if (!groupId) return null
  const snap = await getDoc(doc(db, 'groups', groupId))
  if (!snap.exists()) return null
  return mapGroupDoc(snap)
}

/**
 * @param {string} groupId
 * @param {{ groupName?: string; groupPassword?: string }} patch
 */
export async function updateTacticalGroup(groupId, patch) {
  assertDb()
  if (!groupId) throw new Error('Grup kimliği gerekli')

  const updates = /** @type {Record<string, unknown>} */ ({})
  if (patch.groupName != null) {
    const name = String(patch.groupName).trim()
    if (!name) throw new Error('Grup adı zorunlu')
    updates.groupName = name
  }
  if (patch.groupPassword != null) {
    const password = normalizeGroupPassword(patch.groupPassword)
    if (password.length < 4) throw new Error('Grup şifresi en az 4 karakter olmalı')
    updates.groupPassword = password
  }
  if (Object.keys(updates).length === 0) return

  await updateDoc(doc(db, 'groups', groupId), updates)
}

/**
 * @param {string} groupId
 */
export async function deleteTacticalGroup(groupId) {
  assertDb()
  if (!groupId) throw new Error('Grup kimliği gerekli')
  await deleteDoc(doc(db, 'groups', groupId))
}
