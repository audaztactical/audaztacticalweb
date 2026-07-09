import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, ChevronDown, ChevronUp, FileDown, Stethoscope } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  countCasualtyMarchInterventions,
  evacPriorityTone,
  formatCasualtyCardDate,
  getCasualtyAllergies,
  getCasualtyAppliedTreatmentsNote,
  getCasualtyEvacPriority,
  getCasualtyEvacPriorityLabel,
  getCasualtyMarchSections,
  getCasualtyMarchStep,
  getCasualtyMarchStepMeta,
  getCasualtyMechanismOfInjury,
  getCasualtyOperationNote,
  getCasualtyPatientName,
  getCasualtyBloodTypeLabel,
  sortCasualtyCardsDesc,
} from '../../lib/casualtyCardRegistry'
import { generateCasualtyCardReportPdf } from '../../lib/casualtyCardReportPdf'
import { healthPdfT } from '../../lib/pdfReportText'
import { healthT } from '../../lib/healthDisplayText'

const EVAC_BADGE = {
  urgent: 'border-red-500/50 bg-red-950/50 text-red-400 shadow-[0_0_12px_-4px_rgba(239,68,68,0.5)]',
  priority: 'border-accent/45 bg-accent/10 text-accent shadow-[0_0_12px_-4px_rgba(255,180,0,0.35)]',
  routine: 'border-accent/30 bg-accent/8 text-accent/80',
}

const MARCH_STEP_BADGE = {
  M: 'border-red-500/40 bg-red-950/40 text-red-400',
  A: 'border-amber-500/35 bg-amber-950/35 text-amber-400',
  R: 'border-sky-500/40 bg-sky-950/40 text-sky-400',
  C: 'border-emerald-500/35 bg-emerald-950/35 text-emerald-400',
  H: 'border-cyan-500/35 bg-cyan-950/35 text-cyan-400',
}

/**
 * @param {{ cards: Record<string, unknown>[]; loading: boolean }} props
 */
