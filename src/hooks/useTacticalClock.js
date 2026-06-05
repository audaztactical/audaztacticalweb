import { useEffect, useState } from 'react'

/** @param {Date} date */
export function formatTacticalLocalTime(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/** @param {Date} date */
export function formatTacticalOperationalDate(date) {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

/** Canlı yerel taktik saat — 1s aralık, unmount'ta temizlenir. */
export default function useTacticalClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  return currentTime
}
