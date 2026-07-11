import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { shouldAutoShowWelcomeModal, WELCOME_MODAL_VERSION } from '../../lib/welcomeModal'
import WelcomeOperatorModal from './WelcomeOperatorModal'

const WelcomeOperatorContext = createContext(
  /** @type {{ openWelcomeBriefing: () => void } | null} */ (null),
)

/**
 * Giriş sonrası otomatik brifing + Ayarlar'dan manuel açma.
 *
 * Auto-show waits until profileLoading === false so welcomeModalDismissed from
 * users/{uid} is available (avoids race: open before profile merge).
 */
export function WelcomeOperatorProvider({ children }) {
  const { user, userData, profileLoading, loading } = useAuth()
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  /** Optimistic override after successful dismiss write (before snapshot/merge settles). */
  const [localDismissed, setLocalDismissed] = useState(
    /** @type {{ neverShowAgain: boolean, version: string } | null} */ (null),
  )

  useEffect(() => {
    setSessionDismissed(false)
    setManualOpen(false)
    setReadOnly(false)
    setLocalDismissed(null)
  }, [user?.uid])

  const dismissedPreference = localDismissed ?? userData?.welcomeModalDismissed ?? null

  const profileReady = Boolean(user?.uid) && !loading && !profileLoading && Boolean(userData)

  const autoEligible =
    profileReady &&
    shouldAutoShowWelcomeModal(dismissedPreference) &&
    !sessionDismissed

  const open = autoEligible || manualOpen

  const openWelcomeBriefing = useCallback(() => {
    setReadOnly(true)
    setManualOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    if (manualOpen) {
      setManualOpen(false)
      setReadOnly(false)
      return
    }
    setSessionDismissed(true)
  }, [manualOpen])

  const handleDismissed = useCallback((/** @type {{ neverShowAgain: boolean }} */ payload) => {
    setSessionDismissed(true)
    if (payload?.neverShowAgain) {
      setLocalDismissed({
        neverShowAgain: true,
        version: WELCOME_MODAL_VERSION,
      })
    }
  }, [])

  const value = useMemo(() => ({ openWelcomeBriefing }), [openWelcomeBriefing])

  return (
    <WelcomeOperatorContext.Provider value={value}>
      {children}
      <WelcomeOperatorModal
        open={open}
        readOnly={readOnly}
        onClose={handleClose}
        onDismissed={handleDismissed}
      />
    </WelcomeOperatorContext.Provider>
  )
}

export function useWelcomeOperator() {
  const ctx = useContext(WelcomeOperatorContext)
  if (!ctx) {
    throw new Error('useWelcomeOperator must be used within WelcomeOperatorProvider')
  }
  return ctx
}

/** @returns {ReturnType<typeof useWelcomeOperator> | null} */
export function useWelcomeOperatorOptional() {
  return useContext(WelcomeOperatorContext)
}
