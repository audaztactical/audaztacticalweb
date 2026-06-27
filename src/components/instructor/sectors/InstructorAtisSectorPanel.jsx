import { useCallback, useEffect, useMemo, useState } from 'react'
import { Library, Radio } from 'lucide-react'
import {
  DRILL_SELECT_NEW_DRILL,
  DRILL_SELECT_NEW_LEVEL,
  createDrillTemplate,
  subscribeInstructorDrillTemplates,
} from '../../../lib/firestoreDrillTemplates'
import {
  DEFAULT_INSTRUCTOR_LEVELS,
  collectInstructorDrillLevels,
  isPresetDrillId,
  mergeDrillsForLevel,
} from '../../../lib/instructorDefaultDrills'
import {
  completeGroupTraining,
  createGroupTraining,
  subscribeGroupTrainingResults,
  subscribeInstructorActiveGroupTrainings,
  subscribeTrainingResults,
} from '../../../lib/firestoreGroupTrainings'
import { emitFirebaseError } from '../../../lib/firebaseErrorBus'
import InstructorCommandPanel from '../layout/InstructorCommandPanel'
import DrillQuickSelector from '../cleanTactical/DrillQuickSelector'
import InstructorGroupSelect from '../cleanTactical/InstructorGroupSelect'
import LiveOperatorsTable from '../cleanTactical/LiveOperatorsTable'
import ActiveAtisSessionsList from '../cleanTactical/ActiveAtisSessionsList'
import AtisSessionHistoryPanel from '../cleanTactical/AtisSessionHistoryPanel'
import {
  icBtnGhost,
} from '../layout/instructorCommandTokens'
import {
  inputClass,
  labelClass,
} from '../../training/layout/trainingTerminalTokens'
import {
  ctBentoGrid,
  ctBentoSpan5,
  ctBentoSpan7,
  ctBtnSecondary,
  icHelperText,
  icMsgErr,
  icMsgOk,
} from '../cleanTactical/tokens'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/firestoreDrillTemplates').DrillTemplate} DrillTemplate */
/** @typedef {import('../../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */
/** @typedef {import('../../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */

/**
 * @param {unknown} ts
 */
function formatSessionStart(ts) {
  const ms =
    ts && typeof ts === 'object' && ts !== null && 'toMillis' in ts && typeof ts.toMillis === 'function'
      ? ts.toMillis()
      : Date.parse(String(ts ?? '')) || 0
  if (!ms) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}

function validateAmmoThresholds(totalAmmo, minPassScore) {
  const ammo = Number(totalAmmo)
  const hits = Number(minPassScore)
  if (!Number.isFinite(ammo) || ammo < 1) return 'Mühimmat sayısı en az 1 olmalı'
  if (!Number.isFinite(hits) || hits < 0) return 'Geçer baraj skoru geçersiz'
  if (hits > ammo) return 'Baraj skoru mühimmat sayısından fazla olamaz'
  return null
}

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   instructorId: string
 *   activeGroupId: string
 *   onActiveGroupIdChange: (id: string) => void
 * }} props
 */
