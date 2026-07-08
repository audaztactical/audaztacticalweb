import { useEffect, useMemo, useState } from 'react'
import { Loader2, Radio, UserMinus, Users, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import OperatorAvatar from '../ui/OperatorAvatar'
import PresenceIndicator from '../ui/PresenceIndicator'
import TacticalAlert from './TacticalAlert'
import { useOperatorsPresenceMap } from '../../hooks/useOperatorsPresenceMap'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { messagesRoleLabel } from '../../lib/messagesDisplayText'
import {
  fetchMuhabereChannel,
  fetchMuhabereOperatorProfile,
} from '../../lib/firestoreTaktikMuhabere'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereChannel} MuhabereChannel */
/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereContact} MuhabereContact */

/**
 * @typedef {{
 *   uid: string
 *   callsign: string
 *   username: string
 *   role: string
 *   isSelf?: boolean
 *   isCreator?: boolean
 *   isInactive?: boolean
 * }} ChannelMemberRow
 */

/**
 * @param {{
 *   open: boolean
 *   channel: MuhabereChannel | null
 *   uid: string
 *   selfCallsign: string
 *   contacts: MuhabereContact[]
 *   isCreator: boolean
 *   removingMemberUid: string | null
 *   onClose: () => void
 *   onOpenProfile: (uid: string) => void
 *   onRemoveMember: (memberUid: string) => void | Promise<void>
 * }} props
 */
