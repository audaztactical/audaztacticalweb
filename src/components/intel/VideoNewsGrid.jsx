import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Filter, Loader2, Play, Radio, Video, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import {
  fetchVideoNewsPage,
  subscribeYoutubeChannelFilters,
  VIDEO_NEWS_PAGE_SIZE,
} from '../../lib/firestoreVideoNews'
import {
  formatVideoChannelFilterLabel,
  formatVideoNewsDisplayDateDisplay,
  formatVideoOriginDisplay,
  INTEL_VIDEO_FILTER_ALL,
} from '../../lib/intelDisplayText'
import i18n from '../../i18n'

/** @typedef {import('../../lib/firestoreVideoNews').VideoNewsItem} VideoNewsItem */
/** @typedef {import('firebase/firestore').QueryDocumentSnapshot} QueryDocumentSnapshot */

/**
 * @param {VideoNewsItem} item
 */
function resolveVideoEmbedUrl(item) {
  if (item.videoId) return `https://www.youtube.com/embed/${item.videoId}`
  const match = item.url.match(/[?&]v=([^&]+)/)
  if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}`
  return item.url
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}

/**
 * @param {{ item: VideoNewsItem, onOpen: (item: VideoNewsItem) => void }} props
 */
function VideoNewsCard({ item, onOpen }) {
  const { t } = useTranslation('intel')

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-sm border border-gray-800 bg-app-bg transition-all duration-300 hover:border-[#ffaa00] hover:shadow-[0_0_22px_-6px_rgba(255,170,0,0.3)]">
      <div className="relative aspect-video overflow-hidden border-b border-gray-800 bg-black/60">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            className="size-full object-cover opacity-80 transition duration-300 group-hover:opacity-100"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#111] via-[#1a1a1a] to-[#0d0d0d]">
            <Video className="size-10 text-gray-700" strokeWidth={1.25} aria-hidden />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="flex size-12 items-center justify-center rounded-full border border-[#ffaa00]/50 bg-black/50 text-[#ffaa00] shadow-[0_0_18px_-4px_rgba(255,170,0,0.5)]">
            <Play className="size-5 fill-current" aria-hidden />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <header className="mb-2 flex items-start justify-between gap-2 border-b border-gray-800/80 pb-2">
          <p className="font-mono-technical text-[9px] uppercase tracking-wider text-gray-500">
            {formatVideoOriginDisplay(item.origin)}
          </p>
          <time className="shrink-0 font-mono-technical text-[9px] tabular-nums text-gray-600">
            {formatVideoNewsDisplayDateDisplay(item)}
          </time>
        </header>

        <h2 className="font-display flex-1 text-sm font-bold uppercase leading-tight tracking-wide text-gray-100">
          {item.title}
        </h2>

        {item.description ? (
          <p className="line-clamp-2 font-mono-technical text-[10px] leading-relaxed text-gray-500">
            {item.description}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => onOpen(item)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded border border-[#ffaa00]/40 bg-[#ffaa00]/10 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#ffaa00] transition hover:border-[#ffaa00]/70 hover:bg-[#ffaa00]/15"
        >
          <Play className="size-3.5" aria-hidden />
          {t('video.openVideo')}
        </button>
      </div>
    </article>
  )
}

/**
 * @param {{ item: VideoNewsItem, onClose: () => void }} props
 */
function VideoNewsModal({ item, onClose }) {
  const { t } = useTranslation('intel')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-modal-title"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-4xl overflow-hidden rounded-sm border border-gray-800 bg-[#111]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-800 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono-technical text-[9px] uppercase tracking-wider text-[#ffaa00]">
              {formatVideoOriginDisplay(item.origin)}
            </p>
            <h2 id="video-modal-title" className="font-display mt-1 text-sm font-bold uppercase text-app-text">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-gray-700 p-1.5 text-gray-400 transition hover:border-gray-600 hover:text-app-text"
            aria-label={t('video.close')}
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="aspect-video w-full bg-black">
          <iframe
            title={item.title}
            src={resolveVideoEmbedUrl(item)}
            className="size-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 px-4 py-3">
          <p className="font-mono-technical text-[9px] text-gray-500">
            {t('video.modalHint')}
          </p>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#ffaa00] hover:text-[#ffcc55]"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {t('video.openAtSource')}
          </a>
        </footer>
      </motion.div>
    </motion.div>
  )
}

export default function VideoNewsGrid() {
  const { t } = useTranslation('intel')
  const [videos, setVideos] = useState(/** @type {VideoNewsItem[]} */ ([]))
  const [selectedFilter, setSelectedFilter] = useState(INTEL_VIDEO_FILTER_ALL)
  const [lastDoc, setLastDoc] = useState(/** @type {QueryDocumentSnapshot | null} */ (null))
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [activeVideo, setActiveVideo] = useState(/** @type {VideoNewsItem | null} */ (null))
  const [channelFilters, setChannelFilters] = useState(/** @type {string[]} */ ([INTEL_VIDEO_FILTER_ALL]))

  const fetchSeq = useRef(0)

  useEffect(() => {
    return subscribeYoutubeChannelFilters(setChannelFilters, (err) => emitFirebaseError(err))
  }, [])

  useEffect(() => {
    if (!channelFilters.includes(selectedFilter)) {
      setSelectedFilter(INTEL_VIDEO_FILTER_ALL)
    }
  }, [channelFilters, selectedFilter])

  const loadInitial = useCallback(async (filter) => {
    const seq = ++fetchSeq.current
    setLoading(true)
    setError(null)
    setVideos([])
    setLastDoc(null)
    setHasMore(true)

    try {
      const result = await fetchVideoNewsPage({
        filter,
        pageSize: VIDEO_NEWS_PAGE_SIZE,
      })

      if (seq !== fetchSeq.current) return

      setVideos(result.items)
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (err) {
      if (seq !== fetchSeq.current) return
      emitFirebaseError(err)
      setError(i18n.t('video.loadFailed', { ns: 'intel' }))
      setVideos([])
      setLastDoc(null)
      setHasMore(false)
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitial(selectedFilter)
  }, [selectedFilter, loadInitial])

  const handleLoadMore = async () => {
    if (!hasMore || loading || loadingMore || !lastDoc) return

    setLoadingMore(true)
    setError(null)

    try {
      const result = await fetchVideoNewsPage({
        filter: selectedFilter,
        pageSize: VIDEO_NEWS_PAGE_SIZE,
        lastDoc,
      })

      setVideos((prev) => {
        const seen = new Set(prev.map((v) => v.id))
        const next = result.items.filter((v) => !seen.has(v.id))
        return [...prev, ...next]
      })
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (err) {
      emitFirebaseError(err)
      setError(i18n.t('video.loadMoreFailed', { ns: 'intel' }))
    } finally {
      setLoadingMore(false)
    }
  }

  const showInitialLoader = loading && videos.length === 0
  const selectedFilterLabel = formatVideoChannelFilterLabel(selectedFilter)

  return (
    <div className="space-y-5">
      <div className="border-b border-gray-800 pb-4">
        <label
          htmlFor="video-news-channel-filter"
          className="mb-2 flex items-center gap-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-gray-500"
        >
          <Filter className="size-3.5 text-[#ffaa00]/70" aria-hidden />
          {t('video.filterLabel')}
        </label>
        <div className="relative max-w-md">
          <select
            id="video-news-channel-filter"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            disabled={loading && videos.length === 0}
            className="w-full appearance-none rounded border border-gray-700 bg-app-bg px-3 py-2.5 pr-10 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-gray-300 outline-none transition focus:border-[#ffaa00] focus:ring-1 focus:ring-[#ffaa00]/30 disabled:opacity-60"
          >
            {channelFilters.map((channel) => (
              <option key={channel} value={channel} className="bg-app-bg text-gray-300">
                {formatVideoChannelFilterLabel(channel)}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono-technical text-[10px] text-gray-500"
            aria-hidden
          >
            ▼
          </span>
        </div>
      </div>

      {error ? (
        <p className="rounded border border-red-500/35 bg-red-950/20 px-4 py-3 text-center font-mono-technical text-[10px] uppercase text-red-300">
          {error}
        </p>
      ) : null}

      {showInitialLoader ? (
        <p className="flex items-center justify-center gap-2 py-24 font-mono-technical text-[10px] uppercase text-app-text/55">
          <Loader2 className="size-4 animate-spin text-[#ffaa00]" aria-hidden />
          {t('video.loading')}
        </p>
      ) : !loading && videos.length === 0 ? (
        <div className="rounded border border-gray-800 bg-[#111]/80 px-6 py-16 text-center">
          <Radio className="mx-auto size-8 text-gray-600" aria-hidden />
          <p className="mt-4 font-mono-technical text-[10px] uppercase tracking-wider text-gray-500">
            {selectedFilter === INTEL_VIDEO_FILTER_ALL
              ? t('video.emptyAllTitle')
              : t('video.emptyFilteredTitle', { channel: selectedFilterLabel })}
          </p>
          <p className="mt-2 font-mono-technical text-[9px] text-gray-600">
            {selectedFilter === INTEL_VIDEO_FILTER_ALL
              ? t('video.emptyAllHint')
              : t('video.emptyFilteredHint')}
          </p>
        </div>
      ) : (
        <>
          <div className={loading ? 'pointer-events-none opacity-60 transition-opacity' : ''}>
            <motion.div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="visible"
            >
              {videos.map((item, index) => (
                <motion.div key={item.id} custom={index} variants={cardVariants}>
                  <VideoNewsCard item={item} onOpen={setActiveVideo} />
                </motion.div>
              ))}
            </motion.div>
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore || loading}
                className="inline-flex items-center gap-2 rounded border border-gray-700 bg-black/50 px-6 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-gray-300 transition hover:border-[#ffaa00] hover:text-[#ffaa00] disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-[#ffaa00]" aria-hidden />
                    {t('video.loadingMore')}
                  </>
                ) : (
                  t('video.loadMore')
                )}
              </button>
            </div>
          ) : null}
        </>
      )}

      <AnimatePresence>
        {activeVideo ? (
          <VideoNewsModal item={activeVideo} onClose={() => setActiveVideo(null)} />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
