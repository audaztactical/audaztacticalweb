import { BookOpen, ChevronRight, Loader2, Play } from 'lucide-react'
import {
  ctBtnPrimary,
  ctCriteriaBox,
  ctHelperText,
  ctInput,
  ctLabel,
  ctMsgErr,
  ctMsgOk,
  ctSelect,
} from './tokens'

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
  selectedDrillName,
  levelLabel,
  showNewDrillSlot,
}) {
  const msgOk = message.includes('AKTİF') || message.includes('TAMAMLANDI') || message.includes('açıldı')

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className={ctLabel}>Seviye</span>
        <select className={ctSelect} value={levelSelect} onChange={(e) => onLevelChange(e.target.value)}>
          <option value="">Seviye seçin</option>
          {levelOptions.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
          <option value="__new_level__">+ Yeni seviye</option>
        </select>
      </label>

      {isNewLevel ? (
        <div className="block space-y-1.5">
          <label className="block space-y-1.5" htmlFor="instructor-new-level">
            <span className={ctLabel}>Yeni seviye adı</span>
            <input
              id="instructor-new-level"
              className={ctInput}
              value={newLevelName}
              onChange={(e) => onNewLevelNameChange(e.target.value)}
              placeholder="Örn: Seviye 4 (İleri Operasyonlar)"
            />
          </label>
          <p className={ctHelperText}>
            Liste düzeninin bozulmaması için lütfen &apos;Seviye X (Açıklama)&apos; formatında giriniz.
          </p>
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className={ctLabel}>Drill</span>
        <select
          className={ctSelect}
          value={drillSelect}
          onChange={(e) => onDrillChange(e.target.value)}
          disabled={!levelLabel && !isNewLevel}
        >
          <option value="">Drill seçin</option>
          {drillOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
          <option value="__new_drill__">+ Yeni drill</option>
        </select>
      </label>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Kütüphane yükleniyor…
        </p>
      ) : null}

      {showNewDrillSlot}

      {selectedDrillName && levelLabel ? (
        <div className={ctCriteriaBox}>
          <p className="font-medium text-zinc-300">{selectedDrillName}</p>
          <p className="mt-0.5 text-zinc-500">{levelLabel}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={ctLabel}>Mühimmat</span>
          <input
            type="number"
            min={1}
            className={`${ctInput} tabular-nums`}
            value={totalAmmo}
            onChange={(e) => onTotalAmmoChange(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={ctLabel}>Geçer baraj</span>
          <input
            type="number"
            min={0}
            className={`${ctInput} tabular-nums`}
            value={minPassScore}
            onChange={(e) => onMinPassScoreChange(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5 sm:min-h-[42px]">
          <input
            type="checkbox"
            className="size-4 rounded border-zinc-600 accent-zinc-300"
            checked={isTimed}
            onChange={(e) => onTimedChange(e.target.checked)}
          />
          <span className="text-sm text-zinc-400">Zamanlı oturum</span>
        </label>

        {isTimed ? (
          <label className="block min-w-0 flex-1 space-y-1.5">
            <span className={ctLabel}>Hedef Süre (sn)</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              className={`${ctInput} tabular-nums`}
              value={targetTimeSec}
              onChange={(e) => onTargetTimeSecChange(e.target.value)}
              placeholder="örn. 12"
              required
            />
          </label>
        ) : null}
      </div>

      {thresholdError ? <p className={ctMsgErr}>{thresholdError}</p> : null}

      <button
        type="button"
        disabled={starting || !!thresholdError}
        onClick={onStart}
        className={ctBtnPrimary}
      >
        {starting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Play className="size-4" aria-hidden />
        )}
        Oturumu başlat
        <ChevronRight className="size-4 opacity-60" aria-hidden />
      </button>

      {message ? <p className={msgOk ? ctMsgOk : ctMsgErr}>{message}</p> : null}

      <p className="flex items-center gap-1.5 text-xs text-zinc-600">
        <BookOpen className="size-3.5" aria-hidden />
        Drill seç → Başlat (2 adım)
      </p>
    </div>
  )
}
