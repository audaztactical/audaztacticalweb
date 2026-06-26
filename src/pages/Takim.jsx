import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, Loader2, Shield, UsersRound } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import GroupJoinPanel from '../components/progress/GroupJoinPanel'
import OperatorGroupAcademicPortal from '../components/training/OperatorGroupAcademicPortal'
import { useAuth } from '../context/AuthContext'
import { useOperatorGroup } from '../hooks/useOperatorGroup'
import { fetchGroupById } from '../lib/firestoreGroups'
import { fetchUserProfile } from '../lib/firestoreUsers'

/** @typedef {{ uid: string; callsign: string; isSelf: boolean }} RosterRow */

const hudLabel =
  'font-mono-technical text-[9px] font-bold uppercase tracking-[0.24em] text-app-text/55'
const statValue =
  'font-mono-technical text-lg font-bold uppercase tracking-wide text-lime-400'
const goldLabel =
  'font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-amber-400/90'

/**
 * @param {string | undefined | null} uid
 * @param {{ callsign?: string; username?: string } | null | undefined} profile
 */
function displayCallsign(uid, profile) {
  const callsign = String(profile?.callsign ?? '').trim()
  if (callsign) return callsign
  const username = String(profile?.username ?? '').trim()
  if (username) return username
  return uid ? `${uid.slice(0, 8)}…` : '—'
}

export default function Takim() {
  const { user, refreshUserProfile } = useAuth()
  const { membership, isMember, loading: groupLoading, refresh } = useOperatorGroup()
  const uid = user?.uid ?? ''

  const [academicCategory, setAcademicCategory] = useState(/** @type {string | null} */ (null))
  const [roster, setRoster] = useState(/** @type {RosterRow[]} */ ([]))
  const [instructorCallsign, setInstructorCallsign] = useState('')
  const [memberCount, setMemberCount] = useState(0)
  const [rosterLoading, setRosterLoading] = useState(false)

  const handleJoined = useCallback(() => {
    void refreshUserProfile()
    void refresh()
  }, [refresh, refreshUserProfile])

  useEffect(() => {
    if (!isMember || !membership?.groupId) {
      setRoster([])
      setInstructorCallsign('')
      setMemberCount(0)
      setRosterLoading(false)
      return undefined
    }

    let cancelled = false
    setRosterLoading(true)

    ;(async () => {
      try {
        const group = await fetchGroupById(membership.groupId)
        if (cancelled) return

        if (!group) {
          setRoster([])
          setMemberCount(0)
          setInstructorCallsign('')
          return
        }

        setMemberCount(group.members.length)

        const instructorId = membership.instructorId || group.instructorId
        if (instructorId) {
          const instructorProfile = await fetchUserProfile(instructorId)
          if (!cancelled) {
            setInstructorCallsign(displayCallsign(instructorId, instructorProfile))
          }
        } else {
          setInstructorCallsign('—')
        }

        const rows = await Promise.all(
          group.members.map(async (memberUid) => {
            const profile = await fetchUserProfile(memberUid)
            return {
              uid: memberUid,
              callsign: displayCallsign(memberUid, profile),
              isSelf: memberUid === uid,
            }
          }),
        )

        if (!cancelled) {
          rows.sort((a, b) => {
            if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1
            return a.callsign.localeCompare(b.callsign, 'tr')
          })
          setRoster(rows)
        }
      } finally {
        if (!cancelled) setRosterLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isMember, membership?.groupId, membership?.instructorId, uid])

  const showMemberView = isMember && Boolean(membership?.groupId)
  const pageLoading = groupLoading || (showMemberView && rosterLoading && roster.length === 0)

  return (
    <PageShell
      title="Taktik Timim"
      subtitle="Taktik grup üyeliği, kadro ve eğitmen kayıtları — tek komuta özeti."
      headerAction={<UsersRound className="size-6 text-accent/50" strokeWidth={1.25} aria-hidden />}
    >
      {pageLoading ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-accent/70" aria-hidden />
          <p className={hudLabel}>Tim verisi senkronize ediliyor…</p>
        </div>
      ) : showMemberView ? (
        <div className="space-y-8">
          <section className="rounded-xl border border-emerald-900/35 bg-gradient-to-br from-emerald-950/25 to-black/40 p-5">
            <p className={goldLabel}>[ AKTİF TİM ]</p>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-[0.08em] text-app-text">
              {membership?.groupName || 'Taktik Grup'}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                <p className={hudLabel}>Eğitmen</p>
                <p className={`${statValue} mt-1 flex items-center gap-2 text-base`}>
                  <GraduationCap className="size-4 shrink-0 text-amber-400/80" aria-hidden />
                  {instructorCallsign || '—'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                <p className={hudLabel}>Kadro</p>
                <p className={`${statValue} mt-1 text-base`}>{memberCount} operatör</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                <p className={hudLabel}>Durum</p>
                <p className={`${statValue} mt-1 text-base text-emerald-400`}>AKTİF ÜYE</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800/90 bg-slate-950/60 p-4">
            <p className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-app-text/70">
              <Shield className="size-4 shrink-0 text-lime-400/80" strokeWidth={1.5} aria-hidden />
              KADRO LİSTESİ · {roster.length} KAYIT
            </p>
            {roster.length === 0 ? (
              <p className="py-6 text-center font-mono text-[10px] uppercase text-app-text/45">
                Kadro listesi yüklenemedi
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roster.map((row) => (
                  <li
                    key={row.uid}
                    className={[
                      'rounded-lg border px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wide',
                      row.isSelf
                        ? 'border-lime-500/40 bg-lime-950/20 text-lime-300'
                        : 'border-slate-800 bg-black/25 text-app-text/80',
                    ].join(' ')}
                  >
                    {row.callsign}
                    {row.isSelf ? (
                      <span className="ml-2 text-[9px] font-semibold text-lime-500/80">(siz)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-t border-white/10 pt-6">
            <OperatorGroupAcademicPortal
              embedded
              selectedCategory={academicCategory}
              onSelectedCategoryChange={setAcademicCategory}
              onBack={() => setAcademicCategory(null)}
            />
          </section>
        </div>
      ) : (
        <div className="mx-auto max-w-lg space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <p className={goldLabel}>[ TIM ATANMADI ]</p>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-app-text">
              Henüz bir taktik timin yok
            </h2>
            <p className="font-mono-technical text-xs leading-relaxed text-app-text/60">
              Eğitmeninizden aldığınız grup şifresiyle takıma katılın. Katılım sonrası grup eğitimi,
              kadro listesi ve eğitmen kayıtları bu sayfada görünür.
            </p>
          </div>
          <GroupJoinPanel onJoined={handleJoined} />
        </div>
      )}
    </PageShell>
  )
}
