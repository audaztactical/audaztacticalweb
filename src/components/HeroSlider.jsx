import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * @typedef {{
 *   label: string
 *   value: string
 *   top: string
 *   left: string
 * }} HeroCallout
 */

/**
 * @typedef {{
 *   title: string
 *   lines: string[]
 *   top: string
 *   left: string
 * }} HeroDataBox
 */

/**
 * @typedef {{
 *   id: string
 *   title: string
 *   src: string
 *   alt: string
 *   callouts: HeroCallout[]
 *   dataBoxes: HeroDataBox[]
 *   scrollLines: string[]
 *   missionMap: { label: string, coords: string[] }
 *   resources: { label: string, value: string }[]
 * }} HeroSlide
 */

/** @type {HeroSlide[]} */
const HERO_SLIDES = [
  {
    id: 'core-circuit',
    title: 'DİJİTAL ÇEKİRDEK · DEVRE ANALİZİ',
    src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=90',
    alt: 'Yüksek çözünürlüklü devre kartı — taktik veri katmanı',
    callouts: [
      { label: 'İŞLEMCİ ÇEKİRDEK', value: 'AKTİF (8/12)', top: '22%', left: '38%' },
      { label: 'VERİ YOLU YÜKÜ', value: '12 GB/s', top: '48%', left: '52%' },
      { label: 'SİSTEM UYUMLULUK', value: '%100', top: '62%', left: '28%' },
    ],
    dataBoxes: [
      {
        title: 'TERMAL DURUM',
        lines: ['ÇEKİRDEK: 42°C', 'SOĞUTMA: NOMİNAL', 'FAN RPM: 2840'],
        top: '12%',
        left: '4%',
      },
      {
        title: 'SİNYAL AKIŞI',
        lines: ['PAKET: 0xAF92', 'LATENCY: 1.2ms', 'ŞİFRE: AES-256'],
        top: '58%',
        left: '62%',
      },
    ],
    scrollLines: [
      '>> BUS_SCAN :: LANE_04 SYNC OK',
      '>> CORE_CLUSTER :: 8/12 NODE ACTIVE',
      '>> FIRMWARE :: AUDAZ-HUD v2.4 STABLE',
      '>> THERMAL :: WITHIN OPERATIONAL LIMITS',
    ],
    missionMap: {
      label: 'GÖREV HARİTASI',
      coords: ['39.12°N 32.45°E', 'SEKTÖR: ALPHA-7', 'GRID: 14-C'],
    },
    resources: [
      { label: 'Mühimmat', value: '%87' },
      { label: 'Optik', value: '12 ÜNİTE' },
      { label: 'İletişim', value: 'UPLINK OK' },
    ],
  },
  {
    id: 'night-ops',
    title: 'GECE OPERASYONU · KOMUTA GÖRÜNÜMÜ',
    src: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1800&q=85',
    alt: 'Gece operasyonu — küresel taktik ağ görselleştirmesi',
    callouts: [
      { label: 'UYDU BAĞLANTISI', value: 'KİLİTLİ', top: '28%', left: '44%' },
      { label: 'HEDEF BÖLGE', value: 'SEKTÖR-9', top: '55%', left: '36%' },
      { label: 'OPERATÖR DURUMU', value: 'HAZIR', top: '40%', left: '58%' },
    ],
    dataBoxes: [
      {
        title: 'METEOROLOJİ',
        lines: ['RÜZGÂR: 4 KT', 'GÖRÜŞ: 8 KM', 'BULUT: %12'],
        top: '14%',
        left: '5%',
      },
      {
        title: 'TELSİZ SPEKTRUM',
        lines: ['KANAL: TAC-03', 'ŞİFRE: ROTASYON-A', 'GÜRÜLTÜ: DÜŞÜK'],
        top: '54%',
        left: '58%',
      },
    ],
    scrollLines: [
      '>> ORBIT_LINK :: GEO-SYNC ESTABLISHED',
      '>> SECTOR_SCAN :: 9 TARGETS TRACKED',
      '>> COMMS :: ENCRYPTED CHANNEL OPEN',
      '>> WEATHER :: MISSION WINDOW GREEN',
    ],
    missionMap: {
      label: 'GÖREV HARİTASI',
      coords: ['40.88°N 29.92°E', 'SEKTÖR: BRAVO-2', 'GRID: 07-A'],
    },
    resources: [
      { label: 'Ekipman', value: '%94' },
      { label: 'NVG', value: '6 ÇİFT' },
      { label: 'Medikal', value: 'TAM SET' },
    ],
  },
  {
    id: 'cyber-defense',
    title: 'SİBER SAVUNMA · TEHDİT MATRİSİ',
    src: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1800&q=85',
    alt: 'Siber savunma — tehdit analiz matrisi',
    callouts: [
      { label: 'GÜVENLİK DUVARI', value: 'AKTİF', top: '26%', left: '40%' },
      { label: 'SALDIRI VEKTÖRÜ', value: 'İZOLE', top: '50%', left: '50%' },
      { label: 'ŞİFRELEME KATMANI', value: 'AES-256', top: '65%', left: '32%' },
    ],
    dataBoxes: [
      {
        title: 'TEHDİT LOG',
        lines: ['IDS: 0 KRİTİK', 'PACKET: FİLTRELENDİ', 'BOT: BLOKE'],
        top: '10%',
        left: '4%',
      },
      {
        title: 'AĞ TOPOLOJİSİ',
        lines: ['NODE: 24/24', 'LATENCY: 0.8ms', 'UPTIME: 99.9%'],
        top: '56%',
        left: '60%',
      },
    ],
    scrollLines: [
      '>> IDS_SCAN :: NO CRITICAL THREATS',
      '>> FIREWALL :: ALL ZONES SECURE',
      '>> ENCRYPTION :: LAYER 7 ACTIVE',
      '>> AUDIT :: COMPLIANCE PASS',
    ],
    missionMap: {
      label: 'GÖREV HARİTASI',
      coords: ['41.01°N 28.97°E', 'SEKTÖR: DELTA-1', 'GRID: 22-F'],
    },
    resources: [
      { label: 'Sunucu', value: '%72 YÜK' },
      { label: 'Yedek', value: 'HAZIR' },
      { label: 'Anahtar', value: 'ROTASYON OK' },
    ],
  },
]

