import { useCallback, useEffect, useMemo, useState } from 'react'
import { onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  audazCollectionRef,
  audazCreate,
  audazDelete,
  audazUpdate,
  runAudazFirestore,
} from '../lib/dataManager'
import { PERSONAL_DATA_DOMAINS } from '../lib/firestoreDataDomains'
import { emitFirebaseError } from '../lib/firebaseErrorBus'

/** Kişisel veri: {@link PERSONAL_DATA_DOMAINS.RANGE_LOGS} · {@link PERSONAL_DATA_DOMAINS.TRAINING_PLANS} */
/** @typedef {'inventory' | 'health_records' | 'casualty_cards' | 'ifak_inventory' | 'medevac_logs' | 'missions' | 'trainings' | 'range_logs' | 'vbss_logs' | 'tccc_logs' | 'armory_audit_trail'} AudazDataKey */

/**
 * Kişisel kayıt izolasyonu — userId öncelikli, legacy ownerId yedek.
 * @param {Record<string, unknown>} data
 * @param {string} uid
 */
function docBelongsToUser(data, uid) {
  const userId = typeof data?.userId === 'string' ? data.userId.trim() : ''
  const ownerId = typeof data?.ownerId === 'string' ? data.ownerId.trim() : ''
  if (userId) return userId === uid
  if (ownerId) return ownerId === uid
  return true
}

/**
 * @param {AudazDataKey} domain
 * @param {{ orderByField?: string }} [options]
 */
export function useAudazData(domain, options = {}) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const orderField = options.orderByField ?? 'updatedAt'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [listenError, setListenError] = useState(null)

  const ready = Boolean(uid && isFirebaseConfigured())

  useEffect(() => {
    if (!uid || !isFirebaseConfigured()) {
      setItems([])
      setLoading(false)
      setListenError(null)
      return undefined
    }

    setLoading(true)
    let unsub = () => {}

    try {
      const base = audazCollectionRef(domain, uid)
      // range_logs: path range_logs/{uid}/entries zaten izole — ek userId indeksi gerekmez.
      // trainings/missions: mevcut ownerId + updatedAt indeksini kullan.
      const q =
        domain === 'missions' || domain === 'trainings'
          ? query(base, where('ownerId', '==', uid), orderBy(orderField, 'desc'))
          : query(base, orderBy(orderField, 'desc'))

      const filterPersonal =
        domain === 'trainings' ||
        domain === 'range_logs' ||
        domain === 'vbss_logs' ||
        domain === 'tccc_logs'

      unsub = onSnapshot(
        q,
        (snap) => {
          setListenError(null)
          const rows = snap.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
            }))
            .filter((row) => (filterPersonal ? docBelongsToUser(row, uid) : true))
          setItems(rows)
          setLoading(false)
        },
        (err) => {
          emitFirebaseError(err)
          setListenError(err)
          setLoading(false)
        }
      )
    } catch (err) {
      emitFirebaseError(err)
      setListenError(err)
      setLoading(false)
    }

    // React Strict Mode: aynı tick içinde unsubscribe → yeniden subscribe SDK'da
    // "Unexpected state (ca9) / ve:-1" yarışına yol açabiliyor. Temizliği bir sonraki
    // makro göreve erteleyerek sökümü güvenli hale getiriyoruz.
    return () => {
      const off = unsub
      window.setTimeout(() => {
        try {
          off()
        } catch {
          /* teardown race */
        }
      }, 0)
    }
  }, [domain, uid, orderField])

  const addItem = useCallback(
    async (data) => {
      if (!uid) throw new Error('Oturum gerekli')
      return runAudazFirestore(() => audazCreate(domain, uid, data))
    },
    [domain, uid]
  )

  const updateItem = useCallback(
    async (id, patch) => {
      if (!uid) throw new Error('Oturum gerekli')
      return runAudazFirestore(() => audazUpdate(domain, uid, id, patch))
    },
    [domain, uid]
  )

  const deleteItem = useCallback(
    async (id) => {
      if (!uid) throw new Error('Oturum gerekli')
      return runAudazFirestore(() => audazDelete(domain, uid, id))
    },
    [domain, uid]
  )

  return useMemo(
    () => ({
      items,
      loading,
      listenError,
      ready,
      addItem,
      updateItem,
      deleteItem,
    }),
    [items, loading, listenError, ready, addItem, updateItem, deleteItem]
  )
}
