import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Shield } from 'lucide-react'
import { computeCqbMissionAssessment } from '../../../lib/instructorCqbAssessment'
import {
  CQB_BREACHING_TYPE_OPTIONS,
  CQB_DOOR_STATE_OPTIONS,
  CQB_ENTRY_METHOD_OPTIONS,
  CQB_PHASE_INFRACTION_MATRIX,
  CQB_ROOM_TOPOLOGY_OPTIONS,
  CQB_SELECT_PLACEHOLDER,
  buildCqbDrillNameFromSetup,
  createInitialCqbInfractionFlags,
  labelCqbSelectOption,
} from '../../../lib/instructorCqbMatrix'
import {
  formatInstructorCqbInfractionLabel,
  formatInstructorCqbOptionLabel,
  formatInstructorCqbPhaseField,
} from '../../../lib/instructorDisplayText'
import { submitGroupCqbActivityLog } from '../../../lib/firestoreGroupTraining'
import { emitFirebaseError } from '../../../lib/firebaseErrorBus'
import { formatGroupErrorDisplay } from '../../../lib/progressDisplayText'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/instructorCqbMatrix').CqbSelectOption} CqbSelectOption */

import InstructorGroupSelect from '../cleanTactical/InstructorGroupSelect'
import {
  ctBentoGrid,
  ctBentoSpan6,
  ctBtnPrimary,
  ctInput,
  ctLabel,
  ctMsgErr,
  ctMsgOk,
  ctSelect,
} from '../cleanTactical/tokens'

const durationLockedClass =
  'w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed outline-none'

const phaseColumnClass = 'rounded-lg border border-zinc-800 bg-zinc-950/50 p-3'

const phaseTitleClass = 'mb-2 border-b border-zinc-800 pb-2 text-xs font-semibold text-zinc-300'

const phaseSubtitleClass = 'text-[11px] text-zinc-600'

const infractionCheckClass =
  'flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-2.5 py-2 transition hover:border-zinc-700 hover:bg-zinc-800/50'

/**
 * @param {CqbSelectOption[]} options
 * @param {string} value
 * @param {(v: string) => void} onChange
 * @param {string} label
 * @param {boolean} [required]
 */
