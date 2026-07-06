import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  CircleDot,
  Crosshair,
  Focus,
  Ruler,
  SlidersHorizontal,
  User,
  Wind,
} from 'lucide-react'
import InfoTooltip from '../shared/InfoTooltip.jsx'
import ClickUnitSystemToggle from '../shared/ClickUnitSystemToggle.jsx'
import {
  InventorySectionLockBar,
  InventoryUnlockModal,
  OverrideMarker,
  lockedInputClass,
} from './InventoryLockedFormHelpers.jsx'
import { parseClickUnitSystem } from '../../lib/clickUnitSystem.js'
import {
  isFieldInventoryLocked,
  isFieldInventoryOverridden,
  sectionHasInventoryLocks,
} from '../../lib/inventoryFillLocks.js'

const labelClass =
  'flex items-center gap-1 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-app-text/55'
const inputClass =
  'w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 font-mono-technical text-xs text-slate-100 outline-none focus:border-emerald-500/50'

/** @typedef {'profile' | 'ammo' | 'weapon' | 'optic' | 'env' | 'advanced' | 'range'} FormSectionId */

const DEFAULT_OPEN = /** @type {Record<FormSectionId, boolean>} */ ({
  profile: true,
  ammo: false,
  weapon: false,
  optic: false,
  env: false,
  advanced: false,
  range: false,
})

/**
 * @param {{
 *   id: FormSectionId
 *   title: string
 *   icon: import('lucide-react').LucideIcon
 *   open: boolean
 *   onToggle: (id: FormSectionId) => void
 *   termKey?: string
 *   children: import('react').ReactNode
 * }} props
 */
function FormAccordionSection({ id, title, icon: Icon, open, onToggle, termKey, children }) {
  return (
    <section className="overflow-hidden rounded border border-white/10 bg-black/30">
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border-l-2 border-amber-500/80 px-3 py-2.5 pl-2.5 text-left font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400/95"
        onClick={() => onToggle(id)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-amber-500/75" strokeWidth={2} aria-hidden />
          <span className="truncate">{title}</span>
          {termKey ? <InfoTooltip termKey={termKey} /> : null}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-app-text/45 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? <div className="space-y-2 border-t border-white/10 px-3 py-3">{children}</div> : null}
    </section>
  )
}

/**
 * @param {{ label: string, termKey?: string, showOverride?: boolean, children: import('react').ReactNode }} props
 */
function Field({ label, termKey, showOverride = false, children }) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>
        {showOverride ? <OverrideMarker show /> : null}
        {label}
        {termKey ? <InfoTooltip termKey={termKey} /> : null}
      </span>
      {children}
    </label>
  )
}

/**
 * @param {Record<string, unknown>} ammo
 */
function sectionAmmoHasData(ammo) {
  return (
    Number(ammo.bulletWeight) > 0 ||
    Number(ammo.bulletDiameter) > 0 ||
    Number(ammo.muzzleVelocity) > 0 ||
    Number(ammo.ballisticCoefficient) > 0
  )
}

/**
 * @param {Record<string, unknown>} weapon
 */
function sectionWeaponHasData(weapon) {
  return (
    weapon.barrelLength != null ||
    Boolean(weapon.twistRate) ||
    (Number(weapon.sightHeight) > 0 && Number(weapon.sightHeight) !== 5) ||
    (Number(weapon.zeroDistance) > 0 && Number(weapon.zeroDistance) !== 100)
  )
}

/**
 * @param {Record<string, unknown>} optic
 */
function sectionOpticHasData(optic) {
  return (
    Boolean(parseClickUnitSystem(optic.clickUnitSystem)) ||
    Boolean(optic.magnification) ||
    Boolean(optic.reticleType) ||
    Number(optic.clickValueMoa) > 0 ||
    Number(optic.clickValueMrad) > 0 ||
    Boolean(optic.ffpSfp)
  )
}

/**
 * @param {Record<string, unknown>} env
 */
