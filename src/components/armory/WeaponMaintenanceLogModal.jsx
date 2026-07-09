import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAINTENANCE_TYPES, todayIsoDate, weaponDisplayName, weaponStokKodu } from '../../lib/weaponIlws'
import { submitWeaponMaintenanceLog } from '../../lib/weaponMaintenanceService'
import TacticalPanel from '../ui/TacticalPanel'
import { weaponMaintenanceTypeOptions } from '../../lib/armoryDisplayText'

const inputClass =
  'w-full rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none focus:border-accent/60'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[10px] uppercase text-app-text outline-none'

const dateClass =
  'w-full rounded border border-accent/40 bg-app-bg px-2 py-1.5 font-mono-technical text-[10px] text-accent outline-none [color-scheme:dark]'

/**
 * @param {{
 *   open: boolean
 *   weapon: Record<string, unknown> | null
 *   rangeLogs: Record<string, unknown>[]
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   onClose?: () => void
 *   onSuccess?: () => void
 *   lockDismiss?: boolean
 * }} props
 */
export default function WeaponMaintenanceLogModal({
  open,
  weapon,
  rangeLogs,
  updateItem,
  onClose,
  onSuccess,
  lockDismiss = false,
}) {
  const { t, i18n } = useTranslation('armory')
  const maintTypeOptions = useMemo(() => weaponMaintenanceTypeOptions(), [i18n.language])
  const [maintType, setMaintType] = useState(MAINTENANCE_TYPES[0])
  const [maintDate, setMaintDate] = useState(todayIsoDate)
  const [cleanedBy, setCleanedBy] = useState('')
  const [maintNote, setMaintNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!open) return
    setMaintType(MAINTENANCE_TYPES[0])
    setMaintDate(todayIsoDate())
    setCleanedBy('')
    setMaintNote('')
    setError(null)
  }, [open, weapon])

  if (!open || !weapon) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await submitWeaponMaintenanceLog({
        updateItem,
        weapon,
        rangeLogs,
        maintenanceType: maintType,
        date: maintDate,
        cleanedBy,
        note: maintNote,
      })
      onSuccess?.()
      if (!lockDismiss) onClose?.()
    } catch {
      setError(t('modals.weaponMaint.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
      {!lockDismiss ? (
        <button type="button" className="absolute inset-0 cursor-default" aria-label={t('page.closeAria')} onClick={() => !saving && onClose?.()} />
      ) : (
        <div className="absolute inset-0" aria-hidden />
      )}
      <TacticalPanel className="weapon-maint-alarm relative z-[1] w-full max-w-lg border-red-500/50 bg-app-bg/98 p-0 shadow-[0_0_40px_rgba(239,68,68,0.25)]">
        <div className="border-b border-red-500/40 bg-red-950/30 px-4 py-3">
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
            {t('modals.weaponMaint.alertPrefix', { message: t('modals.weaponMaint.alertMessage') })}
          </p>
          <p className="mt-2 font-mono-technical text-[10px] uppercase text-accent">
            [{weaponStokKodu(String(weapon.id))}] {weaponDisplayName(weapon)}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
          <p className="font-mono-technical text-[8px] uppercase text-app-text/55">
            {t('modals.weaponMaint.lockHint')}
          </p>
          <label className="block space-y-1">
            <span className="font-mono-technical text-[8px] font-bold uppercase text-app-text/55">
              {t('modals.weaponMaint.maintType')}
            </span>
            <select className={selectClass} value={maintType} onChange={(e) => setMaintType(e.target.value)} required>
              {maintTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="font-mono-technical text-[8px] font-bold uppercase text-app-text/55">
                {t('modals.weaponMaint.date')}
              </span>
              <input
                type="date"
                className={dateClass}
                value={maintDate}
                max={todayIsoDate()}
                onChange={(e) => setMaintDate(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="font-mono-technical text-[8px] font-bold uppercase text-app-text/55">
                {t('modals.weaponMaint.cleanedBy')}
              </span>
              <input
                className={inputClass}
                value={cleanedBy}
                onChange={(e) => setCleanedBy(e.target.value)}
                placeholder={t('modals.weaponMaint.cleanedByPlaceholder')}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-mono-technical text-[8px] font-bold uppercase text-app-text/55">
              {t('modals.weaponMaint.note')}
            </span>
            <textarea
              className={`${inputClass} min-h-[4rem] resize-y`}
              value={maintNote}
              onChange={(e) => setMaintNote(e.target.value)}
              placeholder={t('modals.weaponMaint.notePlaceholder')}
            />
          </label>
          {error ? (
            <p className="text-center font-mono-technical text-[9px] font-bold uppercase text-red-400">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded border border-accent/55 bg-accent/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent disabled:opacity-40"
          >
            {saving ? t('common.saving') : t('modals.weaponMaint.confirm')}
          </button>
        </form>
      </TacticalPanel>
    </div>
  )
}
