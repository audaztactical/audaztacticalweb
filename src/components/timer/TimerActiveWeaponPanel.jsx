import { useTranslation } from 'react-i18next'
import { Crosshair } from 'lucide-react'
import { invStr, getTacticalCategory } from '../../lib/inventoryIlws'
import { labelTacticalCategory } from '../../lib/armoryDisplayText'
import { weaponDisplayName } from '../../lib/weaponIlws'

/**
 * Timer — aktif silah seçimi UI (state: useTimerActiveWeapon).
 * @param {{
 *   controller: ReturnType<typeof import('../../hooks/useTimerActiveWeapon').useTimerActiveWeapon>
 *   className?: string
 *   disabled?: boolean
 * }} props
 */
export default function TimerActiveWeaponPanel({ controller, className = '', disabled = false }) {
  const { t, i18n } = useTranslation('timer')
  const {
    weapons,
    weaponId,
    selectWeapon,
    selectedWeapon,
    loading,
    ready,
    isConnected,
    hasActiveWeapon,
  } = controller

  const categoryLabel = selectedWeapon
    ? labelTacticalCategory(getTacticalCategory(selectedWeapon))
    : '—'
  const categoryCode = selectedWeapon ? getTacticalCategory(selectedWeapon) : '—'
  const brand = selectedWeapon ? invStr(selectedWeapon.brand).trim() || '—' : '—'
  const serial = selectedWeapon
    ? invStr(selectedWeapon.serialNo).trim() || invStr(selectedWeapon.serial).trim() || '—'
    : '—'
  const calibre = selectedWeapon ? invStr(selectedWeapon.calibre).trim() || '—' : '—'

  return (
    <section
      className={[
        'rounded-sm border px-3 py-3 sm:px-4 sm:py-4',
        hasActiveWeapon
          ? 'border-zinc-600/55 bg-[#0a0a0b]/90'
          : 'border-amber-500/45 bg-amber-950/25',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={t('activeWeapon.aria')}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <Crosshair className="size-4 shrink-0 text-[#facc15] sm:size-5" strokeWidth={1.75} aria-hidden />
        <p className="font-mono text-sm font-bold uppercase tracking-[0.14em] text-[#facc15] sm:text-base sm:tracking-[0.16em]">
          {t('activeWeapon.title')}
        </p>
      </div>

      {!hasActiveWeapon ? (
        <p
          className="mb-3 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 font-mono text-[11px] font-bold uppercase leading-relaxed tracking-[0.12em] text-amber-100 sm:text-xs"
          role="alert"
        >
          {t('activeWeapon.requiredBanner')}
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-300 sm:text-xs">
          {t('activeWeapon.selectLabel')}
        </span>
        <select
          className="dossier-blood-select w-full min-h-11 rounded-sm border border-zinc-600/60 bg-[#0a0a0b] px-2.5 py-2.5 font-mono text-sm text-app-text outline-none focus:border-[#facc15]/45 disabled:opacity-50 sm:min-h-10 sm:text-[13px]"
          value={weaponId}
          disabled={disabled || loading || !ready}
          onChange={(e) => selectWeapon(e.target.value)}
          required
          aria-required="true"
        >
          <option value="">{t('activeWeapon.placeholder')}</option>
          {weapons.map((w) => (
            <option key={String(w.id)} value={String(w.id)}>
              {weaponDisplayName(w)}
              {invStr(w.brand).trim() ? ` · ${invStr(w.brand).trim()}` : ''}
              {invStr(w.calibre).trim() ? ` · ${invStr(w.calibre).trim()}` : ''}
            </option>
          ))}
        </select>
      </label>

      {!loading && ready && weapons.length === 0 ? (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400 sm:text-xs">
          {t('activeWeapon.empty')}
        </p>
      ) : null}

      {selectedWeapon ? (
        <div
          className="mt-3 grid grid-cols-2 gap-2.5 border-t border-zinc-700/80 pt-3 sm:grid-cols-4 sm:gap-3"
          key={`${String(selectedWeapon.id)}-${i18n.language}`}
        >
          <DetailCell label={t('activeWeapon.fields.brand')} value={brand} />
          <DetailCell label={t('activeWeapon.fields.serial')} value={serial} />
          <DetailCell label={t('activeWeapon.fields.calibre')} value={calibre} />
          <DetailCell
            label={t('activeWeapon.fields.category')}
            value={`${categoryLabel} · ${categoryCode}`}
          />
        </div>
      ) : null}

      {selectedWeapon && isConnected ? (
        <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-400 sm:text-xs">
          {t('activeWeapon.modeSent', { code: categoryCode })}
        </p>
      ) : null}
      {selectedWeapon && !isConnected ? (
        <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400 sm:text-xs">
          {t('activeWeapon.modePending')}
        </p>
      ) : null}
    </section>
  )
}

/**
 * @param {{ label: string, value: string }} props
 */
function DetailCell({ label, value }) {
  return (
    <div className="min-w-0 rounded-sm border border-zinc-600/80 bg-zinc-900/55 px-2.5 py-2 sm:px-3 sm:py-2.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 sm:text-[11px]">
        {label}
      </p>
      <p
        className="mt-1 truncate font-mono text-sm font-semibold tabular-nums text-[#facc15] sm:text-base"
        title={value}
      >
        {value}
      </p>
    </div>
  )
}
