import { useMemo, useState } from 'react'
import { Plus, Radio } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatConversationPreviewTime } from '../../lib/firestoreTaktikMuhabere'
import { formatMuhabereMessagePreviewDisplay } from '../../lib/messagesDisplayText'
import { isActiveChannelRow, sortMuhabereChannelsByRecency } from '../../lib/muhabereConversation'
import MuhabereConversationMenu from './MuhabereConversationMenu'
import MuhabereUnreadBadge from './MuhabereUnreadBadge'
import TacticalAlert from './TacticalAlert'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereChannel} MuhabereChannel */

/**
 * @param {{
 *   uid: string
 *   channels: MuhabereChannel[]
 *   totalChannelCount: number
 *   channelsLoading: boolean
 *   channelsError: string | null
 *   selectedChannelId: string | null
 *   archivingChannelId: string | null
 *   deletingChannelId: string | null
 *   destroyingChannelId?: string | null
 *   editingChannelId?: string | null
 *   channelUnreadById?: Record<string, number>
 *   openChannelId?: string | null
 *   resolveChannelUnread?: (channelId: string, isActiveRow: boolean) => number
 *   conversationIndex?: ReturnType<typeof import('../../lib/muhabereConversation').indexConversationSummaries> | null
 *   summariesError?: string | null
 *   onSelectChannel: (channelId: string) => void
 *   onArchiveChannel: (channel: MuhabereChannel) => void | Promise<void>
 *   onDeleteChannel: (channel: MuhabereChannel) => void | Promise<void>
 *   onLeaveChannel?: (channel: MuhabereChannel) => void | Promise<void>
 *   onEditChannel?: (channel: MuhabereChannel) => void
 *   onDestroyChannel?: (channel: MuhabereChannel) => void | Promise<void>
 *   onCreateChannel: () => void
 *   fillHeight?: boolean
 * }} props
 */
