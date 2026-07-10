/* eslint-disable react-refresh/only-export-components -- Provider + useFirebaseErrorReporter aynı modülde */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AmberAlert from '../components/common/AmberAlert'
import { mapFirebaseError } from '../lib/firebaseErrorMap'
import { emitFirebaseError, subscribeFirebaseErrors } from '../lib/firebaseErrorBus'

const FirebaseErrorContext = createContext(null)

const AUTO_DISMISS_MS = 9000

export function FirebaseErrorProvider({ children }) {
  const { t } = useTranslation('common')
  const [toast, setToast] = useState(null)

  const reportFirebaseError = useCallback((err) => {
    const { technical, message } = mapFirebaseError(err)
    setToast({ technical, message, id: Date.now() })
  }, [])

  useEffect(() => {
    return subscribeFirebaseErrors(reportFirebaseError)
  }, [reportFirebaseError])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast])

  const value = useMemo(
    () => ({
      reportFirebaseError,
      /** Firestore dışı modüllerin (ör. dataManager) aynı kanalı kullanması için */
      emitFirebaseError,
    }),
    [reportFirebaseError]
  )

  return (
    <FirebaseErrorContext.Provider value={value}>
      {toast ? (
        <div
          className="pointer-events-none fixed left-1/2 top-16 z-[180] w-[min(92vw,28rem)] -translate-x-1/2 px-2 md:top-20"
          role="alert"
        >
          <div className="pointer-events-auto shadow-lg shadow-black/40">
            <AmberAlert label={toast.technical}>
              <span className="text-amber-100/90">
                {toast.message ? `${toast.message}` : t('firebaseError.fallback')}
              </span>
            </AmberAlert>
          </div>
        </div>
      ) : null}
      {children}
    </FirebaseErrorContext.Provider>
  )
}

export function useFirebaseErrorReporter() {
  const ctx = useContext(FirebaseErrorContext)
  if (!ctx) {
    return { reportFirebaseError: emitFirebaseError, emitFirebaseError }
  }
  return ctx
}
