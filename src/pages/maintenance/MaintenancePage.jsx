import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import logoUrl from '../../assets/logo.png'
import { mountMaintenanceRuntime } from './brain3d/engine.js'
import Brain3DStage from './Brain3DStage'
import MaintenanceNoro from './MaintenanceNoro'
import MaintenanceTour from './MaintenanceTour'
import SoonPanel from './SoonPanel'
import './maintenance.css'

/** M2: waitlist — network request goes here later */
export function onNotify() {
  // M2: bekleme listesi
}

/**
 * Full-screen maintenance experience (3D Operator Brain + NÖRO tour + soon panel).
 * @param {{ onTeamLogin?: () => void, nonAdminHint?: boolean }} props
 */
export default function MaintenancePage({ onTeamLogin, nonAdminHint = false }) {
  const { t, i18n } = useTranslation('maintenance')
  const rootRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    const prevTitle = document.title
    document.title = t('meta.title')
    let robots = document.querySelector('meta[name="robots"]')
    let created = false
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
      created = true
    }
    const prevRobots = robots.getAttribute('content')
    robots.setAttribute('content', 'noindex')

    const root = rootRef.current
    if (!root) return undefined

    const logoImg = root.querySelector('.logo img')
    if (logoImg) logoImg.src = logoUrl

    apiRef.current = mountMaintenanceRuntime(root, {
      onNotify,
      locale: i18n.language,
    })

    if (nonAdminHint) {
      // Peek after tour/boot settles — engine may hide asst during tour
      const tId = setTimeout(() => {
        try {
          const peek = root.querySelector('#mnt-apeek')
          const btn = root.querySelector('#mnt-abtn')
          if (peek && btn) {
            peek.hidden = false
            peek.innerHTML = `<span class="who">NÖRO</span>${t('noro.teamOnly')}`
            btn.classList.add('talk')
            setTimeout(() => btn.classList.remove('talk'), 600)
          }
        } catch (_) {
          /* ignore */
        }
      }, 1200)
      return () => {
        clearTimeout(tId)
        apiRef.current?.dispose()
        document.title = prevTitle
        if (created) robots.remove()
        else if (prevRobots != null) robots.setAttribute('content', prevRobots)
        else robots.removeAttribute('content')
      }
    }

    return () => {
      apiRef.current?.dispose()
      document.title = prevTitle
      if (created) robots.remove()
      else if (prevRobots != null) robots.setAttribute('content', prevRobots)
      else robots.removeAttribute('content')
    }
  }, [t, i18n.language, nonAdminHint])

  return (
    <div className="mnt-root" ref={rootRef} data-theme="dark">
      <Brain3DStage label={t('stage.label')} />
      <div className="hud" id="mnt-hud">
        <div className="brand">
          <div className="logo">
            <img src={logoUrl} alt="" />
            <span>
              AUDAZ <b>TACTICAL</b>
            </span>
          </div>
          <div className="ttl">{t('brand.title')}</div>
          <div className="sub">{t('brand.sub')}</div>
          <button type="button" className="replay" id="mnt-replay">
            {t('tour.replay')}
          </button>
          <div className="tot">
            <b id="mnt-tl">0</b>
            <span>{t('brand.total')}</span>
          </div>
        </div>
        <div className="legend" id="mnt-legend">
          <span>
            <kbd>{t('legend.dragKey')}</kbd> {t('legend.drag')}
          </span>
          <span>
            <kbd>{t('legend.wheelKey')}</kbd> {t('legend.wheel')}
          </span>
          <span>
            <kbd>{t('legend.clickKey')}</kbd> {t('legend.click')}
          </span>
          <span>
            <kbd>{t('legend.dblKey')}</kbd> {t('legend.dbl')}
          </span>
        </div>
        <SoonPanel t={t} />
      </div>
      <MaintenanceNoro t={t} />
      <MaintenanceTour t={t} />
      <div className="toast" id="mnt-toast" />
      <div className="loading" id="mnt-loading">
        {t('loading')}
      </div>
      <div className="nogl" id="mnt-nogl">
        <div>
          <b style={{ color: '#eef2ef' }}>{t('nogl.title')}</b>
          <br />
          {t('nogl.body')}
        </div>
      </div>
      <button type="button" className="team-login" onClick={() => onTeamLogin?.()}>
        {t('teamLogin')}
      </button>
    </div>
  )
}
