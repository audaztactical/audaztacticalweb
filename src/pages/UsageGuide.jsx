import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen } from 'lucide-react'
import HudFluffDecor from '../components/dashboard/HudFluffDecor'
import GuideShell from '../components/guide/GuideShell'
import GuideNav from '../components/guide/GuideNav'
import GuideSection from '../components/guide/GuideSection'
import GuideInfoNote from '../components/guide/GuideInfoNote'
import { GUIDE_SECTIONS } from '../data/guideContent'
import { flattenGuideNavIds } from '../data/guideNavTree'

export default function UsageGuide() {
  const sectionIds = useMemo(() => flattenGuideNavIds(), [])
  const [activeId, setActiveId] = useState(sectionIds[0] ?? 'platform-intro')

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setActiveId(id)
    window.history.replaceState(null, '', `#${id}`)
  }, [])

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (hash && GUIDE_SECTIONS[hash]) {
      setActiveId(hash)
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ block: 'start' })
      })
    }
  }, [])

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)

    if (!elements.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (top?.target?.id) {
          setActiveId(top.target.id)
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [sectionIds])

  return (
    <div className="relative w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8">
      <HudFluffDecor className="pointer-events-none opacity-40" />

      <header className="relative mb-8 border-b border-amber-500/20 pb-6">
        <div className="mb-2 flex items-center gap-2">
          <BookOpen className="size-5 text-amber-500/80" strokeWidth={1.5} aria-hidden />
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.32em] text-amber-500/85">
            [ KULLANIM KILAVUZU ]
          </p>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-[0.12em] text-app-text sm:text-3xl">
          Operatör Kılavuzu
        </h1>
        <p className="mt-2 max-w-2xl font-mono-technical text-xs leading-relaxed text-app-text/55">
          Audaz Tactical modüllerinin amacı, ön koşulları ve adım adım kullanımı. Her bölümde güncel
          durum sade bir bilgi notu olarak özetlenir.
        </p>
        <div className="mt-4">
          <GuideInfoNote>
            Beta dönemindesiniz: tüm bireysel antrenman sektörleri açık, atış kayıt sınırı uygulanmıyor
            ve ücretli ödeme henüz aktif değil — premium veya eğitmen erişimi erişim kodu ile
            verilebilir. Resmi lansman sonrasında planlar değişebilir.
          </GuideInfoNote>
        </div>
      </header>

      <GuideShell nav={<GuideNav activeId={activeId} onSelect={scrollToSection} />}>
        {sectionIds.map((id) => {
          const section = GUIDE_SECTIONS[id]
          if (!section) return null
          return <GuideSection key={id} id={id} section={section} />
        })}
      </GuideShell>
    </div>
  )
}
