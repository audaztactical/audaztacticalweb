import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { Camera, KeyRound, Link2, Phone, Shield } from 'lucide-react'
import HudFluffDecor from '../components/dashboard/HudFluffDecor'
import AmberAlert from '../components/common/AmberAlert'
import TacticalUploadProgress from '../components/common/TacticalUploadProgress'
import OperatorAvatar from '../components/ui/OperatorAvatar'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useFirebaseErrorReporter } from '../context/FirebaseErrorContext'
import { useAudazData } from '../hooks/useAudazData'
import { useStorage } from '../hooks/useStorage'
import { auth } from '../lib/firebase'
import { buildSystemLogEntries } from '../lib/dashboardHudData'
import { computeORS } from '../lib/orsEngine'
import { filterObservedEvalLogs } from '../lib/observedEvalRegistry'
import { updateUserBloodType, updateUserCallsign, updateUserAvatarUrl, createOperatorProfile, repairPendingOperatorProfile, normalizeUsername } from '../lib/firestoreUsers'
import { readPendingOperatorProfile } from '../lib/pendingOperatorProfile'
import { userStoragePath } from '../services/storageService'

import { getAccentColor } from '../lib/themeColors'

const TACTIC_AMBER = '#f59e0b'
const COMBAT_RED = '#FF0000'

const BLOOD_OPTIONS = ['BELİRTİLMEDİ', '0 RH+', '0 RH-', 'A RH+', 'A RH-', 'B RH+', 'B RH-', 'AB RH+', 'AB RH-']

/** @param {number} ms */
function fmtActivityTs(ms) {
  try {
    return new Date(ms).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '—'
  }
}

/** @param {{ code: string, msg: string }} e */
function humanizeActivity(e) {
  const { code, msg } = e
  if (code === 'CEP_GNC') {
    return `Cephanelik güncellendi · ${msg.slice(0, 48)}`
  }
  if (code === 'CEP') {
    const tail = msg.replace(/^[\s\S]*·\s*/, '').trim() || 'kayıt'
    return `Envanter güncellendi · ${tail.slice(0, 42)}`
  }
  if (code === 'SHT') {
    if (msg.includes('Saha kaydı') || msg.includes('Bölge')) return `TCCC saha kaydı · ${msg.slice(0, 48)}`
    const tail = msg.replace(/^Tıbbi kayıt · /, '').trim() || 'kayıt'
    return `TCCC kaydı girildi · ${tail.slice(0, 42)}`
  }
  if (code === 'EĞT') {
    const tail = msg.replace(/^Tatbikat · /, '').trim() || '—'
    return `Eğitim / tatbikat · ${tail.slice(0, 42)}`
  }
  if (code === 'OPS') {
    const tail = msg.replace(/^Görev · /, '').trim() || '—'
    return `Görev senkronu · ${tail.slice(0, 42)}`
  }
  if (code === 'GÜV') return 'Sisteme giriş · oturum aktif'
  return msg.slice(0, 52)
}

