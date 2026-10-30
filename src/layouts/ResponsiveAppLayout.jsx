import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { useCompactShell } from '../hooks/useCompactShell'
import MainLayout from './MainLayout'
import MobileLayout from '../mobile/MobileLayout'
import { FeedbackPanelProvider } from '../context/FeedbackPanelContext'
import FeedbackBubble from '../components/feedback/FeedbackBubble'
import FeedbackPanelModal from '../components/feedback/FeedbackPanelModal'
import FeedbackToast from '../components/feedback/FeedbackToast'
import SuspensionGate from '../components/auth/SuspensionGate'
import { WelcomeOperatorProvider } from '../components/welcome/WelcomeOperatorProvider'
import { isNeuralPreviewEnabled } from '../lib/neural/neuralPreview'
import { NoroProvider } from '../components/neural/noro/NoroProvider'
import NoroAssistant from '../components/neural/noro/NoroAssistant'

/** Telefon / tablet tarayıcı + Capacitor — alt sekme çubuğu kabuğu; masaüstünde sidebar. */
export default function ResponsiveAppLayout() {
  const compact = useCompactShell()
  const native = Capacitor.isNativePlatform()
  const noro = isNeuralPreviewEnabled()

  useEffect(() => {
    document.documentElement.classList.toggle('compact-shell', compact)
    document.documentElement.classList.toggle('native-app', native)
    return () => {
      document.documentElement.classList.remove('compact-shell')
      if (!native) {
        document.documentElement.classList.remove('native-app')
      }
    }
  }, [compact, native])

  return (
    <FeedbackPanelProvider>
      <WelcomeOperatorProvider>
        <SuspensionGate>
          {compact ? <MobileLayout /> : <MainLayout />}
          <FeedbackBubble />
          <FeedbackPanelModal />
          <FeedbackToast />
          {noro ? (
            <NoroProvider>
              <NoroAssistant />
            </NoroProvider>
          ) : null}
        </SuspensionGate>
      </WelcomeOperatorProvider>
    </FeedbackPanelProvider>
  )
}
