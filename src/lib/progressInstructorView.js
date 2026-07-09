import { collection, getDocs, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { fetchOperatorProfiles } from './firestoreInstructor'
import { subscribeInstructorGroups } from './firestoreGroups'

/**
 * @typedef {{ uid: string, callsign: string, username: string, role: string }} ProgressSquadMember
 */

/**
 * @param {string} instructorId
 * @param {(members: ProgressSquadMember[]) => void} onMembers
 * @param {(err: Error) => void} [onError]
 * @returns {() => void}
 */
export function subscribeInstructorSquadMembers(instructorId, onMembers, onError) {
  if (!instructorId || !isFirebaseConfigured() || !db) {
    onMembers([])
    return () => {}
  }

  /** @type {import('./firestoreGroups').TacticalGroup[]} */
  let groups = []
  /** @type {ProgressSquadMember[] | null} */
  let profiles = null

  const emit = () => {
    if (!profiles) return
    const memberIds = new Set()
    for (const g of groups) {
      if (g.instructorId !== instructorId) continue
      for (const uid of g.members) memberIds.add(uid)
    }
    const rows = profiles
      .filter((p) => memberIds.has(p.uid))
      .map((p) => ({
        uid: p.uid,
        callsign: p.callsign || p.username || p.uid.slice(0, 8).toUpperCase(),
        username: p.username,
        role: p.role,
      }))
      .sort((a, b) => a.callsign.localeCompare(b.callsign, undefined, { sensitivity: 'base' }))
    onMembers(rows)
  }

  const unsubGroups = subscribeInstructorGroups(
    instructorId,
    (next) => {
      groups = next
      emit()
    },
    onError,
  )

  fetchOperatorProfiles()
    .then((list) => {
      profiles = list
      emit()
    })
    .catch((err) => {
      profiles = []
      emit()
      onError?.(err instanceof Error ? err : new Error(String(err)))
    })

  return () => {
    unsubGroups()
  }
}

/**
 * Client-side guard: selected operator must be in instructor's squad list.
 * @param {string | null | undefined} selectedUid
 * @param {ProgressSquadMember[]} squad
 * @param {string | null | undefined} selfUid
 */
export function resolveProgressViewUid(selectedUid, squad, selfUid) {
  const self = selfUid || null
  if (!selectedUid || selectedUid === self) return self
  if (squad.some((m) => m.uid === selectedUid)) return selectedUid
  return self
}

/**
 * @param {string} uid
 * @param {(rows: Record<string, unknown>[]) => void} onRows
 * @param {(err: Error) => void} [onError]
 * @returns {() => void}
 */
export function subscribeOperatorRangeLogEntries(uid, onRows, onError) {
  if (!uid || !isFirebaseConfigured() || !db) {
    onRows([])
    return () => {}
  }

  const entriesRef = collection(db, 'range_logs', uid, 'entries')
  const q = query(entriesRef, orderBy('updatedAt', 'desc'))

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      rows.sort((a, b) => {
        const tb =
          typeof b.updatedAt?.toMillis === 'function'
            ? b.updatedAt.toMillis()
            : Date.parse(String(b.timestamp || '')) || 0
        const ta =
          typeof a.updatedAt?.toMillis === 'function'
            ? a.updatedAt.toMillis()
            : Date.parse(String(a.timestamp || '')) || 0
        return tb - ta
      })
      onRows(rows)
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)))
    },
  )
}

/**
 * One-shot fetch for observed-eval style subcollections (vbss_logs / tccc_logs).
 * @param {string} uid
 * @param {'vbss_logs' | 'tccc_logs'} domain
 * @param {number} [maxEntries]
 */
export async function fetchOperatorDomainEntries(uid, domain, maxEntries = 200) {
  if (!uid || !isFirebaseConfigured() || !db) return []
  const entriesRef = collection(db, domain, uid, 'entries')
  const q = query(entriesRef, orderBy('updatedAt', 'desc'), limit(maxEntries))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Live subscribe for vbss/tccc observed eval entries of another operator.
 * @param {string} uid
 * @param {'vbss_logs' | 'tccc_logs'} domain
 * @param {(rows: Record<string, unknown>[]) => void} onRows
 * @param {(err: Error) => void} [onError]
 */
export function subscribeOperatorDomainEntries(uid, domain, onRows, onError) {
  if (!uid || !isFirebaseConfigured() || !db) {
    onRows([])
    return () => {}
  }
  const entriesRef = collection(db, domain, uid, 'entries')
  const q = query(entriesRef, orderBy('updatedAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      onRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)))
    },
  )
}
