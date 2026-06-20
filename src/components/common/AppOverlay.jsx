import { createPortal } from 'react-dom'
import { useAppViewport } from '../../hooks/useAppViewport'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

/**
 * Davranışsal tam ekran overlay — renk/stil dışarıdan className ile gelir.
 *
 * @param {{
 *   open: boolean
 *   lockId?: string
 *   className?: string
 *   contentClassName?: string
 *   header?: import('react').ReactNode
 *   footer?: import('react').ReactNode
 *   children: import('react').ReactNode
 *   role?: string
 *   'aria-modal'?: boolean | 'true' | 'false'
 *   'aria-labelledby'?: string
 *   'aria-label'?: string
 * }} props
 */
export function AppOverlay({
  open,
  lockId = 'app-overlay',
  className = '',
  contentClassName = '',
  header,
  footer,
  children,
  role = 'dialog',
  'aria-modal': ariaModal = true,
  'aria-labelledby': ariaLabelledby,
  'aria-label': ariaLabel,
}) {
  const { availableHeightPx, availableHeightCss } = useAppViewport()
  useBodyScrollLock(lockId, open)

  if (!open || typeof document === 'undefined') return null

  const maxHeight =
    availableHeightPx > 0
      ? `min(94dvh, ${availableHeightPx}px)`
      : `min(94dvh, ${availableHeightCss})`

  return createPortal(
    <div
      className={['fixed inset-0 flex flex-col overflow-hidden', className].filter(Boolean).join(' ')}
      style={{ maxHeight }}
      role={role}
      aria-modal={ariaModal}
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabel}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div
        className={['min-h-0 flex-1 overflow-y-auto overscroll-y-contain', contentClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>,
    document.body,
  )
}

/** @type {typeof AppOverlay} */
export const AppModal = AppOverlay
