import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { fetchLandingIntelNews } from '../../lib/firestoreIntelFeed'
import {
  feedStatusLabel,
  intelItemToTeaser,
  mergeNewsTeasers,
} from './landingNewsTeasers'

/** @typedef {import('./landingNewsTeasers').NewsTeaser} NewsTeaser */
/** @typedef {import('./landingNewsTeasers').FeedStatus} FeedStatus */

/**
 * @param {{ teaser: NewsTeaser }} props
 */
function NewsTeaserCard({ teaser }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-sm border border-emerald-500/15 bg-black/30 transition hover:border-emerald-400/35 hover:shadow-[0_0_24px_-10px_rgba(52,211,153,0.2)]">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-emerald-500/10 bg-gradient-to-br from-emerald-950/30 via-[#0a0b0d] to-black">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(rgba(52,211,153,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(52,211,153,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.12)_0%,transparent_70%)]" aria-hidden />
        <div className="relative flex h-full flex-col items-center justify-center gap-2 p-4">
          <ImageIcon className="size-8 text-emerald-400/35" strokeWidth={1.25} aria-hidden />
          <p className="font-mono-technical text-[8px] uppercase tracking-[0.25em] text-emerald-400/50">
            {teaser.live ? 'Güncel haber' : 'TEASER · GÖRSEL'}
          </p>
        </div>
        {teaser.live ? (
          <span className="absolute left-2 top-2 rounded-sm border border-emerald-400/40 bg-black/60 px-1.5 py-0.5 font-mono-technical text-[7px] uppercase tracking-wider text-emerald-400">
            LIVE
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono-technical text-[9px] uppercase tracking-wider text-emerald-400/70">
          {teaser.source}
        </p>
        <h3 className="font-display mt-2 text-sm font-bold uppercase leading-snug tracking-wide text-app-text">
          {teaser.title}
        </h3>
        <p className="mt-3 line-clamp-3 flex-1 font-mono-technical text-[11px] leading-relaxed text-app-text/55">
          {teaser.teaser}
        </p>
      </div>
    </article>
  )
}

/**
 * @param {{ onStatusChange?: (status: FeedStatus) => void }} props
 */
export default function LandingIntelNewsGrid({ onStatusChange }) {
  const [teasers, setTeasers] = useState(() => mergeNewsTeasers([]))
  const [status, setStatus] = useState(/** @type {FeedStatus} */ ('syncing'))

  useEffect(() => {
    onStatusChange?.('syncing')
    let cancelled = false

    ;(async () => {
      try {
        const rows = await fetchLandingIntelNews(3)
        if (cancelled) return
        const live = rows.map(intelItemToTeaser)
        const merged = mergeNewsTeasers(live)
        setTeasers(merged)
        const nextStatus = live.length > 0 ? 'live' : 'teaser'
        setStatus(nextStatus)
        onStatusChange?.(nextStatus)
      } catch {
        if (cancelled) return
        setTeasers(mergeNewsTeasers([]))
        setStatus('teaser')
        onStatusChange?.('teaser')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [onStatusChange])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teasers.map((teaser) => (
        <NewsTeaserCard key={teaser.id} teaser={teaser} />
      ))}
      <p className="sr-only" aria-live="polite">
        {feedStatusLabel(status)}
      </p>
    </div>
  )
}

export { feedStatusLabel }
