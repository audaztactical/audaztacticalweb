import { Navigate } from 'react-router-dom'
import { isPremiumPaymentEnabled } from '../lib/registrationPolicy'

/**
 * Premium geçiş ekranı — VITE_PLATFORM_LAUNCH_ISO tarihine kadar devre dışı (beta test).
 * Lansman sonrası ödeme akışı burada yeniden etkinleştirilebilir.
 */
export default function PremiumTransition() {
  if (!isPremiumPaymentEnabled()) {
    return <Navigate to="/dashboard" replace />
  }

  /* Lansman sonrası — MockStripeCheckout + LegalDisclaimer akışı
  import { useMemo, useState } from 'react'
  import { Link, Navigate, useNavigate } from 'react-router-dom'
  import { Crown, ShieldCheck } from 'lucide-react'
  import LegalDisclaimer from '../components/LegalDisclaimer'
  import MockStripeCheckout from '../components/premium/MockStripeCheckout'
  import PageShell from '../components/layout/PageShell'
  import { useAuth } from '../context/AuthContext'
  import { TRIAL_PERIOD_DAYS } from '../data/legalProtocols'
  import { isPremiumMemberRole } from '../lib/authRoles'
  ...
  */

  return <Navigate to="/dashboard" replace />
}

/** @deprecated Beta döneminde kullanılmıyor */
export function trialDaysElapsed() {
  return 0
}

/** @deprecated Beta döneminde kullanılmıyor */
export function isTrialPeriodExpired() {
  return false
}
