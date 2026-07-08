import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import {
  formatTrainingCategoryTitle,
  formatTrainingSectorLabel,
} from '../../lib/trainingDisplayText'

/**
 * @param {{
 *   onCategorySelect?: (category: import('./trainingCategories').TrainingCategory) => void
 * }} props
 */
export default function TrainingCategoryHub({ onCategorySelect }) {
  const { t } = useTranslation('training')
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

  const renderCard = (/** @type {import('./trainingCategories').TrainingCategory} */ category, /** @type {number} */ index) => {
    const isGroupSector = category.id === 'grup-egitimi'
    const highlightLabel =
      isGroupSector && hasLiveGroupTraining
        ? activeGroupTrainings.length > 1
          ? t('hub.highlightCount', { count: activeGroupTrainings.length })
          : t('hub.highlightActive')
        : undefined

    return (
      <TrainingCategoryCard
        key={category.id}
        title={formatTrainingCategoryTitle(category.id)}
        imageSrc={category.imageSrc}
        opsCode={category.opsCode}
        sectorLabel={formatTrainingSectorLabel(category.id)}
        vizVariant={category.vizVariant}
        highlightLabel={highlightLabel}
        imagePriority={index < 2 ? 'high' : 'low'}
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
            {t('hub.activeSession')}
          </p>
          <p className="mt-1 font-mono-technical text-xs text-app-text/90">
            {activeGroupTrainings.length === 1
              ? t('hub.activeSingle', { name: activeGroupTrainings[0].trainingName })
              : t('hub.activeMultiple', { count: activeGroupTrainings.length })}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-5 xl:gap-7 2xl:mx-auto 2xl:max-w-[88rem] 2xl:grid-cols-2 2xl:gap-8">
        {TRAINING_CATEGORIES.filter((c) => INDIVIDUAL_TRAINING_CATEGORY_IDS.includes(c.id)).map((category, index) =>
          renderCard(category, index),
        )}

        {canSeeGroupTraining
          ? (() => {
              const groupCategory = TRAINING_CATEGORIES.find((c) => c.id === 'grup-egitimi')
              return groupCategory ? renderCard(groupCategory, INDIVIDUAL_TRAINING_CATEGORY_IDS.length) : null
            })()
          : null}

        {isInstructor ? renderCard(INSTRUCTOR_CONTROL_PANEL_CARD, INDIVIDUAL_TRAINING_CATEGORY_IDS.length + 1) : null}
      </div>

      {profileLoading ? (
        <p className="font-mono-technical text-[9px] uppercase tracking-wider text-app-text/45">
          {t('hub.profileLoading')}
        </p>
      ) : null}

      {!profileLoading && visibleCategories.length < TRAINING_CATEGORIES.length && !isInstructor ? (
        <p className="font-mono-technical text-[8px] uppercase tracking-[0.2em] text-app-text/45">
          {t('hub.groupHint')}{' '}
          <Link to="/ayarlar" className="text-accent/80 transition hover:text-accent">
            {t('hub.groupLink')}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
