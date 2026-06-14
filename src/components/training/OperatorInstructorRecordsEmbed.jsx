import { useAuth } from '../../context/AuthContext'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'
import OperatorInstructorRecordsPanel from './OperatorInstructorRecordsPanel'

/** @typedef {import('../../lib/firestoreGroupTraining').GroupTrainingDiscipline} GroupTrainingDiscipline */

/**
 * Grup üyesi operatörler için sektör içi salt okunur eğitmen kayıtları.
 * Eğitmen rolünde tetiklenmez — raporlama Eğitmen Kontrol Paneli'ndedir.
 * @param {{ discipline: GroupTrainingDiscipline }} props
 */
export default function OperatorInstructorRecordsEmbed({ discipline }) {
  const { user, role, isInstructor } = useAuth()
  const { membership, isMember, loading } = useOperatorGroup()

  if (role === 'instructor' || isInstructor) return null
  if (loading || !isMember || !membership?.groupId) return null

  return (
    <OperatorInstructorRecordsPanel
      discipline={discipline}
      groupId={membership.groupId}
      groupName={membership.groupName ?? ''}
      currentOperatorId={user?.uid ?? ''}
    />
  )
}
