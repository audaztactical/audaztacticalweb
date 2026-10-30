import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
} from 'firebase/auth'
import mark from '../../assets/landing-mark.png'
import crest from '../../assets/landing-crest.png'
import { useAuth } from '../../context/AuthContext'
import { auth } from '../../lib/firebase'
import { userRequiresEmailVerification } from '../../lib/authEmailVerification'
import { resolveAuthErrorKey } from '../../lib/authErrorDisplay'
import { isPlatformInBetaPeriod } from '../../lib/registrationPolicy'
import {
  isUsernameAvailable,
  isValidUsernameNormalized,
  normalizeUsername,
} from '../../lib/firestoreUsers'
import { registerSendsEmailVerification } from '../../lib/registerOperatorAccount'
import {
  FOCUS_CHIPS,
  PROFESSION_CHIPS,
  writeLandingOnboarding,
} from './landingData'

const RULES = {
  len: (p) => p.length >= 8,
  up: (p) => /[a-zçğıöşü]/.test(p) && /[A-ZÇĞİÖŞÜ]/.test(p),
  num: (p) => /\d/.test(p),
  sym: (p) => /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(p),
}

const STRENGTH_KEYS = [
  'auth.register.strength.0',
  'auth.register.strength.1',
  'auth.register.strength.2',
  'auth.register.strength.3',
  'auth.register.strength.4',
]
const STRENGTH_COLORS = ['#ff5a4e', '#ff8a3d', '#f2c230', '#7fe0a6', '#5fe39a']

const mailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

/** Çağrı işareti → username; normalize sonrası 3–24 a-z0-9_ */
function callsignUsernameOk(raw) {
  const key = normalizeUsername(raw)
  return isValidUsernameNormalized(key)
}

/**
 * @param {{ open: boolean, initialMode?: 'in'|'reg', onClose: () => void }} props
 */
