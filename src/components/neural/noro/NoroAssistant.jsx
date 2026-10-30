import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useFeedbackPanelOptional } from '../../../context/FeedbackPanelContext'
import { db, isFirebaseConfigured } from '../../../lib/firebase'
import { istanbulDayKey } from '../../../lib/neural/neuralEngine'
import { logAarEntry } from '../../../lib/neural/activityEvents'
import { REGION_IDS } from '../../../lib/neural/neuralConfig'
import { LOBE_META } from '../lobeMeta'
import { NORO_KB } from './noroGuideKb'
import { answerGuideQuery, answerOnboarding, buildPageIntro, formatKbAnswer } from './noroGuideSearch'
import {
  buildBriefing,
  buildEventReaction,
  buildQuickAnswer,
  buildRegionStatus,
  buildWelcome,
  canEmitAutoMessage,
  canEmitDragReaction,
  detectIntent,
  DRAG_MIN_DISTANCE_PX,
  DRAG_RECENT_WINDOW,
  isBusyDragContext,
  isOpsecRisky,
  opsecWarnText,
  pickDragLine,
  primaryRegionFromGains,
  withBusyPeek,
} from './noroEngine'
import { useNoroData } from '../../../hooks/useNoroData'
import './noro.css'

const ORB = 60
const DRAG_CLICK_PX = 6
const KEY_STEP = 16
const EDGE_PAD = 8
const MAX_CHARS = 1000

function stampNow() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Bölge etiketleri + puan renkleri (prototip .rt / .plus / .minus) */
function formatNoroHtml(text) {
  let s = escapeHtml(text)
  const lobes = [...LOBE_META].sort((a, b) => b.name.length - a.name.length)
  for (const L of lobes) {
    const name = escapeHtml(L.name)
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    s = s.replace(re, `<span class="rt" style="--c:${L.col}">${name}</span>`)
  }
  const shorts = [
    ['Beyincik', 'cerebellum'],
    ['Hipokampus', 'hippocampus'],
    ['Frontal', 'frontal'],
    ['Motor', 'motor'],
    ['Parietal', 'parietal'],
    ['Oksipital', 'occipital'],
    ['Temporal', 'temporal'],
    ['Beyin sapı', 'stem'],
  ]
  for (const [label, id] of shorts) {
    const L = LOBE_META.find((x) => x.id === id)
    if (!L) continue
    const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    s = s.replace(re, `<span class="rt" style="--c:${L.col}">${escapeHtml(label)}</span>`)
  }
  s = s.replace(/(^|[^A-Za-z0-9])(\+\d+(?:[.,]\d+)?)/g, (_, a, m) => `${a}<span class="plus">${m}</span>`)
  s = s.replace(/(^|[^A-Za-z0-9])([−\-–]\d+(?:[.,]\d+)?)/g, (_, a, m) => `${a}<span class="minus">${m}</span>`)
  return s
}

