import {
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
import { parseClickUnitSystem } from '../../lib/clickUnitSystem.js'

const labelClass =
  'flex items-center gap-1 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-app-text/55'
const inputClass =
  'w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 font-mono-technical text-xs text-slate-100 outline-none focus:border-emerald-500/50'

/**
 * @param {{ icon?: import('lucide-react').LucideIcon, children: import('react').ReactNode }} props
 */
function SectionHeading({ icon: Icon, children }) {
  return (
    <h3 className="flex items-center gap-2 border-l-2 border-amber-500/80 py-0.5 pl-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400/95">
      {Icon ? <Icon className="size-3.5 shrink-0 text-amber-500/75" strokeWidth={2} aria-hidden /> : null}
      <span>{children}</span>
    </h3>
  )
}

/**
 * @param {{ label: string, termKey?: string, children: import('react').ReactNode }} props
 */
function Field({ label, termKey, children }) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>
        {label}
        {termKey ? <InfoTooltip termKey={termKey} /> : null}
      </span>
      {children}
    </label>
  )
}

/**
 * @param {{
 *   form: Record<string, unknown>
 *   env: Record<string, unknown>
 *   advancedOpen: boolean
 *   onAdvancedOpen: (v: boolean) => void
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
 * }} props
 */
export default function BallisticFormPanel({
  form,
  env,
  advancedOpen,
  onAdvancedOpen,
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
}) {
  const weapon = /** @type {Record<string, unknown>} */ (form.weapon ?? {})
  const optic = /** @type {Record<string, unknown>} */ (form.optic ?? {})
  const ammo = /** @type {Record<string, unknown>} */ (form.ammo ?? {})
  const advanced = /** @type {Record<string, unknown>} */ (form.advanced ?? {})

  const patchWeapon = (p) => onFormChange({ weapon: { ...weapon, ...p } })
  const patchOptic = (p) => onFormChange({ optic: { ...optic, ...p } })
  const patchAmmo = (p) => onFormChange({ ammo: { ...ammo, ...p } })
  const patchAdvanced = (p) => onFormChange({ advanced: { ...advanced, ...p } })

  const clickUnit = parseClickUnitSystem(optic.clickUnitSystem)

  const handleClickUnitChange = (unit) => {
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
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="space-y-2">
        <SectionHeading icon={User}>Profil</SectionHeading>
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
      </section>

      <section className="space-y-2">
        <SectionHeading icon={CircleDot}>Mermi</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Ağırlık (gr)">
            <input
              type="number"
              className={inputClass}
              value={ammo.bulletWeight ?? ''}
              onChange={(e) => patchAmmo({ bulletWeight: Number(e.target.value) })}
            />
          </Field>
          <Field label="Çap (in)">
            <input
              type="number"
              step="0.001"
              className={inputClass}
              value={ammo.bulletDiameter ?? ''}
              onChange={(e) => patchAmmo({ bulletDiameter: Number(e.target.value) })}
            />
          </Field>
          <Field label="Namlu hızı (fps)" termKey="muzzleVelocity">
            <input
              type="number"
              className={inputClass}
              value={ammo.muzzleVelocity ?? ''}
              onChange={(e) => patchAmmo({ muzzleVelocity: Number(e.target.value) })}
            />
          </Field>
          <Field label="BC" termKey="bc">
            <input
              type="number"
              step="0.001"
              className={inputClass}
              value={ammo.ballisticCoefficient ?? ''}
              onChange={(e) => patchAmmo({ ballisticCoefficient: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Drag modeli" termKey="g1G7DragModel">
          <div className="flex gap-2">
            {['G7', 'G1'].map((m) => (
              <button
                key={m}
                type="button"
                className={ammo.bcModel === m ? btnAccent : btnSecondary}
                onClick={() => patchAmmo({ bcModel: m })}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
      </section>

      <section className="space-y-2">
        <SectionHeading icon={Crosshair}>Silah</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sight height (cm)" termKey="sightHeight">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={weapon.sightHeight ?? ''}
              onChange={(e) => patchWeapon({ sightHeight: Number(e.target.value) })}
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
          <Field label="Namlu uz. (in)">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={weapon.barrelLength ?? ''}
              onChange={(e) => patchWeapon({ barrelLength: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
          <Field label="Yiv devri" termKey="twistRate">
            <input
              className={inputClass}
              placeholder="1:8"
              value={weapon.twistRate ?? ''}
              onChange={(e) => patchWeapon({ twistRate: e.target.value || null })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeading icon={Focus}>Optik</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Büyütme">
            <input
              className={inputClass}
              value={optic.magnification ?? ''}
              onChange={(e) => patchOptic({ magnification: e.target.value || null })}
            />
          </Field>
          <Field label="Reticle" termKey="reticleType">
            <input
              className={inputClass}
              value={optic.reticleType ?? ''}
              onChange={(e) => patchOptic({ reticleType: e.target.value || null })}
            />
          </Field>
        </div>
        <ClickUnitSystemToggle value={clickUnit} onChange={handleClickUnitChange} />
        {clickUnit === 'MOA' ? (
          <Field label="Tık Değeri (MOA)" termKey="moaClicks">
            <input
              type="number"
              step="0.125"
              className={inputClass}
              value={optic.clickValueMoa ?? ''}
              onChange={(e) =>
                patchOptic({ clickValueMoa: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
        ) : null}
        {clickUnit === 'MRAD' ? (
          <Field label="Tık Değeri (MRAD)" termKey="mradClicks">
            <input
              type="number"
              step="0.05"
              className={inputClass}
              value={optic.clickValueMrad ?? ''}
              onChange={(e) =>
                patchOptic({ clickValueMrad: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
        ) : null}
        {clickUnit ? null : (
          <p className="font-mono-technical text-[9px] text-app-text/40">
            Tık değeri girmek için önce birim sistemi seçin.
          </p>
        )}
        <Field label="FFP / SFP" termKey="ffpSfp">
          <select
            className={inputClass}
            value={optic.ffpSfp ?? ''}
            onChange={(e) => patchOptic({ ffpSfp: e.target.value || null })}
          >
            <option value="">—</option>
            <option value="FFP">FFP</option>
            <option value="SFP">SFP</option>
          </select>
        </Field>
      </section>

      <section className="space-y-2">
        <SectionHeading icon={Wind}>
          Çevre <InfoTooltip termKey="airDensity" />
        </SectionHeading>
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
      </section>

      <section className="overflow-hidden rounded border border-white/10 bg-black/30">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 border-l-2 border-amber-500/80 px-3 py-2.5 pl-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400/95"
          onClick={() => onAdvancedOpen(!advancedOpen)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-3.5 shrink-0 text-amber-500/75" strokeWidth={2} aria-hidden />
            Gelişmiş
            <InfoTooltip termKey="coriolis" />
          </span>
          <span className="text-app-text/55">{advancedOpen ? '−' : '+'}</span>
        </button>
        {advancedOpen ? (
          <div className="space-y-2 border-t border-white/10 px-3 py-2">
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
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <SectionHeading icon={Ruler}>Hedef aralığı</SectionHeading>
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
      </section>
    </div>
  )
}

const btnSecondary =
  'rounded border border-white/15 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/75 hover:bg-white/5'
const btnAccent =
  'rounded border border-emerald-500/45 bg-emerald-500/10 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/15'
