import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  audazCreate,
  audazDelete,
  audazUpdate,
  runAudazFirestore,
} from '../lib/dataManager'
import { subscribeAudazCollection } from '../lib/audazCollectionStore'
import { subscribeAudazUserDoc } from '../lib/audazDocumentStore'
import { PERSONAL_DATA_DOMAINS } from '../lib/firestoreDataDomains'

/** Kişisel veri: {@link PERSONAL_DATA_DOMAINS.RANGE_LOGS} · {@link PERSONAL_DATA_DOMAINS.TRAINING_PLANS} */
/** @typedef {'inventory' | 'health_records' | 'casualty_cards' | 'ifak_inventory' | 'medevac_logs' | 'missions' | 'trainings' | 'range_logs' | 'vbss_logs' | 'tccc_logs' | 'armory_audit_trail'} AudazDataKey */

/**
 * Paylaşımlı koleksiyon dinleyicisi — aynı uid+domain için tek Firestore onSnapshot.
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
    return subscribeAudazCollection(uid, domain, orderField, (state) => {
      setItems(state.items)
      setLoading(state.loading)
      setListenError(state.error)
    })
  }, [domain, uid, orderField])

  const addItem = useCallback(
    async (data) => {
      if (!uid) throw new Error('Oturum gerekli')
      return runAudazFirestore(() => audazCreate(domain, uid, data))
    },
    [domain, uid],
  )

  const updateItem = useCallback(
    async (id, patch) => {
      if (!uid) throw new Error('Oturum gerekli')
      return runAudazFirestore(() => audazUpdate(domain, uid, id, patch))
    },
    [domain, uid],
  )

  const deleteItem = useCallback(
    async (id) => {
      if (!uid) throw new Error('Oturum gerekli')
      return runAudazFirestore(() => audazDelete(domain, uid, id))
    },
    [domain, uid],
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
    [items, loading, listenError, ready, addItem, updateItem, deleteItem],
  )
}

/**
 * Paylaşımlı belge dinleyicisi — users/{uid}/{subcollection}/{docId}.
 * @param {string} subcollection
 * @param {string} docId
 */
export function useAudazDoc(subcollection, docId) {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [data, setData] = useState(/** @type {Record<string, unknown> | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [listenError, setListenError] = useState(null)
  const [exists, setExists] = useState(false)

  const ready = Boolean(uid && isFirebaseConfigured())

  useEffect(() => {
    if (!uid || !isFirebaseConfigured()) {
      setData(null)
      setLoading(false)
      setListenError(null)
      setExists(false)
      return undefined
    }

    setLoading(true)
    return subscribeAudazUserDoc(uid, subcollection, docId, (state) => {
      setData(state.data)
      setLoading(state.loading)
      setListenError(state.error)
      setExists(state.exists)
    })
  }, [uid, subcollection, docId])

  return useMemo(
    () => ({
      data,
      loading,
      listenError,
      exists,
      ready,
    }),
    [data, loading, listenError, exists, ready],
  )
}
