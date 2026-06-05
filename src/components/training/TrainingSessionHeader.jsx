import TrainingTypeSelector from './TrainingTypeSelector'
import { useTrainingSession } from '../../context/TrainingSessionContext'

export default function TrainingSessionHeader() {
  const { trainingType, setTrainingType, isMember, membership, groupLoading } = useTrainingSession()

  return (
    <TrainingTypeSelector
      trainingType={trainingType}
      onTrainingTypeChange={setTrainingType}
      isMember={isMember}
      groupLoading={groupLoading}
      groupName={membership?.groupName ?? null}
    />
  )
}
