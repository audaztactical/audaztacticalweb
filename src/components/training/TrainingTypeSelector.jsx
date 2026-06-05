import { motion as Motion } from 'framer-motion'
import { Lock, Users, User } from 'lucide-react'
import { TRAINING_TYPE_GROUP, TRAINING_TYPE_INDIVIDUAL } from '../../lib/trainingGroupFields'

/** @typedef {import('../../lib/trainingGroupFields').TrainingTypeKey} TrainingTypeKey */

/**
 * @param {{
 *   trainingType: TrainingTypeKey
 *   onTrainingTypeChange: (type: TrainingTypeKey) => void
 *   isMember: boolean
 *   groupLoading?: boolean
 *   groupName?: string | null
 * }} props
 */
export default function TrainingTypeSelector({
  trainingType,
  onTrainingTypeChange,
  isMember,
  groupLoading = false,
  groupName = null,
}) {
  const isGroup = trainingType === TRAINING_TYPE_GROUP

  return (
    <Motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-[#ffb400]/25 bg-[#0a0a0a]/90 p-3 sm:p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.32em] text-[#ffb400]/80">
            [ EĞİTİM TİPİ ]
          </p>
          <p className="mt-0.5 font-mono-technical text-[9px] uppercase text-slate-500">
            Bireysel kayıt yalnızca size · grup kaydı eğitmen paneline yansır
          </p>
        </div>

        <div
          className="inline-flex rounded-lg border border-white/10 bg-black/50 p-1"
          role="radiogroup"
          aria-label="Eğitim tipi seçimi"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!isGroup}
            onClick={() => onTrainingTypeChange(TRAINING_TYPE_INDIVIDUAL)}
            className={[
              'inline-flex items-center gap-2 rounded-md px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition',
              !isGroup
                ? 'bg-[#ffb400]/15 text-[#ffb400] shadow-[0_0_16px_-6px_rgba(255,180,0,0.35)]'
                : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            <User className="size-3.5" strokeWidth={1.75} aria-hidden />
            Bireysel
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={isGroup}
            disabled={!isMember || groupLoading}
            onClick={() => onTrainingTypeChange(TRAINING_TYPE_GROUP)}
            className={[
              'inline-flex items-center gap-2 rounded-md px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition',
              isGroup
                ? 'bg-[#00FF41]/12 text-[#00FF41] shadow-[0_0_16px_-6px_rgba(0,255,65,0.3)]'
                : 'text-slate-500',
              !isMember || groupLoading ? 'cursor-not-allowed opacity-45' : 'hover:text-[#00FF41]',
            ].join(' ')}
          >
            <Users className="size-3.5" strokeWidth={1.75} aria-hidden />
            Grup Eğitimi
          </button>
        </div>
      </div>

      {!isMember && !groupLoading ? (
        <p className="mt-2.5 flex items-center gap-2 font-mono-technical text-[8px] uppercase tracking-wide text-slate-600">
          <Lock className="size-3 shrink-0 text-slate-600" aria-hidden />
          Bir gruba dahil değilsiniz · Başarı Takibi panelinden gruba katılabilirsiniz
        </p>
      ) : null}

      {isGroup && isMember && groupName ? (
        <Motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 flex items-center gap-2 rounded border border-[#00FF41]/25 bg-[#00FF41]/[0.05] px-3 py-2"
        >
          <Lock className="size-3.5 shrink-0 text-[#00FF41]/70" aria-hidden />
          <div className="min-w-0">
            <p className="font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Aktif Grup · Kilitli
            </p>
            <p className="truncate font-display text-sm font-bold tracking-wide text-[#00FF41]">{groupName}</p>
          </div>
        </Motion.div>
      ) : null}
    </Motion.div>
  )
}
