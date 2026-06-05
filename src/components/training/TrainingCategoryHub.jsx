import TrainingCategoryCard from './TrainingCategoryCard'
import { TRAINING_CATEGORIES } from './trainingCategories'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'

/**
 * @param {{
 *   onCategorySelect?: (category: import('./trainingCategories').TrainingCategory) => void
 * }} props
 */
export default function TrainingCategoryHub({ onCategorySelect }) {
  const { isMember, loading: groupLoading } = useOperatorGroup()

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {TRAINING_CATEGORIES.map((category) => {
        const needsGroup = Boolean(category.requiresGroup)
        const locked = needsGroup && !groupLoading && !isMember
        return (
          <TrainingCategoryCard
            key={category.id}
            title={category.title}
            imageSrc={category.imageSrc}
            opsCode={category.opsCode}
            vizVariant={category.vizVariant}
            disabled={locked}
            disabledHint={
              locked ? 'Grup eğitimi için önce bir taktik grubuna katılın (Başarılar → Gruba Katıl).' : undefined
            }
            onSelect={() => {
              if (locked) return
              if (onCategorySelect) onCategorySelect(category)
            }}
          />
        )
      })}
    </div>
  )
}
