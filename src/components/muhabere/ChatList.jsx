import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Radio } from 'lucide-react'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import {
  formatConversationPreviewTime,
  subscribeConversationSummaries,
} from '../../lib/firestoreTaktikMuhabere'
import { indexConversationSummaries } from '../../lib/muhabereConversation'
import MuhabereConversationMenu from './MuhabereConversationMenu'
import MuhabereUnreadBadge from './MuhabereUnreadBadge'
import TacticalAlert from './TacticalAlert'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereChannel} MuhabereChannel */
/** @typedef {import('../../lib/muhabereConversation').MuhabereConversationSummary} MuhabereConversationSummary */

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
 *   onSelectChannel: (channelId: string) => void
 *   onArchiveChannel: (channel: MuhabereChannel) => void | Promise<void>
 *   onDeleteChannel: (channel: MuhabereChannel) => void | Promise<void>
 *   onLeaveChannel?: (channel: MuhabereChannel) => void | Promise<void>
 *   onEditChannel?: (channel: MuhabereChannel) => void
 *   onDestroyChannel?: (channel: MuhabereChannel) => void | Promise<void>
 *   onCreateChannel: () => void
 *   onSummariesChange?: (payload: ReturnType<typeof indexConversationSummaries>) => void
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
  onSelectChannel,
  onArchiveChannel,
  onDeleteChannel,
  onLeaveChannel,
  onEditChannel,
  onDestroyChannel,
  onCreateChannel,
  onSummariesChange,
  fillHeight = false,
}) {
  const [summaries, setSummaries] = useState(/** @type {MuhabereConversationSummary[]} */ ([]))
  const [summariesError, setSummariesError] = useState(/** @type {string | null} */ (null))

  const [archiveTarget, setArchiveTarget] = useState(/** @type {MuhabereChannel | null} */ (null))
  const [leaveTarget, setLeaveTarget] = useState(/** @type {MuhabereChannel | null} */ (null))
  const [destroyTarget, setDestroyTarget] = useState(/** @type {MuhabereChannel | null} */ (null))

  const indexed = useMemo(() => indexConversationSummaries(summaries, uid), [summaries, uid])

  useEffect(() => {
    if (!uid) {
      setSummaries([])
      setSummariesError(null)
      return undefined
    }

    return subscribeConversationSummaries(
      uid,
      (rows) => {
        setSummaries(rows)
        setSummariesError(null)
      },
      (err) => {
        emitFirebaseError(err)
        setSummariesError(err instanceof Error ? err.message : 'Özet kanalı kesildi.')
      },
    )
  }, [uid])

  useEffect(() => {
    onSummariesChange?.(indexed)
  }, [indexed, onSummariesChange])

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
        aria-label="Tim kanalları"
      >
        <div className="flex shrink-0 items-center justify-end border-b border-zinc-800/60 px-3 py-2.5">
          <button
            type="button"
            onClick={onCreateChannel}
            className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-950/30 px-2 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-900/50"
          >
            <Plus className="size-3" strokeWidth={2.5} aria-hidden />
            + Yeni kanal
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {channelsLoading ? (
            <p className="px-1 py-2 text-[10px] text-zinc-600">Kanallar yükleniyor…</p>
          ) : listError ? (
            <p className="px-1 py-2 text-[10px] text-red-400/90">{listError}</p>
          ) : channels.length === 0 ? (
            <p className="px-1 py-2 text-[10px] leading-relaxed text-zinc-600">
              {totalChannelCount === 0
                ? 'Henüz kanal yok — yeni kanal oluştur.'
                : 'Aktif kanal yok — arşivi kontrol edin.'}
            </p>
          ) : (
            <ul className="space-y-1.5" role="listbox" aria-label="Tim kanalları">
              {channels.map((ch) => {
                const activeChannelId =
                  openChannelId != null && openChannelId !== ''
                    ? openChannelId
                    : selectedChannelId
                const isActiveRow =
                  activeChannelId != null && activeChannelId !== '' && ch.id === activeChannelId
                const summary = indexed.byChannelId[ch.id]
                const unreadCount = isActiveRow
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
                            {summary.lastMessage}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-[9px] text-zinc-600">{ch.members.length} üye</span>
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
                    menuLabel={`${ch.name} kanal seçenekleri`}
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
        title="Kanalı arşivle"
        message="Kanal arşivlenen sohbetlere taşınacak. Mesajlar silinmez; yeni mesaj gelirse arşivde bildirim görürsünüz."
        confirmLabel="Arşivle"
        cancelLabel="İptal"
        busy={busyArchive}
        onConfirm={() => {
          if (!archiveTarget) return
          void onArchiveChannel(archiveTarget).then(() => setArchiveTarget(null))
        }}
        onCancel={closeAlerts}
      />

      <TacticalAlert
        open={Boolean(leaveTarget)}
        title="Kanaldan ayrıl"
        message="Bu işlem sohbeti listenizden kaldırır ve sizi gruptan çıkarır. Diğer üyeler gruba ve mesajlara erişmeye devam eder. Onaylıyor musunuz?"
        confirmLabel="Kanaldan ayrıl"
        cancelLabel="İptal"
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
        title="Kanalı kalıcı olarak sil"
        message="Kanal ve tüm mesajları kalıcı olarak silinecek. Bu işlem geri alınamaz. Onaylıyor musunuz?"
        confirmLabel="Kanalı sil"
        cancelLabel="İptal"
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
