import { BookOpen, ChevronRight, Loader2, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  inputClass,
  labelClass,
  selectClass,
} from '../../training/layout/trainingTerminalTokens'
import {
  icBtnPrimary,
  icCriteriaBox,
  icHelperText,
  icMsgErr,
  icMsgOk,
} from '../layout/instructorCommandTokens'

/**
 * Seviye + drill seçimi ve tek tıkla başlatma (max 2 tık: drill seç → başlat).
 *
 * @param {{
 *   levelOptions: string[]
 *   levelSelect: string
 *   onLevelChange: (v: string) => void
 *   newLevelName: string
 *   onNewLevelNameChange: (v: string) => void
 *   isNewLevel: boolean
 *   drillOptions: { id: string; label: string }[]
 *   drillSelect: string
 *   onDrillChange: (id: string) => void
 *   loading?: boolean
 *   totalAmmo: string
 *   onTotalAmmoChange: (v: string) => void
 *   minPassScore: string
 *   onMinPassScoreChange: (v: string) => void
 *   isTimed: boolean
 *   onTimedChange: (v: boolean) => void
 *   targetTimeSec: string
 *   onTargetTimeSecChange: (v: string) => void
 *   thresholdError?: string | null
 *   onStart: () => void
 *   starting?: boolean
 *   message?: string
 *   messageOk?: boolean
 *   selectedDrillName?: string
 *   levelLabel?: string
 *   showNewDrillSlot?: import('react').ReactNode
 * }} props
 */
export default function DrillQuickSelector({
  levelOptions,
  levelSelect,
  onLevelChange,
  newLevelName,
  onNewLevelNameChange,
  isNewLevel,
  drillOptions,
  drillSelect,
  onDrillChange,
  loading = false,
  totalAmmo,
  onTotalAmmoChange,
  minPassScore,
  onMinPassScoreChange,
  isTimed,
  onTimedChange,
  targetTimeSec,
  onTargetTimeSecChange,
  thresholdError,
  onStart,
  starting = false,
  message = '',
  messageOk = false,
  selectedDrillName,
  levelLabel,
  showNewDrillSlot,
}) {
  const { t } = useTranslation('instructor')

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className={labelClass}>{t('education.atis.quick.level')}</span>
        <select className={selectClass} value={levelSelect} onChange={(e) => onLevelChange(e.target.value)}>
          <option value="">{t('education.atis.quick.selectLevel')}</option>
          {levelOptions.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
          <option value="__new_level__">{t('education.atis.quick.newLevel')}</option>
        </select>
      </label>

      {isNewLevel ? (
        <div className="block space-y-1.5">
          <label className="block space-y-1.5" htmlFor="instructor-new-level">
            <span className={labelClass}>{t('education.atis.quick.newLevelName')}</span>
            <input
              id="instructor-new-level"
              className={inputClass}
              value={newLevelName}
              onChange={(e) => onNewLevelNameChange(e.target.value)}
              placeholder={t('education.atis.quick.newLevelPlaceholder')}
            />
          </label>
          <p className={icHelperText}>{t('education.atis.quick.newLevelHint')}</p>
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className={labelClass}>{t('education.atis.quick.drill')}</span>
        <select
          className={selectClass}
          value={drillSelect}
          onChange={(e) => onDrillChange(e.target.value)}
          disabled={!levelLabel && !isNewLevel}
        >
          <option value="">{t('education.atis.quick.selectDrill')}</option>
          {drillOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
          <option value="__new_drill__">{t('education.atis.quick.newDrill')}</option>
        </select>
      </label>

      {loading ? (
        <p className="flex items-center gap-2 font-mono-technical text-[9px] uppercase text-app-text/55">
          <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden />
          {t('education.atis.quick.libraryLoading')}
        </p>
      ) : null}

      {showNewDrillSlot}

      {selectedDrillName && levelLabel ? (
        <div className={icCriteriaBox}>
          <p className="font-bold uppercase text-app-text/85">{selectedDrillName}</p>
          <p className="mt-0.5 text-app-text/50">{levelLabel}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={labelClass}>{t('education.atis.quick.ammo')}</span>
          <input
            type="number"
            min={1}
            className={`${inputClass} tabular-nums`}
            value={totalAmmo}
            onChange={(e) => onTotalAmmoChange(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>{t('education.atis.quick.passThreshold')}</span>
          <input
            type="number"
            min={0}
            className={`${inputClass} tabular-nums`}
            value={minPassScore}
            onChange={(e) => onMinPassScoreChange(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded border border-accent/20 bg-black/35 px-3 py-2.5 sm:min-h-[42px]">
          <input
            type="checkbox"
            className="size-4 rounded border-accent/30 accent-[var(--accent-color)]"
            checked={isTimed}
            onChange={(e) => onTimedChange(e.target.checked)}
          />
          <span className="font-mono-technical text-[10px] uppercase text-app-text/60">
            {t('education.atis.quick.timedSession')}
          </span>
        </label>

        {isTimed ? (
          <label className="block min-w-0 flex-1 space-y-1.5">
            <span className={labelClass}>{t('education.atis.quick.targetDuration')}</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              className={`${inputClass} tabular-nums`}
              value={targetTimeSec}
              onChange={(e) => onTargetTimeSecChange(e.target.value)}
              placeholder={t('education.shared.exampleShort', { value: '12' })}
              required
            />
          </label>
        ) : null}
      </div>

      {thresholdError ? <p className={icMsgErr}>{thresholdError}</p> : null}

      <button
        type="button"
        disabled={starting || !!thresholdError}
        onClick={onStart}
        className={icBtnPrimary}
      >
        {starting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Play className="size-4" aria-hidden />
        )}
        {t('education.atis.quick.startSession')}
        <ChevronRight className="size-4 opacity-60" aria-hidden />
      </button>

      {message ? <p className={messageOk ? icMsgOk : icMsgErr}>{message}</p> : null}

      <p className="flex items-center gap-1.5 font-mono-technical text-[9px] uppercase text-app-text/40">
        <BookOpen className="size-3.5" aria-hidden />
        {t('education.atis.quick.twoStepHint')}
      </p>
    </div>
  )
}
