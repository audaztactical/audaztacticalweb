import { useEffect, useState } from 'react'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import OperatorAvatar from '../components/ui/OperatorAvatar'
import PageShell from '../components/layout/PageShell'
import { useAuth } from '../context/AuthContext'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import { fetchForumAuthorProfile, formatForumRoleLabel } from '../lib/firestoreForum'

/** @typedef {import('../lib/firestoreForum').ForumAuthorProfile} ForumAuthorProfile */

export default function OperatorProfile() {
  const { operatorUid } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(/** @type {ForumAuthorProfile | null} */ (null))
  const [loading, setLoading] = useState(true)

  const uid = String(operatorUid ?? '').trim()
  const isSelf = !!user?.uid && user.uid === uid

  useEffect(() => {
    if (!uid) {
      setProfile(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        const row = await fetchForumAuthorProfile(uid)
        if (!cancelled) setProfile(row)
      } catch (err) {
        if (!cancelled) emitFirebaseError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [uid])

  return (
    <PageShell
      title="Operatör Sicili"
      subtitle="Brifing Odası üzerinden açılan operatör profil özeti."
    >
      <Link
        to="/forum"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition hover:text-amber-400"
      >
        <ChevronLeft className="size-3.5" strokeWidth={2} aria-hidden />
        [ &lt; BRİFİNG ODASINA DÖN ]
      </Link>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 font-mono text-xs text-zinc-500">
          <Loader2 className="size-4 animate-spin text-amber-500/60" aria-hidden />
          Sicil dosyası yükleniyor…
        </div>
      ) : !profile ? (
        <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-xs text-red-300">
          Operatör profili bulunamadı.
        </p>
      ) : (
        <article className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <OperatorAvatar
              uid={profile.uid}
              callsign={profile.callsign}
              username={profile.username}
              photoUrl={profile.photoURL}
              size="lg"
            />
            <div>
              <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-lime-400">
                {profile.callsign}
              </h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-500/90">
                {formatForumRoleLabel(profile.role)}
                <span className="mx-1.5 text-zinc-600">·</span>
                <span className="text-zinc-400">{profile.rank}</span>
              </p>
              {profile.username ? (
                <p className="mt-2 font-mono text-xs text-zinc-500">@{profile.username}</p>
              ) : null}
            </div>
          </div>

          {isSelf ? (
            <Link
              to="/profil"
              className="mt-6 inline-flex rounded border border-amber-500/40 bg-amber-950/20 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400 transition hover:border-amber-500 hover:bg-amber-950/40"
            >
              [ KENDİ DOSSIER&apos;IME GİT ]
            </Link>
          ) : null}
        </article>
      )}
    </PageShell>
  )
}
