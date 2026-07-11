import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Shield, ShieldAlert } from 'lucide-react'
import GuideInfoNote, { GuidePrerequisiteCallout } from './GuideInfoNote'
import GuideFlowDiagram from './GuideFlowDiagram'
import { resolveGuideSectionDisplay } from '../../lib/guideDisplayText'

/** @typedef {import('../../data/guideContent').GuideSectionMeta} GuideSectionMeta */

/**
 * @param {{
 *   id: string
 *   section: GuideSectionMeta
 * }} props
 */
export default function GuideSection({ id, section }) {
  const { t, i18n } = useTranslation('guide')
  const display = resolveGuideSectionDisplay(id, section)
  // Re-resolve when language changes (resolveGuideSectionDisplay uses i18n singleton)
  void i18n.language

  const {
    title,
    opsCode,
    pageLink,
    access,
    purpose,
    prerequisites,
    steps,
    infoNote,
    flowId,
    notes,
    instructorOnly,
    adminOnly,
  } = display

  return (
    <section id={id} className="scroll-mt-24 border-b border-white/8 pb-10 last:border-b-0 last:pb-0">
      <header className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {opsCode ? (
            <span className="font-mono-technical text-[8px] font-bold tabular-nums tracking-[0.2em] text-amber-500/70">
              {opsCode}
            </span>
          ) : null}
          {instructorOnly ? (
            <span className="inline-flex items-center gap-1 rounded border border-violet-500/35 bg-violet-950/30 px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-violet-300">
              <Shield className="size-3" strokeWidth={2} aria-hidden />
              {t('ui.badgeInstructor')}
            </span>
          ) : null}
          {adminOnly ? (
            <span className="inline-flex items-center gap-1 rounded border border-lime-500/35 bg-lime-950/25 px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-lime-300">
              <ShieldAlert className="size-3" strokeWidth={2} aria-hidden />
              {t('ui.badgeAdmin')}
            </span>
          ) : null}
        </div>
        <h2 className="font-display text-lg font-bold uppercase tracking-[0.1em] text-app-text sm:text-xl">
          {title}
        </h2>
        {pageLink ? (
          <Link
            to={pageLink.to}
            className="inline-flex items-center gap-1 font-mono-technical text-[10px] text-amber-400/90 transition hover:text-amber-300"
          >
            {pageLink.label}
            <ChevronRight className="size-3 opacity-70" strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
      </header>

      <dl className="mb-4 space-y-3 font-mono-technical text-xs leading-relaxed">
        <div>
          <dt className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-app-text/45">
            {t('ui.accessLabel')}
          </dt>
          <dd className="text-app-text/80">{access}</dd>
        </div>
        <div>
          <dt className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-app-text/45">
            {t('ui.purposeLabel')}
          </dt>
          <dd className="text-app-text/85">{purpose}</dd>
        </div>
      </dl>

      {infoNote ? <GuideInfoNote className="mb-4">{infoNote}</GuideInfoNote> : null}

      {prerequisites?.length ? (
        <GuidePrerequisiteCallout className="mb-4" label={t('ui.prerequisiteLabel')}>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {prerequisites.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </GuidePrerequisiteCallout>
      ) : null}

      {flowId ? <GuideFlowDiagram flowId={flowId} className="mb-4" /> : null}

      <div className="mb-3">
        <p className="mb-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-amber-500/75">
          {t('ui.stepsLabel')}
        </p>
        <ol className="list-decimal space-y-2 pl-5 font-mono-technical text-xs leading-relaxed text-app-text/85">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {notes?.length ? (
        <ul className="space-y-1 border-l-2 border-amber-500/25 pl-3 font-mono-technical text-[10px] leading-relaxed text-app-text/55">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
