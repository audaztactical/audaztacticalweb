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
  subscribeTrainingResults,
} from '../../../lib/firestoreGroupTrainings'
import { emitFirebaseError } from '../../../lib/firebaseErrorBus'
import BentoCard from '../cleanTactical/BentoCard'
import DrillQuickSelector from '../cleanTactical/DrillQuickSelector'
import InstructorGroupSelect from '../cleanTactical/InstructorGroupSelect'
import LiveOperatorsTable from '../cleanTactical/LiveOperatorsTable'
import {
  ctBentoGrid,
  ctBentoSpan5,
  ctBentoSpan7,
  ctBtnGhost,
  ctBtnSecondary,
  ctHelperText,
  ctInput,
  ctLabel,
  ctMsgErr,
  ctMsgOk,
} from '../cleanTactical/tokens'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/firestoreDrillTemplates').DrillTemplate} DrillTemplate */
/** @typedef {import('../../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */

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

  const [liveTrainingId, setLiveTrainingId] = useState('')
  const [liveTrainingMeta, setLiveTrainingMeta] = useState(
    /** @type {{ trainingName: string; totalAmmo: number; minPassScore: number; isTimed: boolean; targetTimeSec: number | null } | null} */ (null),
  )
  const [results, setResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [resultsLoading, setResultsLoading] = useState(false)

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
    if (!liveTrainingId) {
      setResults([])
      setResultsLoading(false)
      return undefined
    }

    let active = true
    setResultsLoading(true)
    const unsub = subscribeTrainingResults(
      liveTrainingId,
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
  }, [liveTrainingId])

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
      })
      setLiveTrainingId(created.id)
      setLiveTrainingMeta({
        trainingName,
        totalAmmo: Number(totalAmmo),
        minPassScore: Number(minPassScore),
        isTimed,
        targetTimeSec: parsedTargetTime,
      })
      setStartMsg('Oturum aktif — canlı takip başladı')
    } catch (err) {
      emitFirebaseError(err)
      setStartMsg(err instanceof Error ? err.message : 'Başlatma başarısız')
    } finally {
      setStartSaving(false)
    }
  }

  const handleCompleteTraining = useCallback(async () => {
    if (!liveTrainingId) return
    try {
      await completeGroupTraining(liveTrainingId)
      setStartMsg('Oturum tamamlandı')
      setLiveTrainingId('')
      setLiveTrainingMeta(null)
      setResults([])
    } catch (err) {
      emitFirebaseError(err)
    }
  }, [liveTrainingId])

  const newDrillForm = showNewDrillForm ? (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
      <p className="text-xs font-medium text-zinc-400">Yeni drill — {resolvedLevel || '—'}</p>
      <div className="space-y-1.5">
        <label className="block space-y-1.5" htmlFor="instructor-new-drill">
          <span className={ctLabel}>Drill adı</span>
          <input
            id="instructor-new-drill"
            className={ctInput}
            value={newDrillName}
            onChange={(e) => setNewDrillName(e.target.value)}
            placeholder="Örn: VTAC Barricade Drill"
          />
        </label>
        <p className={ctHelperText}>Standart formatta ve açık bir drill adı giriniz.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={ctLabel}>Mühimmat</span>
          <input
            type="number"
            min={1}
            className={`${ctInput} tabular-nums`}
            value={newDrillAmmo}
            onChange={(e) => setNewDrillAmmo(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={ctLabel}>Baraj</span>
          <input
            type="number"
            min={0}
            className={`${ctInput} tabular-nums`}
            value={newDrillBaraj}
            onChange={(e) => setNewDrillBaraj(e.target.value)}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-400">
        <input
          type="checkbox"
          className="size-4 rounded accent-zinc-300"
          checked={newDrillTimed}
          onChange={(e) => setNewDrillTimed(e.target.checked)}
        />
        Zamanlı
      </label>
      {newDrillThresholdError ? <p className={ctMsgErr}>{newDrillThresholdError}</p> : null}
      <button
        type="button"
        disabled={librarySaving || !!newDrillThresholdError}
        onClick={handleSaveToLibrary}
        className={ctBtnSecondary}
      >
        Kütüphaneye kaydet
      </button>
      {libraryMsg ? (
        <p className={libraryMsg.includes('kaydedildi') ? ctMsgOk : ctMsgErr}>{libraryMsg}</p>
      ) : null}
    </div>
  ) : null

  if (!activeGroup) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">Aktif grup seçin</p>
    )
  }

  return (
    <div className="space-y-5">
      <InstructorGroupSelect
        groups={groups}
        value={activeGroupId}
        onChange={(id) => {
          onActiveGroupIdChange(id)
          setLiveTrainingId('')
          setLiveTrainingMeta(null)
        }}
        className="max-w-xs"
      />

      <div className={ctBentoGrid}>
        <div className={ctBentoSpan7}>
          <BentoCard
            title="Drill kütüphanesi"
            description="Seviye ve drill seçin, ardından oturumu başlatın"
            icon={Library}
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
          </BentoCard>
        </div>

        <div className={ctBentoSpan5}>
          <BentoCard
            title="Canlı oturum"
            description={
              liveTrainingMeta
                ? `${liveTrainingMeta.trainingName} · baraj ${liveTrainingMeta.minPassScore}${
                    liveTrainingMeta.isTimed && liveTrainingMeta.targetTimeSec != null
                      ? ` · hedef ${liveTrainingMeta.targetTimeSec}s`
                      : ''
                  }`
                : 'Başlatılan oturumun operatör sonuçları'
            }
            icon={Radio}
            action={
              liveTrainingId ? (
                <button type="button" onClick={handleCompleteTraining} className={ctBtnGhost}>
                  Oturumu kapat
                </button>
              ) : null
            }
            delay={0.1}
          >
            <LiveOperatorsTable
              rows={results}
              loading={resultsLoading}
              idle={!liveTrainingId}
              totalAmmo={liveTrainingMeta?.totalAmmo ?? 0}
              minPassScore={liveTrainingMeta?.minPassScore ?? 0}
              isTimed={Boolean(liveTrainingMeta?.isTimed)}
              targetTimeSec={liveTrainingMeta?.targetTimeSec ?? null}
            />
          </BentoCard>
        </div>
      </div>
    </div>
  )
}
