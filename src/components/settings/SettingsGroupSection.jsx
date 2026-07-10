import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, LogOut, Users } from 'lucide-react'
import GroupJoinPanel from '../progress/GroupJoinPanel'
import { useAuth } from '../../context/AuthContext'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'
import { fetchGroupById, leaveTacticalGroup } from '../../lib/firestoreGroups'
import { fetchUserProfile } from '../../lib/firestoreUsers'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'

/**
 * Ayarlar · [ TAKTİK TİM ] — gruba katılım veya aktif tim özeti.
 */
export default function SettingsGroupSection() {
  const { t } = useTranslation('progress')
  const { user, refreshUserProfile } = useAuth()
  const { membership, isMember, loading, refresh } = useOperatorGroup()
  const [memberCount, setMemberCount] = useState(0)
  const [instructorCallsign, setInstructorCallsign] = useState('—')
  const [detailLoading, setDetailLoading] = useState(false)
  const [leaveBusy, setLeaveBusy] = useState(false)
  const [leaveMsg, setLeaveMsg] = useState('')
  const [leaveSuccess, setLeaveSuccess] = useState(false)

  const loadGroupDetails = useCallback(async () => {
    if (!membership?.groupId) {
      setMemberCount(0)
      setInstructorCallsign('—')
      return
    }

    setDetailLoading(true)
    try {
      const group = await fetchGroupById(membership.groupId)
      setMemberCount(group?.members?.length ?? 0)

      if (membership.instructorId) {
        const instructor = await fetchUserProfile(membership.instructorId)
        setInstructorCallsign(instructor?.callsign?.trim() || instructor?.username?.trim() || 'EĞİTMEN')
      } else {
        setInstructorCallsign('—')
      }
    } catch (err) {
      emitFirebaseError(err)
    } finally {
      setDetailLoading(false)
    }
  }, [membership?.groupId, membership?.instructorId])

  useEffect(() => {
    if (isMember && membership?.groupId) {
      void loadGroupDetails()
    }
  }, [isMember, membership?.groupId, loadGroupDetails])

  const handleJoined = useCallback(async () => {
    if (typeof refreshUserProfile === 'function') {
      await refreshUserProfile()
    }
    await refresh()
  }, [refresh, refreshUserProfile])

  const handleLeave = async () => {
    if (!user?.uid || !membership?.groupId || leaveBusy) return

    const confirmed = window.confirm(t('groupLeave.confirm'))
    if (!confirmed) return

    setLeaveBusy(true)
    setLeaveMsg('')
    setLeaveSuccess(false)
    try {
      await leaveTacticalGroup(user.uid)
      setLeaveSuccess(true)
      setLeaveMsg(t('groupLeave.success'))
      if (typeof refreshUserProfile === 'function') {
        await refreshUserProfile()
      }
      await refresh()
    } catch (err) {
      emitFirebaseError(err)
      setLeaveMsg(err instanceof Error ? err.message : t('groupLeave.failed'))
    } finally {
      setLeaveBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[120px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-emerald-400/70" aria-hidden />
        <span className="sr-only">Grup bilgisi yükleniyor</span>
      </div>
    )
  }

  if (!isMember || !membership?.groupId) {
    return <GroupJoinPanel bare onJoined={handleJoined} />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-emerald-900/35 bg-emerald-950/20 px-4 py-3">
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400/70">
            Grup
          </p>
          <p className="mt-1 font-mono-technical text-sm font-bold uppercase tracking-wider text-app-text">
            {membership.groupName || membership.groupId}
          </p>
        </div>
        <div className="rounded border border-emerald-900/35 bg-emerald-950/20 px-4 py-3">
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400/70">
            Eğitmen
          </p>
          <p className="mt-1 font-mono-technical text-sm font-bold uppercase tracking-wider text-app-text">
            {detailLoading ? '…' : instructorCallsign}
          </p>
        </div>
        <div className="rounded border border-emerald-900/35 bg-emerald-950/20 px-4 py-3">
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400/70">
            Kadro
          </p>
          <p className="mt-1 font-mono-technical text-sm font-bold tabular-nums tracking-wider text-app-text">
            {detailLoading ? '…' : `${memberCount} OPERATÖR`}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={leaveBusy}
        onClick={() => void handleLeave()}
        className="inline-flex w-full items-center justify-center gap-2 rounded border border-red-500/40 bg-red-950/30 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-red-300 transition hover:border-red-400/60 hover:bg-red-950/45 disabled:opacity-50 sm:w-auto"
      >
        {leaveBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" strokeWidth={1.75} aria-hidden />}
        Gruptan Ayrıl
      </button>

      {leaveMsg ? (
        <p
          className={[
            'font-mono-technical text-[10px] font-bold uppercase leading-relaxed',
            leaveSuccess ? 'text-emerald-400' : 'text-red-400',
          ].join(' ')}
        >
          {leaveMsg}
        </p>
      ) : (
        <p className="flex items-center gap-2 font-mono-technical text-[9px] uppercase tracking-wide text-app-text/45">
          <Users className="size-3.5 text-emerald-500/70" strokeWidth={1.5} aria-hidden />
          Aktif tim üyeliği · grup eğitimi ve akademik kayıtlar bu gruba bağlıdır
        </p>
      )}
    </div>
  )
}