export default function AuthModal({ open, initialMode = 'in', onClose }) {
  const { t, i18n } = useTranslation('landing')
  const navigate = useNavigate()
  const { signInWithEmailPassword, registerWithEmailPassword, recordRegistrationConsents } = useAuth()
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(/** @type {HTMLElement | null} */ (null))
  const availTimer = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const resetCooldownUntil = useRef(0)
  const submitLock = useRef(false)

  const [mounted, setMounted] = useState(open)
  const [animOn, setAnimOn] = useState(false)
  const [mode, setMode] = useState(initialMode)
  const [step, setStep] = useState(1)
  const [backAnim, setBackAnim] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [shake, setShake] = useState(false)
  const [err, setErr] = useState('')
  const [errAction, setErrAction] = useState(/** @type {null | 'switch-login'} */ (null))
  const [seqLines, setSeqLines] = useState(0)
  const [seqFailAt, setSeqFailAt] = useState(/** @type {number | null} */ (null))
  const [postAuthPath, setPostAuthPath] = useState('/dashboard')

  const [fMail, setFMail] = useState('')
  const [fPass, setFPass] = useState('')
  const [remember, setRemember] = useState(true)
  const [showLoginPass, setShowLoginPass] = useState(false)

  const [rCall, setRCall] = useState('')
  const [rMail, setRMail] = useState('')
  const [rPass, setRPass] = useState('')
  const [rPass2, setRPass2] = useState('')
  const [showRegPass, setShowRegPass] = useState(false)
  const [showRegPass2, setShowRegPass2] = useState(false)
  const [avail, setAvail] = useState(/** @type {''|'wait'|'ok'|'no'|'invalid'|'offline'} */ (''))
  const [callHintBad, setCallHintBad] = useState(false)
  const [strength, setStrength] = useState(0)
  const [strengthColor, setStrengthColor] = useState('')
  const [matchMsg, setMatchMsg] = useState('')
  const [matchOk, setMatchOk] = useState(false)
  const [crit, setCrit] = useState({ len: false, up: false, num: false, sym: false })
  const [professionId, setProfessionId] = useState(/** @type {string | null} */ (null))
  const [focusSel, setFocusSel] = useState(/** @type {number[]} */ ([]))
  const [glowNote, setGlowNote] = useState('')
  const [rAge, setRAge] = useState(false)
  const [okChips, setOkChips] = useState(/** @type {{ label: string, color: string }[]} */ ([]))

  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const formId = useId()
  const sendVerify = registerSendsEmailVerification()
  const betaMode = isPlatformInBetaPeriod()

  const mapLoginError = useCallback(
    (error) => {
      const key = resolveAuthErrorKey(error)
      if (key === 'wrongPassword' || key === 'userNotFound' || key === 'invalidCredential' || key === 'authFailCredential') {
        return t('auth.errors.badCredentials')
      }
      if (key === 'tooManyRequests') return t('auth.errors.tooManyRequests')
      if (key === 'network') return t('auth.errors.network')
      if (key === 'invalidEmail') return t('auth.errors.invalidEmail')
      return t('auth.errors.generic')
    },
    [t],
  )

  const mapRegisterError = useCallback(
    (error) => {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      const key = resolveAuthErrorKey(error)
      if (code === 'auth/email-already-in-use' || key === 'emailInUse') {
        return { msg: t('auth.errors.emailInUse'), action: /** @type {const} */ ('switch-login') }
      }
      if (key === 'weakPassword') return { msg: t('auth.errors.weakPassword'), action: null }
      if (key === 'invalidEmail') return { msg: t('auth.errors.invalidEmail'), action: null }
      if (key === 'network') return { msg: t('auth.errors.network'), action: null }
      if (key === 'usernameTaken' || code === 'username-already-in-use') {
        return { msg: t('auth.errors.callsignTaken'), action: null, usernameTaken: true }
      }
      if (key === 'usernameInvalid' || code === 'username-invalid') {
        return { msg: t('auth.errors.callsignFormat'), action: null }
      }
      if (key === 'tooManyRequests') return { msg: t('auth.errors.tooManyRequests'), action: null }
      return { msg: t('auth.errors.generic'), action: null }
    },
    [t],
  )

  const resetForm = useCallback(() => {
    setStep(1)
    setBusy(false)
    setDone(false)
    setErr('')
    setErrAction(null)
    setSeqLines(0)
    setSeqFailAt(null)
    setFMail('')
    setFPass('')
    setRemember(true)
    setRCall('')
    setRMail('')
    setRPass('')
    setRPass2('')
    setAvail('')
    setCallHintBad(false)
    setStrength(0)
    setMatchMsg('')
    setProfessionId(null)
    setFocusSel([])
    setGlowNote('')
    setRAge(false)
    setOkChips([])
    setPostAuthPath('/dashboard')
    submitLock.current = false
  }, [])

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setMode(initialMode)
      resetForm()
      setMounted(true)
      requestAnimationFrame(() => setAnimOn(true))
    } else {
      setAnimOn(false)
      const id = window.setTimeout(() => setMounted(false), 350)
      return () => clearTimeout(id)
    }
  }, [open, initialMode, resetForm])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open || !animOn || busy || done) return undefined
    const tId = window.setTimeout(() => {
      const sel = mode === 'reg' ? 'input#rCall' : 'input#fMail'
      dialogRef.current?.querySelector(sel)?.focus()
    }, 250)
    return () => clearTimeout(tId)
  }, [open, animOn, mode, busy, done])

  const handleClose = useCallback(() => {
    if (window.location.hash === '#giris') {
      history.replaceState(null, '', window.location.pathname)
    }
    onClose()
    window.setTimeout(() => returnFocusRef.current?.focus?.(), 360)
  }, [onClose])

  useEffect(() => {
    if (!busy || done) return undefined
    const id = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector('.lp-seq')?.focus?.()
    })
    return () => window.cancelAnimationFrame(id)
  }, [busy, done])

  useEffect(() => {
    if (!done) return undefined
    const id = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector('.lp-ok .lp-go')?.focus?.()
    })
    return () => window.cancelAnimationFrame(id)
  }, [done])

  useEffect(() => {
    if (!mounted || !animOn) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const nodes = [...dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        )].filter((el) => {
          if (!(el instanceof HTMLElement)) return false
          if (el.closest('[hidden]')) return false
          return el.offsetParent !== null || el === document.activeElement
        })
        if (!nodes.length) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, animOn, handleClose, busy, done])

  const fail = (msg, action = null) => {
    setErr(msg)
    setErrAction(action)
    setShake(false)
    requestAnimationFrame(() => setShake(true))
  }

  const computeStrength = useCallback((p) => {
    const nextCrit = {
      len: RULES.len(p),
      up: RULES.up(p),
      num: RULES.num(p),
      sym: RULES.sym(p),
    }
    setCrit(nextCrit)
    let n = Object.values(nextCrit).filter(Boolean).length
    if (p.length >= 12 && n >= 3) n = Math.min(4, n + 1)
    const score = p ? n : 0
    setStrength(score)
    setStrengthColor(p ? STRENGTH_COLORS[score] : '')
    return score
  }, [])

  useEffect(() => {
    computeStrength(rPass)
    if (!rPass2) {
      setMatchMsg('')
      return
    }
    const ok = rPass === rPass2
    setMatchOk(ok)
    setMatchMsg(ok ? t('auth.register.matchOk') : t('auth.register.matchNo'))
  }, [rPass, rPass2, computeStrength, t])

  useEffect(() => {
    clearTimeout(availTimer.current ?? undefined)
    const v = rCall.trim()
    if (!v) {
      setAvail('')
      setCallHintBad(false)
      return
    }
    if (!callsignUsernameOk(v)) {
      setAvail('invalid')
      setCallHintBad(true)
      return
    }
    setCallHintBad(false)
    setAvail('wait')
    availTimer.current = setTimeout(() => {
      const key = normalizeUsername(v)
      void isUsernameAvailable(key)
        .then((free) => setAvail(free ? 'ok' : 'no'))
        .catch(() => setAvail('offline'))
    }, 400)
  }, [rCall])

  const goStep = (s, silent = false) => {
    const back = s < step
    setBackAnim(back)
    setStep(s)
    setErr('')
    setErrAction(null)
    if (!silent) {
      window.setTimeout(() => {
        dialogRef.current?.querySelector(`.lp-stp[data-s="${s}"] input`)?.focus()
      }, 60)
    }
  }

  const setModeAndReset = (m) => {
    setMode(m)
    if (m === 'reg') setStep(1)
    setErr('')
    setErrAction(null)
  }

  const toggleFocus = (index) => {
    setFocusSel((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index)
      if (prev.length >= 3) {
        setGlowNote(t('auth.register.focusMax'))
        return prev
      }
      return [...prev, index]
    })
  }

  useEffect(() => {
    if (!focusSel.length) {
      setGlowNote('')
      return
    }
    const labels = focusSel.map((i) => t(FOCUS_CHIPS[i].key))
    setGlowNote(t('auth.register.focusGlow', { areas: labels.join(', ') }))
  }, [focusSel, t])

  const finishSuccessNav = useCallback(() => {
    handleClose()
    navigate(postAuthPath, { replace: true })
  }, [handleClose, navigate, postAuthPath])

  const runLogin = async () => {
    setErr('')
    setErrAction(null)
    setSeqFailAt(null)
    setBusy(true)
    setSeqLines(1)
    try {
      if (!auth) throw new Error('Firebase yapılandırılmadı')
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
      setSeqLines(2)
      const cred = await signInWithEmailPassword(fMail.trim(), fPass)
      setSeqLines(3)
      const needsVerify = userRequiresEmailVerification(cred.user)
      const next = needsVerify ? '/verify-email' : '/dashboard'
      setPostAuthPath(next)
      setSeqLines(4)
      await new Promise((r) => setTimeout(r, reduce ? 80 : 280))
      setDone(true)
    } catch (error) {
      setSeqFailAt(Math.max(1, seqLines || 2))
      await new Promise((r) => setTimeout(r, reduce ? 160 : 480))
      setSeqLines(0)
      fail(mapLoginError(error))
    } finally {
      setBusy(false)
      submitLock.current = false
    }
  }

  const runRegister = async () => {
    setErr('')
    setErrAction(null)
    setSeqFailAt(null)
    setBusy(true)
    const callsign = rCall.trim()
    const username = normalizeUsername(callsign)
    const focusIds = focusSel.map((i) => FOCUS_CHIPS[i].key.replace('auth.register.focus.', ''))

    try {
      setSeqLines(1)
      let free = false
      try {
        free = await isUsernameAvailable(username)
      } catch {
        free = true
      }
      if (!free) {
        setSeqFailAt(1)
        setAvail('no')
        await new Promise((r) => setTimeout(r, reduce ? 160 : 480))
        goStep(1, true)
        fail(t('auth.errors.callsignTaken'))
        return
      }

      await registerWithEmailPassword({
        email: rMail.trim(),
        password: rPass,
        username,
        callsign,
        bloodType: '',
        status: betaMode ? 'Beta' : 'Sivil',
        role: 'member',
        accountStatus: 'active',
        onStep: (s) => {
          if (s === 'auth') setSeqLines(2)
          if (s === 'profile') setSeqLines(3)
          if (s === 'verify') setSeqLines(5)
        },
      })

      setSeqLines(4)
      writeLandingOnboarding({
        profession: professionId,
        focus: focusIds,
      })

      if (sendVerify) setSeqLines(5)
      else setSeqLines(4)

      try {
        await recordRegistrationConsents?.()
      } catch {
        /* Kayıt tamam; protokol onayı ayarlardan tekrarlanabilir */
      }

      setOkChips(focusSel.map((i) => ({ label: t(FOCUS_CHIPS[i].key), color: FOCUS_CHIPS[i].color })))
      const needsVerify = sendVerify
      setPostAuthPath(needsVerify ? '/verify-email' : '/dashboard')
      await new Promise((r) => setTimeout(r, reduce ? 80 : 280))
      setDone(true)
    } catch (error) {
      const mapped = mapRegisterError(error)
      if (mapped.usernameTaken) {
        setSeqFailAt(1)
        setAvail('no')
      } else {
        setSeqFailAt(Math.max(1, seqLines || 2))
      }
      await new Promise((r) => setTimeout(r, reduce ? 160 : 480))
      if (mapped.usernameTaken) goStep(1, true)
      setSeqLines(0)
      fail(mapped.msg, mapped.action)
    } finally {
      setBusy(false)
      submitLock.current = false
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (busy || done || submitLock.current) return

    if (mode === 'in') {
      if (!mailOk(fMail.trim())) return fail(t('auth.errors.invalidEmail'))
      if (fPass.length < 6) return fail(t('auth.errors.passwordMinLogin'))
      submitLock.current = true
      void runLogin()
      return
    }

    if (step === 1) {
      const v = rCall.trim()
      if (!callsignUsernameOk(v)) return fail(t('auth.errors.callsignFormat'))
      if (avail === 'no') return fail(t('auth.errors.callsignTaken'))
      if (avail === 'invalid') return fail(t('auth.errors.callsignFormat'))
      if (!mailOk(rMail.trim())) return fail(t('auth.errors.invalidEmail'))
      goStep(2)
      return
    }

    if (step === 2) {
      const sc = computeStrength(rPass)
      if (sc < 3) return fail(t('auth.errors.passwordWeak'))
      if (rPass !== rPass2) return fail(t('auth.errors.passwordMismatch'))
      goStep(3)
      return
    }

    if (!rAge) return fail(t('auth.errors.ageRequired'))
    submitLock.current = true
    void runRegister()
  }

  const forgot = async (e) => {
    e.preventDefault()
    const email = fMail.trim()
    if (!email) {
      fail(t('auth.errors.forgotNeedEmail'))
      dialogRef.current?.querySelector('#fMail')?.focus()
      return
    }
    if (!mailOk(email)) return fail(t('auth.errors.invalidEmail'))
    const now = Date.now()
    if (now < resetCooldownUntil.current) {
      fail(t('auth.errors.forgotCooldown'))
      return
    }
    try {
      if (!auth) throw new Error('Firebase yapılandırılmadı')
      auth.languageCode = (i18n.language || 'tr').startsWith('en') ? 'en' : 'tr'
      await sendPasswordResetEmail(auth, email)
    } catch {
      /* Aynı genel mesaj — kullanıcı numaralandırma yok */
    }
    resetCooldownUntil.current = now + 60_000
    setErr(t('auth.login.forgotSent'))
    setErrAction(null)
  }

  if (!mounted) return null

  const cardClass = [
    'lp-card',
    mode === 'reg' ? 'lp-isreg' : '',
    mode === 'reg' ? `s${step}` : '',
    busy ? 'lp-busy' : '',
    done ? 'lp-done' : '',
    shake ? 'shake' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const progressKeys =
    mode === 'in'
      ? ['auth.progress.login.0', 'auth.progress.login.1', 'auth.progress.login.2', 'auth.progress.login.3']
      : sendVerify
        ? [
            'auth.progress.register.0',
            'auth.progress.register.1',
            'auth.progress.register.2',
            'auth.progress.register.3',
            'auth.progress.register.4',
          ]
        : [
            'auth.progress.register.0',
            'auth.progress.register.1',
            'auth.progress.register.2',
            'auth.progress.register.3',
          ]

  const availLabel =
    avail === 'wait'
      ? t('auth.register.availChecking')
      : avail === 'ok'
        ? t('auth.register.availOk')
        : avail === 'no'
          ? t('auth.register.availTaken')
          : avail === 'invalid'
            ? t('auth.register.availInvalid')
            : avail === 'offline'
              ? t('auth.register.availOffline')
              : ''

  return (
    <div
      ref={dialogRef}
      className={`lp-auth${animOn ? ' lp-on' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('auth.dialogAria')}
    >
      <div className="lp-side">
        <div className="lp-crest">
          <div className="lp-ring" />
          <div className="lp-ring b" />
          <img src={crest} alt="" />
          <div className="lp-scan" />
        </div>
        <div className="lp-motto">
          <b>{mode === 'in' ? t('auth.motto.loginTitle') : t('auth.motto.registerTitle')}</b>
          <span>{mode === 'in' ? t('auth.motto.loginSub') : t('auth.motto.registerSub')}</span>
        </div>
        <div className="lp-ticker">
          <div>
            <i>●</i> {t('auth.ticker.encrypted')}
          </div>
          <div>
            <i>●</i> {t('auth.ticker.owned')}
          </div>
          <div>
            <i>●</i> {t('auth.ticker.noroOnline')}
          </div>
        </div>
      </div>
      <div className="lp-main">
        <button
          type="button"
          className="x"
          aria-label={t('auth.close')}
          tabIndex={done ? -1 : undefined}
          onClick={handleClose}
        >
          ×
        </button>
        <div className={cardClass}>
          {done ? null : (
            <div className="lp-hd">
              <img src={mark} alt="" />
              <div>
                <b>{mode === 'in' ? t('auth.cardTitleLogin') : t('auth.cardTitleRegister')}</b>
                <span>{t('auth.secureLink')}</span>
              </div>
            </div>
          )}

          {done ? (
            <div className="lp-ok">
              <img src={mark} alt="" />
              <b>
                {mode === 'in'
                  ? t('auth.success.loginTitle')
                  : t('auth.success.registerTitle', { callsign: rCall.trim() })}
              </b>
              <p>{mode === 'in' ? t('auth.success.loginBody') : t('auth.success.registerBody')}</p>
              <div className="lp-okchips">
                {okChips.map((c) => (
                  <span key={c.label} style={{ '--c': c.color }}>
                    {c.label}
                  </span>
                ))}
              </div>
              <button type="button" className="lp-btn lp-gold lp-go" onClick={finishSuccessNav}>
                {mode === 'in' ? t('auth.success.goDashboard') : t('auth.success.firstLog')}
              </button>
            </div>
          ) : null}

          {busy && !done ? (
            <div className="lp-seq" tabIndex={-1} aria-live="polite" aria-busy="true">
              {progressKeys.map((key, i) => (
                <div
                  key={key}
                  className={`l${
                    seqFailAt === i + 1
                      ? ' lp-fail'
                      : seqLines > i + 1
                        ? ' lp-done'
                        : seqLines === i + 1
                          ? ' lp-on'
                          : ''
                  }`}
                >
                  <i />
                  {t(key)}
                </div>
              ))}
            </div>
          ) : null}

          {!busy && !done ? (
            <>
          <div className="lp-tabs" role="tablist">
            <span className="lp-pill" style={{ transform: mode === 'reg' ? 'translateX(100%)' : 'none' }} />
            <button type="button" role="tab" aria-selected={mode === 'in'} onClick={() => setModeAndReset('in')}>
              {t('auth.tabLogin')}
            </button>
            <button type="button" role="tab" aria-selected={mode === 'reg'} onClick={() => setModeAndReset('reg')}>
              {t('auth.tabRegister')}
            </button>
          </div>

          <form id={formId} onSubmit={onSubmit} noValidate>
            <div className="lp-login-only">
              <div className="lp-fld">
                <input
                  id="fMail"
                  type="email"
                  placeholder=" "
                  autoComplete="email"
                  value={fMail}
                  onChange={(e) => setFMail(e.target.value)}
                />
                <label htmlFor="fMail">{t('auth.fields.email')}</label>
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M4 5h16v14H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </div>
              <div className="lp-fld">
                <input
                  id="fPass"
                  type={showLoginPass ? 'text' : 'password'}
                  placeholder=" "
                  autoComplete="current-password"
                  value={fPass}
                  onChange={(e) => setFPass(e.target.value)}
                />
                <label htmlFor="fPass">{t('auth.fields.password')}</label>
                <svg viewBox="0 0 24 24" aria-hidden>
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <button
                  type="button"
                  className="lp-eye"
                  aria-label={t('auth.togglePassword')}
                  onClick={() => setShowLoginPass((v) => !v)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
              <div className="lp-row2">
                <label>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />{' '}
                  {t('auth.login.remember')}
                </label>
                <a href="#forgot" onClick={forgot}>
                  {t('auth.login.forgot')}
                </a>
              </div>
            </div>

            <div className="lp-reg-only">
              <ol className="lp-steps3">
                {[1, 2, 3].map((n) => (
                  <li key={n} className={step > n ? 'lp-done' : step === n ? 'lp-on' : ''}>
                    <i>{n}</i>
                    <span>{t(`auth.register.steps.${n}`)}</span>
                  </li>
                ))}
              </ol>

              <div className={`lp-stp${step === 1 ? ' lp-on' : ''}${backAnim && step === 1 ? ' lp-bk' : ''}`} data-s="1">
                <p className="lp-sub">{t('auth.register.step1Sub')}</p>
                <div className="lp-fld">
                  <input
                    id="rCall"
                    placeholder=" "
                    autoComplete="nickname"
                    maxLength={24}
                    value={rCall}
                    onChange={(e) => setRCall(e.target.value)}
                  />
                  <label htmlFor="rCall">{t('auth.fields.callsign')}</label>
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
                  </svg>
                  <span
                    className={`lp-avail${
                      avail === 'ok'
                        ? ' lp-a-ok'
                        : avail === 'no' || avail === 'invalid'
                          ? ' lp-a-no'
                          : avail === 'wait' || avail === 'offline'
                            ? ' lp-a-wait'
                            : ''
                    }`}
                  >
                    {availLabel}
                  </span>
                </div>
                <div className={`lp-hint${callHintBad ? ' lp-bad' : ''}`}>{t('auth.register.callsignHint')}</div>
                <div className="lp-fld">
                  <input
                    id="rMail"
                    type="email"
                    placeholder=" "
                    autoComplete="email"
                    value={rMail}
                    onChange={(e) => setRMail(e.target.value)}
                  />
                  <label htmlFor="rMail">{t('auth.fields.email')}</label>
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M4 5h16v14H4z" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                </div>
                <div className="lp-hint">{t('auth.register.verifyHint')}</div>
              </div>

              <div className={`lp-stp${step === 2 ? ' lp-on' : ''}${backAnim && step === 2 ? ' lp-bk' : ''}`} data-s="2">
                <p className="lp-sub">{t('auth.register.step2Sub')}</p>
                <div className="lp-fld">
                  <input
                    id="rPass"
                    type={showRegPass ? 'text' : 'password'}
                    placeholder=" "
                    autoComplete="new-password"
                    value={rPass}
                    onChange={(e) => setRPass(e.target.value)}
                  />
                  <label htmlFor="rPass">{t('auth.fields.password')}</label>
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <button
                    type="button"
                    className="lp-eye"
                    aria-label={t('auth.togglePassword')}
                    onClick={() => setShowRegPass((v) => !v)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
                <div className="lp-meter">
                  {[0, 1, 2, 3].map((k) => (
                    <i key={k} style={{ background: rPass && k < Math.max(1, strength) ? strengthColor : '' }} />
                  ))}
                </div>
                <div className="lp-mlbl" style={{ color: rPass ? strengthColor : undefined }}>
                  {rPass
                    ? t('auth.register.strengthLabel', { label: t(STRENGTH_KEYS[strength]) })
                    : t('auth.register.strengthEmpty')}
                </div>
                <ul className="lp-crit" id="crit">
                  {(['len', 'up', 'num', 'sym']).map((k) => (
                    <li key={k} data-k={k} className={crit[k] ? 'lp-met' : ''}>
                      {t(`auth.register.crit.${k}`)}
                    </li>
                  ))}
                </ul>
                <div className="lp-fld">
                  <input
                    id="rPass2"
                    type={showRegPass2 ? 'text' : 'password'}
                    placeholder=" "
                    autoComplete="new-password"
                    value={rPass2}
                    onChange={(e) => setRPass2(e.target.value)}
                  />
                  <label htmlFor="rPass2">{t('auth.fields.passwordRepeat')}</label>
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <button
                    type="button"
                    className="lp-eye"
                    aria-label={t('auth.togglePassword')}
                    onClick={() => setShowRegPass2((v) => !v)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <span className={`lp-avail${matchMsg ? (matchOk ? ' lp-a-ok' : ' lp-a-no') : ''}`}>{matchMsg}</span>
                </div>
              </div>

              <div className={`lp-stp${step === 3 ? ' lp-on' : ''}${backAnim && step === 3 ? ' lp-bk' : ''}`} data-s="3">
                <p className="lp-sub">{t('auth.register.step3Sub')}</p>
                <p className="lp-glbl">
                  {t('auth.register.professionTitle')}{' '}
                  <em>{t('auth.register.professionHint')}</em>
                </p>
                <div className="lp-chips" data-max="1">
                  {PROFESSION_CHIPS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      aria-pressed={professionId === chip.id}
                      onClick={() => setProfessionId((prev) => (prev === chip.id ? null : chip.id))}
                    >
                      {t(chip.key)}
                    </button>
                  ))}
                </div>
                <p className="lp-glbl">
                  {t('auth.register.focusTitle')}{' '}
                  <em>{t('auth.register.focusMaxHint')}</em>
                </p>
                <div className="lp-chips" data-max="3">
                  {FOCUS_CHIPS.map((chip, i) => (
                    <button
                      key={chip.key}
                      type="button"
                      style={{ '--c': chip.color }}
                      aria-pressed={focusSel.includes(i)}
                      onClick={() => toggleFocus(i)}
                    >
                      {t(chip.key)}
                    </button>
                  ))}
                </div>
                <div className="lp-glow-note">{glowNote}</div>
                <label className="lp-agree">
                  <input type="checkbox" checked={rAge} onChange={(e) => setRAge(e.target.checked)} />
                  <span>
                    {t('auth.register.agePrefix')}{' '}
                    <Link to="/kilavuz" target="_blank" rel="noopener noreferrer">
                      {t('auth.register.termsLink')}
                    </Link>{' '}
                    {t('auth.register.ageAnd')}{' '}
                    <Link to="/kilavuz" target="_blank" rel="noopener noreferrer">
                      {t('auth.register.kvkkLink')}
                    </Link>{' '}
                    {t('auth.register.ageSuffix')}
                  </span>
                </label>
              </div>
            </div>

            <div className="lp-err">
              {err}
              {errAction === 'switch-login' ? (
                <>
                  {' '}
                  <button type="button" className="lp-err-link" onClick={() => setModeAndReset('in')}>
                    {t('auth.errors.switchToLogin')}
                  </button>
                </>
              ) : null}
            </div>

            <div className="lp-btns">
              {mode === 'reg' && step > 1 ? (
                <button type="button" className="lp-btn lp-back" disabled={busy} onClick={() => goStep(step - 1)}>
                  {t('auth.register.back')}
                </button>
              ) : null}
              <button type="submit" className="lp-btn lp-gold lp-go" disabled={busy}>
                {mode === 'in'
                  ? t('auth.submitLogin')
                  : step < 3
                    ? t('auth.submitContinue')
                    : t('auth.submitCreate')}
              </button>
            </div>
          </form>

          <div className="lp-foot">{t('auth.footer')}</div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