export default function InstructorAtisSectorPanel({
  groups,
  operators,
  instructorId,
  activeGroupId,
  onActiveGroupIdChange,
}) {
  const [drillTemplates, setDrillTemplates] = useState(/** @type {DrillTemplate[]} */ ([]))
  const [templatesLoading, setTemplatesLoading] = useState(false)

  const [levelSelect, setLevelSelect] = useState('')
  const [newLevelName, setNewLevelName] = useState('')
  const [sessionLevels, setSessionLevels] = useState(/** @type {string[]} */ ([]))

  const [drillSelect, setDrillSelect] = useState('')
  const [showNewDrillForm, setShowNewDrillForm] = useState(false)

  const [newDrillName, setNewDrillName] = useState('')
  const [newDrillAmmo, setNewDrillAmmo] = useState('10')
  const [newDrillBaraj, setNewDrillBaraj] = useState('6')
  const [newDrillTimed, setNewDrillTimed] = useState(true)
  const [librarySaving, setLibrarySaving] = useState(false)
  const [libraryMsg, setLibraryMsg] = useState('')

  const [totalAmmo, setTotalAmmo] = useState('10')
  const [minPassScore, setMinPassScore] = useState('6')
  const [isTimed, setIsTimed] = useState(true)
  const [targetTimeSec, setTargetTimeSec] = useState('12')
  const [startSaving, setStartSaving] = useState(false)
  const [startMsg, setStartMsg] = useState('')

  const [activeTrainings, setActiveTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [activeTrainingsLoading, setActiveTrainingsLoading] = useState(false)
  const [groupResults, setGroupResults] = useState(/** @type {TrainingResult[]} */ ([]))

  const [trackedTrainingId, setTrackedTrainingId] = useState('')
  const [results, setResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [resultsLoading, setResultsLoading] = useState(false)
  const [closingTrainingId, setClosingTrainingId] = useState('')
  const [sectorTab, setSectorTab] = useState(/** @type {'active' | 'history'} */ ('active'))

  const thresholdError = useMemo(
    () => validateAmmoThresholds(totalAmmo, minPassScore),
    [totalAmmo, minPassScore],
  )

  const newDrillThresholdError = useMemo(
    () => validateAmmoThresholds(newDrillAmmo, newDrillBaraj),
    [newDrillAmmo, newDrillBaraj],
  )

  const activeGroup = useMemo(
    () => groups.find((g) => g.groupId === activeGroupId) ?? null,
    [groups, activeGroupId],
  )

  const trackedTraining = useMemo(
    () => activeTrainings.find((t) => t.id === trackedTrainingId) ?? null,
    [activeTrainings, trackedTrainingId],
  )

  const participantCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const row of groupResults) {
      if (!row.trainingId) continue
      counts[row.trainingId] = (counts[row.trainingId] ?? 0) + 1
    }
    return counts
  }, [groupResults])

  const resolvedLevel = useMemo(() => {
    if (levelSelect === DRILL_SELECT_NEW_LEVEL) return newLevelName.trim()
    return levelSelect
  }, [levelSelect, newLevelName])

  const levelOptions = useMemo(
    () => collectInstructorDrillLevels(drillTemplates, sessionLevels),
    [drillTemplates, sessionLevels],
  )

  const drillsForLevel = useMemo(() => {
    if (!resolvedLevel) return []
    return mergeDrillsForLevel(resolvedLevel, drillTemplates)
  }, [drillTemplates, resolvedLevel])

  const selectedDrill = useMemo(
    () => drillsForLevel.find((t) => t.id === drillSelect) ?? null,
    [drillsForLevel, drillSelect],
  )

  const drillOptions = useMemo(
    () =>
      drillsForLevel.map((t) => ({
        id: t.id,
        label: `${t.name}${t.isTimedDefault ? '' : ' · serbest'}`,
      })),
    [drillsForLevel],
  )

  useEffect(() => {
    if (!instructorId) {
      setDrillTemplates([])
      setTemplatesLoading(false)
      return undefined
    }

    let active = true
    setTemplatesLoading(true)
    const unsub = subscribeInstructorDrillTemplates(
      instructorId,
      (rows) => {
        if (!active) return
        setDrillTemplates(rows)
        setTemplatesLoading(false)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        setTemplatesLoading(false)
      },
    )
    return () => {
      active = false
      unsub()
    }
  }, [instructorId])

  useEffect(() => {
    if (!activeGroupId || !instructorId) {
      setActiveTrainings([])
      setActiveTrainingsLoading(false)
      return undefined
    }

    let active = true
    setActiveTrainingsLoading(true)
    const unsub = subscribeInstructorActiveGroupTrainings(
      activeGroupId,
      instructorId,
      (rows) => {
        if (!active) return
        setActiveTrainings(rows)
        setActiveTrainingsLoading(false)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        setActiveTrainingsLoading(false)
      },
    )
    return () => {
      active = false
      unsub()
    }
  }, [activeGroupId, instructorId])

  useEffect(() => {
    if (!activeGroupId) {
      setGroupResults([])
      return undefined
    }

    let active = true
    const unsub = subscribeGroupTrainingResults(
      activeGroupId,
      (rows) => {
        if (!active) return
        setGroupResults(rows)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
      },
    )
    return () => {
      active = false
      unsub()
    }
  }, [activeGroupId])

  useEffect(() => {
    if (!trackedTrainingId) return
    if (!activeTrainings.some((t) => t.id === trackedTrainingId)) {
      setTrackedTrainingId('')
    }
  }, [activeTrainings, trackedTrainingId])

  useEffect(() => {
    if (!levelSelect && levelOptions.length > 0) {
      setLevelSelect(DEFAULT_INSTRUCTOR_LEVELS[0] ?? levelOptions[0])
    }
  }, [levelOptions, levelSelect])

  useEffect(() => {
    if (!resolvedLevel || drillSelect === DRILL_SELECT_NEW_DRILL) return
    const merged = mergeDrillsForLevel(resolvedLevel, drillTemplates)
    if (merged.length === 0) {
      if (drillSelect) setDrillSelect('')
      return
    }
    if (!merged.some((d) => d.id === drillSelect)) {
      setDrillSelect(merged[0].id)
    }
  }, [resolvedLevel, drillTemplates, drillSelect])

  useEffect(() => {
    if (drillSelect === DRILL_SELECT_NEW_DRILL) {
      setShowNewDrillForm(true)
      return
    }
    setShowNewDrillForm(false)
    if (!selectedDrill) return
    setTotalAmmo(String(selectedDrill.defaultAmmo))
    setMinPassScore(String(selectedDrill.defaultMinPassScore))
    setIsTimed(selectedDrill.isTimedDefault)
    if (!selectedDrill.isTimedDefault) setTargetTimeSec('')
  }, [drillSelect, selectedDrill])

  const handleTimedChange = useCallback((checked) => {
    setIsTimed(checked)
    if (!checked) {
      setTargetTimeSec('')
    } else if (!targetTimeSec.trim()) {
      setTargetTimeSec('12')
    }
  }, [targetTimeSec])

  useEffect(() => {
    if (!trackedTrainingId) {
      setResults([])
      setResultsLoading(false)
      return undefined
    }

    let active = true
    setResultsLoading(true)
    const unsub = subscribeTrainingResults(
      trackedTrainingId,
      (rows) => {
        if (!active) return
        setResults(rows)
        setResultsLoading(false)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        setResultsLoading(false)
      },
    )
    return () => {
      active = false
      unsub()
    }
  }, [trackedTrainingId])

  const handleLevelChange = (value) => {
    if (value === '__new_level__') {
      setLevelSelect(DRILL_SELECT_NEW_LEVEL)
      setDrillSelect('')
      return
    }
    setLevelSelect(value)
    setDrillSelect('')
    setShowNewDrillForm(false)
    if (value !== DRILL_SELECT_NEW_LEVEL) setNewLevelName('')
  }

  const handleDrillChange = (value) => {
    if (value === '__new_drill__') {
      setDrillSelect(DRILL_SELECT_NEW_DRILL)
      return
    }
    setDrillSelect(value)
  }

  const handleSaveToLibrary = async () => {
    setLibraryMsg('')
    if (!instructorId || !resolvedLevel) {
      setLibraryMsg('Önce hedef seviye seçin veya oluşturun.')
      return
    }
    if (newDrillThresholdError) {
      setLibraryMsg(newDrillThresholdError)
      return
    }

    setLibrarySaving(true)
    try {
      const created = await createDrillTemplate({
        instructorId,
        name: newDrillName.trim(),
        level: resolvedLevel,
        defaultAmmo: Number(newDrillAmmo),
        defaultMinPassScore: Number(newDrillBaraj),
        isTimedDefault: newDrillTimed,
      })
      setDrillSelect(created.id)
      setShowNewDrillForm(false)
      setNewDrillName('')
      setLibraryMsg('Şablon kütüphaneye kaydedildi')
    } catch (err) {
      emitFirebaseError(err)
      setLibraryMsg(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setLibrarySaving(false)
    }
  }

  const handleStartTraining = async () => {
    setStartMsg('')
    if (!activeGroupId || !instructorId) return
    if (!resolvedLevel) {
      setStartMsg('Hedef seviye seçin.')
      return
    }
    if (!selectedDrill && drillSelect !== DRILL_SELECT_NEW_DRILL) {
      setStartMsg('Drill seçin veya yeni drill ekleyin.')
      return
    }
    if (thresholdError) {
      setStartMsg(thresholdError)
      return
    }

    let parsedTargetTime = null
    if (isTimed) {
      parsedTargetTime = Number(targetTimeSec)
      if (!Number.isFinite(parsedTargetTime) || parsedTargetTime <= 0) {
        setStartMsg('Hedef süre geçersiz.')
        return
      }
    }

    const trainingName = selectedDrill?.name ?? newDrillName.trim()
    if (!trainingName) {
      setStartMsg('Eğitim / drill adı gerekli.')
      return
    }

    setStartSaving(true)
    try {
      const created = await createGroupTraining({
        groupId: activeGroupId,
        instructorId,
        templateId:
          selectedDrill && !isPresetDrillId(selectedDrill.id) ? selectedDrill.id : null,
        trainingName,
        level: resolvedLevel,
        isTimed,
        targetTimeSec: parsedTargetTime,
        totalAmmo: Number(totalAmmo),
        minPassScore: Number(minPassScore),
        sessionDurationHours: 2,
        sessionDurationMinutes: 0,
      })
      setTrackedTrainingId(created.id)
      setStartMsg('Oturum aktif — canlı takip başladı')
    } catch (err) {
      emitFirebaseError(err)
      setStartMsg(err instanceof Error ? err.message : 'Başlatma başarısız')
    } finally {
      setStartSaving(false)
    }
  }

  const handleCloseTraining = useCallback(async (trainingId) => {
    const id = String(trainingId ?? '').trim()
    if (!id) return

    setClosingTrainingId(id)
    try {
      await completeGroupTraining(id)
      setStartMsg('Oturum tamamlandı')
      if (trackedTrainingId === id) {
        setTrackedTrainingId('')
        setResults([])
      }
    } catch (err) {
      emitFirebaseError(err)
    } finally {
      setClosingTrainingId('')
    }
  }, [trackedTrainingId])

  const livePanelTitle = trackedTraining
    ? `${trackedTraining.trainingName} · ${formatSessionStart(trackedTraining.createdAt)}`
    : 'Canlı oturum'

  const livePanelDescription = trackedTraining
    ? `${trackedTraining.level} · baraj ${trackedTraining.minPassScore}${
        trackedTraining.isTimed && trackedTraining.targetTimeSec != null
          ? ` · hedef ${trackedTraining.targetTimeSec}s`
          : ''
      } · ${participantCounts[trackedTraining.id] ?? 0} katılımcı`
    : 'Takip etmek için aktif oturumlardan birini seçin'

  const newDrillForm = showNewDrillForm ? (
    <div className="space-y-3 rounded border border-amber-500/20 bg-black/35 p-3">
      <p className="font-mono-technical text-[10px] uppercase text-amber-400/90">
        Yeni drill — {resolvedLevel || '—'}
      </p>
      <div className="space-y-1.5">
        <label className="block space-y-1.5" htmlFor="instructor-new-drill">
          <span className={labelClass}>Drill adı</span>
          <input
            id="instructor-new-drill"
            className={inputClass}
            value={newDrillName}
            onChange={(e) => setNewDrillName(e.target.value)}
            placeholder="Örn: VTAC Barricade Drill"
          />
        </label>
        <p className={icHelperText}>Standart formatta ve açık bir drill adı giriniz.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={labelClass}>Mühimmat</span>
          <input
            type="number"
            min={1}
            className={`${inputClass} tabular-nums`}
            value={newDrillAmmo}
            onChange={(e) => setNewDrillAmmo(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Baraj</span>
          <input
            type="number"
            min={0}
            className={`${inputClass} tabular-nums`}
            value={newDrillBaraj}
            onChange={(e) => setNewDrillBaraj(e.target.value)}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 font-mono-technical text-[10px] uppercase text-app-text/60">
        <input
          type="checkbox"
          className="size-4 rounded accent-amber-400"
          checked={newDrillTimed}
          onChange={(e) => setNewDrillTimed(e.target.checked)}
        />
        Zamanlı
      </label>
      {newDrillThresholdError ? <p className={icMsgErr}>{newDrillThresholdError}</p> : null}
      <button
        type="button"
        disabled={librarySaving || !!newDrillThresholdError}
        onClick={handleSaveToLibrary}
        className={ctBtnSecondary}
      >
        Kütüphaneye kaydet
      </button>
      {libraryMsg ? (
        <p className={libraryMsg.includes('kaydedildi') ? icMsgOk : icMsgErr}>{libraryMsg}</p>
      ) : null}
    </div>
  ) : null

  if (!activeGroup) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">Aktif grup seçin</p>
    )
  }

  /** @param {'active' | 'history'} id @param {string} label */
  const renderSectorTab = (id, label) => {
    const active = sectorTab === id
    return (
      <button
        key={id}
        type="button"
        onClick={() => setSectorTab(id)}
        className={[
          'flex-1 rounded border py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition',
          active
            ? 'border-amber-500/60 bg-amber-950/40 text-amber-300'
            : 'border-slate-800 text-app-text/55 hover:border-amber-800/40 hover:text-app-text/75',
        ].join(' ')}
        aria-current={active ? 'page' : undefined}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="space-y-5">
      <div
        className="flex w-full gap-2 rounded border border-amber-900/25 bg-black/40 p-1"
        role="tablist"
        aria-label="Atış sektörü görünümü"
      >
        {renderSectorTab('active', 'Aktif oturumlar')}
        {renderSectorTab('history', 'Oturum geçmişi')}
      </div>

      {sectorTab === 'active' ? (
        <>
          <InstructorGroupSelect
            groups={groups}
            value={activeGroupId}
            onChange={(id) => {
              onActiveGroupIdChange(id)
              setTrackedTrainingId('')
              setResults([])
            }}
            className="max-w-xs"
          />

          <ActiveAtisSessionsList
            sessions={activeTrainings}
            participantCounts={participantCounts}
            selectedId={trackedTrainingId}
            onSelect={setTrackedTrainingId}
            onClose={handleCloseTraining}
            closingId={closingTrainingId}
            loading={activeTrainingsLoading}
          />

          <div className={ctBentoGrid}>
        <div className={ctBentoSpan7}>
          <InstructorCommandPanel
            title="Drill kütüphanesi"
            description="Seviye ve drill seçin, ardından oturumu başlatın"
            icon={Library}
            sector="atis"
            corners="top"
            delay={0.05}
          >
            <DrillQuickSelector
              levelOptions={levelOptions}
              levelSelect={levelSelect === DRILL_SELECT_NEW_LEVEL ? '__new_level__' : levelSelect}
              onLevelChange={handleLevelChange}
              newLevelName={newLevelName}
              onNewLevelNameChange={(v) => {
                setNewLevelName(v)
                if (v.trim()) {
                  setSessionLevels((prev) =>
                    prev.includes(v.trim()) ? prev : [...prev, v.trim()],
                  )
                }
              }}
              isNewLevel={levelSelect === DRILL_SELECT_NEW_LEVEL}
              drillOptions={drillOptions}
              drillSelect={
                drillSelect === DRILL_SELECT_NEW_DRILL ? '__new_drill__' : drillSelect
              }
              onDrillChange={handleDrillChange}
              loading={templatesLoading}
              totalAmmo={totalAmmo}
              onTotalAmmoChange={setTotalAmmo}
              minPassScore={minPassScore}
              onMinPassScoreChange={setMinPassScore}
              isTimed={isTimed}
              onTimedChange={handleTimedChange}
              targetTimeSec={targetTimeSec}
              onTargetTimeSecChange={setTargetTimeSec}
              thresholdError={thresholdError}
              onStart={handleStartTraining}
              starting={startSaving}
              message={startMsg}
              selectedDrillName={selectedDrill?.name}
              levelLabel={resolvedLevel}
              showNewDrillSlot={newDrillForm}
            />
          </InstructorCommandPanel>
        </div>

        <div className={ctBentoSpan5}>
          <InstructorCommandPanel
            title={livePanelTitle}
            description={livePanelDescription}
            icon={Radio}
            sector="atis"
            corners="bottom"
            action={
              trackedTrainingId ? (
                <button
                  type="button"
                  onClick={() => handleCloseTraining(trackedTrainingId)}
                  disabled={closingTrainingId === trackedTrainingId}
                  className={icBtnGhost}
                >
                  Oturumu kapat
                </button>
              ) : null
            }
            delay={0.1}
          >
            <LiveOperatorsTable
              rows={results}
              loading={resultsLoading}
              idle={!trackedTrainingId}
              live={Boolean(trackedTrainingId)}
              chronological
              totalAmmo={trackedTraining?.totalAmmo ?? 0}
              minPassScore={trackedTraining?.minPassScore ?? 0}
              isTimed={Boolean(trackedTraining?.isTimed)}
              targetTimeSec={trackedTraining?.targetTimeSec ?? null}
              idleHint="Aktif oturumlardan Takip et ile canlı akışa geçin"
            />
          </InstructorCommandPanel>
        </div>
      </div>
        </>
      ) : (
        <AtisSessionHistoryPanel groups={groups} operators={operators} instructorId={instructorId} />
      )}
    </div>
  )
}
