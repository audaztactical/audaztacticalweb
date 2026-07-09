import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
} from './InventoryLockedFormHelpers.jsx'
import { getInventoryFieldControlProps } from '../../lib/inventoryFieldControl.js'
import { parseClickUnitSystem } from '../../lib/clickUnitSystem.js'
import {
  armorySessionGroupHasLocks,
  isArmorySessionFieldLocked,
  isArmorySessionFieldOverridden,
} from '../../lib/inventoryFillLocks.js'
import { labelDragModel, labelReticlePlane } from '../../lib/ballisticsDisplayText.js'

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
 *   armorySession?: import('../../lib/inventoryFillLocks.js').ArmorySessionState | null
 * }} input
 */
function computeAutoExpandFlags({
  form,
  env,
  rangeMin,
  rangeMax,
  rangeStep,
  selectedProfileId,
  armorySession = null,
}) {
  const weapon = /** @type {Record<string, unknown>} */ (form.weapon ?? {})
  const optic = /** @type {Record<string, unknown>} */ (form.optic ?? {})
  const ammo = /** @type {Record<string, unknown>} */ (form.ammo ?? {})
  const advanced = /** @type {Record<string, unknown>} */ (form.advanced ?? {})
  const armoryLocked = Boolean(armorySession?.lockedFields && Object.keys(armorySession.lockedFields).length > 0)

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
 *   onSaveProfile: () => void
 *   onArmoryFill: () => void
 *   onCalculate: () => void
 *   calculating: boolean
 *   profileSaving: boolean
 *   autoExpandTrigger?: number
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
  onSaveProfile,
  onArmoryFill,
  onCalculate,
  calculating,
  profileSaving,
  autoExpandTrigger = 0,
  onUnlockInventorySection,
  onMarkInventoryOverrides,
}) {
  const { t } = useTranslation('ballistics')
  const weapon = /** @type {Record<string, unknown>} */ (form.weapon ?? {})
  const optic = /** @type {Record<string, unknown>} */ (form.optic ?? {})
  const ammo = /** @type {Record<string, unknown>} */ (form.ammo ?? {})
  const advanced = /** @type {Record<string, unknown>} */ (form.advanced ?? {})
  const armorySession = /** @type {import('../../lib/inventoryFillLocks.js').ArmorySessionState | null | undefined} */ (
    form.armorySession
  )

  const [openSections, setOpenSections] = useState(DEFAULT_OPEN)
  const [unlockTarget, setUnlockTarget] = useState(/** @type {'weapon' | 'optic' | 'ammo' | null} */ (null))
  const userToggledRef = useRef(/** @type {Set<FormSectionId>} */ (new Set()))
  const prevAutoExpandTriggerRef = useRef(0)
  const prevArmoryRevisionRef = useRef(0)
  const expandContextRef = useRef({
    form,
    env,
    rangeMin,
    rangeMax,
    rangeStep,
    selectedProfileId,
    armorySession,
  })
  expandContextRef.current = {
    form,
    env,
    rangeMin,
    rangeMax,
    rangeStep,
    selectedProfileId,
    armorySession,
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
    const revision = armorySession?.revision ?? 0
    if (revision <= prevArmoryRevisionRef.current) return
    prevArmoryRevisionRef.current = revision
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
  }, [armorySession?.revision])

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
      armorySession?.lockedFields?.[`${group}.${field}`] &&
      armorySession.unlocked?.[group]
    ) {
      onMarkInventoryOverrides?.([`${group}.${field}`])
    }
  }

  /** @param {'weapon' | 'optic' | 'ammo'} group @param {string} field */
  const fieldLocked = (group, field) => isArmorySessionFieldLocked(armorySession, group, field)

  /** @param {'weapon' | 'optic' | 'ammo'} group @param {string} field */
  const fieldOverridden = (group, field) => isArmorySessionFieldOverridden(armorySession, group, field)

  /** @param {'weapon' | 'optic' | 'ammo'} group @param {string} field @param {string} label */
  const inventoryFieldProps = (group, field, label) =>
    getInventoryFieldControlProps({ group, field, label, session: armorySession, baseClass: inputClass })

  /** @param {'weapon' | 'optic' | 'ammo'} group */
  const showSectionLockBar = (group) =>
    openSections[group] &&
    armorySessionGroupHasLocks(armorySession, group) &&
    !armorySession?.unlocked?.[group]

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
    <>
      <InventoryUnlockModal
        open={Boolean(unlockTarget)}
        onCancel={() => setUnlockTarget(null)}
        onConfirm={() => {
          if (unlockTarget) onUnlockInventorySection?.(unlockTarget)
          setUnlockTarget(null)
        }}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain pb-1 [-webkit-overflow-scrolling:touch]">
      <FormAccordionSection
        id="profile"
        title={t('form.sections.profile')}
        icon={User}
        open={openSections.profile}
        onToggle={toggleSection}
      >
        <select
          className={inputClass}
          value={selectedProfileId}
          onChange={(e) => onSelectProfile(e.target.value)}
        >
          <option value="">{t('form.selectProfile')}</option>
          {profiles.map((p) => (
            <option key={String(p.id)} value={String(p.id)}>
              {String(p.profileName || p.id)}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={onSaveProfile} disabled={profileSaving}>
            {profileSaving ? t('form.savingProfile') : t('form.saveProfile')}
          </button>
          <button type="button" className={btnArmory} onClick={onArmoryFill}>
            {t('form.armoryFill')}
          </button>
        </div>
        <Field label={t('form.fields.weaponName')}>
          <input
            readOnly
            disabled
            className={`${inputClass} cursor-not-allowed opacity-50 pointer-events-none bg-neutral-800/50`}
            value={String(form.weaponDisplayLabel ?? '')}
            placeholder={t('form.placeholders.weaponName')}
            aria-label={t('form.fields.weaponName')}
          />
        </Field>
        <Field label={t('form.fields.profileName')}>
          <input
            className={inputClass}
            value={String(form.profileName ?? '')}
            onChange={(e) => onFormChange({ profileName: e.target.value })}
            placeholder={t('form.placeholders.profileName')}
            aria-label={t('form.fields.profileName')}
          />
        </Field>
      </FormAccordionSection>

      <FormAccordionSection
        id="ammo"
        title={t('form.sections.ammo')}
        icon={CircleDot}
        open={openSections.ammo}
        onToggle={toggleSection}
      >
        {showSectionLockBar('ammo') ? (
          <InventorySectionLockBar onUnlock={() => setUnlockTarget('ammo')} />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('form.fields.bulletWeight')} showOverride={fieldOverridden('ammo', 'bulletWeight')}>
            <input
              type="number"
              step="1"
              min="0"
              {...inventoryFieldProps('ammo', 'bulletWeight', t('form.fields.bulletWeight'))}
              value={ammo.bulletWeight ?? ''}
              onChange={(e) => {
                if (fieldLocked('ammo', 'bulletWeight')) return
                patchAmmo({ bulletWeight: Number(e.target.value) })
                markIfOverridden('ammo', 'bulletWeight')
              }}
            />
          </Field>
          <Field label={t('form.fields.bulletDiameter')} showOverride={fieldOverridden('ammo', 'bulletDiameter')}>
            <input
              type="number"
              step="0.001"
              min="0"
              {...inventoryFieldProps('ammo', 'bulletDiameter', t('form.fields.bulletDiameter'))}
              value={ammo.bulletDiameter ?? ''}
              onChange={(e) => {
                if (fieldLocked('ammo', 'bulletDiameter')) return
                patchAmmo({ bulletDiameter: Number(e.target.value) })
                markIfOverridden('ammo', 'bulletDiameter')
              }}
            />
          </Field>
          <Field label={t('form.fields.muzzleVelocity')} termKey="muzzleVelocity" showOverride={fieldOverridden('ammo', 'muzzleVelocity')}>
            <input
              type="number"
              step="1"
              min="0"
              {...inventoryFieldProps('ammo', 'muzzleVelocity', t('form.fields.muzzleVelocity'))}
              value={ammo.muzzleVelocity ?? ''}
              onChange={(e) => {
                if (fieldLocked('ammo', 'muzzleVelocity')) return
                patchAmmo({ muzzleVelocity: Number(e.target.value) })
                markIfOverridden('ammo', 'muzzleVelocity')
              }}
            />
          </Field>
          <Field label={t('form.fields.bc')} termKey="bc" showOverride={fieldOverridden('ammo', 'ballisticCoefficient')}>
            <input
              type="number"
              step="0.001"
              min="0"
              {...inventoryFieldProps('ammo', 'ballisticCoefficient', t('form.fields.bc'))}
              value={ammo.ballisticCoefficient ?? ''}
              onChange={(e) => {
                if (fieldLocked('ammo', 'ballisticCoefficient')) return
                patchAmmo({ ballisticCoefficient: Number(e.target.value) })
                markIfOverridden('ammo', 'ballisticCoefficient')
              }}
            />
          </Field>
        </div>
        <Field label={t('form.fields.dragModel')} termKey="g1G7DragModel" showOverride={fieldOverridden('ammo', 'bcModel')}>
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
                {labelDragModel(m)}
              </button>
            ))}
          </div>
        </Field>
      </FormAccordionSection>

      <FormAccordionSection
        id="weapon"
        title={t('form.sections.weapon')}
        icon={Crosshair}
        open={openSections.weapon}
        onToggle={toggleSection}
      >
        {showSectionLockBar('weapon') ? (
          <InventorySectionLockBar onUnlock={() => setUnlockTarget('weapon')} />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('form.fields.sightHeight')} termKey="sightHeight" showOverride={fieldOverridden('weapon', 'sightHeight')}>
            <input
              type="number"
              step="0.1"
              min="0"
              {...inventoryFieldProps('weapon', 'sightHeight', t('form.fields.sightHeight'))}
              value={weapon.sightHeight ?? ''}
              onChange={(e) => {
                if (fieldLocked('weapon', 'sightHeight')) return
                patchWeapon({ sightHeight: Number(e.target.value) })
                markIfOverridden('weapon', 'sightHeight')
              }}
            />
          </Field>
          <Field label={t('form.fields.zeroDistance')} termKey="zeroDistance">
            <input
              type="number"
              step="1"
              min="1"
              className={inputClass}
              value={weapon.zeroDistance ?? ''}
              onChange={(e) => patchWeapon({ zeroDistance: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('form.fields.barrelLength')} showOverride={fieldOverridden('weapon', 'barrelLength')}>
            <input
              type="number"
              step="0.1"
              min="0"
              {...inventoryFieldProps('weapon', 'barrelLength', t('form.fields.barrelLength'))}
              value={weapon.barrelLength ?? ''}
              onChange={(e) => {
                if (fieldLocked('weapon', 'barrelLength')) return
                patchWeapon({ barrelLength: e.target.value ? Number(e.target.value) : null })
                markIfOverridden('weapon', 'barrelLength')
              }}
            />
          </Field>
          <Field label={t('form.fields.twistRate')} termKey="twistRate" showOverride={fieldOverridden('weapon', 'twistRate')}>
            <input
              {...inventoryFieldProps('weapon', 'twistRate', t('form.fields.twistRate'))}
              placeholder={t('form.placeholders.twistRate')}
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
        title={t('form.sections.optic')}
        icon={Focus}
        open={openSections.optic}
        onToggle={toggleSection}
      >
        {showSectionLockBar('optic') ? (
          <InventorySectionLockBar onUnlock={() => setUnlockTarget('optic')} />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('form.fields.magnification')} showOverride={fieldOverridden('optic', 'magnification')}>
            <input
              {...inventoryFieldProps('optic', 'magnification', t('form.fields.magnification'))}
              value={optic.magnification ?? ''}
              onChange={(e) => {
                if (fieldLocked('optic', 'magnification')) return
                patchOptic({ magnification: e.target.value || null })
                markIfOverridden('optic', 'magnification')
              }}
            />
          </Field>
          <Field label={t('form.fields.reticle')} termKey="reticleType" showOverride={fieldOverridden('optic', 'reticleType')}>
            <input
              {...inventoryFieldProps('optic', 'reticleType', t('form.fields.reticle'))}
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
          <Field label={t('form.fields.clickValueMoa')} termKey="moaClicks" showOverride={fieldOverridden('optic', 'clickValueMoa')}>
            <input
              type="number"
              step="0.125"
              min="0"
              {...inventoryFieldProps('optic', 'clickValueMoa', t('form.fields.clickValueMoa'))}
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
          <Field label={t('form.fields.clickValueMrad')} termKey="mradClicks" showOverride={fieldOverridden('optic', 'clickValueMrad')}>
            <input
              type="number"
              step="0.05"
              min="0"
              {...inventoryFieldProps('optic', 'clickValueMrad', t('form.fields.clickValueMrad'))}
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
            {t('form.clickUnitHint')}
          </p>
        )}
        <Field label={t('form.fields.ffpSfp')} termKey="ffpSfp" showOverride={fieldOverridden('optic', 'ffpSfp')}>
          <select
            {...inventoryFieldProps('optic', 'ffpSfp', t('form.fields.ffpSfp'))}
            value={optic.ffpSfp ?? ''}
            onChange={(e) => {
              if (fieldLocked('optic', 'ffpSfp')) return
              patchOptic({ ffpSfp: e.target.value || null })
              markIfOverridden('optic', 'ffpSfp')
            }}
          >
            <option value="">—</option>
            <option value="FFP">{labelReticlePlane('FFP')}</option>
            <option value="SFP">{labelReticlePlane('SFP')}</option>
          </select>
        </Field>
      </FormAccordionSection>

      <FormAccordionSection
        id="env"
        title={t('form.sections.env')}
        icon={Wind}
        open={openSections.env}
        onToggle={toggleSection}
        termKey="airDensity"
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('form.fields.temperature')}>
            <input
              type="number"
              step="1"
              className={inputClass}
              value={env.temperatureC ?? ''}
              onChange={(e) => onEnvChange({ temperatureC: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('form.fields.pressure')} termKey="pressureType">
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={env.pressureHpa ?? ''}
              onChange={(e) => onEnvChange({ pressureHpa: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('form.fields.pressureMode')} termKey="pressureType">
            <div className="flex flex-wrap gap-1">
              {[
                ['station', t('form.pressureStation')],
                ['sea-level', t('form.pressureSeaLevel')],
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
          <Field label={t('form.fields.humidity')}>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              className={inputClass}
              value={env.humidityPercent ?? ''}
              onChange={(e) => onEnvChange({ humidityPercent: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('form.fields.altitude')}>
            <input
              type="number"
              step="1"
              className={inputClass}
              value={env.altitudeM ?? ''}
              onChange={(e) => onEnvChange({ altitudeM: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('form.fields.windSpeed')} termKey="crosswind">
            <input
              type="number"
              step="0.1"
              min="0"
              className={inputClass}
              value={env.windSpeed ?? ''}
              onChange={(e) => onEnvChange({ windSpeed: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('form.fields.windUnit')}>
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
          <Field label={t('form.fields.windAngle')} termKey="crosswind">
            <input
              type="number"
              step="1"
              className={inputClass}
              value={env.windAngleDegrees ?? 90}
              onChange={(e) => onEnvChange({ windAngleDegrees: Number(e.target.value) })}
            />
          </Field>
        </div>
      </FormAccordionSection>

      <FormAccordionSection
        id="advanced"
        title={t('form.sections.advanced')}
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
          {t('form.fields.coriolisEnabled')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('form.fields.latitude')} termKey="coriolis">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={advanced.latitude ?? ''}
              onChange={(e) =>
                patchAdvanced({ latitude: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
          <Field label={t('form.fields.azimuth')} termKey="coriolis">
            <input
              type="number"
              step="1"
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
        title={t('form.sections.range')}
        icon={Ruler}
        open={openSections.range}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-3 gap-2">
          <Field label={t('form.fields.rangeMin')}>
            <input
              type="number"
              step="1"
              min="1"
              className={inputClass}
              value={rangeMin}
              onChange={(e) => onRangeMin(Number(e.target.value))}
            />
          </Field>
          <Field label={t('form.fields.rangeMax')}>
            <input
              type="number"
              step="1"
              min="1"
              className={inputClass}
              value={rangeMax}
              onChange={(e) => onRangeMax(Number(e.target.value))}
            />
          </Field>
          <Field label={t('form.fields.rangeStep')}>
            <input
              type="number"
              step="1"
              min="1"
              className={inputClass}
              value={rangeStep}
              onChange={(e) => onRangeStep(Number(e.target.value))}
            />
          </Field>
        </div>
      </FormAccordionSection>
        </div>

        <div className="sticky bottom-0 z-[2] -mx-3 shrink-0 border-t border-emerald-500/20 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/98 to-[#0a0a0a]/75 px-3 pt-3 shadow-[0_-12px_28px_rgba(0,0,0,0.55)] sm:-mx-4 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className={`${btnAccent} w-full py-3 sm:py-2.5`}
            onClick={onCalculate}
            disabled={calculating}
          >
            {calculating ? t('form.calculatingCta') : t('form.calculateCta')}
          </button>
        </div>
      </div>
    </>
  )
}

const btnSecondary =
  'rounded border border-white/15 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/75 hover:bg-white/5'
const btnArmory =
  'rounded border border-cyan-500/40 bg-cyan-500/[0.06] px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-cyan-300/95 hover:border-cyan-400/55 hover:bg-cyan-500/10'
const btnAccent =
  'rounded border border-emerald-500/45 bg-emerald-500/10 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/15'
