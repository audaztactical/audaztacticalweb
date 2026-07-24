import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { DRY_FIRE_SAFETY_ITEMS } from '../../lib/dryFireTrainingMachine'

/**
 * @returns {Element}
 */
function resolvePortalRoot() {
  if (typeof document === 'undefined') return /** @type {Element} */ (/** @type {unknown} */ (null))
  const doc = document
  const fs =
    doc.fullscreenElement ||
    /** @type {{ webkitFullscreenElement?: Element | null }} */ (doc).webkitFullscreenElement ||
    null
  if (fs instanceof Element) return fs
  return document.body
}

/**
 * Kuru tetik güvenlik onayı — 3 zorunlu checkbox.
 * Kapatılamaz / atlanamaz; BAŞLA yalnızca tüm maddeler işaretliyken aktif.
 * Tam ekran öğesine portal eder (body dışı FS içeriği görünür kalsın).
 * @param {{
 *   open: boolean
 *   onConfirm: () => void
 * }} props
 */
export default function DryFireSafetyModal({ open, onConfirm }) {
  const { t } = useTranslation('timer')
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [checks, setChecks] = useState(() =>
    Object.fromEntries(DRY_FIRE_SAFETY_ITEMS.map((id) => [id, false])),
  )
  const wasOpenRef = useRef(false)
  const [portalRoot, setPortalRoot] = useState(/** @type {Element | null} */ (null))

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setChecks(Object.fromEntries(DRY_FIRE_SAFETY_ITEMS.map((id) => [id, false])))
    }
    wasOpenRef.current = open
  }, [open])

  // Tam ekran değişince portal hedefini güncelle (buton → FS yarışı)
  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      setPortalRoot(null)
      return undefined
    }
    const sync = () => setPortalRoot(resolvePortalRoot())
    sync()
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    const t1 = window.setTimeout(sync, 0)
    const t2 = window.setTimeout(sync, 120)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [open])

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow || ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const blockKeys = (e) => {
      // Escape modalı kapatmaz (FS çıkış ayrı buton / tarayıcı ESC).
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const trapFocus = (e) => {
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      const list = Array.from(focusables)
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault()
          const lastEl = /** @type {HTMLElement} */ (last)
          lastEl.focus()
        }
      } else if (active === last || !panelRef.current.contains(active)) {
        e.preventDefault()
        const firstEl = /** @type {HTMLElement} */ (first)
        firstEl.focus()
      }
    }

    window.addEventListener('keydown', blockKeys, true)
    window.addEventListener('keydown', trapFocus, true)
    window.setTimeout(() => {
      const firstCb = panelRef.current?.querySelector('input[type="checkbox"]')
      if (firstCb && 'focus' in firstCb) {
        const el = /** @type {HTMLElement} */ (firstCb)
        el.focus()
      }
    }, 30)

    return () => {
      window.removeEventListener('keydown', blockKeys, true)
      window.removeEventListener('keydown', trapFocus, true)
    }
  }, [open])

  const allChecked = useMemo(
    () => DRY_FIRE_SAFETY_ITEMS.every((id) => checks[id]),
    [checks],
  )

  if (!open || !portalRoot) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center bg-black/90 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dryfire-safety-title"
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div
        ref={panelRef}
        className={[
          'relative z-[1] w-full max-w-lg overflow-hidden rounded-xl border border-amber-600/50 bg-slate-950',
          'shadow-[0_8px_32px_-12px_rgba(245,158,11,0.35)]',
        ].join(' ')}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-amber-500/50"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-amber-500/50"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-amber-500/40"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-amber-500/40"
          aria-hidden
        />

        <div className="relative z-[1] border-b border-amber-600/35 bg-amber-950/40 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/50 bg-amber-950/60">
              <ShieldAlert className="size-5 text-amber-400" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0">
              <p
                id="dryfire-safety-title"
                className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300"
              >
                {t('dryFire.training.safety.title')}
              </p>
              <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-app-text/75">
                {t('dryFire.training.safety.subtitle')}
              </p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-amber-400/90">
                {t('dryFire.training.safety.lockHint')}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-[1] px-4 py-5 sm:px-5 sm:py-6">
          <ul className="flex flex-col gap-2.5">
            {DRY_FIRE_SAFETY_ITEMS.map((id) => {
              const inputId = `dryfire-safety-${id}`
              return (
                <li key={id}>
                  <label
                    htmlFor={inputId}
                    className={[
                      'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition',
                      'focus-within:ring-1 focus-within:ring-amber-500/60',
                      checks[id]
                        ? 'border-amber-500/45 bg-amber-950/35'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700',
                    ].join(' ')}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={!!checks[id]}
                      onChange={(e) =>
                        setChecks((prev) => ({ ...prev, [id]: e.target.checked }))
                      }
                      className="mt-0.5 size-4 shrink-0 accent-amber-500"
                      required
                    />
                    <span className="font-mono text-[11px] leading-snug text-app-text/85">
                      {t(`dryFire.training.safety.items.${id}`)}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-app-text/45">
            {t('dryFire.training.safety.hint')}
          </p>

          <button
            type="button"
            disabled={!allChecked}
            aria-disabled={!allChecked}
            tabIndex={allChecked ? 0 : -1}
            onClick={() => {
              if (!allChecked) return
              onConfirm()
            }}
            className={[
              'mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] transition',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#facc15]/55',
              allChecked
                ? 'border-[#facc15]/55 bg-[#facc15] text-slate-950 hover:bg-[#facc15]/90'
                : 'pointer-events-none cursor-not-allowed border-slate-800 bg-slate-900 text-app-text/35 opacity-60',
            ].join(' ')}
          >
            {t('dryFire.training.safety.start')}
          </button>
        </div>
      </div>
    </div>,
    portalRoot,
  )
}
