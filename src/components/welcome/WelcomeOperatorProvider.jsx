import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { shouldAutoShowWelcomeModal } from '../../lib/welcomeModal'
import WelcomeOperatorModal from './WelcomeOperatorModal'

const WelcomeOperatorContext = createContext(
  /** @type {{ openWelcomeBriefing: () => void } | null} */ (null),
)

/**
 * Giriş sonrası otomatik brifing + Ayarlar'dan manuel açma.
 */
export function WelcomeOperatorProvider({ children }) {
  const { user, userData, profileLoading, loading } = useAuth()
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [readOnly, setReadOnly] = useState(false)

  useEffect(() => {
    setSessionDismissed(false)
    setManualOpen(false)
    setReadOnly(false)
  }, [user?.uid])

  const autoEligible =
    Boolean(user?.uid) &&
    !loading &&
    !profileLoading &&
    Boolean(userData) &&
    shouldAutoShowWelcomeModal(userData?.welcomeModalDismissed) &&
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

  const handleDismissed = useCallback(() => {
    setSessionDismissed(true)
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
