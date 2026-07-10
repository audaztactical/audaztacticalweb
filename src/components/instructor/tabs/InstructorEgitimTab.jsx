import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { TRAINING_CATEGORIES } from '../../training/trainingCategories'
import InstructorAtisSectorPanel from '../sectors/InstructorAtisSectorPanel'
import InstructorCqbSectorPanel from '../sectors/InstructorCqbSectorPanel'
import InstructorFofSectorPanel from '../sectors/InstructorFofSectorPanel'
import InstructorVbssSectorPanel from '../sectors/InstructorVbssSectorPanel'
import InstructorTcccSectorPanel from '../sectors/InstructorTcccSectorPanel'
import InstructorCategoryBento from '../cleanTactical/InstructorCategoryBento'
import CleanFade from '../cleanTactical/CleanFade'
import { ctBackBtn, ctHeaderSubtitle, ctHeaderTitle } from '../cleanTactical/tokens'
import {
  formatInstructorEducationSectorTitle,
  formatInstructorEducationSectorSubtitle,
} from '../../../lib/instructorDisplayText'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   instructorId: string
 *   selectedCategory: string | null
 *   onSelectedCategoryChange: (category: string | null) => void
 * }} props
 */
export default function InstructorEgitimTab({
  groups,
  operators,
  instructorId,
  selectedCategory,
  onSelectedCategoryChange,
}) {
  const { t } = useTranslation('instructor')
  const [activeGroupId, setActiveGroupId] = useState('')

  const categoryMeta = useMemo(
    () => TRAINING_CATEGORIES.find((c) => c.id === selectedCategory) ?? null,
    [selectedCategory],
  )

  useEffect(() => {
    if (groups.length > 0 && !activeGroupId) setActiveGroupId(groups[0].groupId)
  }, [groups, activeGroupId])

  useEffect(() => {
    if (selectedCategory === 'egitim') onSelectedCategoryChange(null)
  }, [selectedCategory, onSelectedCategoryChange])

  const resetGroupContext = (/** @type {string} */ id) => {
    setActiveGroupId(id)
  }

  if (selectedCategory === null) {
    return (
      <CleanFade className="space-y-6">
        <header>
          <h2 className={ctHeaderTitle}>{t('education.hub.title')}</h2>
          <p className={ctHeaderSubtitle}>{t('education.hub.subtitle')}</p>
        </header>
        <InstructorCategoryBento onSelect={onSelectedCategoryChange} />
      </CleanFade>
    )
  }

  return (
    <CleanFade className="space-y-5">
      <button type="button" onClick={() => onSelectedCategoryChange(null)} className={ctBackBtn}>
        <ArrowLeft className="size-3.5" aria-hidden />
        {t('education.hub.backToSectors')}
      </button>

      <header className="border-b border-zinc-800 pb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {categoryMeta?.opsCode}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-100">
          {formatInstructorEducationSectorTitle(selectedCategory) || t('education.hub.sectorFallback')}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {formatInstructorEducationSectorSubtitle(selectedCategory)}
        </p>
      </header>

      {selectedCategory === 'atis' ? (
        <InstructorAtisSectorPanel
          groups={groups}
          operators={operators}
          instructorId={instructorId}
          activeGroupId={activeGroupId}
          onActiveGroupIdChange={resetGroupContext}
        />
      ) : selectedCategory === 'cqb' ? (
        <InstructorCqbSectorPanel
          groups={groups}
          operators={operators}
          instructorId={instructorId}
          activeGroupId={activeGroupId}
          onActiveGroupIdChange={resetGroupContext}
        />
      ) : selectedCategory === 'fof' ? (
        <InstructorFofSectorPanel
          groups={groups}
          operators={operators}
          instructorId={instructorId}
          activeGroupId={activeGroupId}
          onActiveGroupIdChange={resetGroupContext}
        />
      ) : selectedCategory === 'vbss' ? (
        <InstructorVbssSectorPanel
          groups={groups}
          operators={operators}
          instructorId={instructorId}
          activeGroupId={activeGroupId}
          onActiveGroupIdChange={setActiveGroupId}
        />
      ) : selectedCategory === 'tccc' ? (
        <InstructorTcccSectorPanel
          groups={groups}
          operators={operators}
          instructorId={instructorId}
          activeGroupId={activeGroupId}
          onActiveGroupIdChange={setActiveGroupId}
        />
      ) : (
        <p className="py-12 text-center text-sm text-zinc-500">{t('education.hub.moduleNotFound')}</p>
      )}
    </CleanFade>
  )
}