function formatEnrolled(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  try {
    return ts.toDate().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/** @param {import('firebase/auth').User | null} u */
function hasPasswordProvider(u) {
  return Boolean(u?.providerData?.some((p) => p.providerId === 'password'))
}

/** @param {import('firebase/auth').User | null} u */
function hasGoogleProvider(u) {
  return Boolean(u?.providerData?.some((p) => p.providerId === 'google.com'))
}

/** @param {number | null} score */
function ohpAccent(score) {
  if (score == null)
    return {
      rgb: TACTIC_AMBER,
      sweepMid: 'rgba(245,158,11,0.12)',
      ring: 'rgba(245,158,11,0.35)',
    }
  if (score >= 85) {
    const accent = getAccentColor()
    return {
      rgb: accent,
      sweepMid: `color-mix(in srgb, ${accent} 14%, transparent)`,
      ring: `color-mix(in srgb, ${accent} 45%, transparent)`,
    }
  }
  if (score >= 50)
    return {
      rgb: TACTIC_AMBER,
      sweepMid: 'rgba(245,158,11,0.14)',
      ring: 'rgba(245,158,11,0.5)',
    }
  return {
    rgb: COMBAT_RED,
    sweepMid: 'rgba(255,0,0,0.15)',
    ring: 'rgba(255,0,0,0.55)',
  }
}

/** @param {unknown} role */
function roleLabel(role) {
  const r = String(role || 'operator').toLowerCase()
  if (r === 'admin') return 'YÖNETİCİ'
  if (r === 'commander' || r === 'komutan') return 'KOMUTAN'
  if (r === 'operator') return 'OPERATÖR'
  return String(role || 'OPERATÖR').toUpperCase()
}

function DataLoadingScreen() {
  return (
    <div className="dashboard-hud-shell relative mx-auto flex min-h-[50vh] max-w-[1480px] flex-col items-center justify-center gap-3 px-5 py-5 pt-12 sm:px-6 sm:pt-14 md:px-8">
      <div
        className="relative h-11 w-full max-w-md overflow-hidden rounded-lg border border-[#004DFF]/35 bg-[#2A2D34]/60 px-4 backdrop-blur-md"
        role="status"
        aria-live="polite"
      >
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono-technical text-[10px] uppercase tracking-widest text-[#004DFF]/90">
          Profil yükleniyor
        </span>
        <span
          className="absolute right-3 top-1/2 inline-block size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-[#004DFF] border-t-transparent"
          aria-hidden
        />
      </div>
      <p className="font-mono-technical text-[10px] font-semibold tracking-[0.3em] text-app-text/55">Kimlik verisi yükleniyor</p>
    </div>
  )
}

function TechLine({ k, v, accentRgb }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-white/[0.06] py-1.5 last:border-0">
      <dt className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">{k}</dt>
      <dd
        className="max-w-[min(100%,14rem)] truncate text-right font-mono-technical text-[10px] text-app-text"
        style={{ textShadow: `0 0 10px ${accentRgb}33` }}
      >
        {v}
      </dd>
    </div>
  )
}

function DossierField({ label, children }) {
  return (
    <label className="block">
      <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-app-text/55">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  )
}

/** @param {{ children: import('react').ReactNode }} props */
function TerminalTitle({ children }) {
  return (
    <div className="op-terminal-title-wrap">
      <h2 className="op-terminal-title">{children}</h2>
      <span className="op-terminal-scanner" aria-hidden />
    </div>
  )
}

/**
 * @param {{
 *   title: string
 *   code?: string
 *   children: import('react').ReactNode
 *   className?: string
 *   wide?: boolean
 * }} props
 */
function OpTacticalCard({ title, code, children, className = '', wide = false }) {
  return (
    <section className={['op-terminal-card', wide ? 'md:col-span-2' : '', className].filter(Boolean).join(' ')}>
      <header className="op-terminal-card__head">
        <TerminalTitle>{title}</TerminalTitle>
        {code ? <span className="op-terminal-card__code">{code}</span> : null}
      </header>
      <div className="op-terminal-card__body">{children}</div>
    </section>
  )
}

/**
 * @param {{ label: string, value: string | number, accentRgb: string, fillPct?: number }} props
 */
function DataStat({ label, value, accentRgb, fillPct = 50 }) {
  return (
    <div className="op-data-stat group">
      <div className="op-data-stat__frame">
        <p className="op-data-stat__label">{label}</p>
        <p className="op-data-stat__value" style={{ color: accentRgb, textShadow: `0 0 10px ${accentRgb}44` }}>
          {value}
        </p>
        <div className="op-data-stat__bar-track" aria-hidden>
          <div
            className="op-data-stat__bar-fill"
            style={{
              // @ts-expect-error CSS custom properties
              '--stat-accent': accentRgb,
              '--stat-fill': `${Math.min(100, Math.max(8, fillPct))}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

/** @param {number | string} n */
function statFillPct(n, max) {
  if (typeof n !== 'number' || max <= 0) return 12
  return Math.round((n / max) * 100)
}

export default function Profile() {
  const { user, userData, profileLoading, refreshUserProfile, linkAccountWithPassword, isAdmin, showAdminPanel } = useAuth()
  const showPricingLink = showAdminPanel || isAdmin
  const { themeClass } = useTheme()
  const { reportFirebaseError } = useFirebaseErrorReporter()
  const [authProvidersTick, setAuthProvidersTick] = useState(0)
  const [sessionOpenedMs] = useState(() => Date.now())
  const m = useAudazData('missions')
  const t = useAudazData('trainings')
  const inv = useAudazData('inventory')
  const h = useAudazData('health_records')
  const rangeLogs = useAudazData('range_logs')
  const vbssLogs = useAudazData('vbss_logs')
  const tcccLogs = useAudazData('tccc_logs')

  const observedEvalLogs = useMemo(
    () => filterObservedEvalLogs([...vbssLogs.items, ...tcccLogs.items]),
    [vbssLogs.items, tcccLogs.items],
  )

  const [orsClock, setOrsClock] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setOrsClock((c) => c + 1), 30000)
    return () => window.clearInterval(id)
  }, [])

  const orsResult = useMemo(() => {
    void orsClock
    if (!m.ready || !t.ready || !inv.ready || !h.ready || !rangeLogs.ready || !vbssLogs.ready || !tcccLogs.ready) return null
    return computeORS({
      inventory: inv.items,
      trainings: t.items,
      health: h.items,
      rangeLogs: rangeLogs.items,
      observedEvalLogs,
      nowMs: Date.now(),
    })
  }, [
    m.ready,
    t.ready,
    inv.ready,
    h.ready,
    rangeLogs.ready,
    vbssLogs.ready,
    tcccLogs.ready,
    m.items,
    t.items,
    inv.items,
    h.items,
    rangeLogs.items,
    observedEvalLogs,
    orsClock,
  ])

  const ohpScore = orsResult?.score ?? null
  const accent = useMemo(() => ohpAccent(ohpScore), [ohpScore, themeClass])

  const incidentCount = useMemo(
    () => h.items.filter((row) => String(row?.kind ?? '') === 'incident').length,
    [h.items]
  )

  const activityTop3 = useMemo(() => {
    const raw = buildSystemLogEntries({
      missions: m.items,
      trainings: t.items,
      inventory: inv.items,
      health: h.items,
      sessionOpenMs: sessionOpenedMs,
    })
    const sorted = [...raw].sort((a, b) => b.ms - a.ms)
    return sorted.slice(0, 3).map((e) => ({
      ms: e.ms,
      line: humanizeActivity(e),
    }))
  }, [m.items, t.items, inv.items, h.items, sessionOpenedMs])

  const [callsignDraft, setCallsignDraft] = useState('')
  const [callsignSaving, setCallsignSaving] = useState(false)
  const [callsignMsg, setCallsignMsg] = useState(null)

  const [bloodDraft, setBloodDraft] = useState('BELİRTİLMEDİ')
  const [bloodSaving, setBloodSaving] = useState(false)
  const [bloodMsg, setBloodMsg] = useState(null)

  const [linkPass, setLinkPass] = useState('')
  const [linkConfirm, setLinkConfirm] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState('')

  const [newPass, setNewPass] = useState('')
  const [newPassConfirm, setNewPassConfirm] = useState('')
  const [currentPassForChange, setCurrentPassForChange] = useState('')
  const [changeBusy, setChangeBusy] = useState(false)
  const [changeError, setChangeError] = useState('')
  const [securityOpen, setSecurityOpen] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState(null)
  const [profileRepairBusy, setProfileRepairBusy] = useState(false)
  const [profileRepairMsg, setProfileRepairMsg] = useState(null)
  const [profileRepairUsername, setProfileRepairUsername] = useState('')
  const avatarInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const {
    replace: replaceAvatar,
    loading: avatarUploading,
    progress: avatarProgress,
    error: avatarUploadError,
    reset: resetAvatarUpload,
  } = useStorage()

  useEffect(() => {
    if (!user?.uid) return
    const pending = readPendingOperatorProfile()
    if (pending?.username) setProfileRepairUsername(pending.username)
    void (async () => {
      const ok = await repairPendingOperatorProfile(user.uid)
      if (ok) await refreshUserProfile()
    })()
  }, [user?.uid, refreshUserProfile])

  const completeOperatorProfile = async () => {
    if (!user?.uid) return
    const key = normalizeUsername(profileRepairUsername)
    if (!key) {
      setProfileRepairMsg({ type: 'err', text: 'Kayıt sırasında seçtiğiniz kullanıcı adını girin.' })
      return
    }
    setProfileRepairBusy(true)
    setProfileRepairMsg(null)
    try {
      await createOperatorProfile(user.uid, {
        email: user.email ?? '',
        username: key,
        callsign: (callsignDraft || user.displayName || 'Operatör').trim(),
        bloodType: '',
        status: 'Beta',
        role: 'member',
        accountStatus: 'active',
      })
      await refreshUserProfile()
      setProfileRepairMsg({ type: 'ok', text: 'Profil tamamlandı — sayfa yenileniyor.' })
    } catch (err) {
      reportFirebaseError(err)
      setProfileRepairMsg({
        type: 'err',
        text:
          err?.code === 'username-already-in-use'
            ? 'Bu kullanıcı adı başka bir hesapta. Farklı bir ad deneyin veya destek ile iletişime geçin.'
            : typeof err?.message === 'string'
              ? err.message
              : 'Profil tamamlanamadı.',
      })
    } finally {
      setProfileRepairBusy(false)
    }
  }

  useEffect(() => {
    if (!userData?.callsign && !user?.displayName) {
      setCallsignDraft('')
      return
    }
    const base = (userData?.callsign || user?.displayName || '').trim()
    setCallsignDraft(base)
  }, [userData?.callsign, user?.displayName])

  const bloodOptions = useMemo(() => {
    const bt = (userData?.bloodType || '').trim()
    const base = [...BLOOD_OPTIONS]
    if (bt && !base.includes(bt) && bt !== 'GUEST') base.push(bt)
    return base
  }, [userData?.bloodType])

  useEffect(() => {
    const bt = (userData?.bloodType || '').trim()
    if (!bt || bt === 'GUEST') {
      setBloodDraft('BELİRTİLMEDİ')
      return
    }
    setBloodDraft(bt)
  }, [userData?.bloodType])

  const email = userData?.email || user?.email || ''
  const callsign = userData?.callsign ?? user?.displayName ?? '—'
  const rawUsername = (userData?.username || '').trim()
  const status = userData?.status ?? 'GUEST'
  const enrolled = formatEnrolled(userData?.enrolledAt)
  const photoUrl = (user?.photoURL || userData?.photoURL || '').trim()

  const sessionUser = auth?.currentUser ?? user
  void authProvidersTick
  const pwdLinked = hasPasswordProvider(sessionUser)
  const googleLinked = hasGoogleProvider(sessionUser)

  const inputTactical =
    'w-full border-0 border-b border-white/20 bg-transparent py-1.5 font-mono-technical text-[13px] text-slate-100 outline-none ring-0 transition placeholder:text-app-text/45 focus:border-b'

  const secPanelClass = 'rounded-md border border-[#004DFF]/28 bg-[#2A2D34]/88'

  const handleAvatarPick = () => {
    resetAvatarUpload()
    setAvatarMsg(null)
    avatarInputRef.current?.click()
  }

  const handleAvatarFile = async (/** @type {import('react').ChangeEvent<HTMLInputElement>} */ e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.uid || !auth?.currentUser) return

    if (!file.type.startsWith('image/')) {
      setAvatarMsg({ type: 'err', text: 'Yalnızca görsel dosyaları desteklenir.' })
      return
    }

    setAvatarMsg(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
      const fileName = `avatar_${Date.now()}.${safeExt}`
      const url = await replaceAvatar(file, photoUrl || null, userStoragePath(user.uid), fileName)
      await updateProfile(auth.currentUser, { photoURL: url })
      await updateUserAvatarUrl(user.uid, url)
      await auth.currentUser.reload()
      await refreshUserProfile()
      setAvatarMsg({ type: 'ok', text: '✓ GÖRSEL SENKRONLANDI' })
    } catch (err) {
      reportFirebaseError(err)
      setAvatarMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Yükleme başarısız.',
      })
    }
  }

  const saveCallsign = async () => {
    if (!auth?.currentUser || !user?.uid) return
    const trimmed = callsignDraft.trim()
    if (!trimmed) {
      setCallsignMsg({ type: 'err', text: 'Kod adı boş olamaz.' })
      return
    }
    setCallsignSaving(true)
    setCallsignMsg(null)
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed })
      await updateUserCallsign(user.uid, trimmed)
      await refreshUserProfile()
      setCallsignMsg({ type: 'ok', text: '✓ GÜNCELLENDİ' })
    } catch (err) {
      reportFirebaseError(err)
      setCallsignMsg({ type: 'err', text: err?.message || 'Kayıt başarısız.' })
    } finally {
      setCallsignSaving(false)
    }
  }

  const saveBloodType = async () => {
    if (!user?.uid) return
    setBloodSaving(true)
    setBloodMsg(null)
    try {
      await updateUserBloodType(user.uid, bloodDraft === 'BELİRTİLMEDİ' ? '' : bloodDraft)
      await refreshUserProfile()
      setBloodMsg({ type: 'ok', text: '✓ Kan grubu kaydedildi' })
    } catch (err) {
      reportFirebaseError(err)
      setBloodMsg({ type: 'err', text: err?.message || 'Kayıt başarısız.' })
    } finally {
      setBloodSaving(false)
    }
  }

  const linkEmailPassword = async (e) => {
    e.preventDefault()
    setLinkError('')
    const u = auth?.currentUser
    if (!u?.email) {
      setLinkError('Hesabınızda e-posta yok; şifre bağlanamaz.')
      return
    }
    if (linkPass.length < 6) {
      setLinkError('Şifre en az 6 karakter olmalı.')
      return
    }
    if (linkPass !== linkConfirm) {
      setLinkError('Şifreler eşleşmiyor.')
      return
    }
    setLinkBusy(true)
    try {
      await linkAccountWithPassword(linkPass)
      setAuthProvidersTick((n) => n + 1)
      setLinkPass('')
      setLinkConfirm('')
      setLinkError('')
    } catch (err) {
      reportFirebaseError(err)
      setLinkError(typeof err?.message === 'string' ? err.message : 'Şifre bağlanamadı.')
    } finally {
      setLinkBusy(false)
    }
  }

  const submitPasswordChange = async (e) => {
    e.preventDefault()
    setChangeError('')
    const u = auth?.currentUser
    if (!u?.email) {
      setChangeError('Oturum bulunamadı.')
      return
    }
    if (newPass.length < 6) {
      setChangeError('Yeni şifre en az 6 karakter olmalı.')
      return
    }
    if (newPass !== newPassConfirm) {
      setChangeError('Yeni şifreler eşleşmiyor.')
      return
    }
    setChangeBusy(true)
    try {
      if (googleLinked) {
        await reauthenticateWithPopup(u, new GoogleAuthProvider())
      } else {
        if (currentPassForChange.length < 6) {
          setChangeError('Mevcut şifrenizi girin.')
          setChangeBusy(false)
          return
        }
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, currentPassForChange))
      }
      await updatePassword(auth.currentUser, newPass)
      setNewPass('')
      setNewPassConfirm('')
      setCurrentPassForChange('')
    } catch (err) {
      reportFirebaseError(err)
      setChangeError(typeof err?.message === 'string' ? err.message : 'Şifre güncellenemedi.')
    } finally {
      setChangeBusy(false)
    }
  }

  if (profileLoading && !userData) {
    return <DataLoadingScreen />
  }

  const missionN = m.ready ? m.items.length : '—'
  const trainN = t.ready ? t.items.length : '—'
  const sihhiN = h.ready ? incidentCount : '—'

  const statMax = Math.max(
    typeof missionN === 'number' ? missionN : 0,
    typeof trainN === 'number' ? trainN : 0,
    typeof sihhiN === 'number' ? sihhiN : 0,
    1
  )

  const criticalPulse = ohpScore != null && ohpScore < 50

  return (
    <div className="dashboard-hud-shell relative mx-auto max-w-[1480px] px-5 py-5 pt-12 sm:px-6 sm:pt-14 md:px-8">
      <HudFluffDecor />

      <div className="relative z-[2] mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="font-mono-technical text-[9px] font-semibold uppercase tracking-[0.34em] text-app-text/55">Operatör Profili</p>
          <h1 className="op-terminal-title mt-1 text-sm tracking-[0.2em]">Profil</h1>
        </div>
        <div className="font-mono-technical text-[9px] uppercase tracking-wider text-app-text/45">
          OHP{' '}
          <span style={{ color: accent.rgb, textShadow: `0 0 8px ${accent.rgb}55` }}>{ohpScore != null ? `${ohpScore}` : '—'}</span>
          <span className="text-app-text/45">/100</span>
        </div>
      </div>

      {!rawUsername && user?.uid ? (
        <div className="relative z-[2] mb-4 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3">
          <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-amber-300">
            Profil kaydı eksik
          </p>
          <p className="mt-1 text-sm text-amber-100/85">
            Oturum açık ancak operatör profiliniz Firestore&apos;a yazılmamış (GUEST görünümü). Kayıt
            sırasında seçtiğiniz kullanıcı adını girip profili tamamlayın.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="font-mono-technical text-[9px] uppercase tracking-wider text-amber-200/70">
                Kullanıcı adı
              </span>
              <input
                value={profileRepairUsername}
                onChange={(e) =>
                  setProfileRepairUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_\s]/g, ''))
                }
                placeholder="örn: sarma1"
                className="mt-1 w-full rounded border border-amber-500/30 bg-black/40 px-3 py-2 font-mono-technical text-sm text-amber-50 outline-none focus:border-amber-400/60"
              />
            </label>
            <button
              type="button"
              onClick={completeOperatorProfile}
              disabled={profileRepairBusy}
              className="shrink-0 rounded border border-amber-400/50 bg-amber-500/15 px-4 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
            >
              {profileRepairBusy ? '…' : 'Profili tamamla'}
            </button>
          </div>
          {profileRepairMsg ? (
            <p
              className={`mt-2 font-mono-technical text-[10px] ${profileRepairMsg.type === 'ok' ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {profileRepairMsg.text}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={`grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr] ${criticalPulse ? 'rounded-sm ring-1 ring-red-500/20' : ''}`}>
        <aside className="op-identity-sticky">
          <section className="op-terminal-card">
            <header className="op-terminal-card__head">
              <TerminalTitle>Taktik Kimlik</TerminalTitle>
            </header>
            <div className="op-terminal-card__body space-y-3">
              <div className="op-avatar-frame lg:mx-0">
                <div className="op-avatar-frame__inner flex items-center justify-center">
                  <span className="op-avatar-frame__corner op-avatar-frame__corner--tl" aria-hidden />
                  <span className="op-avatar-frame__corner op-avatar-frame__corner--tr" aria-hidden />
                  <span className="op-avatar-frame__corner op-avatar-frame__corner--bl" aria-hidden />
                  <span className="op-avatar-frame__corner op-avatar-frame__corner--br" aria-hidden />
                  <span className="op-avatar-frame__scan" aria-hidden />
                  <OperatorAvatar
                    uid={user?.uid}
                    size="lg"
                    callsign={callsign}
                    username={rawUsername}
                    displayName={user?.displayName ?? ''}
                    className="size-full max-h-full max-w-full rounded-none border-0 bg-transparent text-[2.5rem]"
                  />
                </div>
                <p className="mt-1.5 text-center font-mono-technical text-[7px] uppercase tracking-[0.22em] text-accent/75 lg:text-left">
                  Rozet aktif · {photoUrl ? 'Görsel' : 'Otomatik'}
                </p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={handleAvatarFile}
                  disabled={avatarUploading}
                />
                <button
                  type="button"
                  onClick={handleAvatarPick}
                  disabled={avatarUploading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-emerald-500/35 bg-emerald-950/25 px-2 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-400 transition hover:border-emerald-400/55 hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Camera className="size-3" strokeWidth={1.75} aria-hidden />
                  {avatarUploading ? 'YÜKLENİYOR…' : 'PROFİL GÖRSELİ YÜKLE'}
                </button>
                {avatarUploading ? (
                  <TacticalUploadProgress
                    progress={avatarProgress}
                    label="Görsel yükleniyor"
                    error={avatarUploadError}
                    className="mt-2"
                  />
                ) : null}
                {!avatarUploading && avatarUploadError ? (
                  <p className="mt-1 font-mono-technical text-[8px] text-amber-400/90">[ {avatarUploadError} ]</p>
                ) : null}
                {avatarMsg ? (
                  <p
                    className={`mt-1 font-mono-technical text-[8px] ${avatarMsg.type === 'ok' ? 'text-emerald-400/90' : 'text-amber-400/90'}`}
                  >
                    {avatarMsg.text}
                  </p>
                ) : null}
              </div>

              <div className="space-y-0.5 border-t border-white/10 pt-2">
                <p className="font-mono-technical text-[8px] uppercase tracking-[0.28em] text-app-text/55">Çağrı adı</p>
                <p
                  className="font-mono-technical text-lg font-bold uppercase leading-tight tracking-tight"
                  style={{ color: accent.rgb, textShadow: `0 0 14px ${accent.rgb}55` }}
                >
                  {callsign}
                </p>
                <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-widest text-app-text/70">{roleLabel(userData?.role)}</p>
                {showPricingLink ? (
                  <Link
                    to="/fiyatlandirma"
                    className="mt-1 inline-block font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent/80 hover:text-accent"
                  >
                    Üyelik planları →
                  </Link>
                ) : null}
              </div>

              <dl className="space-y-0 border-t border-white/10 pt-2">
                <TechLine k="Statü" v={status} accentRgb={accent.rgb} />
              </dl>
            </div>
          </section>
        </aside>

        <div className="grid gap-4 md:grid-cols-2">
          <OpTacticalCard title="Operatör Özeti" wide>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <DataStat label="Tamamlanan görev" value={missionN} accentRgb={accent.rgb} fillPct={statFillPct(missionN, statMax)} />
              <DataStat label="Eğitim sayısı" value={trainN} accentRgb={accent.rgb} fillPct={statFillPct(trainN, statMax)} />
              <DataStat label="Sıhhî olay" value={sihhiN} accentRgb={accent.rgb} fillPct={statFillPct(sihhiN, statMax)} />
            </div>
            <div className="mt-3 rounded-sm border border-accent/22 bg-app-bg/80 p-2.5">
              <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-accent/85">Kan Grubu</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <select
                  value={bloodOptions.includes(bloodDraft) ? bloodDraft : 'BELİRTİLMEDİ'}
                  onChange={(e) => setBloodDraft(e.target.value)}
                  className="dossier-blood-select min-w-0 flex-1 rounded-sm border border-accent/35 py-1.5 pl-2 pr-1 font-mono-technical text-[11px] font-medium text-app-text outline-none"
                >
                  {bloodOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={saveBloodType}
                  disabled={bloodSaving}
                  className="rounded-sm border border-[#004DFF]/35 bg-[#004DFF]/10 px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#5b8cff] hover:bg-[#004DFF]/18 disabled:opacity-50"
                >
                  {bloodSaving ? '…' : 'KAYDET'}
                </button>
              </div>
              {bloodMsg ? (
                <p className={`mt-1 font-mono-technical text-[8px] ${bloodMsg.type === 'ok' ? 'text-emerald-400/90' : 'text-amber-400/90'}`}>{bloodMsg.text}</p>
              ) : null}
            </div>
          </OpTacticalCard>

          <OpTacticalCard title="Canlı Akış">
            <ul className="space-y-1.5">
              {activityTop3.length === 0 ? (
                <li className="font-mono-technical text-[9px] text-app-text/45">Henüz aktivite yok</li>
              ) : (
                activityTop3.map((row, i) => (
                  <li key={`${row.ms}-${i}-${row.line.slice(0, 12)}`} className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1.5 last:border-0 last:pb-0">
                    <span className="font-mono-technical text-[8px] tabular-nums text-[#004DFF]/80">{fmtActivityTs(row.ms)}</span>
                    <span className="font-mono-technical text-[10px] leading-snug text-app-text/90">{row.line}</span>
                  </li>
                ))
              )}
            </ul>
          </OpTacticalCard>

          <OpTacticalCard title="Kayıt Bilgileri">
            <dl className="grid gap-0 font-mono-technical text-[10px] text-app-text/70">
              <div className="flex justify-between gap-2 border-b border-white/[0.05] py-1.5">
                <dt className="text-app-text/45">@kullanıcı adı</dt>
                <dd className="truncate text-app-text/90">{rawUsername ? `@${rawUsername}` : '—'}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-white/[0.05] py-1.5">
                <dt className="text-app-text/45">E-posta</dt>
                <dd className="truncate text-app-text/90">{email || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-white/[0.05] py-1.5">
                <dt className="text-app-text/45">Kayıt</dt>
                <dd className="text-app-text/90">{enrolled}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1.5">
                <dt className="text-app-text/45">Statü</dt>
                <dd className="text-app-text/90">{status}</dd>
              </div>
            </dl>

            <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
              <DossierField label="Çağrı Adı Güncelle">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
                  <input
                    name="callsign"
                    autoComplete="nickname"
                    value={callsignDraft}
                    onChange={(e) => setCallsignDraft(e.target.value.toUpperCase())}
                    placeholder="ÖRN: WOLF-1"
                    className={`${inputTactical} min-w-0 flex-1`}
                    style={{ borderBottomColor: 'rgba(255,255,255,0.18)' }}
                    onFocus={(e) => {
                      e.target.style.borderBottomColor = accent.rgb
                    }}
                    onBlur={(e) => {
                      e.target.style.borderBottomColor = 'rgba(255,255,255,0.18)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={saveCallsign}
                    disabled={callsignSaving}
                    className="shrink-0 rounded-sm border border-[#004DFF]/40 bg-[#004DFF]/12 px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#6b9fff] hover:bg-[#004DFF]/18 disabled:opacity-50"
                  >
                    {callsignSaving ? '…' : 'UYGULA'}
                  </button>
                </div>
              </DossierField>
              {callsignMsg ? (
                <p className={`font-mono-technical text-[10px] ${callsignMsg.type === 'ok' ? 'text-emerald-400' : 'text-amber-400/90'}`}>{callsignMsg.text}</p>
              ) : null}
            </div>
          </OpTacticalCard>

          <OpTacticalCard title="Hesap Güvenliği" wide>
            <button
              type="button"
              onClick={() => setSecurityOpen((o) => !o)}
              className="op-security-toggle rounded-sm"
              aria-expanded={securityOpen}
            >
              <div>
                <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-[#8eb7ff]">
                  {securityOpen ? 'Güvenlik ayarları açık' : 'Güvenlik Ayarları'}
                </p>
                <p className="mt-0.5 font-mono-technical text-[8px] uppercase tracking-wider text-app-text/55">
                  Şifre değiştir · hesap bağla · MFA
                </p>
              </div>
              <span className="font-mono-technical text-[10px] text-accent">{securityOpen ? '▲' : '▼'}</span>
            </button>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-widest ${
                  googleLinked ? 'border-emerald-500/40 text-emerald-300/90' : 'border-[#2A2D34] bg-[#2A2D34]/80 text-app-text/55'
                }`}
              >
                Google {googleLinked ? '●' : '○'}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-widest ${
                  pwdLinked ? 'border-emerald-500/40 text-emerald-300/90' : 'border-[#004DFF]/35 bg-[#2A2D34]/90 text-[#7aa3ff]'
                }`}
              >
                E-posta + şifre {pwdLinked ? '●' : '○'}
              </span>
            </div>

            <div className={['op-security-panel mt-3', securityOpen ? 'op-security-panel--open' : 'op-security-panel--closed'].join(' ')}>
              <div className="space-y-3 border-t border-[#004DFF]/20 pt-3">
                {!pwdLinked && googleLinked && email ? (
                  <form onSubmit={linkEmailPassword} className={`space-y-2.5 rounded-sm p-3 ${secPanelClass}`}>
                    <div className="flex items-start gap-2">
                      <Link2 className="mt-0.5 size-3.5 shrink-0 text-[#5b8cff]" strokeWidth={1.5} aria-hidden />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-wide text-[#b8ccff]">Hesap şifresi bağla</p>
                        <DossierField label="E_POSTA (SABİT)">
                          <input type="email" readOnly value={email} className={`${inputTactical} opacity-70`} />
                        </DossierField>
                        <DossierField label="ŞİFRE">
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={linkPass}
                            onChange={(e) => setLinkPass(e.target.value)}
                            className={inputTactical}
                            style={{ borderBottomColor: 'rgba(0,77,255,0.35)' }}
                          />
                        </DossierField>
                        <DossierField label="ŞİFRE_TEKRAR">
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={linkConfirm}
                            onChange={(e) => setLinkConfirm(e.target.value)}
                            className={inputTactical}
                            style={{ borderBottomColor: 'rgba(0,77,255,0.35)' }}
                          />
                        </DossierField>
                        {linkError ? <AmberAlert>{linkError}</AmberAlert> : null}
                        <button
                          type="submit"
                          disabled={linkBusy}
                          className="rounded-sm border border-[#004DFF]/50 bg-[#004DFF]/15 px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#8eb7ff] hover:bg-[#004DFF]/22 disabled:opacity-50"
                        >
                          {linkBusy ? '…' : 'BAĞLA'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : null}

                {!pwdLinked && googleLinked && !email ? (
                  <AmberAlert>Hesapta e-posta yok; şifre çiti bu oturum için kapalı.</AmberAlert>
                ) : null}

                {!googleLinked && !pwdLinked && email ? (
                  <AmberAlert>Oturum sağlayıcı bilgisi alınamadı; çıkış / yeniden giriş önerilir.</AmberAlert>
                ) : null}

                {pwdLinked ? (
                  <form onSubmit={submitPasswordChange} className={`space-y-2.5 rounded-sm p-3 ${secPanelClass}`}>
                    <div className="flex items-start gap-2">
                      <KeyRound className="mt-0.5 size-3.5 shrink-0 text-[#5b8cff]" strokeWidth={1.5} aria-hidden />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-wide text-[#b8ccff]">Şifre değiştir</p>
                        {!googleLinked ? (
                          <DossierField label="MEVCUT_ŞİFRE">
                            <input
                              type="password"
                              autoComplete="current-password"
                              value={currentPassForChange}
                              onChange={(e) => setCurrentPassForChange(e.target.value)}
                              className={inputTactical}
                              style={{ borderBottomColor: 'rgba(0,77,255,0.35)' }}
                            />
                          </DossierField>
                        ) : (
                          <p className="font-mono-technical text-[8px] text-app-text/55">Google ile yeniden doğrulama penceresi açılabilir.</p>
                        )}
                        <DossierField label="YENİ_ŞİFRE">
                          <input type="password" autoComplete="new-password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className={inputTactical} style={{ borderBottomColor: 'rgba(0,77,255,0.35)' }} />
                        </DossierField>
                        <DossierField label="YENİ_ŞİFRE_TEKRAR">
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={newPassConfirm}
                            onChange={(e) => setNewPassConfirm(e.target.value)}
                            className={inputTactical}
                            style={{ borderBottomColor: 'rgba(0,77,255,0.35)' }}
                          />
                        </DossierField>
                        {changeError ? <AmberAlert>{changeError}</AmberAlert> : null}
                        <button
                          type="submit"
                          disabled={changeBusy}
                          className="rounded-sm border border-[#004DFF]/40 bg-[#2A2D34] px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#9db6e8] hover:border-[#004DFF]/55 disabled:opacity-50"
                        >
                          {changeBusy ? '…' : 'GÜNCELLE'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : null}

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className={`rounded-sm p-3 ${secPanelClass}`}>
                    <div className="flex items-start gap-2">
                      <Phone className="mt-0.5 size-3.5 shrink-0 text-[#5b8cff]" strokeWidth={1.5} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono-technical text-[9px] font-bold uppercase text-[#b8ccff]">Telefon kanalı</p>
                        <p className="mt-0.5 font-mono-technical text-[8px] uppercase leading-snug text-app-text/55">İleride SMS / kurtarma.</p>
                        <input type="tel" readOnly disabled placeholder="+90 …" className={`${inputTactical} mt-1 cursor-not-allowed opacity-45`} aria-label="Telefon (pasif)" />
                        <button type="button" disabled className="mt-1 rounded-sm border border-[#2A2D34] px-1.5 py-0.5 font-mono-technical text-[8px] uppercase text-app-text/45">
                          Kilitli
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-sm p-3 ${secPanelClass}`}>
                    <div className="flex items-start gap-2">
                      <Shield className="mt-0.5 size-3.5 shrink-0 text-[#5b8cff]" strokeWidth={1.5} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono-technical text-[9px] font-bold uppercase text-[#b8ccff]">Telefon · SMS doğrulama</p>
                        <p className="mt-0.5 font-mono-technical text-[8px] uppercase leading-snug text-app-text/55">Firebase Phone Auth · ücretli katman.</p>
                        <label className="mt-2 flex cursor-not-allowed items-center gap-1.5 opacity-65">
                          <input type="checkbox" disabled className="size-3 rounded-sm border-white/20" />
                          <span className="font-mono-technical text-[8px] uppercase leading-snug tracking-wide text-app-text/55">
                            Durum: Pasif · operasyonel gereklilik
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </OpTacticalCard>
        </div>
      </div>
    </div>
  )
}
