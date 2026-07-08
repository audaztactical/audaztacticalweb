import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Globe, Languages, Loader2, Radio, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import VideoNewsGrid from '../components/intel/VideoNewsGrid'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import {
  defaultShowTurkishForIntelItem,
  formatIntelTimestampDisplay,
  isIntelUiTurkish,
  pickIntelFeedSummary,
  pickIntelFeedTitle,
  shouldShowIntelTranslationToggle,
} from '../lib/intelDisplayText'
import { subscribeIntelFeed } from '../lib/firestoreIntelFeed'
import i18n from '../i18n'

/** @typedef {import('../lib/firestoreIntelFeed').IntelFeedItem} IntelFeedItem */
/** @typedef {'written' | 'video'} IntelFeedTab */

/**
 * @param {{ active: boolean, onClick: () => void, label: string }} props
 */
function IntelFeedTabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'border-b-2 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider transition-colors',
        active
          ? 'border-[#ffaa00] text-[#ffaa00]'
          : 'border-transparent text-gray-500 hover:border-gray-700 hover:text-gray-300',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
}

/**
 * @param {{ item: IntelFeedItem }} props
 */
function IntelCard({ item }) {
  const { t, i18n } = useTranslation('intel')
  const isAlert = item.isAlert === true
  const [showTurkish, setShowTurkish] = useState(() =>
    defaultShowTurkishForIntelItem(item, i18n.language),
  )

  useEffect(() => {
    if (isAlert) return
    setShowTurkish(isIntelUiTurkish(i18n.language))
  }, [i18n.language, isAlert])

  const title = pickIntelFeedTitle(item, showTurkish)
  const summary = pickIntelFeedSummary(item, showTurkish)
  const showTranslationToggle = shouldShowIntelTranslationToggle(item, i18n.language)

  return (
    <article className="group relative h-full overflow-hidden rounded-sm border border-gray-800 bg-app-bg p-4 transition-all duration-300 hover:scale-[1.0001] hover:border-[#ffaa00] hover:shadow-[0_0_22px_-6px_rgba(255,170,0,0.35)]">
      <span
        aria-hidden
        className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-transparent transition-colors duration-300 group-hover:border-[#ffaa00]/80"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-transparent transition-colors duration-300 group-hover:border-[#ffaa00]/80"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-transparent transition-colors duration-300 group-hover:border-[#ffaa00]/80"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-transparent transition-colors duration-300 group-hover:border-[#ffaa00]/80"
      />

      <header className="mb-3 flex items-start justify-between gap-3 border-b border-gray-800/80 pb-2">
        <p className="flex min-w-0 items-center gap-1.5 font-mono-technical text-[9px] uppercase tracking-wider text-gray-500">
          <ShieldAlert className="size-3 shrink-0 text-[#ffaa00]/70" aria-hidden />
          <span className="truncate">{item.source}</span>
        </p>
        <time className="shrink-0 font-mono-technical text-[9px] tabular-nums text-gray-500">
          {formatIntelTimestampDisplay(item.timestamp)}
        </time>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={showTurkish ? 'tr' : 'en'}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <h2 className="font-display text-sm font-bold uppercase leading-tight tracking-wide text-gray-100 sm:text-base">
            {title || t('card.noTitle')}
          </h2>
          <p className="font-mono-technical text-[11px] leading-relaxed text-gray-400">
            {summary || t('card.noSummary')}
          </p>
        </motion.div>
      </AnimatePresence>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-800/60 pt-3">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {item.tags.length ? (
            item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-gray-700/80 bg-black/30 px-2 py-0.5 font-mono-technical text-[8px] uppercase tracking-wider text-gray-500"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="font-mono-technical text-[8px] uppercase text-gray-600">{t('card.noTags')}</span>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-gray-500 transition hover:text-[#ffaa00]"
            >
              <ExternalLink className="size-3 shrink-0" aria-hidden />
              {t('card.goToSource')}
            </a>
          ) : null}

          {showTranslationToggle ? (
            <button
              type="button"
              onClick={() => setShowTurkish((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded border border-gray-700 bg-black/40 px-2.5 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#ffaa00] transition hover:border-[#ffaa00]/60 hover:bg-[#ffaa00]/10"
            >
              <Languages className="size-3" aria-hidden />
              {showTurkish ? t('card.showOriginal') : t('card.showTurkish')}
            </button>
          ) : null}
        </div>
      </footer>
    </article>
  )
}

export default function IntelFeed() {
  const { t } = useTranslation('intel')
  const [feedTab, setFeedTab] = useState(/** @type {IntelFeedTab} */ ('written'))
  const [items, setItems] = useState(/** @type {IntelFeedItem[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsub = subscribeIntelFeed(
      (rows) => {
        setItems(rows)
        setLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setError(i18n.t('written.loadFailed', { ns: 'intel' }))
        setLoading(false)
      },
    )

    return unsub
  }, [])

  return (
    <div className="relative mx-auto min-h-[calc(100vh-6rem)] max-w-[1480px] px-5 py-5 pt-12 sm:px-6 sm:pt-14 md:px-8">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,170,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,170,0,0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-[2] space-y-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5">
          <div className="min-w-0 space-y-2">
            <h1 className="font-display flex items-center gap-3 text-2xl font-bold tracking-[0.14em] text-app-text sm:text-3xl">
              <Globe className="size-7 shrink-0 text-[#ffaa00]" strokeWidth={1.5} aria-hidden />
              {t('header.title')}
            </h1>
            <p className="max-w-2xl font-mono-technical text-[10px] leading-relaxed text-app-text/55">
              {t('header.subtitle')}
            </p>
          </div>
        </header>

        <nav
          className="flex flex-wrap gap-1 border-b border-gray-800"
          aria-label={t('tabs.aria')}
        >
          <IntelFeedTabButton
            active={feedTab === 'written'}
            onClick={() => setFeedTab('written')}
            label={t('tabs.written')}
          />
          <IntelFeedTabButton
            active={feedTab === 'video'}
            onClick={() => setFeedTab('video')}
            label={t('tabs.video')}
          />
        </nav>

        {feedTab === 'video' ? (
          <VideoNewsGrid />
        ) : loading ? (
          <p className="flex items-center justify-center gap-2 py-24 font-mono-technical text-[10px] uppercase text-app-text/55">
            <Loader2 className="size-4 animate-spin text-[#ffaa00]" aria-hidden />
            {t('written.loading')}
          </p>
        ) : error ? (
          <p className="rounded border border-red-500/35 bg-red-950/20 px-4 py-8 text-center font-mono-technical text-[10px] uppercase text-red-300">
            {error}
          </p>
        ) : items.length === 0 ? (
          <div className="rounded border border-gray-800 bg-[#111]/80 px-6 py-16 text-center">
            <Radio className="mx-auto size-8 text-gray-600" aria-hidden />
            <p className="mt-4 font-mono-technical text-[10px] uppercase tracking-wider text-gray-500">
              {t('written.emptyTitle')}
            </p>
            <p className="mt-2 font-mono-technical text-[9px] text-gray-600">
              {t('written.emptyHint')}
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            initial="hidden"
            animate="visible"
          >
            {items.map((item, index) => (
              <motion.div key={item.id} custom={index} variants={cardVariants}>
                <IntelCard item={item} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