function ConfigSelect({ options, value, onChange, label, required = true }) {
  return (
    <label className="block space-y-1.5">
      <span className={ctLabel}>{label}</span>
      <select className={ctSelect} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        {options.map((opt) => (
          <option key={opt.value || 'empty'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
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
export default function InstructorCqbSectorPanel({
  groups,
  operators,
  instructorId,
  activeGroupId,
  onActiveGroupIdChange,
}) {
  const { t } = useTranslation('instructor')
  const [roomTopology, setRoomTopology] = useState(CQB_SELECT_PLACEHOLDER)
  const [entryMethod, setEntryMethod] = useState(CQB_SELECT_PLACEHOLDER)
  const [breachingType, setBreachingType] = useState(CQB_SELECT_PLACEHOLDER)
  const [doorState, setDoorState] = useState(CQB_SELECT_PLACEHOLDER)
  const [logOperatorId, setLogOperatorId] = useState('')

  const [tehditSayisi, setTehditSayisi] = useState('3')
  const [etkisizAlinan, setEtkisizAlinan] = useState('')
  const [temizlikSuresi, setTemizlikSuresi] = useState('')
  const [maxAllowedSeconds, setMaxAllowedSeconds] = useState('12')
  const [isTimedDrill, setIsTimedDrill] = useState(true)

  const [infractionFlags, setInfractionFlags] = useState(createInitialCqbInfractionFlags)
  const [logNotes, setLogNotes] = useState('')
  const [logSaving, setLogSaving] = useState(false)
  const [logMsg, setLogMsg] = useState('')
  const [msgOk, setMsgOk] = useState(false)

  const activeGroup = useMemo(
    () => groups.find((g) => g.groupId === activeGroupId) ?? null,
    [groups, activeGroupId],
  )

  const groupMembers = useMemo(() => {
    if (!activeGroup) return []
    const set = new Set(activeGroup.members)
    return operators.filter((op) => set.has(op.uid))
  }, [activeGroup, operators])

  const setupValid = useMemo(
    () =>
      roomTopology &&
      entryMethod &&
      breachingType &&
      doorState &&
      logOperatorId,
    [roomTopology, entryMethod, breachingType, doorState, logOperatorId],
  )

  const liveAssessment = useMemo(() => {
    if (!setupValid) return null
    const eliminated = etkisizAlinan === '' ? null : Number(etkisizAlinan)
    if (eliminated == null || !Number.isFinite(eliminated)) return null
    return computeCqbMissionAssessment({
      tehditSayisi: Number(tehditSayisi) || 1,
      etkisizAlinan: eliminated,
      temizlikSuresi: isTimedDrill && temizlikSuresi !== '' ? Number(temizlikSuresi) : null,
      maxAllowedSeconds: Number(maxAllowedSeconds) || 0,
      isTimed: isTimedDrill,
      infractionFlags,
    })
  }, [
    setupValid,
    tehditSayisi,
    etkisizAlinan,
    temizlikSuresi,
    maxAllowedSeconds,
    isTimedDrill,
    infractionFlags,
  ])

  useEffect(() => {
    if (groupMembers.length > 0 && !logOperatorId) {
      setLogOperatorId(groupMembers[0].uid)
    }
  }, [groupMembers, logOperatorId])

  useEffect(() => {
    if (!isTimedDrill) setTemizlikSuresi('')
  }, [isTimedDrill])

  const toggleInfraction = (key, checked) => {
    setInfractionFlags((prev) => ({ ...prev, [key]: checked }))
  }

  const resetInfractions = () => {
    setInfractionFlags(createInitialCqbInfractionFlags())
  }

  const handleSubmitLog = async (e) => {
    e.preventDefault()
    setLogMsg('')
    setMsgOk(false)

    if (!activeGroupId || !instructorId || !logOperatorId) {
      setLogMsg(t('education.cqb.validation.groupOperator'))
      return
    }
    if (!roomTopology || !entryMethod || !breachingType || !doorState) {
      setLogMsg(t('education.cqb.validation.configRequired'))
      return
    }

    const threats = Number(tehditSayisi)
    const eliminated = Number(etkisizAlinan)
    if (!Number.isFinite(threats) || threats < 1) {
      setLogMsg(t('education.cqb.validation.threatInvalid'))
      return
    }
    if (!Number.isFinite(eliminated) || eliminated < 0 || eliminated > threats) {
      setLogMsg(t('education.cqb.validation.neutralizedRange', { threats }))
      return
    }
    if (isTimedDrill) {
      const dur = Number(temizlikSuresi)
      const maxSec = Number(maxAllowedSeconds)
      if (!Number.isFinite(dur) || dur < 0) {
        setLogMsg(t('education.cqb.validation.clearanceInvalid'))
        return
      }
      if (!Number.isFinite(maxSec) || maxSec <= 0) {
        setLogMsg(t('education.cqb.validation.maxInvalid'))
        return
      }
    }

    const assessment = computeCqbMissionAssessment({
      tehditSayisi: threats,
      etkisizAlinan: eliminated,
      temizlikSuresi: isTimedDrill ? Number(temizlikSuresi) : null,
      maxAllowedSeconds: Number(maxAllowedSeconds) || 0,
      isTimed: isTimedDrill,
      infractionFlags,
    })

    const cqbSetup = {
      roomTopology,
      entryMethod,
      breachingType,
      doorState,
      roomLabel: labelCqbSelectOption(CQB_ROOM_TOPOLOGY_OPTIONS, roomTopology),
      entryLabel: labelCqbSelectOption(CQB_ENTRY_METHOD_OPTIONS, entryMethod),
      breachLabel: labelCqbSelectOption(CQB_BREACHING_TYPE_OPTIONS, breachingType),
      doorLabel: labelCqbSelectOption(CQB_DOOR_STATE_OPTIONS, doorState),
    }

    setLogSaving(true)
    try {
      await submitGroupCqbActivityLog({
        groupId: activeGroupId,
        operatorId: logOperatorId,
        instructorId,
        templateId: 'cqb-audit-v2',
        drillName: buildCqbDrillNameFromSetup(cqbSetup),
        drillKey: 'cqb-audit-v2',
        drillLevel: 1,
        totalThreats: assessment.tehditSayisi,
        eliminatedThreats: assessment.etkisizAlinan,
        isTimed: isTimedDrill,
        duration: isTimedDrill ? assessment.temizlikSuresi : null,
        maxAllowedSeconds: assessment.maxAllowedSeconds,
        isThreatCleared: assessment.isThreatCleared,
        hasNoTacticalViolations: assessment.hasNoTacticalViolations,
        isTimeValid: assessment.isTimeValid,
        statusResult: assessment.statusResult,
        cqbSuccessStatus: assessment.statusResult,
        instructorInfractions: assessment.instructorInfractions,
        rejectionReasons: assessment.rejectionReasons,
        cqbInfractions: infractionFlags,
        cqbSetup,
        roomTopology: cqbSetup.roomTopology,
        entryMethod: cqbSetup.entryMethod,
        breachingType: cqbSetup.breachingType,
        doorState: cqbSetup.doorState,
        criticalMetrics: {
          totalThreats: assessment.tehditSayisi,
          maxTargetSeconds: assessment.maxAllowedSeconds,
          targetType: cqbSetup.roomLabel,
        },
        instructorNotes: logNotes,
      })
      setLogMsg(t('education.cqb.saved', { status: assessment.statusResult }))
      setMsgOk(true)
      setEtkisizAlinan('')
      setTemizlikSuresi('')
      setLogNotes('')
      resetInfractions()
    } catch (err) {
      emitFirebaseError(err)
      setMsgOk(false)
      setLogMsg(formatGroupErrorDisplay(err, 'groupLib.errors.generic') || t('education.shared.saveFailed'))
    } finally {
      setLogSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <InstructorGroupSelect
        groups={groups}
        value={activeGroupId}
        onChange={(id) => {
          onActiveGroupIdChange(id)
          setLogOperatorId('')
        }}
        className="max-w-xs"
      />

      {!activeGroup ? (
        <p className="py-10 text-center text-sm text-zinc-500">{t('education.shared.selectActiveGroup')}</p>
      ) : (
        <form onSubmit={handleSubmitLog} className="space-y-4">
          <div className={ctBentoGrid}>
            <section className={`${ctBentoSpan6} space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5`}>
              <p className="text-sm font-semibold text-zinc-100">{t('education.cqb.setupTitle')}</p>

              <ConfigSelect
                label={t('education.cqb.roomTopology')}
                options={CQB_ROOM_TOPOLOGY_OPTIONS.map((o) => ({
                  ...o,
                  label: o.value
                    ? formatInstructorCqbOptionLabel('roomTopology', o.value, o.label)
                    : t('education.cqb.selectPlaceholder'),
                }))}
                value={roomTopology}
                onChange={setRoomTopology}
              />
              <ConfigSelect
                label={t('education.cqb.entryMethod')}
                options={CQB_ENTRY_METHOD_OPTIONS.map((o) => ({
                  ...o,
                  label: o.value
                    ? formatInstructorCqbOptionLabel('entryMethod', o.value, o.label)
                    : t('education.cqb.selectPlaceholder'),
                }))}
                value={entryMethod}
                onChange={setEntryMethod}
              />
              <ConfigSelect
                label={t('education.cqb.breachingType')}
                options={CQB_BREACHING_TYPE_OPTIONS.map((o) => ({
                  ...o,
                  label: o.value
                    ? formatInstructorCqbOptionLabel('breachingType', o.value, o.label)
                    : t('education.cqb.selectPlaceholder'),
                }))}
                value={breachingType}
                onChange={setBreachingType}
              />
              <ConfigSelect
                label={t('education.cqb.doorState')}
                options={CQB_DOOR_STATE_OPTIONS.map((o) => ({
                  ...o,
                  label: o.value
                    ? formatInstructorCqbOptionLabel('doorState', o.value, o.label)
                    : t('education.cqb.selectPlaceholder'),
                }))}
                value={doorState}
                onChange={setDoorState}
              />
              <label className="block space-y-1">
                <span className={ctLabel}>{t('education.cqb.operatorSelect')}</span>
                <select
                  className={ctSelect}
                  value={logOperatorId}
                  onChange={(e) => setLogOperatorId(e.target.value)}
                  required
                  disabled={groupMembers.length === 0}
                >
                  {groupMembers.length === 0 ? (
                    <option value="">{t('education.shared.noGroupMembersUpper')}</option>
                  ) : (
                    groupMembers.map((op) => (
                      <option key={op.uid} value={op.uid}>
                        {op.callsign || op.username || op.uid.slice(0, 8)}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 rounded border border-amber-500/20 bg-amber-950/20 px-3 py-2">
                <input
                  type="checkbox"
                  className="size-4 accent-amber-500"
                  checked={isTimedDrill}
                  onChange={(e) => setIsTimedDrill(e.target.checked)}
                />
                <span className="font-mono-technical text-[8px] font-bold uppercase text-amber-400/90">
                  {t('education.cqb.timedActive')}
                </span>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block space-y-1">
                  <span className={ctLabel}>{t('education.cqb.threatCount')}</span>
                  <input
                    type="number"
                    min={1}
                    className={`${ctInput} tabular-nums`}
                    value={tehditSayisi}
                    onChange={(e) => setTehditSayisi(e.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className={ctLabel}>{t('education.cqb.neutralizedCount')}</span>
                  <input
                    type="number"
                    min={0}
                    max={Number(tehditSayisi) || undefined}
                    className={`${ctInput} tabular-nums`}
                    value={etkisizAlinan}
                    onChange={(e) => setEtkisizAlinan(e.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className={ctLabel}>{t('education.cqb.clearanceTime')}</span>
                  <input
                    type={isTimedDrill ? 'number' : 'text'}
                    min={isTimedDrill ? 0 : undefined}
                    step={isTimedDrill ? 0.01 : undefined}
                    disabled={!isTimedDrill}
                    readOnly={!isTimedDrill}
                    className={isTimedDrill ? `${ctInput} tabular-nums` : durationLockedClass}
                    value={isTimedDrill ? temizlikSuresi : t('education.shared.free')}
                    placeholder={
                      isTimedDrill
                        ? t('education.shared.exampleShort', { value: '8.40' })
                        : t('education.shared.free')
                    }
                    onChange={(e) => setTemizlikSuresi(e.target.value)}
                    required={isTimedDrill}
                  />
                </label>
              </div>

              {isTimedDrill ? (
                <label className="block max-w-xs space-y-1">
                  <span className={ctLabel}>{t('education.cqb.maxAllowed')}</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    className={`${ctInput} tabular-nums`}
                    value={maxAllowedSeconds}
                    onChange={(e) => setMaxAllowedSeconds(e.target.value)}
                    required
                  />
                </label>
              ) : null}
            </section>

            <section className={`${ctBentoSpan6} space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5`}>
              <p className="text-sm font-semibold text-zinc-100">{t('education.cqb.infractionsTitle')}</p>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
                {CQB_PHASE_INFRACTION_MATRIX.map((phase) => (
                  <div key={phase.id} className={phaseColumnClass}>
                    <div className={phaseTitleClass}>
                      <p>{formatInstructorCqbPhaseField(phase.id, 'title', phase.title)}</p>
                      <p className={phaseSubtitleClass}>
                        {formatInstructorCqbPhaseField(phase.id, 'subtitle', phase.subtitle)}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {phase.items.map((item) => (
                        <label key={item.key} className={infractionCheckClass}>
                          <input
                            type="checkbox"
                            className="mt-0.5 size-3.5 shrink-0 accent-red-500"
                            checked={!!infractionFlags[item.key]}
                            onChange={(e) => toggleInfraction(item.key, e.target.checked)}
                          />
                          <span className="text-xs leading-snug text-zinc-400">
                            {formatInstructorCqbInfractionLabel(item.key, item.label)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <label className="block space-y-1">
                <span className={ctLabel}>{t('education.cqb.instructorNote')}</span>
                <textarea
                  className={`${ctInput} min-h-[5rem] resize-y normal-case`}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder={t('education.cqb.notePlaceholder')}
                />
              </label>
            </section>
          </div>

          {liveAssessment ? (
            <p
              className={[
                'rounded border px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wide',
                liveAssessment.statusResult === 'BAŞARILI'
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                  : 'border-red-600/50 bg-red-950/40 text-red-300',
              ].join(' ')}
            >
              {liveAssessment.statusResult === 'BAŞARILI'
                ? t('education.cqb.livePass', {
                    status: liveAssessment.statusResult,
                    elim: liveAssessment.etkisizAlinan,
                    threat: liveAssessment.tehditSayisi,
                  })
                : t('education.cqb.liveFail', {
                    status: liveAssessment.statusResult,
                    elim: liveAssessment.etkisizAlinan,
                    threat: liveAssessment.tehditSayisi,
                    infractions: liveAssessment.instructorInfractions.length
                      ? t('education.cqb.liveInfractions', {
                          count: liveAssessment.instructorInfractions.length,
                        })
                      : '',
                  })}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={logSaving || !setupValid || groupMembers.length === 0}
            className={ctBtnPrimary}
          >
            {logSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Shield className="size-4" strokeWidth={1.5} aria-hidden />
            )}
            {t('education.cqb.submit')}
          </button>

          {logMsg ? <p className={msgOk ? ctMsgOk : ctMsgErr}>{logMsg}</p> : null}
        </form>
      )}
    </div>
  )
}
