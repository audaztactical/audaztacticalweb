import { useState } from 'react'
import { Loader2, Megaphone, Radio } from 'lucide-react'
import { sendManualAlert } from '../../lib/manualAlertCallable'

/**
 * @param {{
 *   onFeedback: (type: 'ok' | 'err', text: string) => void
 * }} props
 */
export default function ManualAlertForm({ onFeedback }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedMessage = message.trim()

    if (!trimmedTitle || !trimmedMessage) {
      onFeedback('err', 'Başlık ve mesaj zorunludur.')
      return
    }

    setSending(true)
    try {
      const result = await sendManualAlert({
        title: trimmedTitle,
        message: trimmedMessage,
      })
      setTitle('')
      setMessage('')
      onFeedback(
        'ok',
        `İkaz yayınlandı — ${result.topic ?? 'asayis_ikaz'} konusuna iletildi.`,
      )
    } catch (err) {
      const code = /** @type {{ code?: string, message?: string }} */ (err)?.code
      const fallback =
        err instanceof Error ? err.message : 'Manuel ikaz gönderilemedi.'
      if (code === 'functions/permission-denied') {
        onFeedback('err', 'Yetki reddedildi — yalnızca sistem yöneticisi yayınlayabilir.')
      } else if (code === 'functions/unauthenticated') {
        onFeedback('err', 'Oturum gerekli — yeniden giriş yapın.')
      } else {
        onFeedback('err', fallback)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 bg-black/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <Radio className="size-5 text-[#ffb400]" strokeWidth={1.5} aria-hidden />
          <div>
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-[#ffb400]">
              Manuel İkaz Yayını
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Küresel İstihbarat Ağı ve tüm erken uyarı abonelerine anlık bildirim gönderir.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        <div>
          <label
            htmlFor="manual-alert-title"
            className="mb-1.5 block font-mono-technical text-[10px] font-bold uppercase tracking-widest text-[#d4af37]/90"
          >
            İkaz Başlığı
          </label>
          <input
            id="manual-alert-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="[ SİSTEM UYARISI ] Eğitim İptali"
            maxLength={200}
            disabled={sending}
            className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#ffb400]/50 focus:outline-none focus:ring-2 focus:ring-[#ffb400]/20 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="manual-alert-message"
            className="mb-1.5 block font-mono-technical text-[10px] font-bold uppercase tracking-widest text-[#d4af37]/90"
          >
            İkaz Detayı / Mesajı
          </label>
          <textarea
            id="manual-alert-message"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tüm birliklere iletilecek operasyonel ikaz metni…"
            maxLength={2000}
            disabled={sending}
            className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 font-mono-technical text-sm text-white placeholder:text-slate-600 focus:border-[#ffb400]/50 focus:outline-none focus:ring-2 focus:ring-[#ffb400]/20 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#ffb400]/50 bg-[#ffb400]/15 px-5 py-3 font-display text-sm font-bold uppercase tracking-wider text-[#ffb400] transition hover:bg-[#ffb400]/25 disabled:opacity-50 sm:w-auto"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Megaphone className="size-4" aria-hidden />
          )}
          {sending ? 'YAYINLANIYOR…' : '[ TELSİZDEN GEÇ (TÜM BİRLİKLERE) ]'}
        </button>
      </form>
    </section>
  )
}
