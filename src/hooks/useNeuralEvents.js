import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { db, isFirebaseConfigured } from '../lib/firebase'

/**
 * users/{uid}/neural_events — createdAt desc, limit 20.
 * @returns {{ events: Array<Record<string, unknown> & { id: string }>; loading: boolean }}
 */
export function useNeuralEvents() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [events, setEvents] = useState(/** @type {Array<Record<string, unknown> & { id: string }>} */ ([]))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid || !isFirebaseConfigured() || !db) {
      setEvents([])
      setLoading(false)
      return undefined
    }
    setLoading(true)
    const q = query(
      collection(db, 'users', uid, 'neural_events'),
      orderBy('createdAt', 'desc'),
      limit(20),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      () => {
        setEvents([])
        setLoading(false)
      },
    )
    return () => unsub()
  }, [uid])

  return { events, loading }
}
