import { useEffect, useMemo, useState } from 'react'
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

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */

/** @type {Record<string, { title: string; subtitle: string }>} */
const CATEGORY_HEADERS = {
  atis: { title: 'Atış', subtitle: 'Drill kütüphanesi ve canlı oturum takibi' },
  cqb: { title: 'CQB', subtitle: 'Oda topolojisi, giriş ve taktik değerlendirme' },
  fof: { title: 'Force-on-Force', subtitle: 'Senaryo ve muharebe metrikleri' },
  vbss: {
    title: 'VBSS · Gemi operasyonu',
    subtitle: 'Gemi operasyonu değerlendirme formu — safha bazlı skor ve gözlem',
  },
  tccc: {
    title: 'TCCC · MARCH',
    subtitle: 'Taktik tıbbi değerlendirme — MARCH safha skoru, kritik hata ve gözlem',
  },
}

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

  const header = selectedCategory ? CATEGORY_HEADERS[selectedCategory] : null

  const resetGroupContext = (/** @type {string} */ id) => {
    setActiveGroupId(id)
  }

  if (selectedCategory === null) {
    return (
      <CleanFade className="space-y-6">
        <header>
          <h2 className={ctHeaderTitle}>Eğitim sektörleri</h2>
          <p className={ctHeaderSubtitle}>Kategori seçin — modül ve canlı takip açılır</p>
        </header>
        <InstructorCategoryBento onSelect={onSelectedCategoryChange} />
      </CleanFade>
    )
  }

  return (
    <CleanFade className="space-y-5">
      <button type="button" onClick={() => onSelectedCategoryChange(null)} className={ctBackBtn}>
        <ArrowLeft className="size-3.5" aria-hidden />
        Sektörlere dön
      </button>

      <header className="border-b border-zinc-800 pb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {categoryMeta?.opsCode}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-100">{header?.title ?? 'Sektör'}</h2>
        <p className="mt-1 text-sm text-zinc-500">{header?.subtitle}</p>
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
        <p className="py-12 text-center text-sm text-zinc-500">Sektör modülü bulunamadı.</p>
      )}
    </CleanFade>
  )
}
