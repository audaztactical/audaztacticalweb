import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import mark from '../../assets/landing-mark.png'
import crest from '../../assets/landing-crest.png'
import { useAuth } from '../../context/AuthContext'
import { useLanguagePreference } from '../../context/LanguagePreferenceContext'
import AuthModal from './AuthModal'
import LandingBrain from './LandingBrain'
import {
  CHAT_LINES,
  MARQUEE_KEYS,
  MODULE_ICONS,
  MODULES,
  REGIONS,
  REGIONS_BY_ID,
} from './landingData'
import './landing.css'

export default function Landing() {
  const { t, i18n } = useTranslation('landing')
  const { language, setLanguage } = useLanguagePreference()
  const { user, loading, profileLoading, userData, registrationInProgress } = useAuth()
  const navigate = useNavigate()

  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState(/** @type {'in'|'reg'} */ ('in'))
  const msgsRef = useRef(null)
  const chatAnimated = useRef(false)

  useEffect(() => {
    document.title = t('meta.title')
  }, [t, i18n.language])

  useEffect(() => {
    if (loading || registrationInProgress || !user) return
    if (profileLoading || !userData?.username?.trim()) return
    navigate('/dashboard', { replace: true })
  }, [user, loading, registrationInProgress, profileLoading, userData?.username, navigate])

  const openAuth = useCallback((mode = 'in') => {
    setAuthMode(mode)
    setAuthOpen(true)
  }, [])

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#giris') openAuth('in')
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [openAuth])

  useEffect(() => {
    const root = msgsRef.current
    if (!root || chatAnimated.current) return undefined
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          const msgs = [...root.querySelectorAll('.m')]
          msgs.forEach((m, k) => {
            window.setTimeout(() => m.classList.add('lp-show'), reduce ? 0 : k * 650)
          })
          chatAnimated.current = true
          io.disconnect()
        })
      },
      { threshold: 0.3 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  const langIsTr = (language || i18n.language || 'tr').startsWith('tr')

  return (
    <div className="landing-root">
      <nav className="lp-top">
        <div className="lp-wrap lp-row">
          <Link className="lp-logo" to="/" aria-label={t('nav.homeAria')}>
            <img src={mark} alt="" />
            <span>
              AUDAZ <b>TACTICAL</b>
            </span>
          </Link>
          <div className="lp-links">
            <a href="#nasil">{t('nav.how')}</a>
            <a href="#beyin">{t('nav.brain')}</a>
            <a href="#noro">{t('nav.noro')}</a>
            <a href="#moduller">{t('nav.modules')}</a>
            <a href="#gizlilik">{t('nav.privacy')}</a>
          </div>
          <div className="lp-act">
            <div className="lp-lang" aria-label={t('nav.langAria')}>
              <span
                className={langIsTr ? 'lp-on' : ''}
                role="button"
                tabIndex={0}
                onClick={() => void setLanguage('tr')}
                onKeyDown={(e) => e.key === 'Enter' && void setLanguage('tr')}
              >
                TR
              </span>
              <span
                className={!langIsTr ? 'lp-on' : ''}
                role="button"
                tabIndex={0}
                onClick={() => void setLanguage('en')}
                onKeyDown={(e) => e.key === 'Enter' && void setLanguage('en')}
              >
                EN
              </span>
            </div>
            {!loading && user ? (
              <Link className="lp-btn lp-gold" to="/dashboard">
                {t('nav.goToPanel')}
              </Link>
            ) : (
              <>
                <button type="button" className="lp-btn" onClick={() => openAuth('in')}>
                  {t('nav.signIn')}
                </button>
                <button type="button" className="lp-btn lp-gold" onClick={() => openAuth('reg')}>
                  {t('nav.joinNow')}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="lp-hero" id="top">
        <div className="lp-wrap lp-grid">
          <div>
            <div className="lp-eyebrow">{t('hero.eyebrow')}</div>
            <h1 dangerouslySetInnerHTML={{ __html: t('hero.headlineHtml') }} />
            <p className="lp-lede">{t('hero.lede')}</p>
            <div className="lp-cta">
              <button type="button" className="lp-btn lp-gold lp-lg" onClick={() => openAuth('reg')}>
                {t('hero.ctaPrimary')}
              </button>
              <a className="lp-btn lp-lg" href="#beyin">
                {t('hero.ctaSecondary')}
              </a>
            </div>
            <div className="lp-trust">
              {['hero.trust.0', 'hero.trust.1', 'hero.trust.2', 'hero.trust.3'].map((key) => (
                <span key={key}>{t(key)}</span>
              ))}
            </div>
          </div>
          <LandingBrain />
        </div>
      </header>

      <div className="lp-marq" aria-hidden="true">
        <div className="lp-track">
          {[...MARQUEE_KEYS, ...MARQUEE_KEYS].map((key, i) => (
            <span key={`${key}-${i}`}>{t(key)}</span>
          ))}
        </div>
      </div>

      <section id="nasil">
        <div className="lp-wrap">
          <div className="lp-eyebrow">{t('how.eyebrow')}</div>
          <h2 style={{ marginTop: 14 }}>{t('how.title')}</h2>
          <div className="lp-steps">
            {[1, 2, 3].map((n) => (
              <div key={n} className="lp-step">
                <div className="n">{t(`how.steps.${n}.label`)}</div>
                <h3>{t(`how.steps.${n}.title`)}</h3>
                <p>{t(`how.steps.${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="beyin" style={{ paddingTop: 0 }}>
        <div className="lp-wrap lp-split">
          <div>
            <div className="lp-eyebrow">{t('brain.eyebrow')}</div>
            <h2 style={{ marginTop: 14 }} dangerouslySetInnerHTML={{ __html: t('brain.titleHtml') }} />
            <p className="lp-lede" style={{ marginTop: 18 }}>
              {t('brain.lede')}
            </p>
            <div className="lp-facts">
              {[1, 2, 3].map((n) => (
                <div key={n} className="lp-fact">
                  <div className="k">{t(`brain.facts.${n}.key`)}</div>
                  <p dangerouslySetInnerHTML={{ __html: t(`brain.facts.${n}.html`) }} />
                </div>
              ))}
            </div>
          </div>
          <div className="lp-regions">
            {REGIONS.map((r) => (
              <div key={r.id} className="reg" style={{ '--c': r.color }}>
                <i />
                <div>
                  <b>{t(r.nameKey)}</b>
                  <span>
                    {t(r.funcKey)} · {t(r.modulesKey)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-noro" id="noro">
        <div className="lp-wrap lp-split" style={{ alignItems: 'center' }}>
          <div className="lp-chat" aria-label={t('noro.chatAria')}>
            <div className="lp-ah">
              <span className="lp-orbm" />
              <div>
                <b>{t('noro.name')}</b>
                <small>{t('noro.status')}</small>
              </div>
            </div>
            <div className="lp-msgs" ref={msgsRef}>
              {CHAT_LINES.map((line, i) => (
                <div
                  key={line.htmlKey}
                  className={`m${line.me ? ' lp-me' : ''}`}
                  dangerouslySetInnerHTML={{ __html: t(line.htmlKey) }}
                />
              ))}
              <div className="lp-note">{t('noro.chatNote')}</div>
            </div>
          </div>
          <div>
            <div className="lp-eyebrow">{t('noro.eyebrow')}</div>
            <h2 style={{ marginTop: 14 }} dangerouslySetInnerHTML={{ __html: t('noro.titleHtml') }} />
            <p className="lp-lede" style={{ marginTop: 18 }}>
              {t('noro.lede')}
            </p>
            <ul className="lp-feat">
              {[1, 2, 3].map((n) => (
                <li key={n}>
                  <span className="lp-ic">
                    <svg viewBox="0 0 24 24" aria-hidden>
                      {n === 1 && <path d="M3 12h4l3 8 4-16 3 8h4" />}
                      {n === 2 && (
                        <>
                          <path d="M4 5h16v10H8l-4 4z" />
                          <path d="M8 9h8M8 12h5" />
                        </>
                      )}
                      {n === 3 && (
                        <>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 8v4l3 2" />
                        </>
                      )}
                    </svg>
                  </span>
                  <div>
                    <b>{t(`noro.features.${n}.title`)}</b>
                    {t(`noro.features.${n}.body`)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="moduller">
        <div className="lp-wrap">
          <div className="lp-eyebrow">{t('modules.eyebrow')}</div>
          <h2 style={{ marginTop: 14 }}>{t('modules.title')}</h2>
          <div className="lp-mods">
            {MODULES.map((mod) => {
              const reg = REGIONS_BY_ID[mod.regionId]
              return (
                <div key={mod.titleKey} className={`lp-mod${mod.soon ? ' lp-soon' : ''}`}>
                  <span className="lp-rg" style={{ '--c': reg?.color }}>
                    <i />
                    {reg ? t(reg.shortKey) : ''}
                  </span>
                  <span className="lp-ic">
                    <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: MODULE_ICONS[mod.icon] }} />
                  </span>
                  <h3>
                    {t(mod.titleKey)}
                    {mod.soon ? <span className="lp-tag">{t('modules.soonTag')}</span> : null}
                  </h3>
                  <p>{t(mod.descKey)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="gizlilik" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="lp-eyebrow">{t('privacy.eyebrow')}</div>
          <h2 style={{ marginTop: 14 }}>{t('privacy.title')}</h2>
          <div className="lp-priv">
            {[1, 2, 3].map((n) => (
              <div key={n} className="lp-pv">
                <div className="k">{t(`privacy.cards.${n}.k`)}</div>
                <h3>{t(`privacy.cards.${n}.title`)}</h3>
                <p>{t(`privacy.cards.${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-final" id="basla" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="lp-box">
            <img
              src={crest}
              alt=""
              style={{
                height: 150,
                margin: '0 auto 20px',
                display: 'block',
                filter: 'drop-shadow(0 0 30px rgba(242,194,48,.2))',
              }}
            />
            <div className="lp-eyebrow">{t('final.eyebrow')}</div>
            <h2 style={{ marginTop: 16 }}>{t('final.title')}</h2>
            <p className="lp-lede">{t('final.lede')}</p>
            <button type="button" className="lp-btn lp-gold lp-lg" onClick={() => openAuth('reg')}>
              {t('final.cta')}
            </button>
          </div>
        </div>
      </section>

      <footer>
        <div className="lp-wrap lp-row">
          <span className="lp-logo" style={{ fontSize: 13 }}>
            <img src={mark} alt="" style={{ height: 26 }} />
            AUDAZ <b>TACTICAL</b>
          </span>
          <span>{t('footer.line')}</span>
          <span>
            <Link to="/kilavuz">{t('footer.terms')}</Link>
            {' · '}
            <Link to="/kilavuz">{t('footer.privacy')}</Link>
            {' · '}
            <a href="mailto:info@audazworks.com">{t('footer.contact')}</a>
          </span>
        </div>
      </footer>

      <AuthModal open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
