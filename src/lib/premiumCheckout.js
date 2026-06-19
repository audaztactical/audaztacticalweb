/**
 * Mock Stripe ödeme — gerçek entegrasyon öncesi premium kayıt / yükseltme.
 * @param {{ amountTry?: number; label?: string }} [options]
 * @returns {Promise<{ paymentIntentId: string; amountTry: number; provider: 'mock_stripe' }>}
 */
export async function createMockPremiumPaymentIntent(options = {}) {
  const amountTry = options.amountTry ?? 499
  const label = options.label ?? 'AUDAZ Premium Operatör'

  await new Promise((resolve) => {
    setTimeout(resolve, 900 + Math.random() * 600)
  })

  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase()
  const paymentIntentId = `pi_mock_${Date.now()}_${suffix}`

  if (import.meta.env.DEV) {
    console.info('[mock-stripe]', label, paymentIntentId, `${amountTry} TRY`)
  }

  return {
    paymentIntentId,
    amountTry,
    provider: 'mock_stripe',
  }
}

/** @param {string} paymentIntentId */
export function isValidMockPaymentIntentId(paymentIntentId) {
  return typeof paymentIntentId === 'string' && paymentIntentId.startsWith('pi_mock_') && paymentIntentId.length >= 16
}

export const PREMIUM_PRICE_TRY = 499
