import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNeuralState } from '../../hooks/useNeuralState'
import { REGION_IDS, REGIONS } from '../../lib/neural/neuralConfig'
import { createBrainRenderer } from './brainRenderer'
import {
  DEFAULT_LAYOUT,
  EDGE_LAYOUT,
  EDGE_MARGIN_PX,
  HINT_MAX_VISITS,
  HINT_STORAGE_KEY,
  HUD_SAFE,
  LOBE_META,
  LOBE_BY_ID,
  MOBILE_ORDER,
  loadUiPrefs,
  saveUiPrefs,
} from './lobeMeta'
import NeuralNodeCard from './NeuralNodeCard'
import './operatorBrain.css'

const MOBILE_TOP = MOBILE_ORDER.slice(0, 4)
const MOBILE_BOT = MOBILE_ORDER.slice(4)
const FORBIDDEN_PAD = 8

function readHintVisible() {
  try {
    const n = Number(localStorage.getItem(HINT_STORAGE_KEY) || '0')
    return Number.isFinite(n) && n < HINT_MAX_VISITS
  } catch {
    return true
  }
}

function bumpHintVisit() {
  try {
    const n = Number(localStorage.getItem(HINT_STORAGE_KEY) || '0')
    if (!Number.isFinite(n) || n >= HINT_MAX_VISITS) return
    localStorage.setItem(HINT_STORAGE_KEY, String(n + 1))
  } catch {
    /* private */
  }
}

function readMobileMq() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 759px)').matches
}

/**
 * @param {{ left: number; right: number; top: number; bottom: number }} a
 * @param {{ left: number; right: number; top: number; bottom: number }} b
 */
function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

/**
 * @param {DOMRect|ClientRect|{ left: number; right: number; top: number; bottom: number }} r
 * @param {number} pad
 */
function inflateRect(r, pad) {
  return {
    left: r.left - pad,
    right: r.right + pad,
    top: r.top - pad,
    bottom: r.bottom + pad,
  }
}

/**
 * Operatör Beyni sahnesi — Dashboard bölümü.
 * @param {{ fillViewport?: boolean }} [props]
 */
