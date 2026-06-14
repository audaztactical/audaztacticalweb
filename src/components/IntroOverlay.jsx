import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { markIntroAsShown } from '../lib/introStorage'

/**
 * Karşılama ekranı → intro videosu → siteye geçiş.
 * @param {{ onFinish: () => void }} props
 */
export default function IntroOverlay({ onFinish }) {
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null))
  const exitTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const startedRef = useRef(false)
  const isExitingRef = useRef(false)
  const [phase, setPhase] = useState(/** @type {'welcome' | 'intro' | 'exiting'} */ ('welcome'))
  const [isVideoFinished, setIsVideoFinished] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  isExitingRef.current = phase === 'exiting'

  const stopVideo = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.pause()
  }, [])

  const playWithSound = useCallback(() => {
    const video = videoRef.current
    if (!video || isExitingRef.current) return false

    video.volume = 1

    if (!video.paused && video.muted) {
      video.muted = false
      setIsMuted(false)
      return true
    }

    video.muted = false

    const promise = video.play()
    if (promise !== undefined) {
      promise
        .then(() => {
          if (!video.paused) setIsMuted(false)
        })
        .catch(() => {
          /* Sessiz modda kal */
        })
      return true
    }

    if (!video.paused) {
      setIsMuted(false)
      return true
    }

    return false
  }, [])

  const toggleSound = useCallback(() => {
    const video = videoRef.current
    if (!video || isExitingRef.current) return

    if (video.muted) {
      playWithSound()
      return
    }

    video.muted = true
    setIsMuted(true)
  }, [playWithSound])

  const startIntroFromGesture = useCallback(() => {
    if (startedRef.current) return

    const video = videoRef.current
    if (!video) return

    startedRef.current = true
    setPhase('intro')

    const startAudible = () => {
      video.volume = 1
      video.muted = false
      return video.play()
    }

    const startMuted = () => {
      video.muted = true
      return video.play().then(() => {
        if (!video.paused) setIsMuted(true)
      })
    }

    const beginPlayback = () => {
      startAudible()
        .then(() => {
          if (!video.paused) setIsMuted(false)
        })
        .catch(() => {
          void startMuted()
        })
    }

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      beginPlayback()
      return
    }

    const onCanPlay = () => {
      if (!video.paused) return
      void startMuted()
    }

    video.addEventListener('canplay', onCanPlay, { once: true })
    void startMuted()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.preload = 'auto'
    video.load()
  }, [])

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current)
      stopVideo()
    }
  }, [stopVideo])

  const handleEnter = () => {
    if (phase === 'exiting') return
    markIntroAsShown()
    stopVideo()
    setPhase('exiting')
    exitTimerRef.current = window.setTimeout(() => {
      onFinish()
    }, 520)
  }

  const handleEnded = () => {
    if (isExitingRef.current) return

    const video = videoRef.current
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = Math.max(0, video.duration - 0.04)
      video.pause()
    }

    setIsVideoFinished(true)
  }

  const showVideo = phase === 'intro' || phase === 'exiting'

  return (
    <div
      className={[
        'intro-overlay fixed inset-0 z-[9999] bg-black',
        phase === 'exiting' ? 'intro-overlay--exit' : '',
      ].join(' ')}
      role="dialog"
      aria-label="Giriş deneyimi"
    >
      {phase === 'welcome' ? (
        <div className="entry-gate__atmosphere pointer-events-none absolute inset-0 z-[2]" aria-hidden />
      ) : null}

      <video
        ref={videoRef}
        className={[
          'intro-overlay__video absolute inset-0 z-[1] h-full w-full object-cover',
          showVideo ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        src="/intro.mp4"
        playsInline
        preload="auto"
        onEnded={handleEnded}
      />

      {phase === 'welcome' ? (
        <button
          type="button"
          onClick={startIntroFromGesture}
          className="entry-gate group absolute inset-0 z-[3] flex items-center justify-center border-0 bg-transparent p-6 outline-none"
          aria-label="Hoş geldin, devam etmek için giriş yap"
        >
          <div className="entry-gate__frame pointer-events-none absolute inset-8 border border-white/[0.06] sm:inset-12" aria-hidden>
            <span className="entry-gate__corner entry-gate__corner--tl" />
            <span className="entry-gate__corner entry-gate__corner--tr" />
            <span className="entry-gate__corner entry-gate__corner--bl" />
            <span className="entry-gate__corner entry-gate__corner--br" />
          </div>

          <div className="entry-gate__scan pointer-events-none absolute inset-0" aria-hidden />

          <div className="entry-gate__content relative z-10 max-w-xl text-center">
            <p className="entry-gate__title font-display text-2xl font-semibold leading-snug tracking-wide text-white transition duration-500 group-hover:text-[#ffb400] sm:text-3xl md:text-4xl">
              Hoş Geldin.
            </p>
            <p className="entry-gate__subtitle mt-4 font-display text-sm font-medium tracking-[0.12em] text-slate-400 transition duration-500 group-hover:text-slate-200 sm:text-base">
              devam etmek için giriş yap
            </p>
            <div className="entry-gate__pulse mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-[#ffb400]/80 to-transparent" aria-hidden />
          </div>
        </button>
      ) : null}

      {showVideo && !isVideoFinished ? (
        <button
          type="button"
          onClick={toggleSound}
          className={[
            'fixed right-4 top-4 z-[10000] inline-flex size-9 items-center justify-center rounded-sm border bg-black/50 backdrop-blur-md transition',
            isMuted
              ? 'intro-sound-btn--muted border-[#ffb400]/45 text-[#ffb400] hover:border-[#ffb400]/70 hover:bg-[#ffb400]/10'
              : 'border-white/20 text-slate-300 hover:border-white/35 hover:text-white',
          ].join(' ')}
          aria-label={isMuted ? 'Sesi aç' : 'Sesi kapat'}
          title={isMuted ? 'Sesi aç' : 'Sesi kapat'}
        >
          {isMuted ? (
            <VolumeX className="size-4" strokeWidth={2} aria-hidden />
          ) : (
            <Volume2 className="size-4" strokeWidth={2} aria-hidden />
          )}
        </button>
      ) : null}

      {isVideoFinished && showVideo ? (
        <div className="intro-overlay__end-layer absolute inset-0 z-[4]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-[12vh] flex justify-center px-6 sm:bottom-[14vh]">
            <button
              type="button"
              onClick={handleEnter}
              disabled={phase === 'exiting'}
              className="intro-overlay__cta pointer-events-auto rounded-sm border border-white/25 bg-black/35 px-11 py-3 font-display text-xs font-semibold uppercase tracking-[0.32em] text-slate-100 backdrop-blur-md transition duration-300 hover:border-[#ffb400]/55 hover:bg-[#ffb400]/[0.07] hover:text-[#ffb400] hover:shadow-[0_0_32px_-14px_rgba(255,180,0,0.55)] disabled:pointer-events-none disabled:opacity-50 sm:px-12 sm:py-3.5 sm:text-sm"
            >
              Sisteme giriş
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
