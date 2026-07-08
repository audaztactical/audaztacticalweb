import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useAuth } from './AuthContext'
import { SUPPORTED_LANGUAGES } from '../i18n'
import { prepareAudazPatchPayload } from '../lib/audazFirestoreWrite'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import { safeOnSnapshot } from '../lib/firestoreSnapshot'

/** @typedef {'tr' | 'en'} AppLanguage */

const LanguagePreferenceContext = createContext(
  /** @type {{ language: string, setLanguage: (lang: AppLanguage) => Promise<void>, hydrated: boolean } | null} */ (null),
)

export function LanguagePreferenceProvider({ children }) {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const uid = user?.uid ?? null
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!uid || !isFirebaseConfigured() || !db) {
      setHydrated(true)
      return undefined
    }

    setHydrated(false)
    const ref = doc(db, 'users', uid)
    const unsub = safeOnSnapshot(
      ref,
      (snap) => {
        const pref = snap.data()?.preferredLanguage
        if (pref === 'tr' || pref === 'en') {
          void i18n.changeLanguage(pref)
        }
        setHydrated(true)
      },
      () => setHydrated(true),
    )

    return unsub
  }, [uid, i18n])

  const setLanguage = useCallback(
    async (/** @type {AppLanguage} */ lang) => {
      if (!SUPPORTED_LANGUAGES.includes(lang)) return
      await i18n.changeLanguage(lang)

      if (!uid || !isFirebaseConfigured() || !db) return

      try {
        const payload = prepareAudazPatchPayload({
          preferredLanguage: lang,
          updatedAt: serverTimestamp(),
        })
        await setDoc(doc(db, 'users', uid), payload, { merge: true })
      } catch (err) {
        emitFirebaseError(err)
      }
    },
    [uid, i18n],
  )

  return (
    <LanguagePreferenceContext.Provider
      value={{ language: i18n.language?.startsWith('tr') ? 'tr' : 'en', setLanguage, hydrated }}
    >
      {children}
    </LanguagePreferenceContext.Provider>
  )
}

export function useLanguagePreference() {
  const ctx = useContext(LanguagePreferenceContext)
  if (!ctx) {
    throw new Error('useLanguagePreference must be used within LanguagePreferenceProvider')
  }
  return ctx
}
