import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { emitFirebaseError } from './firebaseErrorBus'

/** @typedef {'inventory' | 'health_records' | 'casualty_cards' | 'ifak_inventory' | 'medevac_logs' | 'missions' | 'trainings' | 'range_logs' | 'vbss_logs' | 'tccc_logs' | 'armory_audit_trail'} AudazDataDomain */

const DOMAIN_CONFIG = {
  inventory: { kind: 'sub', path: (uid) => ['inventory', uid, 'items'] },
  health_records: { kind: 'sub', path: (uid) => ['health_records', uid, 'records'] },
  casualty_cards: { kind: 'sub', path: (uid) => ['casualty_cards', uid, 'cards'] },
  ifak_inventory: { kind: 'sub', path: (uid) => ['ifak_inventory', uid, 'items'] },
  medevac_logs: { kind: 'sub', path: (uid) => ['medevac_logs', uid, 'logs'] },
  range_logs: { kind: 'sub', path: (uid) => ['range_logs', uid, 'entries'] },
  vbss_logs: { kind: 'sub', path: (uid) => ['vbss_logs', uid, 'entries'] },
  tccc_logs: { kind: 'sub', path: (uid) => ['tccc_logs', uid, 'entries'] },
  armory_audit_trail: { kind: 'sub', path: (uid) => ['armory_audit_trail', uid, 'entries'] },
  missions: { kind: 'root', name: 'missions' },
  trainings: { kind: 'root', name: 'trainings' },
}

function assertConfigured() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

function assertUid(uid) {
  if (!uid || typeof uid !== 'string') {
    const e = new Error('Oturum gerekli')
    e.code = 'unauthenticated'
    throw e
  }
}

/**
 * Yeni belge — ownerId, createdAt, updatedAt, status: 'active' (üzerine yazılmadıysa).
 * `ownerId` her zaman `uid` ile set edilir (range_logs Firestore kuralı ile uyumlu).
 * @param {Record<string, unknown>} data
 * @param {string} uid
 */
export function injectAudazCreateFields(data, uid) {
  const next = { ...data }
  next.ownerId = uid
  next.userId = uid
  next.updatedAt = serverTimestamp()
  if (next.createdAt === undefined) next.createdAt = serverTimestamp()
  if (next.status === undefined) next.status = 'active'
  return next
}

/**
 * Güncelleme — yalnızca updatedAt (ownerId / createdAt dokunulmaz)
 * @param {Record<string, unknown>} patch
 */
export function injectAudazUpdateFields(patch) {
  const next = { ...patch }
  delete next.ownerId
  delete next.createdAt
  next.updatedAt = serverTimestamp()
  return next
}

/**
 * @param {AudazDataDomain} domain
 * @param {string} uid
 * @param {Record<string, unknown>} data
 */
export async function audazCreate(domain, uid, data) {
  assertConfigured()
  assertUid(uid)
  const cfg = DOMAIN_CONFIG[domain]
  if (!cfg) throw new Error(`Bilinmeyen domain: ${domain}`)

  // range_logs / inventory / health_records: ownerId her zaman oturum uid (kurallarla uyumlu).
  const payload = injectAudazCreateFields(data, uid)

  if (cfg.kind === 'sub') {
    const ref = collection(db, ...cfg.path(uid))
    return addDoc(ref, payload)
  }

  const col = collection(db, cfg.name)
  return addDoc(col, payload)
}

/**
 * @param {AudazDataDomain} domain
 * @param {string} uid
 * @param {string} docId
 * @param {Record<string, unknown>} patch
 */
export async function audazUpdate(domain, uid, docId, patch) {
  assertConfigured()
  assertUid(uid)
  const cfg = DOMAIN_CONFIG[domain]
  if (!cfg) throw new Error(`Bilinmeyen domain: ${domain}`)

  const payload = injectAudazUpdateFields(patch)

  let ref
  if (cfg.kind === 'sub') {
    ref = doc(db, ...cfg.path(uid), docId)
  } else {
    ref = doc(db, cfg.name, docId)
  }

  return updateDoc(ref, payload)
}

/**
 * @param {AudazDataDomain} domain
 * @param {string} uid
 * @param {string} docId
 */
/**
 * Montaj/sökme — envanter güncellemeleri + denetim kaydı tek batch içinde.
 * @param {string} uid
 * @param {{
 *   inventoryUpdates?: { docId: string, patch: Record<string, unknown> }[]
 *   auditEntries?: Record<string, unknown>[]
 * }} batchOps
 */
export async function audazCommitDeploymentBatch(uid, batchOps) {
  assertConfigured()
  assertUid(uid)
  const inventoryUpdates = batchOps.inventoryUpdates ?? []
  const auditEntries = batchOps.auditEntries ?? []
  if (inventoryUpdates.length === 0 && auditEntries.length === 0) return

  const batch = writeBatch(db)
  for (const u of inventoryUpdates) {
    const ref = doc(db, 'inventory', uid, 'items', u.docId)
    batch.update(ref, injectAudazUpdateFields(u.patch))
  }
  const auditCol = collection(db, 'armory_audit_trail', uid, 'entries')
  for (const audit of auditEntries) {
    const ref = doc(auditCol)
    batch.set(ref, injectAudazCreateFields(audit, uid))
  }
  await batch.commit()
}

export async function audazDelete(domain, uid, docId) {
  assertConfigured()
  assertUid(uid)
  const cfg = DOMAIN_CONFIG[domain]
  if (!cfg) throw new Error(`Bilinmeyen domain: ${domain}`)

  let ref
  if (cfg.kind === 'sub') {
    ref = doc(db, ...cfg.path(uid), docId)
  } else {
    ref = doc(db, cfg.name, docId)
  }

  return deleteDoc(ref)
}

/**
 * @param {AudazDataDomain} domain
 * @param {string} uid
 * @returns {import('firebase/firestore').CollectionReference}
 */
export function audazCollectionRef(domain, uid) {
  assertConfigured()
  assertUid(uid)
  const cfg = DOMAIN_CONFIG[domain]
  if (!cfg) throw new Error(`Bilinmeyen domain: ${domain}`)
  if (cfg.kind === 'sub') {
    return collection(db, ...cfg.path(uid))
  }
  return collection(db, cfg.name)
}

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function runAudazFirestore(fn) {
  try {
    return await fn()
  } catch (err) {
    emitFirebaseError(err)
    throw err
  }
}

export { DOMAIN_CONFIG }