function sectionEnvHasData(env) {
  return (
    Number(env.temperatureC) !== 15 ||
    Number(env.pressureHpa) !== 1013.25 ||
    Number(env.humidityPercent) !== 0 ||
    Number(env.altitudeM) !== 0 ||
    Number(env.windSpeed) !== 0 ||
    env.pressureType !== 'station' ||
    env.windSpeedUnit !== 'mph' ||
    Number(env.windAngleDegrees) !== 90
  )
}

/**
 * @param {Record<string, unknown>} advanced
 */
function sectionAdvancedHasData(advanced) {
  return (
    Boolean(advanced.coriolisEnabled) ||
    advanced.latitude != null ||
    advanced.azimuthDegrees != null
  )
}

/**
 * @param {{
 *   form: Record<string, unknown>
 *   env: Record<string, unknown>
 *   rangeMin: number
 *   rangeMax: number
 *   rangeStep: number
 *   selectedProfileId: string
 *   inventoryFillLocks?: import('../../lib/inventoryFillLocks.js').InventoryFillLockState | null
 * }} input
 */
function computeAutoExpandFlags({
  form,
  env,
  rangeMin,
  rangeMax,
  rangeStep,
  selectedProfileId,
  inventoryFillLocks = null,
}) {
  const weapon = /** @type {Record<string, unknown>} */ (form.weapon ?? {})
  const optic = /** @type {Record<string, unknown>} */ (form.optic ?? {})
  const ammo = /** @type {Record<string, unknown>} */ (form.ammo ?? {})
  const advanced = /** @type {Record<string, unknown>} */ (form.advanced ?? {})
  const armoryLocked = Boolean(inventoryFillLocks?.active)

  return {
    profile: Boolean(selectedProfileId || form.linkedWeaponId || form.linkedAmmoId),
    ammo: armoryLocked ? false : sectionAmmoHasData(ammo),
    weapon: armoryLocked ? false : sectionWeaponHasData(weapon),
    optic: armoryLocked ? false : sectionOpticHasData(optic),
    env: sectionEnvHasData(env),
    advanced: sectionAdvancedHasData(advanced),
    range: rangeMin !== 100 || rangeMax !== 1500 || rangeStep !== 100,
  }
}

/**
 * @param {{
 *   form: Record<string, unknown>
 *   env: Record<string, unknown>
 *   onFormChange: (patch: Record<string, unknown>) => void
 *   onEnvChange: (patch: Record<string, unknown>) => void
 *   rangeMin: number
 *   rangeMax: number
 *   rangeStep: number
 *   onRangeMin: (v: number) => void
 *   onRangeMax: (v: number) => void
 *   onRangeStep: (v: number) => void
 *   profiles: Record<string, unknown>[]
 *   selectedProfileId: string
 *   onSelectProfile: (id: string) => void
 *   onNewProfile: () => void
 *   onSaveProfile: () => void
 *   onArmoryFill: () => void
 *   onCalculate: () => void
 *   calculating: boolean
 *   profileSaving: boolean
 *   autoExpandTrigger?: number
 *   armoryFillRevision?: number
 *   inventoryFillLocks?: import('../../lib/inventoryFillLocks.js').InventoryFillLockState
 *   onUnlockInventorySection?: (group: 'weapon' | 'optic' | 'ammo') => void
 *   onMarkInventoryOverrides?: (paths: string[]) => void
 * }} props
 */
