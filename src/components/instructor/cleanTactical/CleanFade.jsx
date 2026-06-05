/**
 * Hafif fade-in — Framer Motion yerine CSS (Vite HMR / @fs uyumluluğu).
 *
 * @param {{
 *   children: import('react').ReactNode
 *   className?: string
 *   delay?: number
 * }} props
 */
export default function CleanFade({ children, className = '', delay = 0 }) {
  return (
    <div
      className={['animate-fade-in', className].filter(Boolean).join(' ')}
      style={delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  )
}
