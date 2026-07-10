import { Loader2, Radio } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CleanFade from './CleanFade'
import {
  icEmptyCell,
  icEmptyDesc,
  icEmptyTitle,
  icTable,
  icTableWrap,
  icTd,
  icTh,
  icTrHover,
  resolveSectorAccent,
} from '../layout/instructorCommandTokens'
import { ctBtnSecondary } from './tokens'

/** @typedef {import('../../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */

/**
 * @param {unknown} ts
 */
function formatSessionStart(ts) {
  const ms =
    ts && typeof ts === 'object' && ts !== null && 'toMillis' in ts && typeof ts.toMillis === 'function'
      ? ts.toMillis()
      : Date.parse(String(ts ?? '')) || 0
  if (!ms) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}

/**
 * @param {{
 *   sessions: GroupTraining[]
 *   participantCounts: Record<string, number>
 *   selectedId: string
 *   onSelect: (trainingId: string) => void
 *   onClose: (trainingId: string) => void
 *   closingId?: string
 *   loading?: boolean
 * }} props
 */
export default function ActiveAtisSessionsList({
  sessions,
  participantCounts,
  selectedId,
  onSelect,
  onClose,
  closingId = '',
  loading = false,
}) {
  const { t } = useTranslation('instructor')
  const accent = resolveSectorAccent('atis')

  return (
    <CleanFade>
      <div className={`overflow-hidden rounded-lg border ${accent.panelBorder} bg-black/40`}>
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-950/20 px-3 py-2">
          <Radio className={`size-3.5 ${accent.icon}`} strokeWidth={1.5} aria-hidden />
          <p className={`font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] ${accent.title}`}>
            {t('education.atis.sessions.title')}
          </p>
          <span className="ml-auto font-mono-technical text-[9px] tabular-nums text-app-text/45">
            {t('education.atis.sessions.liveCount', { count: sessions.length })}
          </span>
        </div>

        {loading && sessions.length === 0 ? (
          <div className={icEmptyCell}>
            <Loader2 className="mx-auto size-5 animate-spin text-amber-400" aria-hidden />
            <p className={`${icEmptyTitle} mt-3`}>{t('education.atis.sessions.syncing')}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className={icEmptyCell}>
            <p className={icEmptyTitle}>{t('education.atis.sessions.empty')}</p>
            <p className={icEmptyDesc}>{t('education.atis.sessions.emptyHint')}</p>
          </div>
        ) : (
          <div className={icTableWrap}>
            <table className={icTable}>
              <thead>
                <tr>
                  <th className={icTh}>{t('education.atis.sessions.colDrill')}</th>
                  <th className={icTh}>{t('education.atis.sessions.colLevel')}</th>
                  <th className={icTh}>{t('education.atis.sessions.colStart')}</th>
                  <th className={icTh}>{t('education.atis.sessions.colParticipant')}</th>
                  <th className={`${icTh} text-right`}>{t('education.atis.sessions.colCommand')}</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const isSelected = session.id === selectedId
                  const isClosing = closingId === session.id
                  const count = participantCounts[session.id] ?? 0

                  return (
                    <tr
                      key={session.id}
                      className={[
                        icTrHover,
                        isSelected
                          ? 'bg-amber-950/35 ring-1 ring-inset ring-amber-500/35'
                          : 'bg-transparent',
                      ].join(' ')}
                    >
                      <td className={`${icTd} font-mono-technical text-[11px] font-bold uppercase text-app-text`}>
                        {session.trainingName}
                        {isSelected ? (
                          <span className="ml-2 rounded border border-amber-500/40 bg-amber-950/40 px-1.5 py-0.5 text-[8px] font-bold text-amber-300">
                            {t('education.atis.sessions.followBadge')}
                          </span>
                        ) : null}
                      </td>
                      <td className={`${icTd} font-mono-technical text-[10px] uppercase text-app-text/60`}>
                        {session.level || '—'}
                      </td>
                      <td className={`${icTd} font-mono-technical text-[10px] tabular-nums text-app-text/55`}>
                        {formatSessionStart(session.createdAt)}
                      </td>
                      <td className={`${icTd} font-mono-technical text-[11px] tabular-nums text-sky-400`}>
                        {count}
                      </td>
                      <td className={`${icTd} text-right`}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isSelected || isClosing}
                            onClick={() => onSelect(session.id)}
                            className={[
                              ctBtnSecondary,
                              'px-2 py-1 text-[9px]',
                              isSelected ? 'opacity-40' : '',
                            ].join(' ')}
                          >
                            {t('education.atis.sessions.follow')}
                          </button>
                          <button
                            type="button"
                            disabled={isClosing}
                            onClick={() => onClose(session.id)}
                            className="rounded border border-red-500/35 bg-red-950/25 px-2 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-red-300 transition hover:bg-red-950/45 disabled:opacity-50"
                          >
                            {isClosing ? '…' : t('education.atis.sessions.close')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CleanFade>
  )
}