export default function BallisticFormPanel({
  form,
  env,
  onFormChange,
  onEnvChange,
  rangeMin,
  rangeMax,
  rangeStep,
  onRangeMin,
  onRangeMax,
  onRangeStep,
  profiles,
  selectedProfileId,
  onSelectProfile,
  onNewProfile,
  onSaveProfile,
  onArmoryFill,
  onCalculate,
  calculating,
  profileSaving,
  autoExpandTrigger = 0,
  armoryFillRevision = 0,
  inventoryFillLocks = null,
  onUnlockInventorySection,
  onMarkInventoryOverrides,
}) {
  const weapon = /** @type {Record<string, unknown>} */ (form.weapon ?? {})
  const optic = /** @type {Record<string, unknown>} */ (form.optic ?? {})
  const ammo = /** @type {Record<string, unknown>} */ (form.ammo ?? {})
  const advanced = /** @type {Record<string, unknown>} */ (form.advanced ?? {})

  const [openSections, setOpenSections] = useState(DEFAULT_OPEN)
  const [unlockTarget, setUnlockTarget] = useState(/** @type {'weapon' | 'optic' | 'ammo' | null} */ (null))
  const userToggledRef = useRef(/** @type {Set<FormSectionId>} */ (new Set()))
  const prevAutoExpandTriggerRef = useRef(0)
  const expandContextRef = useRef({
    form,
    env,
    rangeMin,
    rangeMax,
    rangeStep,
    selectedProfileId,
    inventoryFillLocks,
  })
  expandContextRef.current = {
    form,
    env,
    rangeMin,
    rangeMax,
    rangeStep,
    selectedProfileId,
    inventoryFillLocks,
  }

  const applyAutoExpand = useCallback((resetUserToggles) => {
    if (resetUserToggles) userToggledRef.current.clear()

    const flags = computeAutoExpandFlags(expandContextRef.current)

    setOpenSections((prev) => {
      /** @type {Record<FormSectionId, boolean>} */
      const next = { ...prev }
      for (const [id, shouldOpen] of Object.entries(flags)) {
        const sectionId = /** @type {FormSectionId} */ (id)
        if (userToggledRef.current.has(sectionId)) continue
        if (shouldOpen) next[sectionId] = true
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (autoExpandTrigger <= prevAutoExpandTriggerRef.current) return
    prevAutoExpandTriggerRef.current = autoExpandTrigger
    applyAutoExpand(true)
  }, [autoExpandTrigger, applyAutoExpand])

  useEffect(() => {
    if (armoryFillRevision <= 0) return
    for (const id of /** @type {FormSectionId[]} */ (['ammo', 'weapon', 'optic'])) {
      userToggledRef.current.delete(id)
    }
    setOpenSections((prev) => ({
      ...prev,
      profile: true,
      ammo: false,
      weapon: false,
      optic: false,
    }))
  }, [armoryFillRevision])

  const toggleSection = (id) => {
    userToggledRef.current.add(id)
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const patchWeapon = (p) => onFormChange({ weapon: { ...weapon, ...p } })
  const patchOptic = (p) => onFormChange({ optic: { ...optic, ...p } })
  const patchAmmo = (p) => onFormChange({ ammo: { ...ammo, ...p } })
  const patchAdvanced = (p) => onFormChange({ advanced: { ...advanced, ...p } })

  /** @param {'weapon' | 'optic' | 'ammo'} group @param {string} field */
  const markIfOverridden = (group, field) => {
    if (
      inventoryFillLocks?.active &&
      inventoryFillLocks[group]?.[field] &&
      inventoryFillLocks.unlocked?.[group]
    ) {
      onMarkInventoryOverrides?.([`${group}.${field}`])
    }
  }

  /** @param {'weapon' | 'optic' | 'ammo'} group @param {string} field */
  const fieldLocked = (group, field) => isFieldInventoryLocked(inventoryFillLocks, group, field)

  /** @param {'weapon' | 'optic' | 'ammo'} group @param {string} field */
  const fieldOverridden = (group, field) => isFieldInventoryOverridden(inventoryFillLocks, group, field)

  /** @param {'weapon' | 'optic' | 'ammo'} group @param {string} field @param {string} inputClassName */
  const lockedFieldClass = (group, field, inputClassName = inputClass) =>
    fieldLocked(group, field) ? `${inputClassName} ${lockedInputClass}` : inputClassName

  /** @param {'weapon' | 'optic' | 'ammo'} group @param {string} field */
  const inventoryInputProps = (group, field) => {
    const locked = fieldLocked(group, field)
    return {
      readOnly: locked,
      disabled: locked,
      'data-inventory-locked': locked ? 'true' : undefined,
      'aria-readonly': locked ? true : undefined,
      className: lockedFieldClass(group, field),
    }
  }

  /** @param {'weapon' | 'optic' | 'ammo'} group */
  const showSectionLockBar = (group) =>
    openSections[group] &&
    sectionHasInventoryLocks(inventoryFillLocks, group) &&
    !inventoryFillLocks?.unlocked?.[group]

  const handleClickUnitChange = (unit) => {
    if (fieldLocked('optic', 'clickUnitSystem')) return
    /** @type {Record<string, unknown>} */
    const patchValues = { clickUnitSystem: unit }
    if (unit === 'MOA') {
      patchValues.clickValueMrad = null
    } else if (unit === 'MRAD') {
      patchValues.clickValueMoa = null
    } else {
      patchValues.clickValueMoa = null
      patchValues.clickValueMrad = null
    }
    patchOptic(patchValues)
    markIfOverridden('optic', 'clickUnitSystem')
    if (unit === 'MOA') markIfOverridden('optic', 'clickValueMoa')
    if (unit === 'MRAD') markIfOverridden('optic', 'clickValueMrad')
  }

  const clickUnit = parseClickUnitSystem(optic.clickUnitSystem)

  return (
    <div className="flex flex-col gap-3">
      <InventoryUnlockModal
        open={Boolean(unlockTarget)}
        onCancel={() => setUnlockTarget(null)}
        onConfirm={() => {
          if (unlockTarget) onUnlockInventorySection?.(unlockTarget)
          setUnlockTarget(null)
        }}
      />
      <FormAccordionSection
        id="profile"
        title="Profil"
        icon={User}
        open={openSections.profile}
        onToggle={toggleSection}
      >
        <select
          className={inputClass}
          value={selectedProfileId}
          onChange={(e) => onSelectProfile(e.target.value)}
        >
          <option value="">— Profil seç —</option>
          {profiles.map((p) => (
            <option key={String(p.id)} value={String(p.id)}>
              {String(p.profileName || p.id)}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={onNewProfile}>
            Yeni Profil
          </button>
          <button type="button" className={btnSecondary} onClick={onSaveProfile} disabled={profileSaving}>
            {profileSaving ? 'Kaydediliyor…' : 'Profili Kaydet'}
          </button>
          <button type="button" className={btnAccent} onClick={onArmoryFill}>
            Silahtan Doldur
          </button>
        </div>
        <Field label="Profil adı">
          <input
            className={inputClass}
            value={String(form.profileName ?? '')}
            onChange={(e) => onFormChange({ profileName: e.target.value })}
          />
        </Field>
      </FormAccordionSection>

      <FormAccordionSection
        id="ammo"
        title="Mermi"
        icon={CircleDot}
        open={openSections.ammo}
        onToggle={toggleSection}
      >
        {showSectionLockBar('ammo') ? (
          <InventorySectionLockBar onUnlock={() => setUnlockTarget('ammo')} />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Ağırlık (gr)" showOverride={fieldOverridden('ammo', 'bulletWeight')}>
            <input
              type="number"
              {...inventoryInputProps('ammo', 'bulletWeight')}
              value={ammo.bulletWeight ?? ''}
              onChange={(e) => {
                if (fieldLocked('ammo', 'bulletWeight')) return
                patchAmmo({ bulletWeight: Number(e.target.value) })
                markIfOverridden('ammo', 'bulletWeight')
              }}
            />
          </Field>
          <Field label="Çap (in)" showOverride={fieldOverridden('ammo', 'bulletDiameter')}>
            <input
              type="number"
              step="0.001"
              {...inventoryInputProps('ammo', 'bulletDiameter')}
              value={ammo.bulletDiameter ?? ''}
              onChange={(e) => {
                if (fieldLocked('ammo', 'bulletDiameter')) return
                patchAmmo({ bulletDiameter: Number(e.target.value) })
                markIfOverridden('ammo', 'bulletDiameter')
              }}
            />
          </Field>
          <Field label="Namlu hızı (fps)" termKey="muzzleVelocity" showOverride={fieldOverridden('ammo', 'muzzleVelocity')}>
            <input
              type="number"
              {...inventoryInputProps('ammo', 'muzzleVelocity')}
              value={ammo.muzzleVelocity ?? ''}
              onChange={(e) => {
                if (fieldLocked('ammo', 'muzzleVelocity')) return
                patchAmmo({ muzzleVelocity: Number(e.target.value) })
                markIfOverridden('ammo', 'muzzleVelocity')
              }}
            />
          </Field>
          <Field label="BC" termKey="bc" showOverride={fieldOverridden('ammo', 'ballisticCoefficient')}>
            <input
              type="number"
              step="0.001"
              {...inventoryInputProps('ammo', 'ballisticCoefficient')}
              value={ammo.ballisticCoefficient ?? ''}
              onChange={(e) => {
                if (fieldLocked('ammo', 'ballisticCoefficient')) return
                patchAmmo({ ballisticCoefficient: Number(e.target.value) })
                markIfOverridden('ammo', 'ballisticCoefficient')
              }}
            />
          </Field>
        </div>
        <Field label="Drag modeli" termKey="g1G7DragModel" showOverride={fieldOverridden('ammo', 'bcModel')}>
          <div className="flex gap-2">
            {['G7', 'G1'].map((m) => (
              <button
                key={m}
                type="button"
                disabled={fieldLocked('ammo', 'bcModel')}
                className={ammo.bcModel === m ? btnAccent : btnSecondary}
                onClick={() => {
                  if (fieldLocked('ammo', 'bcModel')) return
                  patchAmmo({ bcModel: m })
                  markIfOverridden('ammo', 'bcModel')
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
      </FormAccordionSection>

      <FormAccordionSection
        id="weapon"
        title="Silah"
        icon={Crosshair}
        open={openSections.weapon}
        onToggle={toggleSection}
      >
        {showSectionLockBar('weapon') ? (
          <InventorySectionLockBar onUnlock={() => setUnlockTarget('weapon')} />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sight height (cm)" termKey="sightHeight" showOverride={fieldOverridden('weapon', 'sightHeight')}>
            <input
              type="number"
              step="0.1"
              {...inventoryInputProps('weapon', 'sightHeight')}
              value={weapon.sightHeight ?? ''}
              onChange={(e) => {
                if (fieldLocked('weapon', 'sightHeight')) return
                patchWeapon({ sightHeight: Number(e.target.value) })
                markIfOverridden('weapon', 'sightHeight')
              }}
            />
          </Field>
          <Field label="Zero (m)" termKey="zeroDistance">
            <input
              type="number"
              className={inputClass}
              value={weapon.zeroDistance ?? ''}
              onChange={(e) => patchWeapon({ zeroDistance: Number(e.target.value) })}
            />
          </Field>
          <Field label="Namlu uz. (in)" showOverride={fieldOverridden('weapon', 'barrelLength')}>
            <input
              type="number"
              step="0.1"
              {...inventoryInputProps('weapon', 'barrelLength')}
              value={weapon.barrelLength ?? ''}
              onChange={(e) => {
                if (fieldLocked('weapon', 'barrelLength')) return
                patchWeapon({ barrelLength: e.target.value ? Number(e.target.value) : null })
                markIfOverridden('weapon', 'barrelLength')
              }}
            />
          </Field>
          <Field label="Yiv devri" termKey="twistRate" showOverride={fieldOverridden('weapon', 'twistRate')}>
            <input
              {...inventoryInputProps('weapon', 'twistRate')}
              placeholder="1:8"
              value={weapon.twistRate ?? ''}
              onChange={(e) => {
                if (fieldLocked('weapon', 'twistRate')) return
                patchWeapon({ twistRate: e.target.value || null })
                markIfOverridden('weapon', 'twistRate')
              }}
            />
          </Field>
        </div>
      </FormAccordionSection>

      <FormAccordionSection
        id="optic"
        title="Optik"
        icon={Focus}
        open={openSections.optic}
        onToggle={toggleSection}
      >
        {showSectionLockBar('optic') ? (
          <InventorySectionLockBar onUnlock={() => setUnlockTarget('optic')} />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Büyütme" showOverride={fieldOverridden('optic', 'magnification')}>
            <input
              {...inventoryInputProps('optic', 'magnification')}
              value={optic.magnification ?? ''}
              onChange={(e) => {
                if (fieldLocked('optic', 'magnification')) return
                patchOptic({ magnification: e.target.value || null })
                markIfOverridden('optic', 'magnification')
              }}
            />
          </Field>
          <Field label="Reticle" termKey="reticleType" showOverride={fieldOverridden('optic', 'reticleType')}>
            <input
              {...inventoryInputProps('optic', 'reticleType')}
              value={optic.reticleType ?? ''}
              onChange={(e) => {
                if (fieldLocked('optic', 'reticleType')) return
                patchOptic({ reticleType: e.target.value || null })
                markIfOverridden('optic', 'reticleType')
              }}
            />
          </Field>
        </div>
        <ClickUnitSystemToggle
          value={clickUnit}
          onChange={handleClickUnitChange}
          disabled={fieldLocked('optic', 'clickUnitSystem')}
        />
        {clickUnit === 'MOA' ? (
          <Field label="Tık Değeri (MOA)" termKey="moaClicks" showOverride={fieldOverridden('optic', 'clickValueMoa')}>
            <input
              type="number"
              step="0.125"
              {...inventoryInputProps('optic', 'clickValueMoa')}
              value={optic.clickValueMoa ?? ''}
              onChange={(e) => {
                if (fieldLocked('optic', 'clickValueMoa')) return
                patchOptic({ clickValueMoa: e.target.value ? Number(e.target.value) : null })
                markIfOverridden('optic', 'clickValueMoa')
              }}
            />
          </Field>
        ) : null}
        {clickUnit === 'MRAD' ? (
          <Field label="Tık Değeri (MRAD)" termKey="mradClicks" showOverride={fieldOverridden('optic', 'clickValueMrad')}>
            <input
              type="number"
              step="0.05"
              {...inventoryInputProps('optic', 'clickValueMrad')}
              value={optic.clickValueMrad ?? ''}
              onChange={(e) => {
                if (fieldLocked('optic', 'clickValueMrad')) return
                patchOptic({ clickValueMrad: e.target.value ? Number(e.target.value) : null })
                markIfOverridden('optic', 'clickValueMrad')
              }}
            />
          </Field>
        ) : null}
        {clickUnit ? null : (
          <p className="font-mono-technical text-[9px] text-app-text/40">
            Tık değeri girmek için önce birim sistemi seçin.
          </p>
        )}
        <Field label="FFP / SFP" termKey="ffpSfp" showOverride={fieldOverridden('optic', 'ffpSfp')}>
          <select
            {...inventoryInputProps('optic', 'ffpSfp')}
            value={optic.ffpSfp ?? ''}
            onChange={(e) => {
              if (fieldLocked('optic', 'ffpSfp')) return
              patchOptic({ ffpSfp: e.target.value || null })
              markIfOverridden('optic', 'ffpSfp')
            }}
          >
            <option value="">—</option>
            <option value="FFP">FFP</option>
            <option value="SFP">SFP</option>
          </select>
        </Field>
      </FormAccordionSection>

      <FormAccordionSection
        id="env"
        title="Çevre"
        icon={Wind}
        open={openSections.env}
        onToggle={toggleSection}
        termKey="airDensity"
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sıcaklık °C">
            <input
              type="number"
              className={inputClass}
              value={env.temperatureC ?? ''}
              onChange={(e) => onEnvChange({ temperatureC: Number(e.target.value) })}
            />
          </Field>
          <Field label="Basınç hPa" termKey="pressureType">
            <input
              type="number"
              className={inputClass}
              value={env.pressureHpa ?? ''}
              onChange={(e) => onEnvChange({ pressureHpa: Number(e.target.value) })}
            />
          </Field>
          <Field label="Basınç modu" termKey="pressureType">
            <div className="flex flex-wrap gap-1">
              {[
                ['station', 'İstasyon'],
                ['sea-level', 'Deniz sv.'],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  className={env.pressureType === v ? btnAccent : btnSecondary}
                  onClick={() => onEnvChange({ pressureType: v })}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Nem %">
            <input
              type="number"
              className={inputClass}
              value={env.humidityPercent ?? ''}
              onChange={(e) => onEnvChange({ humidityPercent: Number(e.target.value) })}
            />
          </Field>
          <Field label="Rakım m">
            <input
              type="number"
              className={inputClass}
              value={env.altitudeM ?? ''}
              onChange={(e) => onEnvChange({ altitudeM: Number(e.target.value) })}
            />
          </Field>
          <Field label="Rüzgar" termKey="crosswind">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={env.windSpeed ?? ''}
              onChange={(e) => onEnvChange({ windSpeed: Number(e.target.value) })}
            />
          </Field>
          <Field label="Rüzgar birimi">
            <div className="flex gap-1">
              {['mph', 'mps'].map((u) => (
                <button
                  key={u}
                  type="button"
                  className={env.windSpeedUnit === u ? btnAccent : btnSecondary}
                  onClick={() => onEnvChange({ windSpeedUnit: u })}
                >
                  {u}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Rüzgar açı °" termKey="crosswind">
            <input
              type="number"
              className={inputClass}
              value={env.windAngleDegrees ?? 90}
              onChange={(e) => onEnvChange({ windAngleDegrees: Number(e.target.value) })}
            />
          </Field>
        </div>
      </FormAccordionSection>

      <FormAccordionSection
        id="advanced"
        title="Gelişmiş"
        icon={SlidersHorizontal}
        open={openSections.advanced}
        onToggle={toggleSection}
        termKey="coriolis"
      >
        <label className="flex items-center gap-2 font-mono-technical text-xs text-slate-300">
          <input
            type="checkbox"
            checked={Boolean(advanced.coriolisEnabled)}
            onChange={(e) => patchAdvanced({ coriolisEnabled: e.target.checked })}
          />
          Coriolis etkin
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Enlem" termKey="coriolis">
            <input
              type="number"
              className={inputClass}
              value={advanced.latitude ?? ''}
              onChange={(e) =>
                patchAdvanced({ latitude: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
          <Field label="Azimut °" termKey="coriolis">
            <input
              type="number"
              className={inputClass}
              value={advanced.azimuthDegrees ?? ''}
              onChange={(e) =>
                patchAdvanced({ azimuthDegrees: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
        </div>
      </FormAccordionSection>

      <FormAccordionSection
        id="range"
        title="Hedef aralığı"
        icon={Ruler}
        open={openSections.range}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-3 gap-2">
          <Field label="Min m">
            <input
              type="number"
              className={inputClass}
              value={rangeMin}
              onChange={(e) => onRangeMin(Number(e.target.value))}
            />
          </Field>
          <Field label="Max m">
            <input
              type="number"
              className={inputClass}
              value={rangeMax}
              onChange={(e) => onRangeMax(Number(e.target.value))}
            />
          </Field>
          <Field label="Adım m">
            <input
              type="number"
              className={inputClass}
              value={rangeStep}
              onChange={(e) => onRangeStep(Number(e.target.value))}
            />
          </Field>
        </div>
        <button type="button" className={`${btnAccent} w-full py-2.5`} onClick={onCalculate} disabled={calculating}>
          {calculating ? 'Hesaplanıyor…' : 'Hesapla'}
        </button>
      </FormAccordionSection>
    </div>
  )
}

const btnSecondary =
  'rounded border border-white/15 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/75 hover:bg-white/5'
const btnAccent =
  'rounded border border-emerald-500/45 bg-emerald-500/10 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/15'