const AUTOPLAY_MS = 6000

const glitchTransition = {
  initial: { opacity: 0, scale: 1.04, filter: 'blur(4px)' },
  animate: {
    opacity: [0, 0.4, 0.15, 1],
    scale: [1.04, 0.98, 1.01, 1],
    filter: ['blur(4px)', 'blur(2px)', 'blur(0px)', 'blur(0px)'],
    x: [8, -4, 2, 0],
  },
  exit: { opacity: 0, scale: 0.96, filter: 'blur(3px)', x: -6 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
}

/**
 * @param {{ direction: 'left' | 'right', onClick: () => void, label: string }} props
 */
function TacticalArrow({ direction, onClick, label }) {
  const isLeft = direction === 'left'
  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute top-1/2 z-20 -translate-y-1/2"
      style={isLeft ? { left: '0.75rem' } : { right: '0.75rem' }}
      aria-label={label}
    >
      <span
        className={[
          'flex size-10 items-center justify-center backdrop-blur-sm transition',
          'border border-[#ffaa00]/25 bg-black/60',
          'shadow-[0_0_18px_-4px_rgba(255,170,0,0.5)]',
          'group-hover:border-[#ffaa00]/70 group-hover:shadow-[0_0_24px_-2px_rgba(255,170,0,0.65)]',
        ].join(' ')}
        style={{
          clipPath: isLeft
            ? 'polygon(100% 0%, 30% 50%, 100% 100%, 70% 50%)'
            : 'polygon(0% 0%, 70% 50%, 0% 100%, 30% 50%)',
        }}
      >
        <span
          className={[
            'block size-0 border-y-[6px] border-y-transparent transition',
            isLeft
              ? 'ml-1 border-r-[10px] border-r-[#ffaa00]/90 group-hover:border-r-[#ffaa00]'
              : 'mr-1 border-l-[10px] border-l-[#ffaa00]/90 group-hover:border-l-[#ffaa00]',
          ].join(' ')}
          aria-hidden
        />
      </span>
    </button>
  )
}

/**
 * @param {{ callout: HeroCallout }} props
 */
function CalloutPin({ callout }) {
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ top: callout.top, left: callout.left }}
    >
      <div className="relative">
        <span className="absolute -left-1.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#ffaa00] shadow-[0_0_10px_2px_rgba(255,170,0,0.7)]" />
        <div className="ml-3 rounded-sm border border-[#ffaa00]/35 bg-black/75 px-2 py-1 backdrop-blur-sm">
          <p className="font-mono-technical text-[7px] uppercase tracking-wider text-[#ffaa00]/80">
            {callout.label}
          </p>
          <p className="font-mono-technical text-[9px] font-bold tabular-nums text-emerald-400">
            {callout.value}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{ box: HeroDataBox }} props
 */
function DataBox({ box }) {
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[120px] rounded-sm border border-cyan-500/30 bg-black/80 p-2 shadow-[0_0_20px_-6px_rgba(34,211,238,0.4)] backdrop-blur-md"
      style={{ top: box.top, left: box.left }}
    >
      <p className="mb-1 border-b border-cyan-500/20 pb-1 font-mono-technical text-[7px] font-bold uppercase tracking-[0.2em] text-cyan-400">
        {box.title}
      </p>
      {box.lines.map((line) => (
        <p key={line} className="font-mono-technical text-[8px] tabular-nums text-slate-400">
          {line}
        </p>
      ))}
    </div>
  )
}

/**
 * @param {{ lines: string[] }} props
 */
