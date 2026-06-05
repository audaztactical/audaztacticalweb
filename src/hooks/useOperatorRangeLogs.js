import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { emitFirebaseError } from '../lib/firebaseErrorBus'

/**
 * Canlı range_logs dinleyicisi — eğitmen paneli / operatör izleme.
 * @param {string | null} uid
 */
export function useOperatorRangeLogs(uid) {
  const [logs, setLogs] = useState(/** @type {Record<string, unknown>[]} */ ([]))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!uid || !isFirebaseConfigured() || !db) {
      setLogs([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    let unsub = () => {}

    try {
      const entriesRef = collection(db, 'range_logs', uid, 'entries')
      const q = query(entriesRef, orderBy('updatedAt', 'desc'))

      unsub = onSnapshot(
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
          setLogs(rows)
          setLoading(false)
        },
        (err) => {
          emitFirebaseError(err)
          setLoading(false)
        },
      )
    } catch (err) {
      emitFirebaseError(err)
      setLoading(false)
    }

    return () => {
      const off = unsub
      window.setTimeout(() => {
        try {
          off()
        } catch {
          /* teardown */
        }
      }, 0)
    }
  }, [uid])

  return { logs, loading }
}
