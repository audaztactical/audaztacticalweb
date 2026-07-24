import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  DRY_FIRE_GRAPH_IDS,
  resolveEqualGraphGrid,
} from '../../lib/dryFireHits'
import DryFireGraphCharts from './DryFireGraphCharts'

/**
 * Tam ekran sağ/orta grafik havuzu — eşit CSS grid ana alan.
 *
 * @param {{
 *   openGraphIds: import('../../lib/dryFireHits').DryFireGraphId[]
 *   onCloseGraph: (id: import('../../lib/dryFireHits').DryFireGraphId) => void
 *   poolCollapsed: boolean
 *   onTogglePool: () => void
 *   hits: import('../../lib/dryFireHits').DryFireHit[]
 * }} props
 */
export default function DryFireGraphPool({
  openGraphIds,
  onCloseGraph,
  poolCollapsed,
  onTogglePool,
  hits,
}) {
  const { t } = useTranslation('timer')
  const ordered = DRY_FIRE_GRAPH_IDS.filter((id) => openGraphIds.includes(id))
  const { cols, rows } = resolveEqualGraphGrid(ordered.length)
  const hasGraphs = ordered.length > 0

  if (!hasGraphs) return null

  if (poolCollapsed) {
    return (
      <aside
        className={[
          'relative z-30 flex shrink-0 border-[#facc15]/25 bg-[#0a0a0b]',
          'max-md:order-3 max-md:h-12 max-md:w-full max-md:flex-row max-md:items-center max-md:border-r-0 max-md:border-t max-md:px-2',
          'md:order-2 md:h-full md:w-9 md:flex-col md:border-r',
        ].join(' ')}
        aria-label={t('dryFire.analytics.pool.aria')}
      >
        <button
          type="button"
          onClick={onTogglePool}
          className="inline-flex size-11 touch-manipulation items-center justify-center rounded-sm border border-[#facc15]/40 text-[#facc15] transition hover:bg-[rgba(250,204,21,0.12)] md:mt-2 md:size-8 md:self-center"
          aria-expanded={false}
          aria-label={t('dryFire.analytics.pool.expand')}
          title={t('dryFire.analytics.pool.expand')}
        >
          <ChevronRight className="size-4 rotate-90 md:rotate-0" strokeWidth={1.5} aria-hidden />
        </button>
        <p
          className={[
            'select-none font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/70',
            'max-md:ml-2 max-md:flex-1',
            'md:mt-3 md:flex-1 md:[writing-mode:vertical-rl] md:[text-orientation:mixed]',
          ].join(' ')}
        >
          {t('dryFire.analytics.pool.collapsedLabel', { n: ordered.length })}
        </p>
      </aside>
    )
  }

  return (
    <aside
      className={[
        'relative z-30 flex min-w-0 flex-col border-[#facc15]/25 bg-[#070708]',
        'max-md:order-3 max-md:h-[min(34dvh,15rem)] max-md:w-full max-md:shrink-0 max-md:border-r-0 max-md:border-t',
        'md:order-2 md:h-full md:flex-1 md:border-r',
      ].join(' ')}
      aria-label={t('dryFire.analytics.pool.aria')}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#facc15]/20 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#facc15]">
            {t('dryFire.analytics.pool.title')}
          </p>
          <p className="mt-0.5 truncate font-mono-technical text-[7px] uppercase tracking-[0.16em] text-zinc-600">
            {t('dryFire.analytics.modalHint')}
          </p>
        </div>
        <button
          type="button"
          onClick={onTogglePool}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-[#facc15]/40 text-[#facc15] transition hover:bg-[rgba(250,204,21,0.12)]"
          aria-expanded
          aria-label={t('dryFire.analytics.pool.collapse')}
          title={t('dryFire.analytics.pool.collapse')}
        >
          <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <div
        className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {ordered.map((id) => (
          <article
            key={id}
            className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-sm border border-[#facc15]/22 bg-[#0a0a0b] shadow-[inset_0_0_0_1px_rgba(250,204,21,0.04)]"
          >
            <span
              className="pointer-events-none absolute left-1.5 top-1.5 z-[1] h-2 w-2 border-l border-t border-[#facc15]/45"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute right-1.5 top-1.5 z-[1] h-2 w-2 border-r border-t border-[#facc15]/45"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute bottom-1.5 left-1.5 z-[1] h-2 w-2 border-b border-l border-[#facc15]/45"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute bottom-1.5 right-1.5 z-[1] h-2 w-2 border-b border-r border-[#facc15]/45"
              aria-hidden
            />

            <div className="relative z-[2] flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800/90 px-3 py-2 pr-2">
              <p className="min-w-0 flex-1 truncate font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-[#facc15]">
                {t(`dryFire.analytics.graphs.${id}`)}
              </p>
              <button
                type="button"
                onClick={() => onCloseGraph(id)}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm border border-zinc-600/55 bg-[#0a0a0b] text-zinc-400 transition hover:border-[#facc15]/45 hover:text-[#facc15]"
                aria-label={t('dryFire.analytics.pool.closeGraph', {
                  name: t(`dryFire.analytics.graphs.${id}`),
                })}
              >
                <X className="size-3.5" strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="relative z-[2] min-h-0 flex-1 px-2 pb-2 pt-1">
              <DryFireGraphCharts graphId={id} hits={hits} />
            </div>
          </article>
        ))}
      </div>
    </aside>
  )
}
