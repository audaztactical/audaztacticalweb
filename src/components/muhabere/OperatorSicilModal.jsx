import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import OperatorAvatar from '../ui/OperatorAvatar'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { fetchMuhabereOperatorProfile } from '../../lib/firestoreTaktikMuhabere'
import { timestampToMs } from '../../lib/firestoreSnapshot'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereOperatorProfile} MuhabereOperatorProfile */

/**
 * @param {unknown} ts
 */
function formatEnrolled(ts) {
  const ms = timestampToMs(ts)
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * @param {string} role
 */
function roleLabel(role) {
  if (role === 'instructor') return 'Eğitmen'
  if (role === 'premium_member') return 'Premium Operatör'
  if (role === 'member' || role === 'operator') return 'Operatör'
  return role || '—'
}

/**
 * @param {{
 *   open: boolean
 *   operatorUid: string | null
 *   onClose: () => void
 * }} props
 */
export default function OperatorSicilModal({ open, operatorUid, onClose }) {
  const [profile, setProfile] = useState(/** @type {MuhabereOperatorProfile | null} */ (null))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !operatorUid) {
      setProfile(null)
      return undefined
    }

    let active = true
    setLoading(true)
    fetchMuhabereOperatorProfile(operatorUid)
      .then((row) => {
        if (active) setProfile(row)
      })
      .catch((err) => {
        if (active) {
          emitFirebaseError(err)
          setProfile(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [open, operatorUid])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="operator-sicil-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <p
            id="operator-sicil-title"
            className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500"
          >
            Operatör dosyası
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Kapat"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
            <Loader2 className="size-5 animate-spin text-lime-400/80" aria-hidden />
            <span className="text-xs">Dosya yükleniyor…</span>
          </div>
        ) : !profile ? (
          <p className="px-4 py-16 text-center text-xs text-zinc-600">Profil bulunamadı.</p>
        ) : (
          <div className="px-6 py-6 text-center">
            <OperatorAvatar
              uid={profile.uid}
              size="lg"
              callsign={profile.callsign}
              username={profile.username}
              displayName={profile.callsign}
              photoUrl={profile.photoURL ?? undefined}
              className="mx-auto"
            />
            <h2 className="mt-4 font-mono text-xl font-semibold uppercase tracking-wide text-lime-400">
              {profile.callsign}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">{roleLabel(profile.role)}</p>

            <dl className="mt-6 space-y-2 border-t border-zinc-800 pt-4 text-left text-sm">
              {profile.username ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Kullanıcı adı</dt>
                  <dd className="text-zinc-300">@{profile.username}</dd>
                </div>
              ) : null}
              {profile.email ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">E-posta</dt>
                  <dd className="truncate text-zinc-300">{profile.email}</dd>
                </div>
              ) : null}
              {profile.status ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Durum</dt>
                  <dd className="text-zinc-300">{profile.status}</dd>
                </div>
              ) : null}
              {profile.bloodType ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Kan grubu</dt>
                  <dd className="text-zinc-300">{profile.bloodType}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Katılım</dt>
                <dd className="text-zinc-300">{formatEnrolled(profile.enrolledAt)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
