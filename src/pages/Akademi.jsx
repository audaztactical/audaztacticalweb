import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { BookOpen, ExternalLink, Loader2, Lock, PlayCircle, ShieldAlert, X } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import TacticalPanel from '../components/ui/TacticalPanel'
import i18n from '../i18n'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import {
  formatAkademiDate,
  subscribeAkademiDoctrines,
  subscribeAkademiVideos,
  toVideoEmbedUrl,
} from '../lib/firestoreAkademi'

/** Geçici bakım — false yapınca tam Akademi içeriği geri gelir. */
const AKADEMI_COMING_SOON = true

function useAkademiShellProps() {
  const { t } = useTranslation('academy')
  return {
    fullWidth: true,
    hideSector: true,
    className: 'w-full px-6 sm:px-8 lg:px-10',
    title: t('header.title'),
    subtitle: t('header.subtitle'),
  }
}

function AkademiComingSoonScreen() {
  const { t } = useTranslation('academy')
  const shellProps = useAkademiShellProps()

  return (
    <PageShell {...shellProps}>
      <div className="flex min-h-[min(58vh,480px)] w-full flex-col items-center justify-center py-8">
        <TacticalPanel className="w-full max-w-4xl border-accent/25 bg-app-bg/95 p-0 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]">
          <div className="border-b border-accent/15 bg-app-bg px-6 py-4 text-center sm:px-8">
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.32em] text-accent/85">
              {t('comingSoon.badge')}
            </p>
          </div>
          <div className="flex flex-col items-center p-8 text-center sm:p-12">
            <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-accent/35 bg-accent/5 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]">
              <ShieldAlert className="h-16 w-16 text-accent" strokeWidth={1.5} aria-hidden />
              <Lock className="absolute -bottom-1 -right-1 size-4 rounded-full border border-accent/40 bg-black p-0.5 text-accent/80" strokeWidth={2} aria-hidden />
            </div>
            <p className="font-mono-technical text-3xl font-bold uppercase tracking-[0.22em] text-accent">
              {t('comingSoon.title')}
            </p>
            <p className="mt-2 font-mono-technical text-sm font-bold uppercase tracking-[0.28em] text-accent/75">
              {t('comingSoon.subtitle')}
            </p>
            <p className="mt-6 max-w-2xl font-mono-technical text-base leading-relaxed text-app-text/60">
              {t('comingSoon.body')}
            </p>
          </div>
        </TacticalPanel>
      </div>
    </PageShell>
  )
}

/** @typedef {import('../lib/firestoreAkademi').AkademiDoctrine} AkademiDoctrine */
/** @typedef {import('../lib/firestoreAkademi').AkademiVideo} AkademiVideo */
/** @typedef {'doktrinler' | 'videolar'} AkademiTab */

/**
 * @param {{
 *   id: AkademiTab
 *   label: string
 *   active: boolean
 *   onSelect: () => void
 * }} props
 */
