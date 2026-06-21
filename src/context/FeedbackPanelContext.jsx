import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const BUBBLE_DISMISSED_KEY = 'audaz.feedback.bubble.dismissed.v1'

/** @type {import('react').Context<{
 *   panelOpen: boolean
 *   openPanel: () => void
 *   closePanel: () => void
 *   bubbleVisible: boolean
 *   dismissBubble: () => void
 *   toast: string | null
 *   pushToast: (message: string) => void
 *   clearToast: () => void
 * } | null>} */
const FeedbackPanelContext = createContext(null)

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function FeedbackPanelProvider({ children }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [bubbleDismissed, setBubbleDismissed] = useState(false)
  const [toast, setToast] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    try {
      setBubbleDismissed(window.localStorage.getItem(BUBBLE_DISMISSED_KEY) === '1')
    } catch {
      setBubbleDismissed(false)
    }
  }, [])

  const openPanel = useCallback(() => setPanelOpen(true), [])
  const closePanel = useCallback(() => setPanelOpen(false), [])

  const dismissBubble = useCallback(() => {
    setBubbleDismissed(true)
    try {
      window.localStorage.setItem(BUBBLE_DISMISSED_KEY, '1')
    } catch {
      /* localStorage kapalı — oturum içi gizle */
    }
  }, [])

  const pushToast = useCallback((/** @type {string} */ message) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  const bubbleVisible = !bubbleDismissed

  const value = useMemo(
    () => ({
      panelOpen,
      openPanel,
      closePanel,
      bubbleVisible,
      dismissBubble,
      toast,
      pushToast,
      clearToast,
    }),
    [panelOpen, openPanel, closePanel, bubbleVisible, dismissBubble, toast, pushToast, clearToast],
  )

  return <FeedbackPanelContext.Provider value={value}>{children}</FeedbackPanelContext.Provider>
}

export function useFeedbackPanel() {
  const ctx = useContext(FeedbackPanelContext)
  if (!ctx) {
    throw new Error('useFeedbackPanel yalnızca FeedbackPanelProvider içinde kullanılabilir')
  }
  return ctx
}

/** @returns {ReturnType<typeof useFeedbackPanel> | null} */
export function useFeedbackPanelOptional() {
  return useContext(FeedbackPanelContext)
}
