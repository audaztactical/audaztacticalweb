import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { todayIsoDate } from '../../lib/weaponIlws'
import { accessoryMaintenanceTypeOptions } from '../../lib/armoryDisplayText'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[10px] uppercase text-app-text outline-none'

const dateInputClass =
  'w-full rounded border border-accent bg-app-bg px-2 py-1.5 font-mono-technical text-[10px] text-accent outline-none [color-scheme:dark] focus:border-accent'

const textareaClass =
  'mt-1 min-h-[5rem] w-full resize-y rounded border border-accent/35 bg-app-bg px-2 py-1.5 font-mono-technical text-[10px] normal-case text-app-text outline-none placeholder:text-app-text/45 focus:border-accent'

/**
 * @param {{
 *   open: boolean
 *   saving: boolean
 *   busy: boolean
 *   maintenanceType: string
 *   maintenanceDate: string
 *   maintenanceNote: string
 *   onMaintenanceTypeChange: (value: string) => void
 *   onMaintenanceDateChange: (value: string) => void
 *   onMaintenanceNoteChange: (value: string) => void
 *   onClose: () => void
 *   onSubmit: (e: import('react').FormEvent) => void
 * }} props
 */
export default function AccessoryMaintenanceModal({
  open,
  saving,
  busy,
  maintenanceType,
  maintenanceDate,
  maintenanceNote,
  onMaintenanceTypeChange,
  onMaintenanceDateChange,
  onMaintenanceNoteChange,
  onClose,
  onSubmit,
}) {
  const { t, i18n } = useTranslation('armory')
  const maintTypeOptions = useMemo(() => accessoryMaintenanceTypeOptions(), [i18n.language])

  if (!open) return null

  const disabled = saving || busy

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessory-maint-modal-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('page.closeAria')} onClick={() => !disabled && onClose()} />
      <div className="relative z-[1] w-full max-w-md border border-accent bg-app-bg p-0 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]">
        <div className="flex items-start justify-between gap-2 border-b border-accent/30 bg-app-bg px-3 py-2 sm:px-4">
          <div>
            <p
              id="accessory-maint-modal-title"
              className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent"
            >
              {t('modals.accessoryMaint.title')}
            </p>
            <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">
              {t('modals.accessoryMaint.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="shrink-0 rounded border border-white/15 px-2 py-1 font-mono-technical text-[9px] font-bold uppercase text-app-text/70 hover:border-accent/40 hover:text-accent disabled:opacity-40"
            aria-label={t('page.closeAria')}
          >
            {t('modals.accessoryMaint.close')}
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">
              {t('modals.accessoryMaint.maintType')}
            </span>
            <select
              className={`${selectClass} mt-1`}
              value={maintenanceType}
              onChange={(e) => onMaintenanceTypeChange(e.target.value)}
              disabled={disabled}
              required
            >
              {maintTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">
              {t('modals.accessoryMaint.date')}
            </span>
            <input
              type="date"
              className={`${dateInputClass} mt-1`}
              value={maintenanceDate}
              max={todayIsoDate()}
              onChange={(e) => onMaintenanceDateChange(e.target.value)}
              disabled={disabled}
              required
            />
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">
              {t('modals.accessoryMaint.techNote')}
            </span>
            <textarea
              className={textareaClass}
              placeholder={t('modals.accessoryMaint.techNotePlaceholder')}
              value={maintenanceNote}
              onChange={(e) => onMaintenanceNoteChange(e.target.value)}
              disabled={disabled}
              rows={4}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-accent/20 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className="rounded border border-white/15 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/70 hover:bg-white/5 disabled:opacity-40"
            >
              {t('modals.accessoryMaint.cancel')}
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="rounded border border-accent/55 bg-accent/15 px-4 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] hover:bg-accent/25 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
