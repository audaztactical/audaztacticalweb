import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'

/** @typedef {{
 *   id: string
 *   instructorId: string
 *   name: string
 *   level: string
 *   defaultAmmo: number
 *   defaultMinPassScore: number
 *   isTimedDefault: boolean
 *   createdAt?: unknown
 * }} DrillTemplate */

export const DRILL_SELECT_NEW_LEVEL = '__new_level__'
export const DRILL_SELECT_NEW_DRILL = '__new_drill__'

export const DEFAULT_DRILL_LEVELS = ['Seviye 1', 'Seviye 2', 'Seviye 3']

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {unknown} raw
 * @param {string} docId
 * @returns {DrillTemplate | null}
 */
export function mapDrillTemplateDoc(raw, docId) {
  if (!raw || typeof raw !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (raw)
  const defaultAmmo = Math.max(1, Number(d.defaultAmmo) || 1)
  const defaultMinPassScore = Math.min(
    defaultAmmo,
    Math.max(0, Number(d.defaultMinPassScore) || 0),
  )
  return {
    id: typeof d.id === 'string' ? d.id : docId,
    instructorId: String(d.instructorId ?? ''),
    name: String(d.name ?? 'Drill'),
    level: String(d.level ?? 'Seviye 1').trim() || 'Seviye 1',
    defaultAmmo,
    defaultMinPassScore,
    isTimedDefault: Boolean(d.isTimedDefault),
    createdAt: d.createdAt,
  }
}

/**
 * @param {{
 *   instructorId: string
 *   name: string
 *   level: string
 *   defaultAmmo: number
 *   defaultMinPassScore: number
 *   isTimedDefault: boolean
 * }} input
 */
export async function createDrillTemplate(input) {
  assertDb()
  const instructorId = String(input.instructorId ?? '').trim()
  const name = String(input.name ?? '').trim()
  const level = String(input.level ?? '').trim()
  if (!instructorId || !name || !level) {
    const e = new Error('Eğitmen, drill adı ve seviye zorunludur.')
    e.code = 'failed-precondition'
    throw e
  }

  const defaultAmmo = Math.max(1, Math.min(999, Number(input.defaultAmmo) || 1))
  const defaultMinPassScore = Math.min(
    defaultAmmo,
    Math.max(0, Number(input.defaultMinPassScore) || 0),
  )

  const ref = doc(collection(db, 'drill_templates'))
  const payload = {
    id: ref.id,
    instructorId,
    name,
    level,
    defaultAmmo,
    defaultMinPassScore,
    isTimedDefault: Boolean(input.isTimedDefault),
    createdAt: serverTimestamp(),
  }
  await setDoc(ref, payload)
  return { ...payload, createdAt: null }
}

/**
 * Eğitmenin drill kütüphanesini canlı dinler.
 * @param {string} instructorId
 * @param {(templates: DrillTemplate[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeInstructorDrillTemplates(instructorId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const iid = String(instructorId ?? '').trim()
  if (!iid) {
    onData([])
    return () => {}
  }

  // Tek alanlı sorgu — composite index gerekmez; sıralama istemci tarafında
  const q = query(collection(db, 'drill_templates'), where('instructorId', '==', iid))

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapDrillTemplateDoc(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {string} instructorId
 * @returns {Promise<DrillTemplate[]>}
 */
export async function fetchInstructorDrillTemplates(instructorId) {
  assertDb()
  const iid = String(instructorId ?? '').trim()
  if (!iid) return []
  const q = query(collection(db, 'drill_templates'), where('instructorId', '==', iid))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => mapDrillTemplateDoc(d.data(), d.id))
    .filter(Boolean)
    .sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
}

/**
 * @param {DrillTemplate[]} templates
 * @param {string[]} extraLevels
 */
export function collectDrillLevels(templates, extraLevels = []) {
  const set = new Set([...DEFAULT_DRILL_LEVELS, ...extraLevels])
  for (const t of templates) {
    if (t.level?.trim()) set.add(t.level.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
}
