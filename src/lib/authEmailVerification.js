/**
 * Yalnızca e-posta/şifre (password) sağlayıcısı: doğrulama zorunluluğu.
 * Google vb. sağlayıcılar genelde e-postayı zaten doğrulamış sayılır.
 */
export function userRequiresEmailVerification(user) {
  if (!user) return false
  if (user.emailVerified) return false
  const ids = user.providerData?.map((p) => p.providerId) ?? []
  return ids.includes('password')
}
