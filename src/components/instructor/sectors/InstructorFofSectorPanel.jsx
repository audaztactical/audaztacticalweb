import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Swords } from 'lucide-react'
import { submitGroupFofActivityLog } from '../../../lib/firestoreGroupTraining'
import { emitFirebaseError } from '../../../lib/firebaseErrorBus'
import ForceonForceTerminal from '../ForceonForceTerminal'
import BentoCard from '../cleanTactical/BentoCard'
import InstructorGroupSelect from '../cleanTactical/InstructorGroupSelect'
import { ctLabel, ctSelect } from '../cleanTactical/tokens'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   instructorId: string
 *   activeGroupId: string
 *   onActiveGroupIdChange: (id: string) => void
 * }} props
 */
export default function InstructorFofSectorPanel({
  groups,
  operators,
  instructorId,
  activeGroupId,
  onActiveGroupIdChange,
}) {
  const { t } = useTranslation('instructor')
  const [logOperatorId, setLogOperatorId] = useState('')
  const [saving, setSaving] = useState(false)

  const activeGroup = useMemo(
    () => groups.find((g) => g.groupId === activeGroupId) ?? null,
    [groups, activeGroupId],
  )

  const groupMembers = useMemo(() => {
    if (!activeGroup) return []
    const set = new Set(activeGroup.members)
    return operators.filter((op) => set.has(op.uid))
  }, [activeGroup, operators])

  const selectedOperator = useMemo(
    () => groupMembers.find((op) => op.uid === logOperatorId) ?? null,
    [groupMembers, logOperatorId],
  )

  useEffect(() => {
    if (groupMembers.length > 0 && !logOperatorId) {
      setLogOperatorId(groupMembers[0].uid)
    }
  }, [groupMembers, logOperatorId])

  const handleSaveEvaluation = async (payload) => {
    if (!activeGroupId || !instructorId) {
      throw new Error(t('education.fof.groupRequired'))
    }
    setSaving(true)
    try {
      await submitGroupFofActivityLog({
        groupId: activeGroupId,
        instructorId,
        operatorId: payload.operatorId,
        scenarioType: payload.scenarioType,
        oodaCycle: payload.oodaCycle,
        tacticalCommunication: payload.tacticalCommunication,
        coverManagement: payload.coverManagement,
        hitStatus: payload.hitStatus,
        penalties: payload.penalties,
        finalScore: payload.finalScore,
        passed: payload.passed,
        instantFail: payload.instantFail,
        failReason: payload.failReason,
        aarNotes: payload.aarNotes,
      })
    } catch (err) {
      emitFirebaseError(err)
      throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <InstructorGroupSelect
          groups={groups}
          value={activeGroupId}
          onChange={(id) => {
            onActiveGroupIdChange(id)
            setLogOperatorId('')
          }}
        />
        <label className="block space-y-1.5">
          <span className={ctLabel}>{t('education.shared.operator')}</span>
          <select
            value={logOperatorId}
            onChange={(e) => setLogOperatorId(e.target.value)}
            className={ctSelect}
            disabled={groupMembers.length === 0}
          >
            {groupMembers.length === 0 ? (
              <option value="">{t('education.shared.noGroupMembers')}</option>
            ) : (
              groupMembers.map((op) => (
                <option key={op.uid} value={op.uid}>
                  {op.callsign || op.username || op.uid.slice(0, 8)}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {saving ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {t('education.shared.saving')}
        </p>
      ) : null}

      <BentoCard
        title={t('education.fof.panelTitle')}
        description={t('education.fof.panelSubtitle')}
        icon={Swords}
      >
        <ForceonForceTerminal
          selectedOperator={selectedOperator}
          onSaveEvaluation={handleSaveEvaluation}
          saving={saving}
        />
      </BentoCard>
    </div>
  )
}