export default function TcccMedicalHistoryTab({ cards, loading }) {
  const { t } = useTranslation('health')
  const { user, userData } = useAuth()
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))
  const [pdfBusyId, setPdfBusyId] = useState(/** @type {string | null} */ (null))

  const sorted = useMemo(() => sortCasualtyCardsDesc(cards), [cards])

  const operator = useMemo(
    () => ({
      callsign: (userData?.callsign || user?.displayName || healthPdfT('common.defaultOperator')).trim(),
      username: userData?.username,
      email: user?.email ?? undefined,
      bloodType: userData?.bloodType,
    }),
    [user, userData],
  )

  /** @param {Record<string, unknown>} row */
  const handleDownloadPdf = async (row) => {
    if (!row?.id || pdfBusyId) return
    setPdfBusyId(String(row.id))
    try {
      await generateCasualtyCardReportPdf({ cards: [row], operator })
    } finally {
      setPdfBusyId(null)
    }
  }

  if (loading && sorted.length === 0) {
    return (
      <p className="py-12 text-center font-mono-technical text-[10px] uppercase text-app-text/45">
        {t('archive.loading')}
      </p>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-accent/25 bg-black/40">
        <Archive className="size-12 text-accent/30" aria-hidden />
        <p className="mt-3 font-mono-technical text-[10px] uppercase text-app-text/45">
          {t('archive.empty')}
        </p>
      </div>
    )
  }

  const emDash = healthT('common.emDash')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-accent/12 pb-2">
        <div>
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/90">
            {t('archive.title')}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {sorted.map((row) => {
          const id = String(row.id ?? '')
          const open = expandedId === id
          const evac = getCasualtyEvacPriority(row)
          const evacTone = evacPriorityTone(evac)
          const marchStep = getCasualtyMarchStep(row)
          const marchMeta = getCasualtyMarchStepMeta(row)
          const marchCount = countCasualtyMarchInterventions(row)
          const sections = getCasualtyMarchSections(row)
          const treatments = getCasualtyAppliedTreatmentsNote(row)
          const opNote = getCasualtyOperationNote(row)
          const hasNotes = treatments !== emDash || opNote !== emDash
          const pdfBusy = pdfBusyId === id

          return (
            <li
              key={id}
              className="overflow-hidden rounded-xl border border-accent/15 bg-gradient-to-br from-[#0a0a0a] to-black/80 font-mono-technical shadow-[inset_0_1px_0_rgba(0,255,65,0.06)]"
            >
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : id)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
                >
                  <div className="hidden shrink-0 flex-col items-start gap-1 sm:flex">
                    <span className="font-mono-technical text-[8px] uppercase tracking-wider text-app-text/55">
                      {formatCasualtyCardDate(row).split(' ')[0]}
                    </span>
                    <span className="font-mono-technical text-[10px] font-bold tabular-nums text-app-text/90">
                      {formatCasualtyCardDate(row).split(' ').slice(1).join(' ') || emDash}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${EVAC_BADGE[evacTone]}`}
                      >
                        {getCasualtyEvacPriorityLabel(row)}
                      </span>
                      <span
                        className={`inline-flex rounded border px-2 py-0.5 text-[8px] font-bold uppercase ${MARCH_STEP_BADGE[marchStep]}`}
                      >
                        {marchStep} · {marchMeta.subtitle}
                      </span>
                      {marchCount.done > 0 ? (
                        <span className="text-[8px] uppercase text-app-text/45">
                          {t('archive.interventionCount', { count: marchCount.done })}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 truncate text-sm font-bold uppercase tracking-wide text-accent">
                      {getCasualtyPatientName(row)}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] uppercase text-app-text/55 sm:hidden">
                      {formatCasualtyCardDate(row)}
                    </p>
                  </div>

                  {open ? (
                    <ChevronUp className="size-4 shrink-0 text-app-text/55" aria-hidden />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 text-app-text/55" aria-hidden />
                  )}
                </button>

                <button
                  type="button"
                  disabled={pdfBusy}
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleDownloadPdf(row)
                  }}
                  title={t('archive.downloadPdfTitle')}
                  aria-label={t('archive.downloadPdfAria')}
                  className="inline-flex w-11 shrink-0 items-center justify-center border-l border-accent/12 text-accent/60 transition hover:bg-accent/8 hover:text-accent disabled:opacity-40"
                >
                  <FileDown className={`size-4 ${pdfBusy ? 'animate-pulse' : ''}`} strokeWidth={2} aria-hidden />
                </button>
              </div>

              {open ? (
                <div className="border-t border-white/8 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MetaCell label={t('archive.bloodType')} value={getCasualtyBloodTypeLabel(row)} />
                    <MetaCell label={t('archive.allergies')} value={getCasualtyAllergies(row)} />
                    <MetaCell label={t('archive.moi')} value={getCasualtyMechanismOfInjury(row)} />
                  </div>

                  {sections.length > 0 ? (
                    <div className="mt-4">
                      <p className="mb-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-accent/70">
                        {t('archive.marchInterventions')}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {sections.map((section) => (
                          <div
                            key={section.step}
                            className={`rounded-lg border p-3 ${MARCH_STEP_BADGE[section.step]} border-opacity-40 bg-black/40`}
                          >
                            <p className="text-[9px] font-bold uppercase tracking-wider">
                              {section.step} · {section.title}
                            </p>
                            <ul className="mt-2 space-y-1">
                              {section.items.map((item) => (
                                <li key={item} className="text-[10px] leading-snug text-app-text/90">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 font-mono-technical text-[9px] uppercase text-app-text/45">
                      {t('archive.noMarchInterventions')}
                    </p>
                  )}

                  {hasNotes ? (
                    <div className="mt-4 rounded-xl border border-white/8 bg-black/50 p-4">
                      <header className="mb-3 flex items-center gap-2 border-b border-white/6 pb-2">
                        <Stethoscope className="size-3.5 text-accent/70" strokeWidth={1.5} aria-hidden />
                        <h4 className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-app-text/70">
                          {t('archive.medicalNotes')}
                        </h4>
                      </header>
                      <div className="space-y-3">
                        {treatments !== emDash ? (
                          <NoteBlock label={t('archive.appliedTreatments')} body={treatments} />
                        ) : null}
                        {opNote !== emDash ? (
                          <NoteBlock label={t('archive.operationNote')} body={opNote} />
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** @param {{ label: string; value: string }} props */
function MetaCell({ label, value }) {
  return (
    <div className="rounded-lg border border-white/6 bg-black/30 px-3 py-2">
      <p className="font-mono-technical text-[7px] font-bold uppercase tracking-[0.18em] text-app-text/45">
        {label}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-app-text/90">{value}</p>
    </div>
  )
}

/** @param {{ label: string; body: string }} props */
function NoteBlock({ label, body }) {
  return (
    <div>
      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-app-text/55">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed tracking-wide text-app-text">{body}</p>
    </div>
  )
}
