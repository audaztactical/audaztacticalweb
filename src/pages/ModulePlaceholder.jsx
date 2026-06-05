import { Link } from 'react-router-dom'

/**
 * Yeni modüller için boş sayfa kabuğu (test — tüm kullanıcılar erişebilir).
 * @param {{
 *   title: string
 *   subtitle?: string
 *   opsCode?: string
 * }} props
 */
export default function ModulePlaceholder({
  title,
  subtitle = 'Modül test aşamasında — içerik yakında eklenecek.',
  opsCode = 'MOD-00',
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 font-mono">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">{opsCode}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-500">{subtitle}</p>

      <p className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
        Test ortamı — bu sayfaya kısıtlama uygulanmıyor.
      </p>

      <Link
        to="/dashboard"
        className="mt-10 inline-block text-xs uppercase tracking-widest text-zinc-500 transition hover:text-lime-400"
      >
        ← Ana sayfaya dön
      </Link>
    </div>
  )
}
