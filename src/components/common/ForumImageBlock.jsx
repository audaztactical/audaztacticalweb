/**
 * Brifing / forum görsel önizlemesi — HUD çerçeve.
 * @param {{ url: string, alt?: string, className?: string }} props
 */
export default function ForumImageBlock({ url, alt = 'Brifing görseli', className = '' }) {
  const src = typeof url === 'string' ? url.trim() : ''
  if (!src) return null

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        'mt-3 block overflow-hidden rounded-sm border border-lime-500/30 bg-black/50 transition hover:border-lime-400/55',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <img src={src} alt={alt} className="max-h-80 w-full object-contain" loading="lazy" decoding="async" />
    </a>
  )
}
