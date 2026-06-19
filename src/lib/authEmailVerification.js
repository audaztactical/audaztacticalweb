import { normalizeAccountStatus } from './authRoles'
import { isBetaAuthEmail } from './betaAuth'
import { isPlatformInBetaPeriod } from './registrationPolicy'

/**
 * E-posta/şifre (password) sağlayıcısı için doğrulama zorunluluğu.
 * Beta döneminde aktif operatörler /verify-email'e düşmez.
 *
 * @param {import('firebase/auth').User | null | undefined} user
 * @param {string} [accountStatus='active']
 */
export function userRequiresEmailVerification(user, accountStatus = 'active') {
  if (!user) return false
  if (user.emailVerified) return false

  if (isPlatformInBetaPeriod() && normalizeAccountStatus(accountStatus) === 'active') {
    return false
  }

  if (isBetaAuthEmail(user.email)) return false

  const ids = user.providerData?.map((p) => p.providerId) ?? []
  return ids.includes('password')
}
