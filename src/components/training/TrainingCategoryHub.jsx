import { useNavigate } from 'react-router-dom'
import TrainingCategoryCard from './TrainingCategoryCard'
import {
  filterTrainingCategoriesByAccess,
  INSTRUCTOR_CONTROL_PANEL_CARD,
  INDIVIDUAL_TRAINING_CATEGORY_IDS,
  resolveUserGroup,
  TRAINING_CATEGORIES,
} from './trainingCategories'
import { useActiveGroupTrainings } from '../../hooks/useActiveGroupTrainings'
import { useAuth } from '../../context/AuthContext'

/**
 * @param {{
 *   onCategorySelect?: (category: import('./trainingCategories').TrainingCategory) => void
 * }} props
 */
export default function TrainingCategoryHub({ onCategorySelect }) {
  const navigate = useNavigate()
  const { role, userData, profileLoading } = useAuth()
  const userGroup = resolveUserGroup(userData)
  const isInstructor = role === 'instructor'
  const canSeeGroupTraining = Boolean(userGroup) || isInstructor
  const { hasLiveGroupTraining, activeGroupTrainings } = useActiveGroupTrainings()

  const visibleCategories = filterTrainingCategoriesByAccess({
    role: role ?? 'operator',
    userGroup,
  })

  const renderCard = (/** @type {import('./trainingCategories').TrainingCategory} */ category) => {
    const isGroupSector = category.id === 'grup-egitimi'
    const highlightLabel =
      isGroupSector && hasLiveGroupTraining
        ? activeGroupTrainings.length > 1
          ? `${activeGroupTrainings.length} AKTİF`
          : 'AKTİF EĞİTİM'
        : undefined

    return (
      <TrainingCategoryCard
        key={category.id}
        title={category.title}
        imageSrc={category.imageSrc}
        opsCode={category.opsCode}
        vizVariant={category.vizVariant}
        highlightLabel={highlightLabel}
        onSelect={() => {
          if (profileLoading) return
          if (category.externalRoute) {
            navigate(category.externalRoute)
            return
          }
          if (onCategorySelect) onCategorySelect(category)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {canSeeGroupTraining && hasLiveGroupTraining ? (
        <div className="rounded-lg border border-accent/30 bg-accent/[0.06] px-4 py-3">
          <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.3em] text-accent/85">
            [ EĞİTMEN OTURUMU AKTİF ]
          </p>
          <p className="mt-1 font-mono-technical text-xs text-app-text/90">
            {activeGroupTrainings.length === 1
              ? `"${activeGroupTrainings[0].trainingName}" canlı — Grup Eğitimi sektöründen katılın.`
              : `${activeGroupTrainings.length} aktif grup eğitimi — Grup Eğitimi sektöründen katılın.`}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TRAINING_CATEGORIES.filter((c) => INDIVIDUAL_TRAINING_CATEGORY_IDS.includes(c.id)).map(renderCard)}

        {canSeeGroupTraining
          ? (() => {
              const groupCategory = TRAINING_CATEGORIES.find((c) => c.id === 'grup-egitimi')
              return groupCategory ? renderCard(groupCategory) : null
            })()
          : null}

        {isInstructor ? renderCard(INSTRUCTOR_CONTROL_PANEL_CARD) : null}
      </div>

      {profileLoading ? (
        <p className="font-mono-technical text-[9px] uppercase tracking-wider text-app-text/45">
          Erişim profili doğrulanıyor…
        </p>
      ) : null}

      {!profileLoading && visibleCategories.length < TRAINING_CATEGORIES.length && !isInstructor ? (
        <p className="font-mono-technical text-[8px] uppercase tracking-[0.2em] text-app-text/45">
          Kişisel sektörler açık · grup eğitimi için gruba katılın
        </p>
      ) : null}
    </div>
  )
}