function ScrollStream({ lines }) {
  const doubled = [...lines, ...lines]
  return (
    <div className="pointer-events-none absolute bottom-14 left-0 right-48 z-10 overflow-hidden border-t border-[#ffaa00]/15 bg-black/50 py-1 backdrop-blur-sm">
      <motion.div
        className="flex whitespace-nowrap font-mono-technical text-[8px] uppercase tracking-wider text-[#ffaa00]/70"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((line, i) => (
          <span key={`${line}-${i}`} className="mx-6">
            {line}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

/**
 * @param {{ slide: HeroSlide }} props
 */
function SidePanel({ slide }) {
  return (
    <div className="pointer-events-none absolute right-0 top-0 z-10 flex h-full w-[140px] flex-col border-l border-[#ffaa00]/20 bg-black/75 backdrop-blur-md sm:w-[168px]">
      <div className="border-b border-[#ffaa00]/15 p-2.5">
        <p className="font-mono-technical text-[7px] font-bold uppercase tracking-[0.22em] text-[#ffaa00]">
          {slide.missionMap.label}
        </p>
        {slide.missionMap.coords.map((c) => (
          <p key={c} className="mt-1 font-mono-technical text-[8px] tabular-nums text-slate-400">
            {c}
          </p>
        ))}
      </div>
      <div className="flex-1 p-2.5">
        <p className="font-mono-technical text-[7px] font-bold uppercase tracking-[0.22em] text-cyan-400">
          KAYNAKLAR
        </p>
        <ul className="mt-2 space-y-2">
          {slide.resources.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-1">
              <span className="font-mono-technical text-[8px] text-slate-500">{r.label}</span>
              <span className="font-mono-technical text-[8px] font-bold tabular-nums text-emerald-400/90">
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-[#ffaa00]/15 p-2">
        <p className="font-mono-technical text-[7px] uppercase text-slate-600">CANLI · SIM</p>
      </div>
    </div>
  )
}

/**
 * @param {{ slide: HeroSlide }} props
 */
function SlideView({ slide }) {
  return (
    <motion.div
      key={slide.id}
      className="absolute inset-0"
      initial={glitchTransition.initial}
      animate={glitchTransition.animate}
      exit={glitchTransition.exit}
      transition={glitchTransition.transition}
    >
      <img
        src={slide.src}
        alt={slide.alt}
        className="absolute inset-0 h-full w-full object-cover brightness-90 contrast-110 saturate-75"
        decoding="async"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35" />
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,170,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,170,0,0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {slide.dataBoxes.map((box) => (
        <DataBox key={box.title} box={box} />
      ))}
      {slide.callouts.map((c) => (
        <CalloutPin key={c.label} callout={c} />
      ))}

      <SidePanel slide={slide} />
      <ScrollStream lines={slide.scrollLines} />

      <div className="pointer-events-none absolute left-4 top-3 z-10 max-w-[55%]">
        <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#ffaa00]">
          {slide.title}
        </p>
      </div>
    </motion.div>
  )
}

export default function HeroSlider() {
  const [index, setIndex] = useState(0)
  const total = HERO_SLIDES.length

  const goTo = useCallback(
    (next) => {
      setIndex(((next % total) + total) % total)
    },
    [total],
  )

  const goNext = useCallback(() => goTo(index + 1), [goTo, index])
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [total])

  const slide = HERO_SLIDES[index]

  return (
    <section
      className="relative mx-auto max-w-5xl overflow-hidden rounded-sm border border-[#333] shadow-2xl"
      aria-roledescription="carousel"
      aria-label="Operasyonel taktik görünüm ekranı"
    >
      <div className="relative aspect-[21/9] min-h-[220px] bg-black sm:min-h-[280px] md:min-h-[340px]">
        <AnimatePresence mode="wait" initial={false}>
          <SlideView slide={slide} />
        </AnimatePresence>

        <TacticalArrow direction="left" onClick={goPrev} label="Önceki slayt" />
        <TacticalArrow direction="right" onClick={goNext} label="Sonraki slayt" />

        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between gap-3 px-4 pb-3 pt-6">
          <p className="max-w-[45%] font-mono-technical text-[8px] uppercase leading-snug tracking-wider text-slate-500">
            {slide.alt}
          </p>
          <div className="flex shrink-0 items-end gap-2" role="tablist" aria-label="Slayt veri hatları">
            {HERO_SLIDES.map((item, i) => {
              const active = i === index
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Slayt ${i + 1}: ${item.title}`}
                  onClick={() => goTo(i)}
                  className="group flex flex-col items-center gap-1 py-1"
                >
                  <span
                    className={[
                      'block h-px transition-all duration-500',
                      active
                        ? 'w-10 animate-pulse bg-[#ffaa00] shadow-[0_0_12px_1px_rgba(255,170,0,0.75)]'
                        : 'w-6 bg-gray-600 group-hover:bg-gray-500',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'font-mono-technical text-[6px] uppercase tracking-widest',
                      active ? 'text-[#ffaa00]' : 'text-slate-600',
                    ].join(' ')}
                  >
                    {active ? 'AKTİF' : 'BEKLE'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
