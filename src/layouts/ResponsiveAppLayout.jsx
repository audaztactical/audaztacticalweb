import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { useCompactShell } from '../hooks/useCompactShell'
import MainLayout from './MainLayout'
import MobileLayout from '../mobile/MobileLayout'

/** Telefon / tablet tarayıcı + Capacitor — alt sekme çubuğu kabuğu; masaüstünde sidebar. */
export default function ResponsiveAppLayout() {
  const compact = useCompactShell()
  const native = Capacitor.isNativePlatform()

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

  return compact ? <MobileLayout /> : <MainLayout />
}
