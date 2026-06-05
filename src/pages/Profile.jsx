import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reload,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { KeyRound, Link2, Phone, Shield, User } from 'lucide-react'
import HudFluffDecor from '../components/dashboard/HudFluffDecor'
import AmberAlert from '../components/common/AmberAlert'
import TacticalPanel from '../components/ui/TacticalPanel'
import { useAuth } from '../context/AuthContext'
import { useFirebaseErrorReporter } from '../context/FirebaseErrorContext'
import { useAudazData } from '../hooks/useAudazData'
import { auth, isFirebaseConfigured, storage } from '../lib/firebase'
import { buildSystemLogEntries } from '../lib/dashboardHudData'
import { computeORS } from '../lib/orsEngine'
import { updateUserBloodType, updateUserCallsign } from '../lib/firestoreUsers'

const CYBER_GREEN = '#00FF41'
const TACTIC_AMBER = '#f59e0b'
const COMBAT_RED = '#FF0000'
const TACTIC_BLUE = '#004DFF'

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
    const tail = msg.replace(/^[\s\S]*Δ · /, '').trim() || 'kayıt'
    return `Envanter güncellendi · ${tail.slice(0, 42)}`
  }
  if (code === 'SHT') {
    if (msg.includes('SAHA_KAYIT') || msg.includes('BÖLGE')) return `TCCC saha kaydı · ${msg.slice(0, 48)}`
    const tail = msg.replace(/^TIBBİ_SENK · /, '').trim() || 'kayıt'
    return `TCCC kaydı girildi · ${tail.slice(0, 42)}`
  }
  if (code === 'EĞT') {
    const tail = msg.replace(/^TATBİKAT_IX · /, '').trim() || '—'
    return `Eğitim / tatbikat · ${tail.slice(0, 42)}`
  }
  if (code === 'OPS') {
    const tail = msg.replace(/^GÖREV_SENK · /, '').trim() || '—'
    return `Görev senkronu · ${tail.slice(0, 42)}`
  }
  if (code === 'GÜV') return 'Sisteme giriş · oturum aktif'
  return msg.slice(0, 52)
}

/**
 * @param {File} file
 * @param {number} maxDim
 */
async function resizeImageToJpegBlob(file, maxDim = 512) {
  const bitmap = await createImageBitmap(file)
  const w = bitmap.width
  const h = bitmap.height
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas kullanılamadı')
  ctx.drawImage(bitmap, 0, 0, tw, th)
  bitmap.close()
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Görüntü kodlanamadı'))), 'image/jpeg', 0.86)
  })
  return blob
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

/** @param {string | undefined} uid */
function persKodu(uid) {
  const raw = (uid || 'XXXXXXXX').replace(/-/g, '').slice(0, 8).toUpperCase()
  return `AUDAZ-${raw}`
}