export default function ChatList({
  uid,
  channels,
  totalChannelCount,
  channelsLoading,
  channelsError,
  selectedChannelId,
  archivingChannelId,
  deletingChannelId,
  destroyingChannelId = null,
  editingChannelId = null,
  channelUnreadById = {},
  openChannelId = null,
  resolveChannelUnread,
  conversationIndex = null,
  summariesError = null,
  onSelectChannel,
  onArchiveChannel,
  onDeleteChannel,
  onLeaveChannel,
  onEditChannel,
  onDestroyChannel,
  onCreateChannel,
  fillHeight = false,
}) {
  const { t } = useTranslation('messages')
  const [archiveTarget, setArchiveTarget] = useState(/** @type {MuhabereChannel | null} */ (null))
  const [leaveTarget, setLeaveTarget] = useState(/** @type {MuhabereChannel | null} */ (null))
  const [destroyTarget, setDestroyTarget] = useState(/** @type {MuhabereChannel | null} */ (null))

  const byChannelId = conversationIndex?.byChannelId ?? {}

  const sortedChannels = useMemo(
    () => sortMuhabereChannelsByRecency(channels, conversationIndex),
    [channels, conversationIndex],
  )

  const busyArchive = Boolean(archivingChannelId)
  const busyLeave = Boolean(deletingChannelId)
  const busyDestroy = Boolean(destroyingChannelId)

  const closeAlerts = () => {
    if (busyArchive || busyLeave || busyDestroy) return
    setArchiveTarget(null)
    setLeaveTarget(null)
    setDestroyTarget(null)
  }

  const listError = channelsError || summariesError

  return (
    <>
      <section
        className={[
          'flex flex-col overflow-hidden',
          fillHeight ? 'min-h-0 flex-1' : 'max-h-[40%] min-h-[180px] shrink-0',
        ].join(' ')}
        aria-label={t('channels.sectionAria')}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-zinc-800/60 px-3 py-2.5">
          <button
            type="button"
            onClick={onCreateChannel}
            className="inline-flex min-w-0 items-center gap-1 rounded border border-amber-500/30 bg-amber-950/30 px-2 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-900/50"
          >
            <Plus className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
            <span className="truncate">{t('channels.newChannel')}</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {channelsLoading ? (
            <p className="px-1 py-2 text-[10px] text-zinc-600">{t('channels.loading')}</p>
          ) : listError ? (
            <p className="px-1 py-2 text-[10px] text-red-400/90">{listError}</p>
          ) : channels.length === 0 ? (
            <p className="px-1 py-2 text-[10px] leading-relaxed text-zinc-600">
              {totalChannelCount === 0
                ? t('channels.emptyNone')
                : t('channels.emptyArchived')}
            </p>
          ) : (
            <ul className="space-y-1.5" role="listbox" aria-label={t('channels.sectionAria')}>
              {sortedChannels.map((ch) => {
                const isActiveRow = isActiveChannelRow(openChannelId, ch.id)
                const summary = byChannelId[ch.id]
                const unreadCount = resolveChannelUnread
                  ? resolveChannelUnread(ch.id, isActiveRow)
                  : isActiveRow
                    ? 0
                    : Math.max(summary?.unreadCount ?? 0, channelUnreadById[ch.id] ?? 0)
                const hasUnread = !isActiveRow && unreadCount > 0
                const isOwner = ch.createdBy === uid

                return (
                  <li
                    key={ch.id}
                    className={[
                      'flex items-stretch gap-1 rounded-md border-l-2',
                      hasUnread
                        ? 'muhabere-unread-pulse !border-l-amber-500'
                        : 'border-l-transparent',
                      isActiveRow ? 'bg-zinc-800/80' : 'hover:bg-amber-500/[0.06]',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActiveRow}
                      onClick={() => onSelectChannel(ch.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-3 text-left"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/80">
                        <Radio className="size-4 text-amber-400/80" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={[
                              'truncate text-xs font-semibold uppercase tracking-wide',
                              isActiveRow ? 'text-amber-300' : hasUnread ? 'text-amber-100' : 'text-zinc-300',
                            ].join(' ')}
                          >
                            {ch.name}
                          </span>
                          {summary?.lastMessageAt ? (
                            <span className="shrink-0 text-[9px] text-zinc-600">
                              {formatConversationPreviewTime(summary.lastMessageAt)}
                            </span>
                          ) : null}
                        </span>
                        {summary?.lastMessage ? (
                          <span className="mt-0.5 block truncate text-[9px] normal-case tracking-normal text-zinc-500">
                            {summary.lastSender ? `${summary.lastSender}: ` : ''}
                            {formatMuhabereMessagePreviewDisplay(summary.lastMessage)}
                          </span>
                        ) : (
                          <span className="mt-0.5 block truncate text-[9px] text-zinc-600">
                            {t('channels.memberCount', { count: ch.members.length })}
                          </span>
                        )}
                      </span>
                    </button>

                    {hasUnread ? (
                      <span className="flex shrink-0 items-center self-center pr-0.5">
                        <MuhabereUnreadBadge count={unreadCount} />
                      </span>
                    ) : null}

                    <MuhabereConversationMenu
                      variant="channel"
                      isOwner={isOwner}
                      archiveBusy={archivingChannelId === ch.id}
                      leaveBusy={deletingChannelId === ch.id}
                      destroyBusy={destroyingChannelId === ch.id}
                      editBusy={editingChannelId === ch.id}
                      onArchive={() => setArchiveTarget(ch)}
                      onDelete={() => setLeaveTarget(ch)}
                      onLeave={() => setLeaveTarget(ch)}
                      onEdit={isOwner && onEditChannel ? () => onEditChannel(ch) : undefined}
                      onDestroyChannel={isOwner && onDestroyChannel ? () => setDestroyTarget(ch) : undefined}
                      menuLabel={t('channels.menuLabel', { name: ch.name })}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <TacticalAlert
        open={Boolean(archiveTarget)}
        title={t('alerts.archiveChannel.title')}
        message={t('alerts.archiveChannel.message')}
        confirmLabel={t('alerts.archiveChannel.confirm')}
        cancelLabel={t('alerts.cancel')}
        busy={busyArchive}
        onConfirm={() => {
          if (!archiveTarget) return
          void onArchiveChannel(archiveTarget).then(() => setArchiveTarget(null))
        }}
        onCancel={closeAlerts}
      />

      <TacticalAlert
        open={Boolean(leaveTarget)}
        title={t('alerts.leaveChannel.title')}
        message={t('alerts.leaveChannel.message')}
        confirmLabel={t('alerts.leaveChannel.confirm')}
        cancelLabel={t('alerts.cancel')}
        busy={busyLeave}
        onConfirm={() => {
          if (!leaveTarget) return
          const handler = onLeaveChannel ?? onDeleteChannel
          void handler(leaveTarget).then(() => setLeaveTarget(null))
        }}
        onCancel={closeAlerts}
      />

      <TacticalAlert
        open={Boolean(destroyTarget)}
        title={t('alerts.destroyChannel.title')}
        message={t('alerts.destroyChannel.message')}
        confirmLabel={t('alerts.destroyChannel.confirm')}
        cancelLabel={t('alerts.cancel')}
        busy={busyDestroy}
        onConfirm={() => {
          if (!destroyTarget || !onDestroyChannel) return
          void onDestroyChannel(destroyTarget).then(() => setDestroyTarget(null))
        }}
        onCancel={closeAlerts}
      />
    </>
  )
}
