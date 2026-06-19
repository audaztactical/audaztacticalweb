import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Radio } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { recordSystemAlertSeen } from '../../lib/firestoreSystemAlertReceipts'
import {
  acknowledgeSystemAlert,
  subscribePendingSystemAlerts,
} from '../../lib/firestoreSystemAlerts'

/** @typedef {import('../lib/firestoreSystemAlerts').SystemAlertRecord} SystemAlertRecord */

/**
 * Tam ekran zorunlu ikaz — onay olmadan kapatılamaz.
 */
function SystemAlertOverlay({
  alert,
  user,
  userData,
  onAcknowledged,
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setConfirmed(false)
    setError('')
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    if (user?.uid) {
      void recordSystemAlertSeen(alert.id, {
        uid: user.uid,
        email: user.email ?? userData?.email,
        displayName: user.displayName ?? userData?.username,
        callsign: userData?.callsign,
      })
    }

    return () => {
      document.body.style.overflow = prev
    }
  }, [alert.id, user?.uid, user?.email, user?.displayName, userData?.email, userData?.username, userData?.callsign])

  const handleAcknowledge = async () => {
    if (!confirmed || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await onAcknowledged(alert.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onay kaydedilemedi.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="system-alert-title"
      aria-describedby="system-alert-body"
    >
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        aria-hidden
      />
      <div
        className="system-alert-pulse relative z-10 w-full max-w-lg rounded-xl border-2 border-red-500/80 bg-[#0a0b0d] shadow-[0_0_60px_rgba(239,68,68,0.35)]"
      >
        <div className="border-b border-red-500/40 bg-red-950/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-red-400/60 bg-red-500/20">
              <AlertTriangle className="size-5 text-red-400" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.35em] text-red-400">
                Zorunlu sistem ikazı
              </p>
              <p className="text-[11px] text-app-text/50">{alert.source}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <h2
            id="system-alert-title"
            className="font-display text-lg font-bold uppercase tracking-wide text-red-300"
          >
            {alert.title}
          </h2>
          <p
            id="system-alert-body"
            className="whitespace-pre-wrap font-mono-technical text-sm leading-relaxed text-app-text/90"
          >
            {alert.message}
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/40 p-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 size-4 shrink-0 accent-red-500"
            />
            <span className="text-sm text-app-text/80">İkaz metnini okudum, anladım.</span>
          </label>

          {error ? (
            <p className="text-sm text-red-400" role="alert">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={!confirmed || submitting}
            onClick={() => void handleAcknowledge()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/60 bg-red-600/25 px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-red-200 transition hover:bg-red-600/40 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Radio className="size-4" aria-hidden />
            )}
            {submitting ? 'ONAY KAYDEDİLİYOR…' : 'OKUDUM — İKAZI ONAYLA VE KAPAT'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SystemAlertGate() {
  const { user, userData } = useAuth()
  const [pending, setPending] = useState(/** @type {SystemAlertRecord[]} */ ([]))

  useEffect(() => {
    if (!user?.uid) {
      setPending([])
      return undefined
    }

    return subscribePendingSystemAlerts(user.uid, setPending)
  }, [user?.uid])

  const handleAcknowledged = useCallback(
    async (alertId) => {
      if (!user?.uid) return
      await acknowledgeSystemAlert(user.uid, alertId, {
        email: user.email ?? userData?.email,
        displayName: user.displayName ?? userData?.username,
        callsign: userData?.callsign,
      })
    },
    [user, userData],
  )

  const current = pending[0]
  if (!current) return null

  return (
    <SystemAlertOverlay
      alert={current}
      user={user}
      userData={userData}
      onAcknowledged={handleAcknowledged}
    />
  )
}
