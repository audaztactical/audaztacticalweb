import { ChevronRight, Lock } from 'lucide-react'
import { TRAINING_CATEGORIES } from '../../training/trainingCategories'

/** @type {Record<string, string>} */
const SECTOR_LABELS = {
  atis: 'Atış',
  cqb: 'CQB',
  fof: 'FoF',
  vbss: 'Gemi operasyonu',
  tccc: 'MARCH değerlendirme',
  'grup-egitimi': 'Grup',
}

const INSTRUCTOR_EXCLUDED_SECTOR_IDS = new Set(['grup-egitimi', 'egitim'])

/**
 * @param {{
 *   onSelect: (id: string) => void
 *   lockedIds?: Set<string>
 * }} props
 */
export default function InstructorCategoryBento({ onSelect, lockedIds = new Set() }) {
  return (
    <div className="instructor-category-bento grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {TRAINING_CATEGORIES.filter((c) => !INSTRUCTOR_EXCLUDED_SECTOR_IDS.has(c.id)).map((cat, i) => {
        const locked = lockedIds.has(cat.id)
        return (
          <button
            key={cat.id}
            type="button"
            disabled={locked}
            onClick={() => onSelect(cat.id)}
            style={{ animationDelay: `${i * 0.03}s` }}
            className={[
              'animate-fade-in group flex min-h-0 min-w-0 w-full flex-col rounded-xl border p-4 text-left transition-colors duration-200',
              locked
                ? 'cursor-not-allowed border-zinc-800/80 bg-zinc-900/30 opacity-50'
                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50',
            ].join(' ')}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <span className="truncate text-xs font-medium uppercase tracking-wider text-zinc-500">
                {cat.opsCode}
              </span>
              {locked ? (
                <Lock className="size-3.5 text-zinc-600" aria-hidden />
              ) : (
                <ChevronRight
                  className="size-4 text-zinc-600 transition group-hover:text-zinc-300"
                  aria-hidden
                />
              )}
            </div>
            <h3 className="mt-2 break-words text-base font-semibold leading-snug text-zinc-100">
              {cat.title}
            </h3>
            <p className="mt-1 break-words text-xs leading-snug text-zinc-500">
              {SECTOR_LABELS[cat.id] ?? 'Sektör'} modülü
            </p>
          </button>
        )
      })}
    </div>
  )
}
