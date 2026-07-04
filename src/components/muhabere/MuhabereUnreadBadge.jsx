/**
 * Okunmamış mesaj sayacı — 1, 2, 3+ formatında.
 * @param {{ count: number }} props
 */
export default function MuhabereUnreadBadge({ count }) {
  if (!count || count <= 0) return null
  const label = count > 99 ? '99+' : count > 3 ? '3+' : String(count)

  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black shadow-[0_0_10px_rgba(245,158,11,0.45)]"
      aria-label={`${count} okunmamış mesaj`}
    >
      {label}
    </span>
  )
}
