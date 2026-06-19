import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scheduleScrollAppToTop } from '../../lib/scrollAppToTop'

/** Route path değişince sayfayı en üste alır (query/hash aynı sayfada kalır). */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    if ('scrollRestoration' in history) {
      const prev = history.scrollRestoration
      history.scrollRestoration = 'manual'
      return () => {
        history.scrollRestoration = prev
      }
    }
    return undefined
  }, [])

  useLayoutEffect(() => {
    scheduleScrollAppToTop()
  }, [pathname])

  useEffect(() => {
    scheduleScrollAppToTop()
  }, [pathname])

  return null
}
