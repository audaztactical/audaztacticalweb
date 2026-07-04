import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import InstructorCategoryBento from '../instructor/cleanTactical/InstructorCategoryBento'
import CleanFade from '../instructor/cleanTactical/CleanFade'
import { ctBackBtn, ctHeaderSubtitle, ctHeaderTitle } from '../instructor/cleanTactical/tokens'
import { TRAINING_CATEGORIES } from './trainingCategories'
import OperatorInstructorRecordsPanel from './OperatorInstructorRecordsPanel'
import { useAuth } from '../../context/AuthContext'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'

/** @type {Record<string, { title: string; subtitle: string }>} */
const CATEGORY_HEADERS = {
  atis: { title: 'Atış', subtitle: 'Eğitmenin girdiği grup atış kayıtları ve notları' },
  cqb: { title: 'CQB', subtitle: 'Oda değerlendirmesi, ihlaller ve eğitmen notları' },
  fof: { title: 'Force-on-Force', subtitle: 'Senaryo değerlendirmeleri ve gözlemler' },
  vbss: { title: 'VBSS · Gemi operasyonu', subtitle: 'Safha bazlı eğitmen puanları ve operasyon notları' },
  tccc: { title: 'TCCC · MARCH', subtitle: 'MARCH safha skorları, kritik hatalar ve gözlemler' },
}

/**
 * @param {{
 *   selectedCategory: string | null
 *   onSelectedCategoryChange: (category: string | null) => void
 *   onBack: () => void
 *   embedded?: boolean
 * }} props
 */
export default function OperatorGroupAcademicPortal({
  selectedCategory,
  onSelectedCategoryChange,
  onBack,
  embedded = false,
}) {
  const { user } = useAuth()
  const { membership, isMember, loading } = useOperatorGroup()

  const categoryMeta = useMemo(
    () => TRAINING_CATEGORIES.find((c) => c.id === selectedCategory) ?? null,
    [selectedCategory],
  )

  const header = selectedCategory ? CATEGORY_HEADERS[selectedCategory] : null
  const groupId = membership?.groupId ?? ''
  const groupName = membership?.groupName ?? ''

  if (loading) {
    return (
      <p className="py-16 text-center font-mono-technical text-[10px] uppercase text-app-text/55">
        Grup üyeliği kontrol ediliyor…
      </p>
    )
  }

  if (!isMember || !groupId) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
        <p className="font-mono-technical text-[10px] uppercase text-app-text/55">
          Eğitmen kayıtlarını görüntülemek için bir taktik grubuna dahil olmalısınız.{' '}
          <Link to="/takim" className="text-accent hover:text-accent/80">
            Taktik Timim →
          </Link>
        </p>
        {!embedded ? (
          <button type="button" onClick={onBack} className={`${ctBackBtn} mx-auto mt-4`}>
            <ArrowLeft className="size-3.5" aria-hidden />
            Sektörlere dön
          </button>
        ) : null}
      </section>
    )
  }

  if (selectedCategory === null) {
    return (
      <CleanFade className="space-y-6">
        <header>
          {!embedded ? (
            <button type="button" onClick={onBack} className={ctBackBtn}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Antrenman terminali
            </button>
          ) : null}
          <h2 className={`${ctHeaderTitle} ${embedded ? '' : 'mt-4'}`}>Grup eğitmen kayıtları</h2>
          <p className={ctHeaderSubtitle}>
            {groupName ? `${groupName} · ` : ''}Sektör seçin — yalnızca kendi kayıtlarınız salt okunurdur
          </p>
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

      <OperatorInstructorRecordsPanel
        discipline={/** @type {import('../../lib/firestoreGroupTraining').GroupTrainingDiscipline} */ (selectedCategory)}
        groupId={groupId}
        groupName={groupName}
        currentOperatorId={user?.uid ?? ''}
        selfOnly
      />
    </CleanFade>
  )
}
