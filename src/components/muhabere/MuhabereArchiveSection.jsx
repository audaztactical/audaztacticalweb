import { useState } from 'react'
import { Archive, ArchiveRestore, ChevronDown, ChevronRight, Loader2, Radio } from 'lucide-react'
import OperatorAvatar from '../ui/OperatorAvatar'
import PresenceIndicator from '../ui/PresenceIndicator'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereChannel} MuhabereChannel */
/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereContact} MuhabereContact */

/**
 * @param {{
 *   archivedChannels: MuhabereChannel[]
 *   archivedContacts: MuhabereContact[]
 *   selectedChannelId: string | null
 *   selectedUid: string | null
 *   channelUnreadById: Record<string, number>
 *   dmUnreadByPeerId: Record<string, number>
 *   presenceMap?: Record<string, { online: boolean; label: string }>
 *   onSelectChannel: (channelId: string) => void
 *   onSelectContact: (uid: string) => void
 *   onUnarchiveChannel: (channel: MuhabereChannel) => void | Promise<void>
 *   onUnarchiveContact: (contact: MuhabereContact) => void | Promise<void>
 *   unarchivingChannelId?: string | null
 *   unarchivingDmUid?: string | null
 * }} props
 */
export default function MuhabereArchiveSection({
  archivedChannels,
  archivedContacts,
  selectedChannelId,
  selectedUid,
  channelUnreadById,
  dmUnreadByPeerId,
  presenceMap = {},
  onSelectChannel,
  onSelectContact,
  onUnarchiveChannel,
  onUnarchiveContact,
  unarchivingChannelId = null,
  unarchivingDmUid = null,
}) {
  const [open, setOpen] = useState(true)
  const total = archivedChannels.length + archivedContacts.length
  if (total === 0) return null

  const archivedUnreadTotal =
    archivedChannels.reduce((sum, ch) => sum + (channelUnreadById[ch.id] ?? 0), 0) +
    archivedContacts.reduce((sum, c) => sum + (dmUnreadByPeerId[c.uid] ?? 0), 0)

  return (
    <div className="shrink-0 border-t border-zinc-800 px-3 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-zinc-800/50"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-amber-400" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-amber-400" aria-hidden />
        )}
        <Archive className="size-3.5 shrink-0 text-amber-400" aria-hidden />
        <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/90">
          Arşivlenen sohbetler
        </span>
        {archivedUnreadTotal > 0 ? (
          <span className="blink shrink-0 rounded-sm bg-lime-500 px-1.5 py-0.5 font-mono text-[9px] font-bold text-black">
            {archivedUnreadTotal > 99 ? '99+' : archivedUnreadTotal}
          </span>
        ) : null}
      </button>

      {open ? (
        <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto" role="listbox" aria-label="Arşivlenen sohbetler">
          {archivedChannels.map((ch) => {
            const active = ch.id === selectedChannelId
            const unread = channelUnreadById[ch.id] ?? 0
            return (
              <li key={`ch-${ch.id}`} className="flex items-stretch gap-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onSelectChannel(ch.id)}
                  className={[
                    'min-w-0 flex-1 flex items-center gap-2 rounded-md border-l-4 px-2 py-2 text-left transition',
                    active
                      ? 'border-amber-500 bg-zinc-800 text-amber-300'
                      : 'border-l-transparent text-zinc-500 hover:bg-zinc-800/70',
                  ].join(' ')}
                >
                  <Radio className="size-3 shrink-0 text-amber-500/70" aria-hidden />
                  <span
                    className={[
                      'min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide',
                      unread > 0 && !active ? 'blink text-lime-300' : '',
                    ].join(' ')}
                  >
                    {ch.name}
                  </span>
                  {unread > 0 ? (
                    <span className="shrink-0 rounded-sm bg-lime-500/25 px-1.5 py-0.5 font-mono text-[9px] font-bold text-lime-400">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  disabled={unarchivingChannelId === ch.id}
                  onClick={() => void onUnarchiveChannel(ch)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-lime-500/45 bg-lime-950/50 text-lime-400 transition hover:border-lime-400 hover:bg-lime-900/60 hover:text-lime-300 disabled:opacity-40"
                  aria-label={`${ch.name} kanalını arşivden çıkar`}
                  title="Arşivden çıkar"
                >
                  {unarchivingChannelId === ch.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <ArchiveRestore className="size-3.5" strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              </li>
            )
          })}

          {archivedContacts.map((contact) => {
            const active = contact.uid === selectedUid
            const unread = dmUnreadByPeerId[contact.uid] ?? 0
            const presence = presenceMap[contact.uid]
            return (
              <li key={`dm-${contact.uid}`} className="flex items-stretch gap-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onSelectContact(contact.uid)}
                  className={[
                    'min-w-0 flex-1 flex items-center gap-2 rounded-md border-l-4 px-2 py-2 text-left transition',
                    active
                      ? 'border-amber-500 bg-zinc-800 text-amber-300'
                      : 'border-l-transparent text-zinc-500 hover:bg-zinc-800/70',
                  ].join(' ')}
                >
                  <OperatorAvatar
                    uid={contact.uid}
                    size="sm"
                    callsign={contact.callsign}
                    username={contact.username}
                    photoUrl={contact.photoURL ?? undefined}
                    online={presence?.online}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={[
                        'block truncate text-xs font-semibold uppercase tracking-wide',
                        unread > 0 && !active ? 'blink text-lime-300' : '',
                      ].join(' ')}
                    >
                      {contact.callsign}
                    </span>
                    <PresenceIndicator
                      online={presence?.online ?? false}
                      label={presence?.label}
                      className="mt-0.5"
                    />
                  </span>
                  {unread > 0 ? (
                    <span className="shrink-0 rounded-sm bg-lime-500/25 px-1.5 py-0.5 font-mono text-[9px] font-bold text-lime-400">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  disabled={unarchivingDmUid === contact.uid}
                  onClick={() => void onUnarchiveContact(contact)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-lime-500/45 bg-lime-950/50 text-lime-400 transition hover:border-lime-400 hover:bg-lime-900/60 hover:text-lime-300 disabled:opacity-40"
                  aria-label={`${contact.callsign} sohbetini arşivden çıkar`}
                  title="Arşivden çıkar"
                >
                  {unarchivingDmUid === contact.uid ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <ArchiveRestore className="size-3.5" strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