export default function MuhabereChannelMembersModal({
  open,
  channel,
  uid,
  selfCallsign,
  contacts,
  isCreator,
  removingMemberUid,
  onClose,
  onOpenProfile,
  onRemoveMember,
}) {
  const { t } = useTranslation('messages')
  const [liveChannel, setLiveChannel] = useState(/** @type {MuhabereChannel | null} */ (null))
  const [rows, setRows] = useState(/** @type {ChannelMemberRow[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(/** @type {ChannelMemberRow | null} */ (null))

  const contactByUid = useMemo(() => new Map(contacts.map((c) => [c.uid, c])), [contacts])
  const rosterUidSet = useMemo(() => new Set(contacts.map((c) => c.uid)), [contacts])

  const displayChannel = liveChannel ?? channel

  const memberUids = useMemo(() => rows.map((row) => row.uid), [rows])
  const presenceMap = useOperatorsPresenceMap(memberUids)

  useEffect(() => {
    if (!open || !channel) {
      setLiveChannel(null)
      setRows([])
      return undefined
    }

    let active = true

    const load = async () => {
      setLoading(true)
      try {
        const fresh = await fetchMuhabereChannel(channel.id)
        if (!active) return
        const resolvedChannel = fresh ?? channel
        setLiveChannel(resolvedChannel)

        const memberUids = [
          ...new Set(resolvedChannel.members.map((id) => String(id).trim()).filter(Boolean)),
        ]

        const resolved = await Promise.all(
          memberUids.map(async (memberUid) => {
            const contact = contactByUid.get(memberUid)
            const inRoster = rosterUidSet.has(memberUid) || memberUid === uid

            if (contact) {
              return {
                uid: memberUid,
                callsign: contact.callsign,
                username: contact.username,
                role: contact.role,
                isSelf: memberUid === uid,
                isCreator: memberUid === resolvedChannel.createdBy,
                isInactive: !inRoster,
              }
            }

            if (memberUid === uid) {
              return {
                uid: memberUid,
                callsign: selfCallsign || t('members.selfFallback'),
                username: '',
                role: 'operator',
                isSelf: true,
                isCreator: memberUid === resolvedChannel.createdBy,
                isInactive: false,
              }
            }

            const profile = await fetchMuhabereOperatorProfile(memberUid)
            return {
              uid: memberUid,
              callsign: profile?.callsign ?? memberUid.slice(0, 8),
              username: profile?.username ?? '',
              role: profile?.role ?? 'operator',
              isSelf: false,
              isCreator: memberUid === resolvedChannel.createdBy,
              isInactive: !inRoster,
            }
          }),
        )

        if (!active) return
        resolved.sort((a, b) => {
          if (a.isSelf) return -1
          if (b.isSelf) return 1
          if (a.isCreator) return -1
          if (b.isCreator) return 1
          if (a.isInactive !== b.isInactive) return a.isInactive ? 1 : -1
          return a.callsign.localeCompare(b.callsign, 'tr')
        })
        setRows(resolved)
      } catch (err) {
        if (active) {
          emitFirebaseError(err)
          setLiveChannel(null)
          setRows([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [open, channel, contactByUid, rosterUidSet, uid, selfCallsign, t])

  if (!open || !channel) return null

  const activeCount = rows.filter((m) => !m.isInactive).length
  const busyRemove = Boolean(removingMemberUid)

  return (
    <>
      <div
        className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-4 font-mono backdrop-blur-sm"
        role="presentation"
        onClick={busyRemove ? undefined : onClose}
      >
        <div
          className="w-full max-w-md rounded-md border border-lime-500/40 bg-zinc-950 shadow-2xl"
          role="dialog"
          aria-labelledby="channel-members-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="min-w-0">
              <h2
                id="channel-members-title"
                className="truncate text-xs font-bold uppercase tracking-[0.2em] text-lime-400"
              >
                {t('members.title')}
              </h2>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-zinc-500">
                {t('members.subtitle', {
                  name: displayChannel?.name ?? channel.name,
                  total: rows.length,
                  active: activeCount,
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busyRemove}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
              aria-label={t('common.close')}
            >
              <X className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </header>

          <div className="px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-zinc-500">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span className="text-xs">{t('members.loading')}</span>
              </div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-600">{t('members.empty')}</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900/50 p-2">
                {rows.map((member) => {
                  const canRemove = isCreator && !member.isSelf
                  const removing = removingMemberUid === member.uid
                  const presence = presenceMap[member.uid]

                  return (
                    <li key={member.uid} className="flex items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(member.uid)}
                        className={[
                          'flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-zinc-800/80',
                          member.isInactive ? 'opacity-70' : '',
                        ].join(' ')}
                      >
                        <OperatorAvatar
                          uid={member.uid}
                          size="sm"
                          callsign={member.callsign}
                          username={member.username}
                          photoUrl={contactByUid.get(member.uid)?.photoURL ?? undefined}
                          online={presence?.online}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-200">
                            {member.callsign}
                            {member.isSelf ? (
                              <span className="ml-1.5 text-[9px] font-bold text-lime-400">{t('members.you')}</span>
                            ) : null}
                          </p>
                          <p className="flex flex-wrap items-center gap-x-1.5 text-[9px] uppercase tracking-wider text-zinc-500">
                            {!member.isInactive ? (
                              <PresenceIndicator
                                online={presence?.online ?? false}
                                label={presence?.label}
                              />
                            ) : null}
                            {!member.isInactive ? <span aria-hidden>·</span> : null}
                            <span className="line-clamp-2">
                              {member.isCreator ? t('members.creator') : ''}
                              {messagesRoleLabel(member.role)}
                              {member.isInactive ? ` · ${t('members.notInRoster')}` : ''}
                            </span>
                          </p>
                        </div>
                      </button>

                      {canRemove ? (
                        <button
                          type="button"
                          disabled={busyRemove}
                          onClick={() => setRemoveTarget(member)}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-red-500/45 bg-red-950/50 text-red-400 transition hover:border-red-400 hover:bg-red-900/60 hover:text-red-300 disabled:opacity-40"
                          aria-label={t('members.removeAria', { callsign: member.callsign })}
                          title={t('members.removeTitle')}
                        >
                          {removing ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <UserMinus className="size-3.5" strokeWidth={2.25} aria-hidden />
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex size-8 shrink-0 items-center justify-center text-zinc-700">
                          <Users className="size-3" aria-hidden />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="mt-3 flex items-start gap-2 text-[9px] leading-relaxed text-zinc-600">
              <Radio className="mt-0.5 size-3 shrink-0 text-lime-500/60" aria-hidden />
              {t('members.footnote')}
            </p>
          </div>
        </div>
      </div>

      <TacticalAlert
        open={Boolean(removeTarget)}
        title={t('alerts.removeMember.title')}
        message={
          removeTarget?.isInactive
            ? t('alerts.removeMember.messageInactive', { callsign: removeTarget.callsign })
            : t('alerts.removeMember.messageActive', {
                callsign: removeTarget?.callsign ?? t('alerts.removeMember.memberFallback'),
              })
        }
        confirmLabel={t('alerts.removeMember.confirm')}
        cancelLabel={t('alerts.cancel')}
        busy={busyRemove}
        onConfirm={() => {
          if (!removeTarget) return
          void onRemoveMember(removeTarget.uid).then(() => setRemoveTarget(null))
        }}
        onCancel={() => {
          if (busyRemove) return
          setRemoveTarget(null)
        }}
      />
    </>
  )
}
