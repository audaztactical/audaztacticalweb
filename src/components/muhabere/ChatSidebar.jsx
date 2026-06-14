import { useState } from 'react'
import { Loader2, Plus, Radio } from 'lucide-react'
import MuhabereConversationActions from './MuhabereConversationActions'
import TacticalAlert from './TacticalAlert'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereChannel} MuhabereChannel */

/**
 * @param {{
 *   channels: MuhabereChannel[]
 *   totalChannelCount: number
 *   channelsLoading: boolean
 *   channelsError: string | null
 *   selectedChannelId: string | null
 *   channelUnreadById: Record<string, number>
 *   archivingChannelId: string | null
 *   deletingChannelId: string | null
 *   onSelectChannel: (channelId: string) => void
 *   onArchiveChannel: (channel: MuhabereChannel) => void | Promise<void>
 *   onDeleteChannel: (channel: MuhabereChannel) => void | Promise<void>
 *   onCreateChannel: () => void
 * }} props
 */
export default function ChatSidebar({
  channels,
  totalChannelCount,
  channelsLoading,
  channelsError,
  selectedChannelId,
  channelUnreadById,
  archivingChannelId,
  deletingChannelId,
  onSelectChannel,
  onArchiveChannel,
  onDeleteChannel,
  onCreateChannel,
}) {
  const [archiveTarget, setArchiveTarget] = useState(/** @type {MuhabereChannel | null} */ (null))
  const [deleteTarget, setDeleteTarget] = useState(/** @type {MuhabereChannel | null} */ (null))

  const busyArchive = Boolean(archivingChannelId)
  const busyDelete = Boolean(deletingChannelId)

  const closeAlerts = () => {
    if (busyArchive || busyDelete) return
    setArchiveTarget(null)
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="shrink-0 border-b border-zinc-800 px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-500/90">
            Tim kanalları
          </h2>
          <button
            type="button"
            onClick={onCreateChannel}
            className="inline-flex items-center gap-1 rounded border border-lime-500/30 bg-lime-950/30 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-lime-400 transition hover:bg-lime-900/50"
          >
            <Plus className="size-3" strokeWidth={2.5} aria-hidden />
            Yeni kanal
          </button>
        </div>

        {channelsLoading ? (
          <p className="text-[10px] text-zinc-600">Kanallar yükleniyor…</p>
        ) : channelsError ? (
          <p className="text-[10px] text-red-400/90">{channelsError}</p>
        ) : channels.length === 0 ? (
          <p className="text-[10px] leading-relaxed text-zinc-600">
            {totalChannelCount === 0
              ? 'Henüz kanal yok — tim üyeleriyle grup açın.'
              : 'Aktif kanal yok — arşivi kontrol edin.'}
          </p>
        ) : (
          <ul className="max-h-36 space-y-1 overflow-y-auto" role="listbox" aria-label="Tim kanalları">
            {channels.map((ch) => {
              const active = ch.id === selectedChannelId
              const unreadCount = channelUnreadById[ch.id] ?? 0

              return (
                <li key={ch.id} className="flex items-stretch gap-1">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => onSelectChannel(ch.id)}
                    className={[
                      'min-w-0 flex-1 flex items-center gap-2 rounded-md border-l-4 px-2 py-2 text-left transition',
                      active
                        ? 'border-lime-500 bg-zinc-800 text-lime-400'
                        : 'border-l-transparent text-zinc-400 hover:bg-zinc-800/70',
                    ].join(' ')}
                  >
                    <Radio className="size-3 shrink-0 text-lime-500/70" aria-hidden />
                    <span
                      className={[
                        'min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide',
                        unreadCount > 0 && !active ? 'blink text-lime-300' : '',
                      ].join(' ')}
                    >
                      {ch.name}
                    </span>
                    {unreadCount > 0 && !active ? (
                      <span className="shrink-0 rounded-sm bg-lime-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-lime-400">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[9px] text-zinc-500">{ch.members.length}</span>
                    )}
                  </button>

                  <MuhabereConversationActions
                    archiveBusy={archivingChannelId === ch.id}
                    deleteBusy={deletingChannelId === ch.id}
                    onArchive={() => setArchiveTarget(ch)}
                    onDelete={() => setDeleteTarget(ch)}
                    archiveLabel={`${ch.name} kanalını arşivle`}
                    deleteLabel={`${ch.name} grubundan çık`}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>

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
        open={Boolean(deleteTarget)}
        title="Gruptan çık ve sohbeti sil"
        message="Bu işlem sohbeti listenizden kaldırır ve sizi gruptan çıkarır. Diğer üyeler gruba ve mesajlara erişmeye devam eder. Onaylıyor musunuz?"
        confirmLabel="Gruptan çık"
        cancelLabel="İptal"
        busy={busyDelete}
        onConfirm={() => {
          if (!deleteTarget) return
          void onDeleteChannel(deleteTarget).then(() => setDeleteTarget(null))
        }}
        onCancel={closeAlerts}
      />
    </>
  )
}