export default function OperatorBrain({ fillViewport = false }) {
  const navigate = useNavigate()
  const { state, loading, error, refresh, hasActivity } = useNeuralState()

  const rootRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const stageRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const stageViewRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const canvasRef = useRef(/** @type {HTMLCanvasElement|null} */ (null))
  const zoomTagRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const hudTlRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const hudTrRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const hudBlRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const hudBrRef = useRef(/** @type {HTMLParagraphElement|null} */ (null))
  const rendererRef = useRef(/** @type {ReturnType<typeof createBrainRenderer>|null} */ (null))
  const nodeEls = useRef(/** @type {Record<string, HTMLDivElement|null>} */ ({}))
  const portsCache = useRef(/** @type {Record<string, number[][]>} */ ({}))
  const dragRef = useRef(
    /** @type {null|{ id: string; x: number; y: number; l: number; t: number; moved: boolean; cur?: number[] }} */ (
      null
    ),
  )

  const [ui, setUi] = useState(() => loadUiPrefs())
  // fillViewport: ilk açılışta seçim yok → rehber nabız; gömülü: motor
  const [sel, setSel] = useState(/** @type {string|null} */ (fillViewport ? null : 'motor'))
  const [zoom, setZoom] = useState(false)
  const [open, setOpen] = useState(/** @type {string|null} */ (null))
  const [mobile, setMobile] = useState(() => readMobileMq())
  const [zoomTag, setZoomTag] = useState('')
  const [zoomTagHidden, setZoomTagHidden] = useState(false)
  const [hudDim, setHudDim] = useState({ bl: false, br: false })
  const [placeTick, setPlaceTick] = useState(0)
  const [visible, setVisible] = useState(true)
  const [docHidden, setDocHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )
  const [showHint, setShowHint] = useState(() => readHintVisible())
  const [guidePulse, setGuidePulse] = useState(() => !!fillViewport)
  const stopGuidePulse = useCallback(() => {
    setGuidePulse(false)
  }, [])

  const flowMobile = fillViewport && mobile

  useEffect(() => {
    if (!fillViewport) return
    bumpHintVisit()
    setShowHint(readHintVisible())
  }, [fillViewport])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 759px)')
    const onMq = () => {
      setMobile(mq.matches)
      setPlaceTick((t) => t + 1)
    }
    onMq()
    mq.addEventListener?.('change', onMq)
    return () => mq.removeEventListener?.('change', onMq)
  }, [])

  const levels = useMemo(() => {
    /** @type {Record<string, number>} */
    const out = {}
    for (const id of REGION_IDS) out[id] = state.regions[id]?.level ?? 1
    return out
  }, [state])

  const effectiveXp = useMemo(() => {
    /** @type {Record<string, number>} */
    const out = {}
    for (const id of REGION_IDS) out[id] = state.regions[id]?.effectiveXp ?? 0
    return out
  }, [state])

  const weak = useMemo(() => {
    let min = 99
    let id = 'stem'
    for (const rid of REGION_IDS) {
      const lv = levels[rid] ?? 1
      if (lv < min) {
        min = lv
        id = rid
      }
    }
    return { id, level: min, name: REGIONS[id]?.nameTr ?? id }
  }, [levels])

  const persistUi = useCallback((next) => {
    setUi(next)
    saveUiPrefs(next)
  }, [])

  const readPorts = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return portsCache.current
    const sr = stage.getBoundingClientRect()
    /** @type {Record<string, number[][]>} */
    const next = {}
    for (const meta of LOBE_META) {
      const n = nodeEls.current[meta.id]
      next[meta.id] = []
      if (!n || n.hidden) continue
      const collapsed = n.classList.contains('ob-col') || n.classList.contains('ob-compact')
      if (collapsed) {
        const r = n.getBoundingClientRect()
        if (mobile) {
          const idx = MOBILE_ORDER.indexOf(meta.id)
          const topBand = idx >= 0 && idx < 4
          for (let k = 0; k < meta.mods.length; k++) {
            next[meta.id].push([
              r.left - sr.left + r.width * (0.25 + (0.5 * k) / Math.max(1, meta.mods.length - 1)),
              topBand ? r.bottom - sr.top : r.top - sr.top,
            ])
          }
        } else {
          const p = n.querySelector('.ob-hd .ob-pt')
          if (p) {
            const pr = p.getBoundingClientRect()
            for (let k = 0; k < meta.mods.length; k++) {
              next[meta.id].push([pr.left - sr.left + pr.width / 2, pr.top - sr.top + pr.height / 2])
            }
          }
        }
      } else {
        n.querySelectorAll('.ob-rw .ob-pt').forEach((p) => {
          const r = p.getBoundingClientRect()
          next[meta.id].push([r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2])
        })
      }
    }
    portsCache.current = next
    return next
  }, [mobile])

  const invalidatePorts = useCallback(() => {
    readPorts()
    rendererRef.current?.invalidatePorts()
  }, [readPorts])

  const liveRef = useRef({
    sel,
    zoom,
    levels,
    effectiveXp,
    visible,
    docHidden,
    reduceMotion,
    loading,
    guidePulse,
    weakId: weak.id,
    mobile,
    flowMobile,
  })
  liveRef.current = {
    sel,
    zoom,
    levels,
    effectiveXp,
    visible,
    docHidden,
    reduceMotion,
    loading,
    guidePulse,
    weakId: weak.id,
    mobile,
    flowMobile,
  }

  // Renderer lifecycle
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const renderer = createBrainRenderer({
      canvas,
      getLevels: () => liveRef.current.levels,
      getEffectiveXp: () => liveRef.current.effectiveXp,
      getSel: () => liveRef.current.sel,
      getZoom: () => liveRef.current.zoom,
      getPorts: () => portsCache.current,
      getPaused: () =>
        !liveRef.current.visible || liveRef.current.docHidden || liveRef.current.loading,
      getReduceMotion: () => liveRef.current.reduceMotion,
      getGuidePulseId: () =>
        liveRef.current.guidePulse && !liveRef.current.sel ? liveRef.current.weakId : null,
      getViewRect: () => {
        if (!liveRef.current.flowMobile) return null
        const block = stageRef.current
        const view = stageViewRef.current
        if (!block || !view) return null
        const br = block.getBoundingClientRect()
        const vr = view.getBoundingClientRect()
        return {
          x: vr.left - br.left,
          y: vr.top - br.top,
          w: vr.width,
          h: vr.height,
        }
      },
    })
    rendererRef.current = renderer
    renderer.layout()
    setMobile(renderer.getMetrics().mobile || readMobileMq())
    readPorts()
    renderer.invalidatePorts()
    if (!liveRef.current.loading) renderer.start()
    else renderer.drawSkeleton()

    const ro = new ResizeObserver(() => {
      renderer.layout()
      setMobile(renderer.getMetrics().mobile || readMobileMq())
      setPlaceTick((t) => t + 1)
      invalidatePorts()
    })
    if (stageRef.current) ro.observe(stageRef.current)
    if (rootRef.current) ro.observe(rootRef.current)
    if (stageViewRef.current) ro.observe(stageViewRef.current)

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        setVisible(hit)
      },
      { threshold: 0.05 },
    )
    if (stageRef.current) io.observe(stageRef.current)

    const onVis = () => setDocHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)

    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onReduce = () => setReduceMotion(mqReduce.matches)
    mqReduce.addEventListener?.('change', onReduce)

    const syncId = window.setInterval(() => {
      const m = renderer.getMetrics()
      setZoomTag(m.zoomTag || '')
    }, 250)

    return () => {
      window.clearInterval(syncId)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      mqReduce.removeEventListener?.('change', onReduce)
      renderer.destroy()
      rendererRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowMobile])

  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    if (loading || !visible || docHidden) {
      r.stop()
      if (loading) r.drawSkeleton()
    } else {
      r.rebuildWires()
      r.start()
    }
  }, [loading, visible, docHidden, levels])

  useEffect(() => {
    invalidatePorts()
  }, [open, sel, ui, placeTick, mobile, invalidatePorts])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && zoom) {
        setZoom(false)
        setOpen(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  // Mobil sahne yüksekliği: max(360, kalan dvh payı)
  useEffect(() => {
    if (!flowMobile) return undefined
    const view = stageViewRef.current
    const root = rootRef.current
    if (!view || !root) return undefined

    const apply = () => {
      const stage = stageRef.current
      const used = [
        root.querySelector('.ob-mhead'),
        root.querySelector('.ob-mchips'),
        root.querySelector('.ob-mbar--sticky'),
        stage?.querySelector('.ob-grid--top'),
        stage?.querySelector('.ob-grid--bot'),
      ].reduce((sum, el) => sum + (el ? /** @type {HTMLElement} */ (el).offsetHeight : 0), 0)
      const avail = window.innerHeight - root.getBoundingClientRect().top - used - 8
      view.style.minHeight = '360px'
      view.style.height = `${Math.max(360, avail)}px`
      rendererRef.current?.layout()
      invalidatePorts()
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(root)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [flowMobile, placeTick, showHint, invalidatePorts])

  const placeStyle = useCallback(
    (id) => {
      const stage = stageRef.current
      const W = stage?.clientWidth || 800
      const H = stage?.clientHeight || 720
      void placeTick
      if (ui.hid[id] && !mobile) return { visibility: 'hidden', pointerEvents: 'none' }

      // Mobil akış: grid hücresi — absolut yok; masaüstü konumları etkilemez
      if (flowMobile) {
        return {
          position: 'relative',
          left: 'auto',
          right: 'auto',
          top: 'auto',
          bottom: 'auto',
          transform: 'none',
          width: 'auto',
          marginTop: 0,
        }
      }

      const mode = mobile ? 'm' : 'd'
      const cp = ui.pos[mode][id]
      if (cp) {
        return {
          transform: 'none',
          right: 'auto',
          bottom: 'auto',
          left: Math.max(0, Math.min(cp[0] * W, Math.max(0, W - 60))),
          top: Math.max(0, Math.min(cp[1] * H, Math.max(0, H - 24))),
        }
      }
      if (mobile) {
        const i = MOBILE_ORDER.indexOf(id)
        const top = i < 4
        const row = Math.floor((i % 4) / 2)
        const col = i % 2
        const colW = (W - 30) / 2
        const topPad = fillViewport ? 72 : 10
        const botPad = fillViewport ? 56 : 10
        return {
          transform: 'none',
          width: colW,
          right: 'auto',
          left: 10 + col * (colW + 10),
          ...(top
            ? { top: topPad + row * 42, bottom: 'auto' }
            : { bottom: botPad + (1 - row) * 42, top: 'auto' }),
        }
      }

      const layout = fillViewport ? EDGE_LAYOUT : DEFAULT_LAYOUT
      const [fx, fy, , al] = layout[id]
      const m = EDGE_MARGIN_PX

      if (fillViewport) {
        if (al === 'l') {
          const minTop = HUD_SAFE.topLeft.h + 8
          const top = Math.max(minTop, Math.min(fy * H, H - 120))
          return { left: m, right: 'auto', top, bottom: 'auto', transform: 'none' }
        }
        if (al === 'r') {
          const minTop = HUD_SAFE.topRight.h + 8
          const top = Math.max(minTop, Math.min(fy * H, H - 120))
          return { left: 'auto', right: m, top, bottom: 'auto', transform: 'none' }
        }
        if (al === 'ct') {
          return {
            left: fx * W,
            right: 'auto',
            top: m,
            bottom: 'auto',
            transform: 'translateX(-50%)',
          }
        }
        if (al === 'cb') {
          return {
            left: fx * W,
            right: 'auto',
            top: 'auto',
            bottom: m,
            transform: 'translateX(-50%)',
          }
        }
      }

      const tx = al[0] === 'l' ? '0' : al[0] === 'r' ? '-100%' : '-50%'
      if (al[1] === 'b') {
        return { left: fx * W, transform: `translateX(${tx})`, top: 'auto', bottom: 10, right: 'auto' }
      }
      return { left: fx * W, transform: `translateX(${tx})`, top: fy * H, bottom: 'auto', right: 'auto' }
    },
    [ui, mobile, placeTick, fillViewport, flowMobile],
  )

  const sideFor = useCallback(
    (id) => {
      if (mobile) return MOBILE_ORDER.indexOf(id) % 2 ? 'pl' : 'pr'
      const stage = stageRef.current
      const W = stage?.clientWidth || 800
      const cp = ui.pos.d[id]
      if (cp) return cp[0] * W + 102 < W / 2 ? 'pr' : 'pl'
      const layout = fillViewport ? EDGE_LAYOUT : DEFAULT_LAYOUT
      return /** @type {'pr'|'pl'} */ (layout[id][2])
    },
    [mobile, ui, fillViewport],
  )

  // Açık kart: HUD yasak bölgeleri + sahne kenarı; kesişen sol-alt/sağ-alt HUD soldur
  useEffect(() => {
    if (mobile || !fillViewport) {
      LOBE_META.forEach((m) => {
        const n = nodeEls.current[m.id]
        if (n) n.style.marginTop = '0px'
      })
      setHudDim({ bl: false, br: false })
      return
    }
    if (!open) {
      LOBE_META.forEach((m) => {
        const n = nodeEls.current[m.id]
        if (n) n.style.marginTop = '0px'
      })
      setHudDim({ bl: false, br: false })
      setZoomTagHidden(false)
      return
    }

    const stage = stageRef.current
    if (!stage) return
    const sr = stage.getBoundingClientRect()
    const H = sr.height

    /** @type {{ left: number; right: number; top: number; bottom: number }[]} */
    const forbidden = []
    for (const ref of [hudTlRef, hudTrRef, hudBlRef]) {
      const el = ref.current
      if (!el) continue
      forbidden.push(inflateRect(el.getBoundingClientRect(), FORBIDDEN_PAD))
    }

    LOBE_META.forEach((m) => {
      const n = nodeEls.current[m.id]
      if (!n) return
      const cur = parseFloat(n.style.marginTop) || 0
      if (m.id !== open || n.hidden) {
        if (cur) n.style.marginTop = '0px'
        return
      }
      const r = n.getBoundingClientRect()
      const natTop = r.top - sr.top - cur
      const natH = r.height
      const left = r.left
      const right = r.right

      const cardAt = (mt) => ({
        left,
        right,
        top: sr.top + natTop + mt,
        bottom: sr.top + natTop + mt + natH,
      })

      const inStage = (mt) => {
        const top = natTop + mt
        return top >= 4 && top + natH <= H - 4
      }

      const hitsForbidden = (mt) => {
        if (!inStage(mt)) return true
        const cr = cardAt(mt)
        return forbidden.some((z) => rectsOverlap(cr, z))
      }

      let want = 0
      if (hitsForbidden(0)) {
        let found = false
        for (let mt = 0; mt >= -(natTop - 4); mt -= 2) {
          if (!hitsForbidden(mt)) {
            want = mt
            found = true
            break
          }
        }
        if (!found) {
          for (let mt = 2; mt <= H - 4 - natH - natTop; mt += 2) {
            if (!hitsForbidden(mt)) {
              want = mt
              found = true
              break
            }
          }
        }
        if (!found) {
          // En azından sahne içinde tut: yukarı öncelikli
          want = Math.min(0, H - 8 - (natTop + natH))
          want = Math.max(-(natTop - 4), want)
        }
      }

      if (Math.abs(want - cur) > 0.5) n.style.marginTop = `${want}px`
    })

    const openEl = nodeEls.current[open]
    if (openEl) {
      const cr = openEl.getBoundingClientRect()
      const bl = hudBlRef.current?.getBoundingClientRect()
      const br = hudBrRef.current?.getBoundingClientRect()
      setHudDim({
        bl: !!(bl && rectsOverlap(cr, inflateRect(bl, 4))),
        br: !!(br && rectsOverlap(cr, inflateRect(br, 4))),
      })
    } else {
      setHudDim({ bl: false, br: false })
    }

    invalidatePorts()
  }, [open, mobile, fillViewport, placeTick, invalidatePorts])

  // Zoom etiketi ↔ kart kesişimi (yalnızca masaüstü)
  useEffect(() => {
    if (mobile || !zoomTag) {
      setZoomTagHidden(false)
      return
    }
    const tag = zoomTagRef.current
    if (!tag) return
    const tr = tag.getBoundingClientRect()
    let hit = false
    for (const m of LOBE_META) {
      const n = nodeEls.current[m.id]
      if (!n || n.hidden) continue
      if (rectsOverlap(tr, n.getBoundingClientRect())) {
        hit = true
        break
      }
    }
    setZoomTagHidden(hit)
  }, [zoomTag, open, placeTick, mobile, ui, sel])

  const select = useCallback(
    (id, withZoom) => {
      stopGuidePulse()
      setSel((prev) => {
        if (withZoom && prev === id && zoom) {
          setZoom(false)
          setOpen(null)
          return prev
        }
        if (withZoom) {
          setZoom(true)
          setOpen(id)
        }
        return id
      })
    },
    [zoom, stopGuidePulse],
  )

  const onCanvasClick = useCallback(
    (e) => {
      const L = rendererRef.current?.screenToBrain(e.clientX, e.clientY)
      if (L) select(L.id, true)
      else if (zoom || open) {
        setZoom(false)
        setOpen(null)
      }
    },
    [select, zoom, open],
  )

  const onCanvasMove = useCallback((e) => {
    const cv = canvasRef.current
    if (!cv) return
    const L = rendererRef.current?.screenToBrain(e.clientX, e.clientY)
    cv.style.cursor = L ? 'pointer' : 'default'
  }, [])

  const startDrag = useCallback(
    (id, e) => {
      if (mobile) return
      if (e.target.closest('button')) return
      const stage = stageRef.current
      const n = nodeEls.current[id]
      if (!stage || !n) return
      stopGuidePulse()
      const sr = stage.getBoundingClientRect()
      const r = n.getBoundingClientRect()
      dragRef.current = {
        id,
        x: e.clientX,
        y: e.clientY,
        l: r.left - sr.left,
        t: r.top - sr.top,
        moved: false,
      }
      e.currentTarget.setPointerCapture?.(e.pointerId)
    },
    [stopGuidePulse, mobile],
  )

  const moveDrag = useCallback(
    (e) => {
      if (mobile) return
      const drag = dragRef.current
      const stage = stageRef.current
      const n = drag ? nodeEls.current[drag.id] : null
      if (!drag || !stage || !n) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (!drag.moved && Math.hypot(dx, dy) < 4) return
      if (!drag.moved) {
        drag.moved = true
        n.classList.add('ob-drag')
        n.style.transform = 'none'
        n.style.bottom = 'auto'
      }
      const W = stage.clientWidth
      const H = stage.clientHeight
      const l = Math.max(0, Math.min(W - n.offsetWidth, drag.l + dx))
      const t = Math.max(0, Math.min(H - n.offsetHeight, drag.t + dy))
      n.style.left = `${l}px`
      n.style.top = `${t}px`
      drag.cur = [l, t]
      invalidatePorts()
    },
    [invalidatePorts, mobile],
  )

  const endDrag = useCallback(
    (id) => {
      if (mobile) return
      const drag = dragRef.current
      const n = nodeEls.current[id]
      if (!drag || drag.id !== id) return
      if (n) n.classList.remove('ob-drag')
      const stage = stageRef.current
      if (drag.moved && drag.cur && stage) {
        const W = stage.clientWidth
        const H = stage.clientHeight
        persistUi({
          ...ui,
          pos: {
            ...ui.pos,
            d: { ...ui.pos.d, [id]: [drag.cur[0] / W, drag.cur[1] / H] },
          },
        })
      } else {
        select(id, true)
      }
      dragRef.current = null
      invalidatePorts()
    },
    [mobile, ui, persistUi, select, invalidatePorts],
  )

  const goModule = useCallback(
    (to) => {
      if (!to) return
      navigate(to)
    },
    [navigate],
  )

  const hiddenMetas = mobile ? [] : LOBE_META.filter((m) => ui.hid[m.id])
  const selMeta = LOBE_BY_ID[sel]
  const weakMeta = LOBE_BY_ID[weak.id]
  const weakCol = weakMeta?.col ?? '#888'

  const zoomOut = () => {
    setZoom(false)
    setOpen(null)
  }
  const resetLayout = () => {
    persistUi({ pos: { d: {}, m: {} }, col: {}, hid: {} })
    setPlaceTick((t) => t + 1)
  }

  const renderCard = (meta) => (
    <NeuralNodeCard
      key={meta.id}
      meta={meta}
      region={state.regions[meta.id]}
      selected={sel === meta.id}
      open={open === meta.id}
      mobile={mobile}
      side={sideFor(meta.id)}
      style={placeStyle(meta.id)}
      nodeRef={(el) => {
        nodeEls.current[meta.id] = el
      }}
      onSelect={() => select(meta.id, true)}
      onToggleOpen={() => {
        stopGuidePulse()
        if (open === meta.id) setOpen(null)
        else {
          setOpen(meta.id)
          setSel(meta.id)
        }
      }}
      onHide={() => persistUi({ ...ui, hid: { ...ui.hid, [meta.id]: true } })}
      onDragStart={(e) => startDrag(meta.id, e)}
      onDragMove={moveDrag}
      onDragEnd={() => endDrag(meta.id)}
      onGoModule={goModule}
      guidePulse={guidePulse && !sel && weak.id === meta.id}
    />
  )

  const fabButtons = (
    <>
      <button
        type="button"
        className="ob-fab"
        disabled={!zoom}
        onClick={zoomOut}
        title="Tümünü göster"
        aria-label="Tümünü göster"
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14L3 21" />
        </svg>
        <span className="ob-fab-lbl">Tümünü göster</span>
      </button>
      <button
        type="button"
        className="ob-fab"
        onClick={resetLayout}
        title="Düzeni sıfırla"
        aria-label="Düzeni sıfırla"
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M3 12a9 9 0 0 1 15.5-6.4M21 12a9 9 0 0 1-15.5 6.4M3 5v5h5M21 19v-5h-5" />
        </svg>
        <span className="ob-fab-lbl">Düzeni sıfırla</span>
      </button>
    </>
  )

  const chipRow = (
    <>
      <button
        type="button"
        className="ob-glass-chip"
        style={{ ['--ob-c']: weakCol }}
        onClick={() => select(weak.id, true)}
        title="En zayıf bölgeye git"
      >
        <i className="ob-glass-dot" aria-hidden />
        <span>
          EN ZAYIF · {weak.name} · lv {weak.level}
        </span>
      </button>
      <div className="ob-glass-chip ob-glass-chip--static">
        <span>SERİ · {state.streak} gün</span>
      </div>
    </>
  )

  const mbarContent = (
    <>
      <div className="ob-t">
        <b>{selMeta?.name ?? weak.name}</b>
        <span>
          lv {(sel ? levels[sel] : weak.level) ?? 1} ·{' '}
          {(selMeta?.mods || weakMeta?.mods || []).map((m) => m.label).join(', ')}
        </span>
      </div>
      <button
        type="button"
        className="ob-act"
        onClick={() => goModule(selMeta?.goTo ?? weakMeta?.goTo ?? '/antrenman')}
      >
        MODÜLE GİT
      </button>
    </>
  )

  if (error) {
    return (
      <div className="ob-root">
        <p className="ob-err">Beyin verisi okunamadı.</p>
        <button type="button" className="ob-btn" onClick={() => refresh()}>
          Tekrar dene
        </button>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={[
        'ob-root',
        fillViewport ? 'ob-root--fill' : '',
        flowMobile ? 'ob-root--flow' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!fillViewport ? (
        <>
          <div className="ob-bar">
            <h2>OPERATÖR BEYNİ</h2>
            <p className="ob-sub">Eğitim kayıtların beynini şekillendirir</p>
            <span>
              toplam <b>{state.totalLevel}/80</b>
            </span>
            <span>
              en zayıf{' '}
              <b className="ob-w">
                {weak.name.toLowerCase()} · lv {weak.level}
              </b>
            </span>
            <span>
              seri <b>{state.streak}</b>
            </span>
          </div>
          <div className="ob-ctrl" role="group" aria-label="Görünüm">
            <button type="button" className="ob-btn" disabled={!zoom} onClick={zoomOut}>
              Tümünü göster
            </button>
            <button type="button" className="ob-btn" onClick={resetLayout}>
              Düzeni sıfırla
            </button>
            <span className="ob-hidden-list">
              {hiddenMetas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="ob-hchip"
                  onClick={() => {
                    const hid = { ...ui.hid }
                    delete hid[m.id]
                    persistUi({ ...ui, hid })
                  }}
                >
                  + {m.name.toLowerCase()}
                </button>
              ))}
            </span>
          </div>
        </>
      ) : null}

      {flowMobile ? (
        <>
          <header className="ob-mhead">
            <div className="ob-mhead-text">
              <h2 className="ob-hud-title">OPERATÖR BEYNİ</h2>
              <p className="ob-mhead-level">
                {state.totalLevel}/80 <span>toplam seviye</span>
              </p>
            </div>
            <div className="ob-mhead-fabs" role="group" aria-label="Görünüm">
              {fabButtons}
            </div>
          </header>
          <div className="ob-mchips">{chipRow}</div>
        </>
      ) : null}

      <div
        className={[
          'ob-stage',
          fillViewport ? 'ob-stage--bleed' : '',
          flowMobile ? 'ob-stage--flow' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        ref={stageRef}
      >
        <div className="ob-stage-glow" aria-hidden />
        <div className="ob-stage-vignette" aria-hidden />
        <canvas
          ref={canvasRef}
          aria-label="Animasyonlu beyin haritası. Bölgeye tıklayınca o bölgeye yaklaşır."
          onClick={onCanvasClick}
          onMouseMove={onCanvasMove}
        />
        {!flowMobile && zoomTag ? (
          <div
            ref={zoomTagRef}
            className={['ob-zoomtag', zoomTagHidden ? 'ob-zoomtag--hidden' : ''].filter(Boolean).join(' ')}
          >
            {zoomTag}
          </div>
        ) : null}

        {fillViewport && !flowMobile ? (
          <>
            <div className="ob-hud ob-hud-tl" ref={hudTlRef}>
              <h2 className="ob-hud-title">OPERATÖR BEYNİ</h2>
              <p className="ob-hud-sub">Eğitim kayıtların beynini şekillendirir</p>
              <p className="ob-hud-level">
                <span className="ob-hud-level-num">
                  {state.totalLevel} <span className="ob-hud-level-den">/ 80</span>
                </span>
                <span className="ob-hud-level-lbl">toplam seviye</span>
              </p>
            </div>
            <div className="ob-hud ob-hud-tr" ref={hudTrRef}>
              {chipRow}
            </div>
            <div
              className={['ob-hud', 'ob-hud-bl', hudDim.bl ? 'ob-hud--dim' : ''].filter(Boolean).join(' ')}
              ref={hudBlRef}
              role="group"
              aria-label="Görünüm"
            >
              {fabButtons}
              {hiddenMetas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="ob-hchip"
                  onClick={() => {
                    const hid = { ...ui.hid }
                    delete hid[m.id]
                    persistUi({ ...ui, hid })
                  }}
                >
                  + {m.name.toLowerCase()}
                </button>
              ))}
            </div>
            {showHint ? (
              <p
                ref={hudBrRef}
                className={['ob-hud', 'ob-hud-br', 'ob-hint', hudDim.br ? 'ob-hud--dim' : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                Bir bölgeye tıkla · kartları sürükleyebilirsin
              </p>
            ) : null}
          </>
        ) : null}

        {!loading && !hasActivity ? (
          <div className="ob-empty">
            <div className="ob-empty-glow" aria-hidden />
            <p>İlk kaydını gir, beynin uyansın</p>
            <button type="button" className="ob-act" onClick={() => navigate('/antrenman')}>
              ANTRENMANA GİT
            </button>
          </div>
        ) : null}

        {flowMobile ? (
          <>
            <div className="ob-grid ob-grid--top">
              {MOBILE_TOP.map((id) => renderCard(LOBE_BY_ID[id]))}
            </div>
            <div className="ob-stage-view" ref={stageViewRef} aria-hidden />
            <div className="ob-grid ob-grid--bot">
              {MOBILE_BOT.map((id) => renderCard(LOBE_BY_ID[id]))}
            </div>
          </>
        ) : (
          LOBE_META.map((meta) => renderCard(meta))
        )}

        {fillViewport && !flowMobile ? (
          <div className="ob-mbar ob-mbar--overlay">{mbarContent}</div>
        ) : null}
      </div>

      {flowMobile ? <div className="ob-mbar ob-mbar--sticky">{mbarContent}</div> : null}

      {!fillViewport ? <div className="ob-mbar">{mbarContent}</div> : null}
    </div>
  )
}