function AkademiTabButton({ label, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'rounded border px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition',
        active
          ? 'border-lime-500 text-lime-400 shadow-[0_0_18px_-6px_rgba(132,204,22,0.45)]'
          : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

/**
 * @param {{
 *   doctrine: AkademiDoctrine | null
 *   onClose: () => void
 * }} props
 */
function DoctrineReaderModal({ doctrine, onClose }) {
  const { t } = useTranslation('academy')
  if (!doctrine) return null

  const emptyBody = `*${t('doctrineModal.emptyBody')}*`

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 font-mono backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doctrine-reader-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
              {t('doctrineModal.badge')}
            </p>
            <h2 id="doctrine-reader-title" className="mt-1 truncate text-lg font-semibold text-zinc-100">
              {doctrine.title}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {doctrine.category} · {formatAkademiDate(doctrine.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
            aria-label={t('doctrineModal.close')}
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {doctrine.teaser ? (
            <p className="mb-4 border-l-2 border-lime-500/40 pl-3 text-sm italic text-zinc-400">{doctrine.teaser}</p>
          ) : null}
          <div className="prose prose-invert max-w-none text-sm leading-relaxed text-zinc-300 prose-headings:text-zinc-100 prose-a:text-lime-400">
            <ReactMarkdown>{doctrine.body || emptyBody}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   video: AkademiVideo | null
 *   onClose: () => void
 * }} props
 */
function VideoPlayerModal({ video, onClose }) {
  const { t } = useTranslation('academy')
  if (!video) return null

  const embedUrl = toVideoEmbedUrl(video.url)
  const canEmbed = embedUrl.includes('youtube.com/embed') || embedUrl.includes('player.vimeo.com')

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 font-mono backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-player-title"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
              {t('videoModal.badge')}
            </p>
            <h2 id="video-player-title" className="mt-1 truncate text-lg font-semibold text-zinc-100">
              {video.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
            aria-label={t('videoModal.close')}
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="p-5">
          {canEmbed ? (
            <div className="aspect-video w-full overflow-hidden rounded border border-zinc-800 bg-black">
              <iframe
                src={embedUrl}
                title={video.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center">
              <p className="text-sm text-zinc-400">{t('videoModal.embedUnsupported')}</p>
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-lime-400 hover:text-lime-300"
              >
                <ExternalLink className="size-4" aria-hidden />
                {t('videoModal.openExternal')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AkademiContent() {
  const { t } = useTranslation('academy')
  const shellProps = useAkademiShellProps()
  const [activeTab, setActiveTab] = useState(/** @type {AkademiTab} */ ('doktrinler'))

  const [doctrines, setDoctrines] = useState(/** @type {AkademiDoctrine[]} */ ([]))
  const [videos, setVideos] = useState(/** @type {AkademiVideo[]} */ ([]))
  const [doctrinesLoading, setDoctrinesLoading] = useState(true)
  const [videosLoading, setVideosLoading] = useState(true)
  const [doctrinesError, setDoctrinesError] = useState(/** @type {string | null} */ (null))
  const [videosError, setVideosError] = useState(/** @type {string | null} */ (null))

  const [readingDoctrine, setReadingDoctrine] = useState(/** @type {AkademiDoctrine | null} */ (null))
  const [watchingVideo, setWatchingVideo] = useState(/** @type {AkademiVideo | null} */ (null))

  useEffect(() => {
    setDoctrinesLoading(true)
    const unsub = subscribeAkademiDoctrines(
      (rows) => {
        setDoctrines(rows)
        setDoctrinesError(null)
        setDoctrinesLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setDoctrinesError(err instanceof Error ? err.message : i18n.t('doctrines.loadFailed', { ns: 'academy' }))
        setDoctrinesLoading(false)
      },
    )
    return unsub
  }, [])

  useEffect(() => {
    setVideosLoading(true)
    const unsub = subscribeAkademiVideos(
      (rows) => {
        setVideos(rows)
        setVideosError(null)
        setVideosLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setVideosError(err instanceof Error ? err.message : i18n.t('videos.loadFailed', { ns: 'academy' }))
        setVideosLoading(false)
      },
    )
    return unsub
  }, [])

  return (
    <PageShell {...shellProps}>
      <div className="mb-6 flex flex-wrap gap-2">
        <AkademiTabButton
          id="doktrinler"
          label={t('tabs.doctrines')}
          active={activeTab === 'doktrinler'}
          onSelect={() => setActiveTab('doktrinler')}
        />
        <AkademiTabButton
          id="videolar"
          label={t('tabs.videos')}
          active={activeTab === 'videolar'}
          onSelect={() => setActiveTab('videolar')}
        />
      </div>

      {activeTab === 'doktrinler' ? (
        <section aria-label={t('doctrines.sectionAria')}>
          {doctrinesLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 font-mono text-xs text-zinc-500">
              <Loader2 className="size-4 animate-spin text-lime-500/60" aria-hidden />
              {t('doctrines.loading')}
            </div>
          ) : doctrinesError ? (
            <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-xs text-red-300">
              {doctrinesError}
            </p>
          ) : doctrines.length === 0 ? (
            <p className="rounded border border-zinc-800 bg-zinc-950/40 px-4 py-10 text-center font-mono text-xs text-zinc-500">
              {t('doctrines.empty')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {doctrines.map((doc) => (
                <article
                  key={doc.id}
                  className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-lime-500"
                >
                  <div className="mb-3 flex items-start gap-2">
                    <BookOpen className="mt-0.5 size-4 shrink-0 text-lime-500/70" strokeWidth={1.75} aria-hidden />
                    <div className="min-w-0">
                      <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-zinc-100">{doc.title}</h3>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{doc.category}</p>
                      <p className="mt-1 font-mono text-[10px] text-zinc-600">{formatAkademiDate(doc.createdAt)}</p>
                    </div>
                  </div>
                  {doc.teaser ? (
                    <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-zinc-400">{doc.teaser}</p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <button
                    type="button"
                    onClick={() => setReadingDoctrine(doc)}
                    className="mt-auto self-start rounded border border-zinc-700 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-lime-400 transition hover:border-lime-500/50 hover:bg-lime-950/30"
                  >
                    {t('doctrines.read')}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section aria-label={t('videos.sectionAria')}>
          {videosLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 font-mono text-xs text-zinc-500">
              <Loader2 className="size-4 animate-spin text-lime-500/60" aria-hidden />
              {t('videos.loading')}
            </div>
          ) : videosError ? (
            <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-xs text-red-300">
              {videosError}
            </p>
          ) : videos.length === 0 ? (
            <p className="rounded border border-zinc-800 bg-zinc-950/40 px-4 py-10 text-center font-mono text-xs text-zinc-500">
              {t('videos.empty')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <article
                  key={video.id}
                  className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-lime-500"
                >
                  <div className="mb-3 flex items-start gap-2">
                    <PlayCircle className="mt-0.5 size-4 shrink-0 text-lime-500/70" strokeWidth={1.75} aria-hidden />
                    <div className="min-w-0">
                      <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-zinc-100">{video.title}</h3>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        {t('videos.categoryMeta')}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-zinc-600">{formatAkademiDate(video.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWatchingVideo(video)}
                    className="mt-auto self-start rounded border border-zinc-700 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-lime-400 transition hover:border-lime-500/50 hover:bg-lime-950/30"
                  >
                    {t('videos.watch')}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <DoctrineReaderModal doctrine={readingDoctrine} onClose={() => setReadingDoctrine(null)} />
      <VideoPlayerModal video={watchingVideo} onClose={() => setWatchingVideo(null)} />
    </PageShell>
  )
}

export default function Akademi() {
  if (AKADEMI_COMING_SOON) {
    return <AkademiComingSoonScreen />
  }
  return <AkademiContent />
}
