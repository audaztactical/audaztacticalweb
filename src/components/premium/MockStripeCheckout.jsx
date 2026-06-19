import { useState } from 'react'
import { CreditCard, Loader2, Lock } from 'lucide-react'
import { createMockPremiumPaymentIntent, PREMIUM_PRICE_TRY } from '../../lib/premiumCheckout'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'

/**
 * Mock Stripe ödeme formu — premium kayıt / yükseltme.
 * @param {{
 *   onPaid: (paymentIntentId: string) => void | Promise<void>
 *   disabled?: boolean
 *   label?: string
 * }} props
 */
export default function MockStripeCheckout({ onPaid, disabled = false, label = 'Premium Operatör' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cardName, setCardName] = useState('')
  const [paidId, setPaidId] = useState('')

  const handlePay = async () => {
    if (busy || disabled || paidId) return
    setBusy(true)
    setError('')
    try {
      const result = await createMockPremiumPaymentIntent({ amountTry: PREMIUM_PRICE_TRY, label })
      setPaidId(result.paymentIntentId)
      await onPaid(result.paymentIntentId)
    } catch (err) {
      emitFirebaseError(err)
      setError(err instanceof Error ? err.message : 'Ödeme işlenemedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-accent/25 bg-black/35 p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="size-4 text-accent" aria-hidden />
        <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent">
          Mock Stripe · {PREMIUM_PRICE_TRY} TRY / ay
        </p>
      </div>

      <p className="mt-2 font-mono-technical text-[9px] leading-relaxed text-app-text/55">
        Test ortamı — gerçek kart bilgisi gönderilmez. Ödeme onaylandığında{' '}
        <span className="text-accent">premium_member</span> statüsü atanır.
      </p>

      <div className="mt-3 space-y-2">
        <input
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          placeholder="Kart üzerindeki isim"
          disabled={busy || disabled || Boolean(paidId)}
          className="w-full rounded border border-accent/20 bg-app-bg px-3 py-2 font-mono-technical text-sm text-app-text outline-none focus:border-accent/50 disabled:opacity-50"
        />
        <input
          type="text"
          readOnly
          value="4242 4242 4242 4242"
          className="w-full rounded border border-accent/15 bg-app-bg/60 px-3 py-2 font-mono-technical text-sm text-app-text/70"
          aria-label="Test kart numarası"
        />
      </div>

      {paidId ? (
        <p className="mt-3 font-mono-technical text-[9px] uppercase tracking-wide text-accent/80">
          Ödeme OK · {paidId}
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 font-mono-technical text-[9px] font-bold uppercase text-red-400">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={busy || disabled || Boolean(paidId) || !cardName.trim()}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded border border-accent/55 bg-accent/12 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            İşleniyor…
          </>
        ) : paidId ? (
          <>
            <Lock className="size-3.5" aria-hidden />
            Ödeme tamamlandı
          </>
        ) : (
          'Mock ödeme ile devam et'
        )}
      </button>
    </div>
  )
}