/** @param {string | undefined} uid */
function kutuRefFromUid(uid) {
  const s = (uid || '0').replace(/-/g, '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const g1 = 2400 + (h % 90)
  const g2 = 8900 + ((h >> 4) % 80)
  return `36S ST ${g1} ${g2}`
}

/** @param {number | null} score */
function ohpAccent(score) {
  if (score == null)
    return {
      rgb: TACTIC_AMBER,
      sweepMid: 'rgba(245,158,11,0.12)',
      ring: 'rgba(245,158,11,0.35)',
    }
  if (score >= 85)
    return {
      rgb: CYBER_GREEN,
      sweepMid: 'rgba(0,255,65,0.14)',
      ring: 'rgba(0,255,65,0.45)',
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
    <div className="dashboard-hud-shell relative mx-auto flex min-h-[50vh] max-w-[1480px] flex-col items-center justify-center gap-3 px-3 py-5 pt-12 sm:px-4 sm:pt-14 md:px-6">
      <div
        className="relative h-11 w-full max-w-md overflow-hidden rounded-lg border border-[#004DFF]/35 bg-[#2A2D34]/60 px-4 backdrop-blur-md"
        role="status"
        aria-live="polite"
      >
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono-technical text-[10px] uppercase tracking-widest text-[#004DFF]/90">
          DOSSIER_SYNC
        </span>
        <span
          className="absolute right-3 top-1/2 inline-block size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-[#004DFF] border-t-transparent"
          aria-hidden
        />
      </div>
      <p className="font-mono-technical text-[10px] font-semibold tracking-[0.3em] text-slate-500">KİMLİK_VERİSİ_YÜKLENİYOR</p>
    </div>
  )
}

function TechLine({ k, v, accentRgb }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-white/[0.06] py-1.5 last:border-0">
      <dt className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">{k}</dt>
      <dd
        className="max-w-[min(100%,14rem)] truncate text-right font-mono-technical text-[10px] text-slate-200"
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
      <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  )
}

export default function Profile() {
  const { user, userData, profileLoading, refreshUserProfile, linkAccountWithPassword } = useAuth()
  const { reportFirebaseError } = useFirebaseErrorReporter()
  const [authProvidersTick, setAuthProvidersTick] = useState(0)
  const [sessionOpenedMs] = useState(() => Date.now())
  const fileInputRef = useRef(null)

  const m = useAudazData('missions')
  const t = useAudazData('trainings')
  const inv = useAudazData('inventory')
  const h = useAudazData('health_records')
  const rangeLogs = useAudazData('range_logs')

  const [orsClock, setOrsClock] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setOrsClock((c) => c + 1), 30000)
    return () => window.clearInterval(id)
  }, [])

  const orsResult = useMemo(() => {
    void orsClock
    if (!m.ready || !t.ready || !inv.ready || !h.ready || !rangeLogs.ready) return null
    return computeORS({
      inventory: inv.items,
      trainings: t.items,
      health: h.items,
      rangeLogs: rangeLogs.items,
      nowMs: Date.now(),
    })
  }, [
    m.ready,
    t.ready,
    inv.ready,
    h.ready,
    rangeLogs.ready,
    m.items,
    t.items,
    inv.items,
    h.items,
    rangeLogs.items,
    orsClock,
  ])

  const ohpScore = orsResult?.score ?? null
  const accent = ohpAccent(ohpScore)

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

  const [localPhotoUrl, setLocalPhotoUrl] = useState(null)
  useEffect(() => {
    setLocalPhotoUrl(null)
  }, [user?.uid])

  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState(null)

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

  const sessionUser = auth?.currentUser ?? user
  void authProvidersTick
  const pwdLinked = hasPasswordProvider(sessionUser)
  const googleLinked = hasGoogleProvider(sessionUser)

  const avatarSrc = localPhotoUrl ?? user?.photoURL ?? null

  const inputTactical =
    'w-full border-0 border-b border-white/20 bg-transparent py-1.5 font-mono-technical text-[13px] text-slate-100 outline-none ring-0 transition placeholder:text-slate-600 focus:border-b'

  const secPanelClass = 'rounded-md border border-[#004DFF]/28 bg-[#2A2D34]/88'

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !auth?.currentUser || !user?.uid) return
    if (!file.type.startsWith('image/')) {
      setAvatarMsg({ type: 'err', text: 'Yalnızca görüntü dosyası.' })
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarMsg({ type: 'err', text: 'Dosya 8MB altında olmalı.' })
      return
    }
    setAvatarBusy(true)
    setAvatarMsg(null)
    try {
      const blob = await resizeImageToJpegBlob(file, 512)
      let url = ''
      if (storage && isFirebaseConfigured()) {
        const path = `avatars/${user.uid}/profile_${Date.now()}.jpg`
        const ref = storageRef(storage, path)
        await uploadBytes(ref, blob, { contentType: 'image/jpeg' })
        url = await getDownloadURL(ref)
      } else {
        throw new Error('Firebase Storage kullanılamıyor (bucket / yapılandırma).')
      }
      await updateProfile(auth.currentUser, { photoURL: url })
      await reload(auth.currentUser)
      await refreshUserProfile()
      setLocalPhotoUrl(url)
      setAvatarMsg({ type: 'ok', text: '✓ GÖRÜNTÜ_SENK' })
    } catch (err) {
      reportFirebaseError(err)
      setAvatarMsg({
        type: 'err',
        text: typeof err?.message === 'string' ? err.message : 'Yükleme başarısız.',
      })
    } finally {
      setAvatarBusy(false)
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
      setBloodMsg({ type: 'ok', text: '✓ KAN_GRUBU_KAYIT' })
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

  if (profileLoading) {
    return <DataLoadingScreen />
  }

  const missionN = m.ready ? m.items.length : '—'
  const trainN = t.ready ? t.items.length : '—'
  const sihhiN = h.ready ? incidentCount : '—'

  const scanLineColor = `${accent.rgb}40`
  const criticalPulse = ohpScore != null && ohpScore < 50

  return (
    <div className="dashboard-hud-shell relative mx-auto max-w-[1480px] px-3 py-5 pt-12 sm:px-4 sm:pt-14 md:px-6">
      <HudFluffDecor />

      <div className="relative z-[2]">
        <TacticalPanel
          className={`relative z-10 border-[#004DFF]/20 bg-[#0c0c0e]/97 p-0 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.85)] backdrop-blur-sm ${criticalPulse ? 'ring-1 ring-red-500/35' : ''}`}
          scanning={ohpScore != null && ohpScore >= 50 && ohpScore < 85}
          style={criticalPulse ? { boxShadow: `0 0 22px -4px ${accent.ring}` } : undefined}
        >
          <div className="relative z-[50] flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#080808] px-4 py-2.5">
            <div>
              <p className="font-mono-technical text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">[ OPERATOR_DOSSIER ]</p>
              <p className="font-display text-sm font-bold tracking-[0.08em] text-white">TAKTİK KİMLİK KONSOLU</p>
            </div>
            <div className="font-mono-technical text-[9px] uppercase tracking-wider text-slate-600">
              OHP{' '}
              <span style={{ color: accent.rgb, textShadow: `0 0 8px ${accent.rgb}55` }}>{ohpScore != null ? `${ohpScore}` : '—'}</span>
              <span className="text-slate-600">/100</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[minmax(200px,27%)_1fr] lg:items-start">
            {/* Sol — profil kartı + avatar */}
            <div
              className={`relative z-10 flex flex-col gap-2 overflow-hidden border-b border-white/10 p-4 lg:min-h-0 lg:border-b-0 lg:border-r lg:border-white/10 ${criticalPulse ? 'ring-1 ring-inset ring-red-500/25' : ''}`}
              style={{ boxShadow: `inset 0 0 36px -14px ${accent.rgb}18` }}
            >
              <div
                className="pointer-events-none absolute inset-0 z-0 opacity-[0.28]"
                style={{
                  backgroundImage: `repeating-linear-gradient(180deg, transparent, transparent 4px, ${scanLineColor} 4px, ${scanLineColor} 5px)`,
                }}
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden mix-blend-screen" aria-hidden>
                <div
                  className="dossier-scan-sweep absolute left-[-5%] right-[-5%] top-0 h-[32%]"
                  style={{
                    background: `linear-gradient(to bottom, transparent 0%, ${accent.sweepMid} 50%, transparent 100%)`,
                  }}
                />
              </div>

              <div className="relative z-10 flex flex-col items-center gap-2 lg:items-stretch">
                <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={onAvatarFile} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarBusy}
                  className="group relative mx-auto w-full max-w-[10.5rem] shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004DFF]/60 disabled:opacity-60 lg:mx-0"
                  aria-label="Profil fotoğrafı yükle"
                >
                  <div className="relative overflow-hidden rounded-lg bg-black/50 ring-2 ring-[#00FF41]/45" style={{ boxShadow: `0 0 20px ${CYBER_GREEN}33` }}>
                    <div className="relative aspect-square w-full">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-black/60 p-2">
                          <User className="size-10 text-[#00FF41]/50" strokeWidth={1.2} aria-hidden />
                          <span className="text-center font-mono-technical text-[7px] uppercase leading-tight tracking-widest text-slate-600">GÖRÜNTÜ_YOK</span>
                        </div>
                      )}
                      <div
                        className="pointer-events-none absolute inset-0 rounded-lg border border-[#00FF41]/25"
                        style={{ boxShadow: `inset 0 0 14px ${CYBER_GREEN}22` }}
                        aria-hidden
                      />
                      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg" aria-hidden>
                        <div
                          className="dossier-scan-sweep absolute left-0 right-0 top-0 h-[28%] opacity-70"
                          style={{
                            background: `linear-gradient(to bottom, transparent 0%, ${CYBER_GREEN}22 45%, transparent 100%)`,
                          }}
                        />
                      </div>
                      <div
                        className="dossier-avatar-orbit pointer-events-none absolute -inset-[2px] rounded-lg border-2 border-transparent border-t-[#00FF41] border-r-[#00FF41]/40 opacity-90"
                        aria-hidden
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/75 px-1 py-0.5 text-center">
                      <span className="font-mono-technical text-[7px] font-bold uppercase tracking-[0.2em] text-[#00FF41]/90">SCANNING</span>
                    </div>
                  </div>
                  <p className="mt-1 text-center font-mono-technical text-[7px] uppercase tracking-wider text-slate-500 group-hover:text-[#004DFF]/90 lg:text-left">
                    {avatarBusy ? 'YÜKLENİYOR…' : 'TIKLA · DOSYA_SEÇ'}
                  </p>
                </button>
                {avatarMsg ? (
                  <p className={`text-center font-mono-technical text-[9px] lg:text-left ${avatarMsg.type === 'ok' ? 'text-emerald-400' : 'text-amber-400/90'}`}>{avatarMsg.text}</p>
                ) : null}

                <div className="w-full space-y-0.5 border-t border-white/10 pt-2">
                  <p className="font-mono-technical text-[8px] uppercase tracking-[0.28em] text-slate-500">SİSTEM_KİMLİK</p>
                  <p className="font-display text-lg font-bold uppercase leading-tight tracking-tight" style={{ color: accent.rgb, textShadow: `0 0 14px ${accent.rgb}55` }}>
                    {callsign}
                  </p>
                  <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-widest text-slate-400">{roleLabel(userData?.role)}</p>
                </div>

                <dl className="w-full space-y-0">
                  <TechLine k="PERS_KODU" v={persKodu(user?.uid)} accentRgb={accent.rgb} />
                  <TechLine k="KUTUP_REF" v={kutuRefFromUid(user?.uid)} accentRgb={accent.rgb} />
                </dl>
              </div>
            </div>

            {/* Sağ — özet, akış, formlar */}
            <div className="space-y-3 p-4 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/25 px-3 py-2.5"
                  style={{ boxShadow: `0 0 12px -6px ${accent.rgb}28` }}
                >
                  <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500">HİZMET_ÖZETİ</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center font-mono-technical">
                    <div className="flex min-h-[3.25rem] flex-col items-center justify-start gap-1 px-0.5 pt-0.5">
                      <p className="text-[7px] uppercase leading-snug tracking-wider text-slate-500">TOPLAM_GÖREV</p>
                      <p className="text-base font-bold tabular-nums leading-none" style={{ color: accent.rgb }}>
                        {missionN}
                      </p>
                    </div>
                    <div className="flex min-h-[3.25rem] flex-col items-center justify-start gap-1 border-x border-white/[0.06] px-0.5 pt-0.5">
                      <p className="text-[7px] uppercase leading-snug tracking-wider text-slate-500">EĞİTİM_SAYISI</p>
                      <p className="text-base font-bold tabular-nums leading-none" style={{ color: accent.rgb }}>
                        {trainN}
                      </p>
                    </div>
                    <div className="flex min-h-[3.25rem] flex-col items-center justify-start gap-1 px-0.5 pt-0.5">
                      <p className="text-[7px] uppercase leading-snug tracking-wider text-slate-500">SIHHİ_OLAY</p>
                      <p className="text-base font-bold tabular-nums leading-none" style={{ color: accent.rgb }}>
                        {sihhiN}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 rounded-md border border-[#00FF41]/25 bg-[#0A0A0A]/95 px-3 py-2.5 sm:max-w-[12rem]">
                  <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-[#00FF41]/85">KAN_GRUBU</p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <select
                      value={bloodOptions.includes(bloodDraft) ? bloodDraft : 'BELİRTİLMEDİ'}
                      onChange={(e) => setBloodDraft(e.target.value)}
                      className="dossier-blood-select min-w-0 flex-1 rounded border border-[#00FF41]/35 py-1.5 pl-2 pr-1 font-mono-technical text-[11px] font-medium text-white outline-none"
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
                      className="rounded border border-[#004DFF]/35 bg-[#004DFF]/10 px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#5b8cff] hover:bg-[#004DFF]/18 disabled:opacity-50"
                    >
                      {bloodSaving ? '…' : 'KAYDET'}
                    </button>
                  </div>
                  {bloodMsg ? (
                    <p className={`mt-1 font-mono-technical text-[8px] ${bloodMsg.type === 'ok' ? 'text-emerald-400/90' : 'text-amber-400/90'}`}>{bloodMsg.text}</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500">AKTİVİTE_AKIŞI</p>
                <ul className="mt-1.5 space-y-1.5">
                  {activityTop3.length === 0 ? (
                    <li className="font-mono-technical text-[9px] text-slate-600">AKTİVİTE_BEKLENİYOR · VERİ_YOK</li>
                  ) : (
                    activityTop3.map((row, i) => (
                      <li key={`${row.ms}-${i}-${row.line.slice(0, 12)}`} className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1.5 last:border-0 last:pb-0">
                        <span className="font-mono-technical text-[8px] tabular-nums text-[#004DFF]/80">{fmtActivityTs(row.ms)}</span>
                        <span className="font-mono-technical text-[10px] leading-snug text-slate-300">{row.line}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">KAYIT_VERİSİ</p>
                <dl className="mt-1 grid gap-0 font-mono-technical text-[10px] text-slate-400 sm:grid-cols-2">
                  <div className="flex justify-between gap-2 border-b border-white/[0.05] py-1 sm:border-0">
                    <dt className="text-slate-600">@HANDLE</dt>
                    <dd className="truncate text-slate-300">{rawUsername ? `@${rawUsername}` : '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-white/[0.05] py-1 sm:border-0">
                    <dt className="text-slate-600">E_POSTA</dt>
                    <dd className="truncate text-slate-300">{email || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-white/[0.05] py-1 sm:border-0">
                    <dt className="text-slate-600">KAYIT</dt>
                    <dd className="text-slate-300">{enrolled}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-white/[0.05] py-1 sm:border-0">
                    <dt className="text-slate-600">STATÜ</dt>
                    <dd className="text-slate-300">{status}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2 border-t border-white/10 px-0.5 pt-3">
                <DossierField label="KOD_ADI_GÜNCELLE">
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
                      className="shrink-0 rounded border border-[#004DFF]/40 bg-[#004DFF]/12 px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#6b9fff] hover:bg-[#004DFF]/18 disabled:opacity-50"
                    >
                      {callsignSaving ? '…' : 'UYGULA'}
                    </button>
                  </div>
                </DossierField>
                {callsignMsg ? (
                  <p className={`font-mono-technical text-[10px] ${callsignMsg.type === 'ok' ? 'text-emerald-400' : 'text-amber-400/90'}`}>{callsignMsg.text}</p>
                ) : null}
              </div>

              <section className="space-y-3 border-t border-[#004DFF]/25 px-0.5 pt-3" aria-labelledby="sec-perimeter">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 id="sec-perimeter" className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.24em]" style={{ color: TACTIC_BLUE, textShadow: '0 0 12px rgba(0,77,255,0.35)' }}>
                    GÜVENLİK_ÇİTİ
                  </h2>
                  <span className="font-mono-technical text-[8px] uppercase tracking-widest text-slate-600">SECURITY_PERIMETER</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-widest ${
                      googleLinked ? 'border-emerald-500/40 text-emerald-300/90' : 'border-[#2A2D34] bg-[#2A2D34]/80 text-slate-500'
                    }`}
                    style={googleLinked ? { boxShadow: `0 0 8px ${accent.rgb}28` } : undefined}
                  >
                    Google {googleLinked ? '●' : '○'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-widest ${
                      pwdLinked ? 'border-emerald-500/40 text-emerald-300/90' : 'border-[#004DFF]/35 bg-[#2A2D34]/90 text-[#7aa3ff]'
                    }`}
                  >
                    E_POSTA+ŞİFRE {pwdLinked ? '●' : '○'}
                  </span>
                </div>

                {!pwdLinked && googleLinked && email ? (
                  <form onSubmit={linkEmailPassword} className={`space-y-2.5 p-3 ${secPanelClass}`}>
                    <div className="flex items-start gap-2">
                      <Link2 className="mt-0.5 size-3.5 shrink-0 text-[#5b8cff]" strokeWidth={1.5} aria-hidden />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-wide text-[#b8ccff]">HESAP_ŞİFRE_BAĞLA</p>
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
                          className="rounded border border-[#004DFF]/50 bg-[#004DFF]/15 px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#8eb7ff] hover:bg-[#004DFF]/22 disabled:opacity-50"
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
                  <form onSubmit={submitPasswordChange} className={`space-y-2.5 p-3 ${secPanelClass}`}>
                    <div className="flex items-start gap-2">
                      <KeyRound className="mt-0.5 size-3.5 shrink-0 text-[#5b8cff]" strokeWidth={1.5} aria-hidden />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-wide text-[#b8ccff]">ŞİFRE_DEĞİŞİM</p>
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
                          <p className="font-mono-technical text-[8px] text-slate-500">Google ile yeniden doğrulama penceresi açılabilir.</p>
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
                          className="rounded border border-[#004DFF]/40 bg-[#2A2D34] px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#9db6e8] hover:border-[#004DFF]/55 disabled:opacity-50"
                        >
                          {changeBusy ? '…' : 'GÜNCELLE'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : null}

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className={`p-3 ${secPanelClass}`}>
                    <div className="flex items-start gap-2">
                      <Phone className="mt-0.5 size-3.5 shrink-0 text-[#5b8cff]" strokeWidth={1.5} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono-technical text-[9px] font-bold uppercase text-[#b8ccff]">TELEFON_KANALI</p>
                        <p className="mt-0.5 font-mono-technical text-[8px] uppercase leading-snug text-slate-500">İleride SMS / kurtarma.</p>
                        <input type="tel" readOnly disabled placeholder="+90 …" className={`${inputTactical} mt-1 cursor-not-allowed opacity-45`} aria-label="Telefon (pasif)" />
                        <button type="button" disabled className="mt-1 rounded border border-[#2A2D34] px-1.5 py-0.5 font-mono-technical text-[8px] uppercase text-slate-600">
                          Kilitli
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 ${secPanelClass}`}>
                    <div className="flex items-start gap-2">
                      <Shield
                        className="mt-0.5 size-3.5 shrink-0 text-[#5b8cff]"
                        strokeWidth={1.5}
                        style={{ filter: `drop-shadow(0 0 5px ${accent.rgb}40)` }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono-technical text-[9px] font-bold uppercase text-[#b8ccff]">TELEFON_VE_SMS_MFA</p>
                        <p className="mt-0.5 font-mono-technical text-[8px] uppercase leading-snug text-slate-500">Firebase Phone Auth · ücretli katman.</p>
                        <label className="mt-2 flex cursor-not-allowed items-center gap-1.5 opacity-65">
                          <input type="checkbox" disabled className="size-3 rounded border-white/20" />
                          <span className="font-mono-technical text-[8px] uppercase leading-snug tracking-wide text-slate-500">
                            DURUM: PASİF · OPERASYONEL_GEREKLİLİK
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </TacticalPanel>
      </div>
    </div>
  )
}
