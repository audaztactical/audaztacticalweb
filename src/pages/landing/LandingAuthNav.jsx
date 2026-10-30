import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signOut } from 'firebase/auth'
import { ChevronDown, Compass, LogOut, Settings, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguagePreference } from '../../context/LanguagePreferenceContext'
import { useInstructorNavItem, useNavGroups } from '../../hooks/useNavLabels'
import { useNeuralState } from '../../hooks/useNeuralState'
import { auth } from '../../lib/firebase'
import { applyInstructorNavVisibility } from '../../lib/navStructure'
import { isNeuralPreviewEnabled } from '../../lib/neural/neuralPreview'
import {
  buildLandingAuthMenus,
  findInstructorNavItem,
  LANDING_BRAIN_STATIC,
  LANDING_EXPLORE_ITEMS,
} from './landingNavMap'

const OPEN_DELAY_MS = 150
const CLOSE_DELAY_MS = 250

/**
 * @param {{ onNavigate?: () => void }} props
 */
export default function LandingAuthNav({ onNavigate }) {
  const { t, i18n } = useTranslation('landing')
  const { t: tNav } = useTranslation('nav')
  const { language, setLanguage } = useLanguagePreference()
  const { user, userData, role, isInstructor } = useAuth()
  const navGroups = useNavGroups()
  const instructorNavItem = useInstructorNavItem()
  const neuralOn = isNeuralPreviewEnabled()
  const neural = useNeuralState()

  const [openId, setOpenId] = useState(/** @type {string | null} */ (null))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const rootRef = useRef(/** @type {HTMLElement | null} */ (null))
  const openTimer = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const closeTimer = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const baseId = useId()

  const visibleGroups = useMemo(
    () => applyInstructorNavVisibility(navGroups, instructorNavItem, { role, isInstructor }),
    [navGroups, instructorNavItem, role, isInstructor],
  )

  const menus = useMemo(() => buildLandingAuthMenus(visibleGroups), [visibleGroups])
  const instructorItem = useMemo(() => findInstructorNavItem(visibleGroups), [visibleGroups])

  const callsign =
    (typeof userData?.callsign === 'string' && userData.callsign.trim()) ||
    user?.displayName ||
    t('authNav.operatorFallback')
  const totalLevel = neuralOn && neural?.state?.totalLevel != null ? neural.state.totalLevel : null

  const langIsTr = (language || i18n.language || 'tr').startsWith('tr')

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current)
    if (closeTimer.current) clearTimeout(closeTimer.current)
    openTimer.current = null
    closeTimer.current = null
  }

  const closeAll = useCallback(() => {
    clearTimers()
    setOpenId(null)
  }, [])

  const openMenu = useCallback((id) => {
    clearTimers()
    setOpenId(id)
  }, [])

  const scheduleOpen = (id) => {
    clearTimers()
    openTimer.current = setTimeout(() => setOpenId(id), OPEN_DELAY_MS)
  }

  const scheduleClose = () => {
    clearTimers()
    closeTimer.current = setTimeout(() => setOpenId(null), CLOSE_DELAY_MS)
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (!mobileOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(/** @type {Node} */ (e.target))) {
        closeAll()
        setMobileOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeAll()
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [closeAll])

  const handleSignOut = async () => {
    if (!auth || signingOut) return
    setSigningOut(true)
    try {
      await signOut(auth)
      closeAll()
      setMobileOpen(false)
      onNavigate?.()
    } finally {
      setSigningOut(false)
    }
  }

  const itemLabel = (item) => {
    if (item.labelKey === 'items.hqReturn') return t('authNav.operatorBrain')
    return item.label
  }

  const renderMenuItems = (menu, { accordion = false } = {}) => (
    <ul className="lp-dd-list" role="menu" id={`${baseId}-${menu.id}-menu`}>
      {menu.items.map((item) => {
        const Icon = item.icon
        return (
          <li key={`${menu.id}-${item.to}`} role="none">
            <Link
              role="menuitem"
              to={item.to}
              className="lp-dd-item"
              onClick={() => {
                closeAll()
                setMobileOpen(false)
                onNavigate?.()
              }}
            >
              {Icon ? <Icon className="lp-dd-ico" aria-hidden size={16} strokeWidth={1.75} /> : null}
              <span className="lp-dd-txt">
                <span className="lp-dd-title">
                  {itemLabel(item)}
                  {item.soon ? <em className="lp-soon">{t('authNav.soon')}</em> : null}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
      {menu.id === 'brain' ? (
        <li role="none">
          <a
            role="menuitem"
            href={LANDING_BRAIN_STATIC.href}
            className="lp-dd-item"
            onClick={() => {
              closeAll()
              setMobileOpen(false)
            }}
          >
            <Compass className="lp-dd-ico" aria-hidden size={16} strokeWidth={1.75} />
            <span className="lp-dd-txt">
              <span className="lp-dd-title">{t(LANDING_BRAIN_STATIC.labelKey)}</span>
            </span>
          </a>
        </li>
      ) : null}
      {accordion ? null : null}
    </ul>
  )

  const renderExplore = () => (
    <ul className="lp-dd-list" role="menu" id={`${baseId}-explore-menu`}>
      {LANDING_EXPLORE_ITEMS.map((item) => (
        <li key={item.id} role="none">
          {item.to ? (
            <Link
              role="menuitem"
              to={item.to}
              className="lp-dd-item"
              onClick={() => {
                closeAll()
                setMobileOpen(false)
                onNavigate?.()
              }}
            >
              <span className="lp-dd-txt">
                <span className="lp-dd-title">{t(item.labelKey)}</span>
              </span>
            </Link>
          ) : (
            <a
              role="menuitem"
              href={item.href}
              className="lp-dd-item"
              onClick={() => {
                closeAll()
                setMobileOpen(false)
              }}
            >
              <span className="lp-dd-txt">
                <span className="lp-dd-title">{t(item.labelKey)}</span>
              </span>
            </a>
          )}
        </li>
      ))}
    </ul>
  )

  const renderProfile = () => (
    <ul className="lp-dd-list" role="menu" id={`${baseId}-profile-menu`}>
      <li className="lp-dd-head" role="presentation">
        <strong>{callsign}</strong>
        {totalLevel != null ? (
          <span>
            {t('authNav.brainLevel', { level: totalLevel })}
          </span>
        ) : null}
      </li>
      <li role="none">
        <Link
          role="menuitem"
          to="/profil"
          className="lp-dd-item"
          onClick={() => {
            closeAll()
            setMobileOpen(false)
            onNavigate?.()
          }}
        >
          <User className="lp-dd-ico" aria-hidden size={16} strokeWidth={1.75} />
          <span className="lp-dd-txt">
            <span className="lp-dd-title">{tNav('items.profile')}</span>
          </span>
        </Link>
      </li>
      {instructorItem
        ? (() => {
            const InstIcon = instructorItem.icon
            return (
              <li role="none">
                <Link
                  role="menuitem"
                  to={instructorItem.to}
                  className="lp-dd-item"
                  onClick={() => {
                    closeAll()
                    setMobileOpen(false)
                    onNavigate?.()
                  }}
                >
                  {InstIcon ? <InstIcon className="lp-dd-ico" aria-hidden size={16} strokeWidth={1.75} /> : null}
                  <span className="lp-dd-txt">
                    <span className="lp-dd-title">{instructorItem.label}</span>
                  </span>
                </Link>
              </li>
            )
          })()
        : null}
      <li role="none">
        <Link
          role="menuitem"
          to="/ayarlar"
          className="lp-dd-item"
          onClick={() => {
            closeAll()
            setMobileOpen(false)
            onNavigate?.()
          }}
        >
          <Settings className="lp-dd-ico" aria-hidden size={16} strokeWidth={1.75} />
          <span className="lp-dd-txt">
            <span className="lp-dd-title">{tNav('items.settings')}</span>
          </span>
        </Link>
      </li>
      <li className="lp-dd-lang" role="none">
        <button
          type="button"
          role="menuitem"
          className={langIsTr ? 'lp-on' : ''}
          onClick={() => void setLanguage('tr')}
        >
          TR
        </button>
        <button
          type="button"
          role="menuitem"
          className={!langIsTr ? 'lp-on' : ''}
          onClick={() => void setLanguage('en')}
        >
          EN
        </button>
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          className="lp-dd-item lp-dd-danger"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
        >
          <LogOut className="lp-dd-ico" aria-hidden size={16} strokeWidth={1.75} />
          <span className="lp-dd-txt">
            <span className="lp-dd-title">{tNav('items.signOut')}</span>
          </span>
        </button>
      </li>
    </ul>
  )

  /**
   * @param {string} id
   * @param {string} label
   * @param {React.ReactNode} panel
   */
  const DesktopDropdown = ({ id, label, panel, alignEnd = false }) => {
    const expanded = openId === id
    const btnRef = useRef(/** @type {HTMLButtonElement | null} */ (null))

    const onTriggerKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (expanded) closeAll()
        else openMenu(id)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        openMenu(id)
        requestAnimationFrame(() => {
          const first = document.getElementById(`${baseId}-${id}-menu`)?.querySelector('[role="menuitem"]')
          if (first instanceof HTMLElement) first.focus()
        })
      } else if (e.key === 'Escape' && expanded) {
        e.preventDefault()
        closeAll()
        btnRef.current?.focus()
      }
    }

    const onPanelKey = (e) => {
      const list = document.getElementById(`${baseId}-${id}-menu`)
      if (!list) return
      const items = [...list.querySelectorAll('[role="menuitem"]')].filter(
        (el) => el instanceof HTMLElement && !el.hasAttribute('disabled'),
      )
      const idx = items.indexOf(/** @type {HTMLElement} */ (document.activeElement))
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = items[(idx + 1) % items.length]
        next?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = items[(idx - 1 + items.length) % items.length]
        prev?.focus()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeAll()
        btnRef.current?.focus()
      } else if (e.key === 'Tab') {
        closeAll()
      }
    }

    return (
      <div
        className={`lp-dd${expanded ? ' lp-open' : ''}${alignEnd ? ' lp-dd-end' : ''}`}
        onMouseEnter={() => scheduleOpen(id)}
        onMouseLeave={scheduleClose}
      >
        <button
          ref={btnRef}
          type="button"
          className="lp-dd-trig"
          aria-haspopup="menu"
          aria-expanded={expanded}
          aria-controls={`${baseId}-${id}-menu`}
          onClick={() => (expanded ? closeAll() : openMenu(id))}
          onKeyDown={onTriggerKey}
        >
          {label}
          <ChevronDown className="lp-dd-chev" aria-hidden size={14} strokeWidth={2} />
        </button>
        {expanded ? (
          <div className="lp-dd-panel" onKeyDown={onPanelKey} onMouseEnter={() => openMenu(id)}>
            {panel}
          </div>
        ) : null}
      </div>
    )
  }

  const MobileAccordion = ({ id, label, panel }) => {
    const expanded = openId === id
    return (
      <div className={`lp-acc${expanded ? ' lp-open' : ''}`}>
        <button
          type="button"
          className="lp-acc-trig"
          aria-expanded={expanded}
          aria-controls={`${baseId}-${id}-menu`}
          onClick={() => (expanded ? setOpenId(null) : setOpenId(id))}
        >
          {label}
          <ChevronDown className="lp-dd-chev" aria-hidden size={16} strokeWidth={2} />
        </button>
        {expanded ? <div className="lp-acc-body">{panel}</div> : null}
      </div>
    )
  }

  return (
    <div className="lp-auth-nav" ref={rootRef}>
      <div className="lp-auth-desktop">
        {menus.map((menu) =>
          menu.items.length || menu.id === 'brain' ? (
            <DesktopDropdown
              key={menu.id}
              id={menu.id}
              label={t(menu.labelKey)}
              panel={renderMenuItems(menu)}
            />
          ) : null,
        )}
        <DesktopDropdown id="explore" label={t('authNav.menus.explore')} panel={renderExplore()} />
        <Link className="lp-btn lp-gold lp-hq" to="/dashboard" onClick={() => onNavigate?.()}>
          {t('authNav.hqCta')}
        </Link>
        <DesktopDropdown id="profile" label={callsign} panel={renderProfile()} alignEnd />
      </div>

      <button
        type="button"
        className="lp-burger"
        aria-expanded={mobileOpen}
        aria-controls={`${baseId}-mobile`}
        aria-label={t('authNav.menuAria')}
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      {mobileOpen ? (
        <div className="lp-mobile-sheet" id={`${baseId}-mobile`} role="dialog" aria-modal="true">
          <Link
            className="lp-btn lp-gold lp-hq lp-hq-mobile"
            to="/dashboard"
            onClick={() => {
              setMobileOpen(false)
              onNavigate?.()
            }}
          >
            {t('authNav.hqCta')}
          </Link>
          {menus.map((menu) =>
            menu.items.length || menu.id === 'brain' ? (
              <MobileAccordion
                key={menu.id}
                id={menu.id}
                label={t(menu.labelKey)}
                panel={renderMenuItems(menu, { accordion: true })}
              />
            ) : null,
          )}
          <MobileAccordion id="explore" label={t('authNav.menus.explore')} panel={renderExplore()} />
          <MobileAccordion id="profile" label={callsign} panel={renderProfile()} />
        </div>
      ) : null}
    </div>
  )
}
