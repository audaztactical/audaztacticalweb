import { Link } from 'react-router-dom'
import { ExternalLink, Shield, ShieldAlert } from 'lucide-react'
import GuideStatusCallout, { GuidePrerequisiteCallout } from './GuideStatusCallout'
import GuideFlowDiagram from './GuideFlowDiagram'

/** @typedef {import('../../data/guideContent').GuideSectionContent} GuideSectionContent */

/**
 * @param {{
 *   id: string
 *   section: GuideSectionContent
 * }} props
 */
export default function GuideSection({ id, section }) {
  const {
    title,
    opsCode,
    route,
    access,
    purpose,
    prerequisites,
    steps,
    status,
    flowId,
    notes,
    instructorOnly,
    adminOnly,
  } = section

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
              Eğitmen
            </span>
          ) : null}
          {adminOnly ? (
            <span className="inline-flex items-center gap-1 rounded border border-lime-500/35 bg-lime-950/25 px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-lime-300">
              <ShieldAlert className="size-3" strokeWidth={2} aria-hidden />
              Admin
            </span>
          ) : null}
        </div>
        <h2 className="font-display text-lg font-bold uppercase tracking-[0.1em] text-app-text sm:text-xl">
          {title}
        </h2>
        {route ? (
          <Link
            to={route.split('?')[0]}
            className="inline-flex items-center gap-1 font-mono-technical text-[10px] text-amber-400/90 transition hover:text-amber-300"
          >
            {route}
            <ExternalLink className="size-3 opacity-70" strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
      </header>

      <dl className="mb-4 space-y-3 font-mono-technical text-xs leading-relaxed">
        <div>
          <dt className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-app-text/45">Erişim</dt>
          <dd className="text-app-text/80">{access}</dd>
        </div>
        <div>
          <dt className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-app-text/45">Amaç</dt>
          <dd className="text-app-text/85">{purpose}</dd>
        </div>
      </dl>

      {status ? <GuideStatusCallout now={status.now} launch={status.launch} className="mb-4" /> : null}

      {prerequisites?.length ? (
        <GuidePrerequisiteCallout className="mb-4">
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
          Temel akış
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
