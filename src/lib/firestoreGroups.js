import { collection, deleteDoc, doc, getDoc, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { safeOnSnapshot } from './firestoreSnapshot'
import { db, isFirebaseConfigured } from './firebase'
import { callJoinGroupByPassword, callLeaveGroup } from './cloudFunctions'
import { fetchGroupActivityLogsByGroup } from './firestoreGroupTraining'
import { buildGroupLeaderboardRowFromActivity, sortGroupLeaderboardRows } from './groupLeaderboard'
import { syncUserGroupFields } from './operatorGroupMembership'
import { throwGroupError } from './groupErrors'

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
    throwGroupError('FIREBASE_NOT_CONFIGURED', 'failed-precondition')
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
  if (!instructorId) throwGroupError('INSTRUCTOR_SESSION_REQUIRED', 'unauthenticated')

  const name = String(groupName ?? '').trim()
  const password = normalizeGroupPassword(groupPassword)
  if (!name) throwGroupError('GROUP_NAME_REQUIRED', 'invalid-argument')
  if (password.length < 4) throwGroupError('GROUP_PASSWORD_TOO_SHORT', 'invalid-argument')

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
 * @param {string} operatorUid
 * @param {string} password
 */
export async function joinGroupByPassword(operatorUid, password) {
  assertDb()
  if (!operatorUid) throwGroupError('SESSION_REQUIRED', 'unauthenticated')

  try {
    const result = await callJoinGroupByPassword(password)

    const group = {
      groupId: result.group.groupId,
      groupName: result.group.groupName,
      groupPassword: '',
      instructorId: result.group.instructorId,
      members: result.group.members,
      createdAt: null,
    }

    await syncUserGroupFields(operatorUid, group.groupId, group.instructorId)

    return { group, alreadyMember: result.alreadyMember === true }
  } catch (err) {
    if (err && typeof err === 'object' && '__audazCode' in err) throw err
    const code = String(/** @type {{ code?: string }} */ (err)?.code ?? '')
    if (code.includes('not-found')) {
      throwGroupError('GROUP_NOT_FOUND', 'group-not-found')
    }
    if (code.includes('unauthenticated')) {
      throwGroupError('SESSION_REQUIRED', 'unauthenticated')
    }
    if (code.includes('invalid-argument')) {
      throwGroupError('GROUP_PASSWORD_TOO_SHORT', 'invalid-argument')
    }
    throw err
  }
}

/**
 * @param {string} operatorUid
 */
export async function leaveTacticalGroup(operatorUid) {
  assertDb()
  if (!operatorUid) throwGroupError('SESSION_REQUIRED', 'unauthenticated')

  try {
    await callLeaveGroup()
  } catch (err) {
    if (err && typeof err === 'object' && '__audazCode' in err) throw err
    const code = String(/** @type {{ code?: string }} */ (err)?.code ?? '')
    if (code.includes('unauthenticated')) {
      throwGroupError('SESSION_REQUIRED', 'unauthenticated')
    }
    throw err
  }
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
  if (!groupId) throwGroupError('GROUP_ID_REQUIRED', 'invalid-argument')

  const updates = /** @type {Record<string, unknown>} */ ({})
  if (patch.groupName != null) {
    const name = String(patch.groupName).trim()
    if (!name) throwGroupError('GROUP_NAME_REQUIRED', 'invalid-argument')
    updates.groupName = name
  }
  if (patch.groupPassword != null) {
    const password = normalizeGroupPassword(patch.groupPassword)
    if (password.length < 4) throwGroupError('GROUP_PASSWORD_TOO_SHORT', 'invalid-argument')
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
  if (!groupId) throwGroupError('GROUP_ID_REQUIRED', 'invalid-argument')
  await deleteDoc(doc(db, 'groups', groupId))
}