function lsGet(uid, key) {
  try {
    return localStorage.getItem(`noro:${uid}:${key}`)
  } catch {
    return null
  }
}
function lsSet(uid, key, val) {
  try {
    localStorage.setItem(`noro:${uid}:${key}`, val)
  } catch {
    /* */
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function safeInsets() {
  const cs = getComputedStyle(document.documentElement)
  const read = (name, fb) => {
    const v = cs.getPropertyValue(name).trim()
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : fb
  }
  return {
    top: read('--safe-top', 0) || 0,
    bottom: read('--safe-bottom', 0) || 0,
    left: read('--safe-left', 0) || 0,
    right: read('--safe-right', 0) || 0,
  }
}

function feedbackClearance() {
  const compact = document.documentElement.classList.contains('compact-shell')
  const tab = compact ? 64 : 0
  return 72 + tab
}

/** Görünür alan — üst bar / sol menü altına girmesin */
function getVisibleBounds() {
  const inset = safeInsets()
  const w = window.innerWidth
  const h = window.innerHeight
  const compact = document.documentElement.classList.contains('compact-shell')
  let minX = inset.left + EDGE_PAD
  let minY = inset.top + EDGE_PAD

  const chrome = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--ob-chrome-top'),
  )
  if (Number.isFinite(chrome) && chrome > 0) minY = Math.max(minY, chrome + EDGE_PAD)

  if (compact || w < 1024) {
    minY = Math.max(minY, 56 + inset.top + EDGE_PAD)
  } else {
    minY = Math.max(minY, inset.top + EDGE_PAD + 44)
    const nav = document.getElementById('sidebar-nav')
    if (nav) {
      const r = nav.getBoundingClientRect()
      if (r.width > 40 && r.right > 0) minX = Math.max(minX, r.right + EDGE_PAD)
    }
  }

  const maxX = w - inset.right - EDGE_PAD - ORB
  const maxY = h - inset.bottom - EDGE_PAD - feedbackClearance() - ORB
  return {
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
  }
}

/** @param {number} x @param {number} y */
function clampToBounds(x, y) {
  const b = getVisibleBounds()
  return { x: clamp(x, b.minX, b.maxX), y: clamp(y, b.minY, b.maxY) }
}

/** Varsayılan: sağ alt, Geri Bildirim üstü */
function defaultPosRatio() {
  const b = getVisibleBounds()
  const x = b.maxX
  const y = b.maxY
  const w = window.innerWidth || 1
  const h = window.innerHeight || 1
  return {
    xRatio: clamp((x + ORB / 2) / w, 0.05, 0.95),
    yRatio: clamp((y + ORB / 2) / h, 0.05, 0.95),
  }
}

/** @param {{ xRatio: number; yRatio: number }} ratio */
function ratioToPx(ratio) {
  const w = window.innerWidth
  const h = window.innerHeight
  const raw = {
    x: ratio.xRatio * w - ORB / 2,
    y: ratio.yRatio * h - ORB / 2,
  }
  return clampToBounds(raw.x, raw.y)
}

/** @param {number} x @param {number} y */
function pxToRatio(x, y) {
  const w = window.innerWidth || 1
  const h = window.innerHeight || 1
  return {
    xRatio: clamp((x + ORB / 2) / w, 0.02, 0.98),
    yRatio: clamp((y + ORB / 2) / h, 0.02, 0.98),
  }
}

/** Panel / peek: en çok boş alan yönü */
function placementForOrb(orbX, orbY) {
  const w = window.innerWidth
  const h = window.innerHeight
  const panelW = Math.min(360, w - 32)
  const spaceRight = w - (orbX + ORB) - EDGE_PAD
  const spaceLeft = orbX - EDGE_PAD
  const spaceBelow = h - (orbY + ORB) - EDGE_PAD
  const spaceAbove = orbY - EDGE_PAD
  const openRight = spaceRight >= spaceLeft
  const openBelow = spaceBelow >= spaceAbove
  const cx = orbX + ORB / 2
  const cy = orbY + ORB / 2
  const centerish = Math.abs(cx - w / 2) < w * 0.18 && Math.abs(cy - h / 2) < h * 0.18
  return { openRight, openBelow, panelW, centerish, spaceRight, spaceLeft, spaceAbove, spaceBelow }
}

export default function NoroAssistant() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const navigate = useNavigate()
  const location = useLocation()
  const feedback = useFeedbackPanelOptional()
  const { enabled, neuralState, serverStored, hasActivity, loading, events } = useNoroData()

  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [unread, setUnread] = useState(0)
  const [peek, setPeek] = useState(/** @type {{ text: string; kind?: string }|null} */ (null))
  const [talking, setTalking] = useState(false)
  const [msgs, setMsgs] = useState(
    /** @type {Array<{ id: string; text: string; me?: boolean; sys?: boolean; stamp?: string; aar?: { good: string; change: string }; links?: Array<{ to: string; label: string }>; choices?: Array<{ id: string; title: string; to: string }>; qrs?: boolean; eventKey?: string }>} */ (
      []
    ),
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [busyPeek, setBusyPeek] = useState(/** @type {string|null} */ (null))
  const [aar, setAar] = useState({
    step: /** @type {0|1|2} */ (0),
    eventKey: /** @type {string|null} */ (null),
    region: /** @type {string|null} */ (null),
    a1: '',
    pendingKey: /** @type {string|null} */ (null),
  })
  const [input, setInput] = useState('')
  const [pos, setPos] = useState(() =>
    typeof window !== 'undefined' ? defaultPosRatio() : { xRatio: 0.92, yRatio: 0.78 },
  )
  const [px, setPx] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [settling, setSettling] = useState(false)

  const listRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const bootRef = useRef(false)
  const seenEventsRef = useRef(new Set())
  const primedRef = useRef(false)
  const prevLevelsRef = useRef(/** @type {Record<string, number>} */ ({}))
  const recentMotRef = useRef(/** @type {string[]} */ ([]))
  const dragSessRef = useRef({
    count: 0,
    lastAt: 0,
    lastIdleAt: Date.now(),
    recentByTag: /** @type {Record<string, string[]>} */ ({}),
  })
  const dragPtrRef = useRef(
    /** @type {null | { id: number; startX: number; startY: number; origX: number; origY: number; moved: boolean; samples: number[]; startedReact: boolean }} */ (
      null
    ),
  )
  const peekQueueRef = useRef(/** @type {Array<{ text: string; kind?: string }>} */ ([]))
  const peekBusyRef = useRef(false)
  const busyPeekKeyRef = useRef(/** @type {string|null} */ (null))
  const busyPanelMsgRef = useRef(/** @type {string|null} */ (null))
  const busyPeekTimerRef = useRef(/** @type {number|null} */ (null))
  const peekRef = useRef(peek)
  peekRef.current = peek
  const openRef = useRef(open)
  openRef.current = open
  const msgsRef = useRef(msgs)
  msgsRef.current = msgs

  const pushPeek = useCallback((text, kind = 'info') => {
    peekQueueRef.current.push({ text, kind })
    const run = () => {
      if (peekBusyRef.current || open) return
      const next = peekQueueRef.current.shift()
      if (!next) return
      peekBusyRef.current = true
      setPeek(next)
      window.setTimeout(() => {
        setPeek(null)
        peekBusyRef.current = false
        run()
      }, 2800)
    }
    run()
  }, [open])

  const pushMsg = useCallback(
    (m) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      setMsgs((prev) => [...prev, { ...m, id, stamp: m.stamp || stampNow() }].slice(-50))
      if (!open && !m.me && !m.sys) {
        setUnread((u) => u + 1)
        pushPeek(m.text.slice(0, 160), 'msg')
      }
    },
    [open, pushPeek],
  )

  const say = useCallback(
    (text, extra = {}) => {
      setTalking(true)
      window.setTimeout(() => {
        pushMsg({ text, ...extra })
        setTalking(false)
      }, 220)
    },
    [pushMsg],
  )

  const bumpAuto = useCallback(
    (n = 1) => {
      if (!uid) return
      const day = istanbulDayKey(Date.now())
      const used = Number(lsGet(uid, `auto:${day}`) || 0)
      lsSet(uid, `auto:${day}`, String(used + n))
    },
    [uid],
  )

  const rememberMot = useCallback((ids) => {
    if (!ids?.length) return
    recentMotRef.current = [...recentMotRef.current, ...ids].slice(-40)
    if (uid) lsSet(uid, 'motIds', JSON.stringify(recentMotRef.current))
  }, [uid])

  // Load prefs
  useEffect(() => {
    if (!uid) return
    try {
      const raw = lsGet(uid, 'msgs')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setMsgs(parsed.slice(-50))
      }
      const mot = lsGet(uid, 'motIds')
      if (mot) recentMotRef.current = JSON.parse(mot)
      const p = lsGet(uid, 'pos')
      if (p) {
        const parsed = JSON.parse(p)
        if (Number.isFinite(parsed?.xRatio) && Number.isFinite(parsed?.yRatio)) {
          setPos({
            xRatio: clamp(Number(parsed.xRatio), 0.02, 0.98),
            yRatio: clamp(Number(parsed.yRatio), 0.02, 0.98),
          })
        } else if (parsed?.side === 'left' || parsed?.side === 'right') {
          // eski kenar formatı → varsayılan serbest
          setPos(defaultPosRatio())
        }
      }
    } catch {
      /* */
    }
  }, [uid])

  useEffect(() => {
    if (!uid || msgs.length === 0) return
    lsSet(uid, 'msgs', JSON.stringify(msgs.slice(-50)))
  }, [uid, msgs])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, open, talking])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDoc = (e) => {
      const t = /** @type {HTMLElement|null} */ (e.target)
      if (t?.closest?.('.ah-actions')) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [menuOpen])

  useEffect(() => {
    if (!open) busyPanelMsgRef.current = null
  }, [open])

  useEffect(() => {
    if (!peek) {
      busyPeekKeyRef.current = null
      setBusyPeek(null)
    }
  }, [peek])

  const posRef = useRef(pos)
  posRef.current = pos

  const persistPos = useCallback(
    (ratio) => {
      const nextPx = ratioToPx(ratio)
      const nextRatio = pxToRatio(nextPx.x, nextPx.y)
      setPx(nextPx)
      setPos(nextRatio)
      if (uid) lsSet(uid, 'pos', JSON.stringify(nextRatio))
      return { ...nextRatio, x: nextPx.x, y: nextPx.y }
    },
    [uid],
  )

  useEffect(() => {
    setPx(ratioToPx(posRef.current))
  }, [pos.xRatio, pos.yRatio])

  useEffect(() => {
    const sync = () => setPx(ratioToPx(posRef.current))
    window.addEventListener('resize', sync)
    const nav = document.getElementById('sidebar-nav')
    let ro = null
    if (nav && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(sync)
      ro.observe(nav)
    }
    return () => {
      window.removeEventListener('resize', sync)
      ro?.disconnect()
    }
  }, [])

  // Briefing / welcome
  useEffect(() => {
    if (!enabled || !uid || loading || bootRef.current) return
    bootRef.current = true
    const day = istanbulDayKey(Date.now())
    if (!hasActivity) {
      say(buildWelcome(false), { links: [{ to: '/antrenman', label: 'Antrenmana git' }] })
      return
    }
    if (lsGet(uid, `brief:${day}`)) return
    const lastVisit = Number(lsGet(uid, 'lastVisitMs') || 0)
    const daysSince = lastVisit ? Math.max(1, (Date.now() - lastVisit) / 86_400_000) : 1
    const used = Number(lsGet(uid, `auto:${day}`) || 0)
    if (!canEmitAutoMessage(day, used)) return
    const regions = REGION_IDS.map((id) => {
      const r = neuralState?.regions?.[id] || {}
      return {
        id,
        idleDays: Number(r.idleDays) || 0,
        decayLoss: Number(r.decayLoss) || 0,
        daysToDecay: Number(r.daysToDecay) || 0,
        decaying: Boolean(r.decaying),
        level: Number(r.level) || 0,
      }
    })
    const brief = buildBriefing({
      daysSince,
      regions,
      streak: Number(neuralState?.streak) || 0,
      recentMotivationIds: recentMotRef.current,
    })
    brief.texts.forEach((t) => say(t))
    bumpAuto(brief.texts.length)
    rememberMot(brief.motivationIds)
    lsSet(uid, `brief:${day}`, '1')
    lsSet(uid, 'lastVisitMs', String(Date.now()))
  }, [enabled, uid, loading, hasActivity, neuralState, say, bumpAuto, rememberMot])

  useEffect(() => {
    /** @type {Record<string, number>} */
    const lv = {}
    for (const id of REGION_IDS) lv[id] = Number(neuralState?.regions?.[id]?.level) || 0
    prevLevelsRef.current = lv
  }, [neuralState])

  // New neural events (any page)
  useEffect(() => {
    if (!enabled || !uid || !events.length) return
    const lastTs = Number(lsGet(uid, 'lastEventTs') || 0)
    const day = istanbulDayKey(Date.now())

    if (!primedRef.current) {
      primedRef.current = true
      for (const ev of events) seenEventsRef.current.add(String(ev.id))
      const newest = events[0]
      const ts =
        newest?.createdAt && typeof newest.createdAt.toMillis === 'function'
          ? newest.createdAt.toMillis()
          : Number(newest?.ts) || Date.now()
      if (!lastTs) lsSet(uid, 'lastEventTs', String(ts))
      return
    }

    let autoUsed = Number(lsGet(uid, `auto:${day}`) || 0)
    let cursorTs = lastTs
    const fresh = [...events].reverse().filter((ev) => !seenEventsRef.current.has(String(ev.id)))

    for (const ev of fresh) {
      seenEventsRef.current.add(String(ev.id))
      const ts =
        ev.createdAt && typeof ev.createdAt.toMillis === 'function'
          ? ev.createdAt.toMillis()
          : Number(ev.ts) || Date.now()
      if (ts <= cursorTs) continue
      if (!canEmitAutoMessage(day, autoUsed)) {
        cursorTs = ts
        lsSet(uid, 'lastEventTs', String(cursorTs))
        continue
      }

      const gains = /** @type {Record<string, number>} */ (ev.gains || {})
      const flags = /** @type {{ bonus?: boolean; cap?: boolean; typeCap?: boolean; streakBonus?: number }} */ (
        ev.flags || {}
      )
      const primary = primaryRegionFromGains(gains)
      let aarReminder = null
      try {
        const raw = lsGet(uid, 'aarMap')
        const map = raw ? JSON.parse(raw) : {}
        const remKey = map[primary]
        if (remKey && !lsGet(uid, `aarRem:${primary}:${String(remKey).slice(0, 40)}`)) {
          aarReminder = String(remKey)
          lsSet(uid, `aarRem:${primary}:${aarReminder.slice(0, 40)}`, '1')
          delete map[primary]
          lsSet(uid, 'aarMap', JSON.stringify(map))
        }
      } catch {
        /* */
      }

      /** @type {Record<string, number>} */
      const nextLv = {}
      for (const id of REGION_IDS) nextLv[id] = Number(neuralState?.regions?.[id]?.level) || 0

      const reaction = buildEventReaction({
        gains,
        score: ev.score == null ? null : Number(ev.score),
        flags,
        streak: Number(serverStored?.streak ?? neuralState?.streak) || 0,
        prevLevels: prevLevelsRef.current,
        nextLevels: nextLv,
        aarReminder,
        recentMotivationIds: recentMotRef.current,
      })
      reaction.texts.forEach((t) => say(t))
      bumpAuto(reaction.texts.length)
      autoUsed += reaction.texts.length
      rememberMot(reaction.motivationIds)
      cursorTs = ts
      lsSet(uid, 'lastEventTs', String(cursorTs))

      if (reaction.offerAar) {
        const skipDay = lsGet(uid, 'aarSkipDay')
        const offered = lsGet(uid, `aarOffered:${ev.id}`)
        if (skipDay !== day && !offered && aar.step === 0 && !aar.pendingKey) {
          lsSet(uid, `aarOffered:${ev.id}`, '1')
          setAar((a) => ({ ...a, pendingKey: String(ev.id), region: reaction.primaryId }))
          say(
            'Sıcağı sıcağına kısa bir AAR yapalım mı? İki soru, yarım dakika. Cevapların Frontal hanesine yazılır.',
            { qrs: true, eventKey: String(ev.id) },
          )
          bumpAuto(1)
          autoUsed += 1
        }
      }
    }
  }, [
    enabled,
    events,
    uid,
    neuralState,
    serverStored,
    say,
    bumpAuto,
    rememberMot,
    aar.step,
    aar.pendingKey,
  ])

  // First visit page intro
  useEffect(() => {
    if (!enabled || !uid) return
    const path = location.pathname
    const key = `pageIntro:${path}`
    if (lsGet(uid, key)) return
    lsSet(uid, key, '1')
    const intro = buildPageIntro(path)
    pushPeek(intro.text, 'intro')
    // also stash howto link via soft msg only if panel closed — peek is enough
  }, [enabled, uid, location.pathname, pushPeek])

  // Stuck event
  useEffect(() => {
    if (!enabled || !uid) return undefined
    const onStuck = () => {
      const path = location.pathname
      const key = `stuck:${path}`
      if (lsGet(uid, key)) return
      lsSet(uid, key, '1')
      pushPeek('Takıldıysan buradayım — sor, birlikte çözeriz.', 'stuck')
    }
    window.addEventListener('noro:stuck', onStuck)
    return () => window.removeEventListener('noro:stuck', onStuck)
  }, [enabled, uid, location.pathname, pushPeek])

  function showBusyPeekBubble(text) {
    if (busyPeekTimerRef.current) window.clearTimeout(busyPeekTimerRef.current)
    setBusyPeek(text)
    busyPeekTimerRef.current = window.setTimeout(() => {
      setBusyPeek(null)
      busyPeekTimerRef.current = null
    }, 2500)
  }

  function emitDragReaction(tag) {
    const st = dragSessRef.current
    if (!canEmitDragReaction({ sessionCount: st.count, lastAt: st.lastAt })) return false
    const busy = isBusyDragContext({ open: openRef.current, peek: peekRef.current })
    const useTag = busy ? 'busy' : tag

    if (busy) {
      const peek = peekRef.current
      if (openRef.current) {
        const lastNoro = [...msgsRef.current].reverse().find((m) => !m.me && !m.sys)
        const key = lastNoro?.id || 'panel-open'
        if (busyPanelMsgRef.current === key) return false
        busyPanelMsgRef.current = key
      } else if (peek) {
        const key = `${peek.kind || 'info'}:${peek.text}`
        if (busyPeekKeyRef.current === key) return false
        busyPeekKeyRef.current = key
      } else {
        return false
      }
    }

    const recent = st.recentByTag[useTag] || []
    const line = pickDragLine(useTag, recent)
    st.count += 1
    st.lastAt = Date.now()
    st.recentByTag[useTag] = [...recent, line.id].slice(-DRAG_RECENT_WINDOW)

    if (busy && openRef.current) {
      pushMsg({ text: line.text, sys: true })
      return true
    }
    if (busy && peekRef.current) {
      // asıl peek korunur — yalnızca ek balon
      void withBusyPeek(peekRef.current, line.text)
      showBusyPeekBubble(line.text)
      return true
    }
    pushPeek(line.text, 'drag')
    return true
  }

  function onPtrDown(e) {
    if (hidden) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragPtrRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: px.x,
      origY: px.y,
      moved: false,
      samples: [],
      startedReact: false,
    }
    setDragging(true)
    setSettling(false)
  }

  function onPtrMove(e) {
    const d = dragPtrRef.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    const dist = Math.hypot(dx, dy)
    if (!d.moved && dist > DRAG_CLICK_PX) d.moved = true
    if (!d.moved) return
    // İmleci tam takip — sınır sadece taşan eksende
    const raw = { x: d.origX + dx, y: d.origY + dy }
    setPx(clampToBounds(raw.x, raw.y))
    if (dist < DRAG_MIN_DISTANCE_PX) return
    if (!d.startedReact) {
      d.startedReact = true
      const idle = Date.now() - dragSessRef.current.lastIdleAt
      if (idle > 120_000) emitDragReaction('after_idle')
      else emitDragReaction('start')
    }
    d.samples.push(dist)
    if (d.samples.length > 8) d.samples.shift()
    const speed =
      d.samples.length >= 2
        ? Math.abs(d.samples[d.samples.length - 1] - d.samples[0])
        : 0
    if (speed > 180 && !isBusyDragContext({ open: openRef.current, peek: peekRef.current })) {
      emitDragReaction('shake')
    }
  }

  function onPtrUp(e) {
    const d = dragPtrRef.current
    if (!d || d.id !== e.pointerId) return
    dragPtrRef.current = null
    setDragging(false)
    dragSessRef.current.lastIdleAt = Date.now()
    if (!d.moved) {
      setOpen((o) => !o)
      setUnread(0)
      setPeek(null)
      setBusyPeek(null)
      return
    }
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    const dist = Math.hypot(dx, dy)
    const clamped = clampToBounds(d.origX + dx, d.origY + dy)
    const saved = persistPos(pxToRatio(clamped.x, clamped.y))
    setSettling(true)
    window.setTimeout(() => setSettling(false), 220)
    if (dist < DRAG_MIN_DISTANCE_PX) return
    if (isBusyDragContext({ open: openRef.current, peek: peekRef.current })) {
      // busy: ilk 40px geçişinde bir kez; bırakışta tekrar yok
      if (!d.startedReact) emitDragReaction('busy')
      return
    }
    const w = window.innerWidth
    const h = window.innerHeight
    const cx = saved.x + ORB / 2
    const cy = saved.y + ORB / 2
    const nearTop = saved.y < 80
    const nearCorner =
      (saved.x < 72 || saved.x > w - ORB - 72) && (saved.y < 100 || saved.y > h - ORB - 120)
    const nearCenter = Math.abs(cx - w / 2) < w * 0.12 && Math.abs(cy - h / 2) < h * 0.12
    const same = Math.abs(saved.x - d.origX) < 24 && Math.abs(saved.y - d.origY) < 24
    if (dragSessRef.current.count >= 5) emitDragReaction('frequent')
    else if (nearCenter) emitDragReaction('center')
    else if (nearTop) emitDragReaction('top')
    else if (same) emitDragReaction('same')
    else if (nearCorner) emitDragReaction('corner')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen((o) => !o)
      setUnread(0)
      return
    }
    let nx = px.x
    let ny = px.y
    if (e.key === 'ArrowLeft') nx -= KEY_STEP
    else if (e.key === 'ArrowRight') nx += KEY_STEP
    else if (e.key === 'ArrowUp') ny -= KEY_STEP
    else if (e.key === 'ArrowDown') ny += KEY_STEP
    else return
    e.preventDefault()
    persistPos(pxToRatio(nx, ny))
  }

  function resetPosition() {
    const def = defaultPosRatio()
    persistPos(def)
    setSettling(true)
    window.setTimeout(() => setSettling(false), 220)
  }

  function handleLink(to) {
    if (to === '__feedback__') {
      feedback?.openPanel?.()
      return
    }
    if (to.startsWith('__howto__:')) {
      const id = to.slice('__howto__:'.length)
      const entry = NORO_KB.find((k) => k.id === id)
      if (entry) {
        const ans = formatKbAnswer(entry)
        say(ans.text, { links: ans.links })
        setOpen(true)
      }
      return
    }
    navigate(to)
  }

  function onQrs(action, eventKey) {
    pushMsg({
      text: action === 'yes' ? 'AAR yap' : action === 'no' ? 'Şimdi değil' : 'Bugün sorma',
      me: true,
    })
    if (action === 'skip') {
      lsSet(uid || '', 'aarSkipDay', istanbulDayKey(Date.now()))
      setAar((a) => ({ ...a, pendingKey: null }))
      say('Bugünlük AAR sormuyorum, söz.')
      return
    }
    if (action === 'no') {
      setAar((a) => ({ ...a, pendingKey: null }))
      say('Tamamdır, başka sefere.')
      return
    }
    setAar({
      step: 1,
      eventKey: eventKey || aar.pendingKey,
      region: aar.region || 'motor',
      a1: '',
      pendingKey: null,
    })
    setOpen(true)
    say('Birinci soru: ne iyi gitti? Bir cümle yeter.')
  }

  async function submitAarText(raw) {
    const t = String(raw || '').trim()
    if (!t || !uid) return
    if (isOpsecRisky(t)) {
      pushMsg({ text: '[mesaj gönderilmedi]', me: true })
      say(opsecWarnText())
      return
    }
    if (t.length > 400) {
      say('En fazla 400 karakter.')
      return
    }
    pushMsg({ text: t, me: true })
    if (aar.step === 1) {
      setAar((a) => ({ ...a, step: 2, a1: t }))
      say('Güzel. İkinci soru: bir dahakine neyi farklı yaparsın?')
      return
    }
    if (aar.step === 2 && aar.eventKey && aar.region) {
      const good = aar.a1
      const change = t
      const eventKey = aar.eventKey
      const region = aar.region
      setAar({ step: 0, eventKey: null, region: null, a1: '', pendingKey: null })
      try {
        if (isFirebaseConfigured() && db) {
          await setDoc(doc(db, 'users', uid, 'aar_notes', eventKey), {
            eventKey,
            region,
            good,
            change,
            createdAt: serverTimestamp(),
          })
          logAarEntry(eventKey)
        }
        try {
          const rawMap = lsGet(uid, 'aarMap')
          const map = rawMap ? JSON.parse(rawMap) : {}
          map[region] = change
          lsSet(uid, 'aarMap', JSON.stringify(map))
        } catch {
          /* */
        }
        say(
          'AAR kaydedildi, eline sağlık. Frontal puanı tetikleyiciyle işlenecek. Bir sonraki kayıtta bu notu hatırlatacağım.',
          { aar: { good, change } },
        )
      } catch {
        say('AAR kaydı şimdilik başarısız olabilir; yerel not tutuldu.', { aar: { good, change } })
      }
    }
  }

  function handleUserText(raw) {
    const t = String(raw || '').trim()
    if (!t) return
    if (t.length > MAX_CHARS) {
      say('Bu bir roman kanka, kısaca sor')
      return
    }
    if (isOpsecRisky(t)) {
      pushMsg({ text: '[mesaj gönderilmedi]', me: true })
      say(opsecWarnText())
      return
    }
    if (aar.step > 0) {
      void submitAarText(t)
      return
    }
    pushMsg({ text: t, me: true })
    const intent = detectIntent(t)
    if (intent.kind === 'rapor') {
      say(buildQuickAnswer('rapor', neuralState).text)
      return
    }
    if (intent.kind === 'oneri') {
      const ans = buildQuickAnswer('oneri', neuralState)
      say(ans.text, { links: ans.links })
      return
    }
    if (intent.kind === 'zayif') {
      const ans = buildQuickAnswer('zayif', neuralState)
      say(ans.text, { links: ans.links })
      return
    }
    if (intent.kind === 'region' && intent.regionId) {
      const ans = buildRegionStatus(intent.regionId, neuralState)
      say(ans.text, { links: ans.links })
      return
    }
    if (intent.kind === 'onboard' || intent.kind === 'page_help') {
      const ans = answerOnboarding(location.pathname, {
        preferBrain: location.pathname.startsWith('/dashboard'),
      })
      say(ans.text, { links: ans.links })
      return
    }
    const ans = answerGuideQuery(t, { pathname: location.pathname })
    if (ans.kind === 'ambiguous') {
      say(ans.text, { choices: ans.choices })
      return
    }
    say(ans.text, { links: ans.links })
  }

  if (!enabled || !uid) return null

  const place = placementForOrb(px.x, px.y)
  const panelOpenRight = place.openRight
  const panelOpenBelow = place.openBelow
  const tabSide = px.x + ORB / 2 < window.innerWidth / 2 ? 'left' : 'right'

  if (hidden) {
    return (
      <button
        type="button"
        className={['noro-tab', tabSide === 'left' ? 'noro-tab-left' : 'noro-tab-right'].join(' ')}
        style={{ top: px.y + ORB / 2 }}
        onClick={() => setHidden(false)}
        aria-label="NÖRO'yu göster"
      >
        NÖRO
      </button>
    )
  }

  const panelStyle = (() => {
    const w = window.innerWidth
    const h = window.innerHeight
    const pw = Math.min(360, w - 32)
    const ph = Math.min(520, h - 16)
    /** @type {Record<string, string|number>} */
    const st = { maxHeight: ph }
    if (panelOpenRight) {
      st.left = Math.min(px.x + ORB + 8, w - pw - EDGE_PAD)
    } else {
      st.left = Math.max(EDGE_PAD, px.x - pw - 8)
    }
    if (place.centerish) {
      st.top = clamp(px.y + ORB / 2 - ph / 2, EDGE_PAD, Math.max(EDGE_PAD, h - ph - EDGE_PAD))
    } else if (panelOpenBelow) {
      st.top = clamp(px.y + ORB + 8, EDGE_PAD, Math.max(EDGE_PAD, h - ph - EDGE_PAD))
    } else {
      st.bottom = Math.max(EDGE_PAD, h - px.y + 8)
    }
    return st
  })()

  const peekStyle = (() => {
    const w = window.innerWidth
    /** @type {Record<string, string|number>} */
    const st = { top: Math.max(8, px.y - 4) }
    if (panelOpenRight) st.left = Math.min(px.x + ORB + 8, w - 40)
    else st.right = Math.max(8, w - px.x + 8)
    return st
  })()

  return (
    <div className="noro-root" aria-live="polite">
      {open ? (
        <div className="apanel" style={panelStyle} role="dialog" aria-label="NÖRO asistanı">
          <div className="ah">
            <span className="mini" aria-hidden>
              <span className="orb" />
              <span className="core" />
            </span>
            <div className="t">
              <b>NÖRO</b>
              <span>operatör asistanı · çevrimiçi</span>
            </div>
            <div className="ah-actions">
              <button
                type="button"
                aria-label="Menü"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                ⋯
              </button>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => {
                  setMenuOpen(false)
                  setOpen(false)
                }}
              >
                ×
              </button>
              {menuOpen ? (
                <div className="ah-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      resetPosition()
                      setMenuOpen(false)
                    }}
                  >
                    Konumu sıfırla
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setHidden(true)
                      setMenuOpen(false)
                      setOpen(false)
                    }}
                  >
                    Gizle
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="alist" ref={listRef}>
            {msgs.map((m) =>
              m.sys ? (
                <div key={m.id} className="msg-sys" role="status">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className={['msg', m.me ? 'me' : ''].filter(Boolean).join(' ')}>
                  <div className="bub">
                    {m.me ? (
                      m.text
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: formatNoroHtml(m.text) }} />
                    )}
                    {m.aar ? (
                      <div className="aar-card">
                        <div>
                          ✓ <b>İyi giden:</b> {m.aar.good}
                        </div>
                        <div>
                          ↻ <b>Değişecek:</b> {m.aar.change}
                        </div>
                      </div>
                    ) : null}
                    {m.links?.length ? (
                      <div className="qrs">
                        {m.links.map((l) => (
                          <button
                            key={l.to + l.label}
                            type="button"
                            className="qr"
                            onClick={() => handleLink(l.to)}
                          >
                            {l.label} →
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {m.choices?.length ? (
                      <div className="qrs">
                        {m.choices.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="qr"
                            onClick={() => {
                              const entry = NORO_KB.find((k) => k.id === c.id)
                              if (entry) {
                                const ans = formatKbAnswer(entry)
                                say(ans.text, { links: ans.links })
                              } else navigate(c.to)
                            }}
                          >
                            {c.title}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {m.qrs ? (
                      <div className="qrs">
                        <button type="button" className="qr" onClick={() => onQrs('yes', m.eventKey)}>
                          AAR yap
                        </button>
                        <button type="button" className="qr" onClick={() => onQrs('no', m.eventKey)}>
                          Şimdi değil
                        </button>
                        <button type="button" className="qr" onClick={() => onQrs('skip', m.eventKey)}>
                          Bugün sorma
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <time>
                    {m.me ? 'sen' : 'NÖRO'} · {m.stamp || stampNow()}
                  </time>
                </div>
              ),
            )}
            {talking ? (
              <div className="msg">
                <div className="bub">
                  <span className="typing" aria-label="Yazıyor">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            ) : null}
          </div>
          <form
            className="ain"
            onSubmit={(e) => {
              e.preventDefault()
              const v = input
              setInput('')
              handleUserText(v)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX_CHARS + 50}
              placeholder={
                aar.step === 1
                  ? 'AAR 1/2 · ne iyi gitti?'
                  : aar.step === 2
                    ? 'AAR 2/2 · neyi değiştirirsin?'
                    : "NÖRO'ya sor… ör. balistik profil nasıl kaydedilir?"
              }
              aria-label="NÖRO mesajı"
              autoComplete="off"
            />
            <button type="submit" aria-label="Gönder">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M4 12l16-8-6 16-2-7-8-1z" />
              </svg>
            </button>
          </form>
          <div className="anote">
            Operasyonel bilgi, konum, birlik ve kişi adı yazma. NÖRO bir asistan, hata yapabilir.
          </div>
        </div>
      ) : null}

      {peek && !open ? (
        <div className="apeek-stack" style={peekStyle}>
          <button
            type="button"
            className={['apeek', panelOpenRight ? 'apeek-tip-left' : ''].filter(Boolean).join(' ')}
            onClick={() => {
              setOpen(true)
              setUnread(0)
              setPeek(null)
              setBusyPeek(null)
            }}
          >
            <span className="who">NÖRO</span>
            {peek.text}
          </button>
          {busyPeek ? (
            <div className="apeek-busy" role="status">
              {busyPeek}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={[
          'abtn',
          talking ? 'talk' : '',
          dragging ? 'dragging' : '',
          settling ? 'settle' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ left: px.x, top: px.y }}
        aria-label="NÖRO asistanı"
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerCancel={onPtrUp}
        onKeyDown={onKeyDown}
      >
        <span className="orb" aria-hidden />
        <span className="core" aria-hidden />
        {unread > 0 ? <i className="abadge">{unread > 9 ? '9+' : unread}</i> : null}
      </button>
    </div>
  )
}
