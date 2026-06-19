import { TRIAL_PERIOD_DAYS } from '../data/legalProtocols'

/**
 * Platform lansman tarihi — 20 gün sonrasında yeni ücretsiz kayıt kapanır.
 * VITE_PLATFORM_LAUNCH_ISO=2026-01-01T00:00:00+03:00
 */
export function getPlatformLaunchMs() {
  const iso = import.meta.env.VITE_PLATFORM_LAUNCH_ISO
  if (typeof iso === 'string' && iso.trim()) {
    const ms = Date.parse(iso.trim())
    if (Number.isFinite(ms)) return ms
  }
  return Date.parse('2026-07-07T00:00:00+03:00')
}

/** Lansman tarihine kadar beta test dönemi */
export function isPlatformInBetaPeriod() {
  const launch = getPlatformLaunchMs()
  if (!Number.isFinite(launch)) return true
  return Date.now() < launch
}

/** Lansman tarihine kadar premium ödeme akışı kapalı (beta test) */
export function isPremiumPaymentEnabled() {
  return !isPlatformInBetaPeriod()
}

/** Lansmandan bu yana geçen tam gün sayısı */
export function platformDaysElapsed() {
  const launch = getPlatformLaunchMs()
  if (!Number.isFinite(launch)) return 0
  return Math.max(0, Math.floor((Date.now() - launch) / (1000 * 60 * 60 * 24)))
}

/** 20. gün sonrası yeni kayıtlar premium ödeme gerektirir (beta döneminde devre dışı) */
export function isPremiumRegistrationRequired() {
  if (!isPremiumPaymentEnabled()) return false
  return platformDaysElapsed() >= TRIAL_PERIOD_DAYS
}
