import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import i18n from '../../i18n'
import { createForumReport } from '../../lib/firestoreForumReports'
import { formatForumReportReasonLabel } from '../../lib/forumDisplayText'

/** @typedef {import('../../lib/firestoreForumReports').ForumReportReasonKey} ForumReportReasonKey */

const REPORT_REASON_KEYS = /** @type {ForumReportReasonKey[]} */ ([
  'spam',
  'harassment',
  'inappropriate',
  'other',
])

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   targetType: 'post' | 'comment'
 *   targetId: string
 *   parentPostId?: string | null
 *   reporterId: string
 *   reporterCallsign: string
 *   onSuccess: () => void
 * }} props
 */
export default function ForumReportModal({
  open,
  onClose,
  targetType,
  targetId,
  parentPostId = null,
  reporterId,
  reporterCallsign,
  onSuccess,
}) {
  const { t } = useTranslation('forum')
  const [reason, setReason] = useState(/** @type {ForumReportReasonKey} */ ('spam'))
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setReason('spam')
      setDescription('')
      setError('')
      setSubmitting(false)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError('')
    try {
      await createForumReport({
        targetType,
        targetId,
        parentPostId: targetType === 'comment' ? parentPostId : null,
        reason,
        description,
        reporterId,
        reporterCallsign,
      })
      onSuccess()
      onClose()
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String(/** @type {{ code?: string }} */ (err).code) : ''
      if (code === 'already-exists') {
        setError(i18n.t('report.errorAlreadyReported', { ns: 'forum' }))
      } else {
        setError(err instanceof Error ? err.message : i18n.t('report.errorSubmitFailed', { ns: 'forum' }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forum-report-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-amber-500/30 bg-zinc-950 shadow-[0_0_40px_-8px_rgba(251,191,36,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-amber-400">
              {t('report.kicker')}
            </p>
            <h3 id="forum-report-title" className="mt-1 font-mono text-sm font-bold uppercase text-zinc-100">
              {t('report.title')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-700 p-1 text-zinc-400 hover:text-zinc-200"
            aria-label={t('report.close')}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
          <fieldset className="space-y-2">
            <legend className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {t('report.categoryLegend')}
            </legend>
            {REPORT_REASON_KEYS.map((key) => (
              <label
                key={key}
                className={[
                  'flex cursor-pointer items-center gap-2 rounded border px-3 py-2 font-mono text-[10px] uppercase transition',
                  reason === key
                    ? 'border-amber-500/50 bg-amber-950/30 text-amber-300'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="forum-report-reason"
                  value={key}
                  checked={reason === key}
                  onChange={() => setReason(key)}
                  className="accent-amber-400"
                />
                {formatForumReportReasonLabel(key)}
              </label>
            ))}
          </fieldset>

          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {t('report.descriptionLabel')}
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t('report.descriptionPlaceholder')}
              className="w-full resize-y rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </label>

          {error ? (
            <p className="rounded border border-red-900/50 bg-red-950/25 px-3 py-2 font-mono text-[10px] uppercase text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-zinc-700 px-3 py-2 font-mono text-[10px] font-bold uppercase text-zinc-400 hover:border-zinc-600"
            >
              {t('report.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded border border-amber-500/45 bg-amber-950/30 px-4 py-2 font-mono text-[10px] font-bold uppercase text-amber-300 hover:border-amber-400 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              {t('report.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
