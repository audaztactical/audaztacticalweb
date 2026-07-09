import { Fragment, useCallback, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TacticalPanel from '../ui/TacticalPanel'
import {
  countEgitimLogisticsReady,
  difficultyToneClass,
  extractEgitimFocusOptions,
  filterEgitimPlans,
  EMPTY_SANDBOX_BLUEPRINT,
  extractSandboxBlueprintFromRow,
  isEgitimPlanUpcoming,
  isEgitimSandboxPlan,
  selectEgitimPlans,
} from '../../lib/egitimLogRegistry'
import { invStr } from '../../lib/inventoryIlws'
import {
  formatEgitimBoolDisplay,
  formatEgitimDateCellDisplay,
  formatEgitimDifficultyDisplay,
  formatEgitimDurationDisplay,
  formatEgitimLogisticsObjectsDisplay,
  formatEgitimOperationNoteDisplay,
  formatEgitimPlanKindLabel,
  formatEgitimScheduleLabel,
  formatEgitimStatusDisplay,
  formatEgitimTrainingFocusDisplay,
} from '../../lib/trainingDisplayText'
import RangeLayoutPreviewCanvas from './RangeLayoutPreviewCanvas'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-accent/35 bg-app-bg py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-app-text outline-none focus:border-accent/60'

const FILTER_INITIAL = {
  trainingFocusKey: 'ALL',
  scheduleFilter: 'ALL',
}

/** @param {string} text */
function cellTitle(text) {
  const t = String(text || '').trim()
  return t && t !== '—' ? t : undefined
}

/**
 * @typedef {import('../../lib/egitimLogRegistry').SandboxLayoutBlueprint} SandboxLayoutBlueprint
 */

/**
 * @typedef {{ planId: string | null } & SandboxLayoutBlueprint} PreviewBlueprintState
 */

/** @type {PreviewBlueprintState} */
const EMPTY_PREVIEW = { planId: null, ...EMPTY_SANDBOX_BLUEPRINT }

/**
 * @param {{
 *   trainingPlans: Record<string, unknown>[]
 *   loading?: boolean
 *   onOpenInSandbox?: (blueprint: SandboxLayoutBlueprint, row: Record<string, unknown>) => void
 * }} props
 */
export default function EgitimLogRegistry({ trainingPlans, loading = false, onOpenInSandbox }) {
  const { t } = useTranslation('training')
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))
  const [previewBlueprint, setPreviewBlueprint] = useState(/** @type {PreviewBlueprintState} */ (EMPTY_PREVIEW))
  const [editMode, setEditMode] = useState(false)

  const egitimPlans = useMemo(() => selectEgitimPlans(trainingPlans), [trainingPlans])
  const focusOptions = useMemo(() => extractEgitimFocusOptions(egitimPlans), [egitimPlans])

  const filtered = useMemo(
    () =>
      filterEgitimPlans({
        plans: egitimPlans,
        trainingFocusKey: filters.trainingFocusKey,
        scheduleFilter: filters.scheduleFilter,
      }),
    [egitimPlans, filters]
  )

  const purgePreviewBlueprint = useCallback(() => {
    setPreviewBlueprint(EMPTY_PREVIEW)
    setEditMode(false)
  }, [])

  const loadPreviewBlueprint = useCallback((/** @type {string} */ planId, /** @type {Record<string, unknown>} */ row) => {
    setPreviewBlueprint({ planId, ...extractSandboxBlueprintFromRow(row) })
  }, [])

  const handleSelectPlan = useCallback(
    (/** @type {string} */ planId, /** @type {Record<string, unknown>} */ row) => {
      if (expandedId === planId) {
        setExpandedId(null)
        purgePreviewBlueprint()
        return
      }
      purgePreviewBlueprint()
      setExpandedId(planId)
      if (isEgitimSandboxPlan(row)) {
        loadPreviewBlueprint(planId, row)
      }
    },
    [expandedId, loadPreviewBlueprint, purgePreviewBlueprint]
  )

  const patchFilter = (/** @type {Partial<typeof FILTER_INITIAL>} */ next) => {
    setFilters((f) => ({ ...f, ...next }))
    setExpandedId(null)
    purgePreviewBlueprint()
  }

  return (
    <TacticalPanel className="relative w-full min-w-0 border-accent/20 bg-app-bg/95 p-0">
      <span className="pointer-events-none absolute left-2 top-2 z-10 h-3 w-3 border-l border-t border-accent/45" />
      <span className="pointer-events-none absolute right-2 top-2 z-10 h-3 w-3 border-r border-t border-accent/45" />
      <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-3 w-3 border-b border-l border-accent/45" />
      <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-3 w-3 border-b border-r border-accent/45" />

      <div className="border-b border-accent/15 bg-app-bg px-4 py-2">
        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/90">
          {t('sectors.egitim.history.title')}
        </p>
        <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">
          {t('sectors.egitim.history.syncMeta', {
            filtered: filtered.length,
            total: egitimPlans.length,
          })}
        </p>
      </div>

      <div className="border-b border-accent/12 bg-app-bg px-3 py-3">
        <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-app-text/55">
          {t('sectors.egitim.history.filterBar')}
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-app-text/45">
              {t('sectors.egitim.history.trainingFocus')}
            </span>
            <select
              className={filterSelectClass}
              value={filters.trainingFocusKey}
              onChange={(e) => patchFilter({ trainingFocusKey: e.target.value })}
            >
              <option value="ALL">{t('sectors.egitim.history.all')}</option>
              {focusOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-app-text/45">
              {t('sectors.egitim.history.schedule')}
            </span>
            <select
              className={filterSelectClass}
              value={filters.scheduleFilter}
              onChange={(e) =>
                patchFilter({
                  scheduleFilter: /** @type {typeof FILTER_INITIAL.scheduleFilter} */ (
                    e.target.value
                  ),
                })
              }
            >
              <option value="ALL">{t('sectors.egitim.history.all')}</option>
              <option value="UPCOMING">{t('sectors.egitim.history.upcoming')}</option>
              <option value="PAST">{t('sectors.egitim.history.past')}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="ilws-green-scroll max-h-[min(58vh,560px)] overflow-auto">
        {loading ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/55">
            {t('sectors.egitim.history.syncing')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/45">
            {egitimPlans.length === 0
              ? t('sectors.egitim.history.empty')
              : t('sectors.egitim.history.noFilterResults')}
          </p>
        ) : (
          <table className="w-full min-w-[1020px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-app-bg">
              <tr className="border-b border-accent/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.egitim.history.columns.targetDate')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.egitim.history.columns.type')}</th>
                <th className="min-w-[10rem] px-3 py-2">{t('sectors.egitim.history.columns.trainingFocus')}</th>
                <th className="min-w-[8rem] px-3 py-2">{t('sectors.egitim.history.columns.difficulty')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.egitim.history.columns.duration')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.egitim.history.columns.logistics')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.egitim.history.columns.status')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.egitim.history.columns.schedule')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = String(row.id)
                const open = expandedId === id
                const focus = formatEgitimTrainingFocusDisplay(row)
                const difficulty = formatEgitimDifficultyDisplay(row)
                const diffKey = invStr(row.difficultyLevelKey).trim()
                const upcoming = isEgitimPlanUpcoming(row)
                const logistics = countEgitimLogisticsReady(row)
                const sandbox = isEgitimSandboxPlan(row)
                const kindLabel = formatEgitimPlanKindLabel(row)
                const rowLayout = sandbox ? extractSandboxBlueprintFromRow(row) : EMPTY_SANDBOX_BLUEPRINT
                const isActivePreview = open && previewBlueprint.planId === id
                const layoutObjects = isActivePreview ? previewBlueprint.objects : []
                const layoutArrows = isActivePreview ? previewBlueprint.tacticalArrows : []
                const layoutShapes = isActivePreview ? previewBlueprint.drawnShapes : []
                const hasLayoutPreview =
                  isActivePreview &&
                  (layoutObjects.length > 0 || layoutArrows.length > 0 || layoutShapes.length > 0)

                return (
                  <Fragment key={id}>
                    <tr
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectPlan(id, row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSelectPlan(id, row)
                        }
                      }}
                      className={`cursor-pointer border-b border-accent/10 font-mono-technical text-[9px] uppercase transition hover:bg-accent/[0.04] ${
                        open ? 'bg-accent/[0.06]' : ''
                      }`}
                    >
                      <td className="px-2 py-2 text-accent/60">
                        <ChevronDown
                          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-app-text/70">
                        {formatEgitimDateCellDisplay(row)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 font-bold ${sandbox ? 'text-accent' : 'text-app-text/70'}`}
                      >
                        {kindLabel}
                      </td>
                      <td
                        className="max-w-[14rem] break-words px-3 py-2 normal-case leading-snug text-app-text"
                        title={cellTitle(focus)}
                      >
                        {focus}
                      </td>
                      <td
                        className={`max-w-[10rem] break-words px-3 py-2 normal-case leading-snug ${difficultyToneClass(diffKey)}`}
                        title={cellTitle(difficulty)}
                      >
                        {difficulty}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#5ec8ff]">
                        {formatEgitimDurationDisplay(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-accent">
                        {sandbox
                          ? formatEgitimLogisticsObjectsDisplay(rowLayout.objects.length)
                          : `${logistics}/4`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-app-text/90">
                        {formatEgitimStatusDisplay(String(row.status ?? ''))}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 font-bold ${
                          upcoming ? 'text-accent' : 'text-app-text/55'
                        }`}
                      >
                        {formatEgitimScheduleLabel(upcoming)}
                      </td>
                    </tr>
                    <tr className="border-b border-accent/8">
                      <td colSpan={9} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 mb-3 mt-1 rounded border border-accent/20 bg-black/50 p-3 font-mono-technical text-[8px] uppercase">
                              <p className="mb-2 font-bold tracking-wider text-accent/85">
                                {sandbox
                                  ? t('sectors.egitim.history.detail.sandboxTitle')
                                  : t('sectors.egitim.history.detail.planTitle')}
                              </p>
                              {open && sandbox ? (
                                <div className="mb-3">
                                  {hasLayoutPreview ? (
                                    <>
                                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-mono-technical text-[7px] uppercase text-app-text/55">
                                          {t('sectors.egitim.history.detail.layoutPreview', {
                                            objects: layoutObjects.length,
                                            arrows: layoutArrows.length,
                                            shapes: layoutShapes.length,
                                            mode: editMode
                                              ? t('sectors.egitim.history.detail.editMode')
                                              : t('sectors.egitim.history.detail.readOnlyMode'),
                                          })}
                                        </p>
                                        {onOpenInSandbox ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              const blueprint = extractSandboxBlueprintFromRow(row)
                                              setEditMode(true)
                                              onOpenInSandbox(blueprint, row)
                                            }}
                                            className="rounded border border-accent/50 bg-accent/12 px-2 py-1 font-mono-technical text-[7px] font-bold uppercase tracking-wider text-accent hover:bg-accent/22"
                                          >
                                            {t('sectors.egitim.history.detail.editInterface')}
                                          </button>
                                        ) : null}
                                      </div>
                                      <RangeLayoutPreviewCanvas
                                        key={id}
                                        layoutKey={id}
                                        objects={layoutObjects}
                                        tacticalArrows={layoutArrows}
                                        drawnShapes={layoutShapes}
                                        readOnly={!editMode}
                                        height={240}
                                      />
                                    </>
                                  ) : (
                                    <p className="font-mono-technical text-[7px] uppercase text-app-text/45">
                                      {t('sectors.egitim.history.detail.noLayoutData')}
                                    </p>
                                  )}
                                </div>
                              ) : null}
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p
                                  className="break-words normal-case leading-relaxed text-app-text/90"
                                  title={cellTitle(focus)}
                                >
                                  {t('sectors.egitim.history.detail.focus')}{' '}
                                  <span className="text-slate-100">{focus}</span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.egitim.history.detail.difficulty')}{' '}
                                  <span className={difficultyToneClass(diffKey)}>{difficulty}</span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.egitim.history.detail.target')}{' '}
                                  <span className="text-app-text">{formatEgitimDateCellDisplay(row)}</span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.egitim.history.detail.duration')}{' '}
                                  <span className="text-[#5ec8ff]">{formatEgitimDurationDisplay(row)}</span>
                                </p>
                              </div>
                              {!sandbox ? (
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-app-text/70">
                                  {t('sectors.egitim.history.detail.weaponsReady')}{' '}
                                  <span className="text-app-text">
                                    {formatEgitimBoolDisplay(Boolean(row.weaponsReady))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.egitim.history.detail.ammoAllocated')}{' '}
                                  <span className="text-app-text">
                                    {formatEgitimBoolDisplay(Boolean(row.ammoAllocated))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.egitim.history.detail.ppe')}{' '}
                                  <span className="text-app-text">
                                    {formatEgitimBoolDisplay(Boolean(row.ppeChecked))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.egitim.history.detail.tcccKit')}{' '}
                                  <span className="text-app-text">
                                    {formatEgitimBoolDisplay(Boolean(row.tcccKitReady))}
                                  </span>
                                </p>
                              </div>
                              ) : null}
                              <p className="break-words normal-case leading-relaxed text-app-text/70">
                                {sandbox
                                  ? t('sectors.egitim.history.detail.designNote')
                                  : t('sectors.egitim.history.detail.trainingGoals')}{' '}
                                <span className="text-app-text">{formatEgitimOperationNoteDisplay(row)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </TacticalPanel>
  )
}
