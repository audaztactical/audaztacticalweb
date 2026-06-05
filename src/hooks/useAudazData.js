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
import { emitFirebaseError } from '../lib/firebaseErrorBus'

/** @typedef {'inventory' | 'health_records' | 'casualty_cards' | 'ifak_inventory' | 'medevac_logs' | 'missions' | 'trainings' | 'range_logs' | 'armory_audit_trail'} AudazDataKey */

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
      const q =
        domain === 'missions' || domain === 'trainings'
          ? query(base, where('ownerId', '==', uid), orderBy(orderField, 'desc'))
          : query(base, orderBy(orderField, 'desc'))

      unsub = onSnapshot(
        q,
        (snap) => {
          setListenError(null)
          setItems(
            snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }))
          )
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
