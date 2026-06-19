import {
  isAccountLocked,
  normalizeAccountStatus,
} from './authRoles'
import { isPremiumPaymentEnabled } from './registrationPolicy'

/** Eğitmen paneli rotası — InstructorRoute ile korunur; diğer modüllere erişim engellenmez */
export const INSTRUCTOR_DASHBOARD_PATH = '/egitmen-komuta'

/** @deprecated Eski kısıtlı allow-list; artık yönlendirme için kullanılmıyor */
export const INSTRUCTOR_ALLOWED_PATHS = new Set(['/egitmen-komuta', '/verify-email'])

/** Kilitli hesapların erişebileceği rotalar */
export const LOCKED_ALLOWED_PATHS = new Set([
  '/premium-gecis',
  '/site-bakimda',
  '/verify-email',
  '/ayarlar',
])

/**
 * @param {string} pathname
 */
export function normalizePathname(pathname) {
  const base = (pathname || '/').split('?')[0].replace(/\/+$/, '')
  return base || '/'
}

/**
 * VITE_SITE_MAINTENANCE=true iken kilitli kullanıcılar site-bakimda'ya yönlendirilir.
 */
export function isSiteMaintenanceMode() {
  return String(import.meta.env.VITE_SITE_MAINTENANCE ?? '').toLowerCase() === 'true'
}

/**
 * Rol / hesap durumuna göre yönlendirme hedefi.
 * @param {{
 *   pathname: string
 *   userData: { role?: string; accountStatus?: string } | null | undefined
 *   isAdmin?: boolean
 * }} params
 * @returns {string | null}
 */
export function resolveAccessRedirect({ pathname, userData, isAdmin = false }) {
  if (!userData || isAdmin) return null

  const path = normalizePathname(pathname)
  const accountStatus = normalizeAccountStatus(userData.accountStatus)

  if (isAccountLocked(accountStatus)) {
    if (LOCKED_ALLOWED_PATHS.has(path)) return null
    if (!isPremiumPaymentEnabled()) return null
    return isSiteMaintenanceMode() ? '/site-bakimda' : '/premium-gecis'
  }

  return null
}

/**
 * @param {string} pathname
 */
export function isLockedAllowedPath(pathname) {
  return LOCKED_ALLOWED_PATHS.has(normalizePathname(pathname))
}
