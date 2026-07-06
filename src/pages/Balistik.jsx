import { useCallback, useMemo, useState } from 'react'
import { Download, Target } from 'lucide-react'
import HudFluffDecor from '../components/dashboard/HudFluffDecor'
import TacticalPanel from '../components/ui/TacticalPanel'
import BallisticFormPanel from '../components/ballistics/BallisticFormPanel'
import BallisticChartPanel from '../components/ballistics/BallisticChartPanel'
import BallisticQuickReferencePanel from '../components/ballistics/BallisticQuickReferencePanel'
import BallisticTrajectoryHud from '../components/ballistics/BallisticTrajectoryHud'
import InfoTooltip from '../components/shared/InfoTooltip'
import { useAudazData } from '../hooks/useAudazData'
import { useBallisticProfiles } from '../hooks/useBallisticProfiles'
import {
  buildProfileDefaultsFromInventory,
  createDefaultBallisticProfileFields,
  filterInventoryWeapons,
  normalizeBallisticProfile,
  runBallisticsForProfile,
} from '../lib/ballisticProfileBridge'
import { exportBallisticReportPdf } from '../lib/ballisticReportPdf'
import { angleTableCellsForRow, buildAngleTableColumns } from '../lib/clickUnitSystem'
import { weaponDisplayName } from '../lib/weaponIlws'

/** @typedef {import('../lib/ballisticsEngine.js').BallisticsEngineOutput} BallisticsEngineOutput */

function buildTargetDistances(min, max, step) {
  const lo = Math.max(1, Math.min(min, max))
  const hi = Math.max(lo, max)
  const inc = Math.max(1, step)
  const out = []
  for (let d = lo; d <= hi; d += inc) out.push(d)
  return out.length ? out : [100]
}

const DEFAULT_ENV = {
  temperatureC: 15,
  pressureHpa: 1013.25,
  humidityPercent: 0,
  altitudeM: 0,
  pressureType: 'station',
  windSpeed: 0,
  windSpeedUnit: 'mph',
  windAngleDegrees: 90,
}

/** @type {{ label: string, termKey: string }[]} */
const TABLE_COLUMNS_BASE = [
  { label: 'M', termKey: 'distance' },
  { label: 'Drop', termKey: 'drop' },
  { label: 'Wind', termKey: 'windage' },
  { label: 'TOF', termKey: 'timeOfFlight' },
  { label: 'fps', termKey: 'velocity' },
  { label: 'E', termKey: 'remainingEnergy' },
]

export default function Balistik() {
  const { items: inventoryItems } = useAudazData('inventory')
  const { profiles, createProfile, updateProfile, loading: profilesLoading } = useBallisticProfiles()

  const [form, setForm] = useState(() => ({
    profileName: 'Yeni Profil',
    ...createDefaultBallisticProfileFields(),
  }))
  const [env, setEnv] = useState(DEFAULT_ENV)
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [rangeMin, setRangeMin] = useState(100)
  const [rangeMax, setRangeMax] = useState(1500)
  const [rangeStep, setRangeStep] = useState(100)
  const [activeDistance, setActiveDistance] = useState(100)
  const [output, setOutput] = useState(/** @type {BallisticsEngineOutput | null} */ (null))
  const [calcError, setCalcError] = useState('')
  const [calculating, setCalculating] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [armoryOpen, setArmoryOpen] = useState(false)
  const [armoryFillNotice, setArmoryFillNotice] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [resultTab, setResultTab] = useState(/** @type {'chart' | 'table'} */ ('chart'))

  const weapons = useMemo(() => filterInventoryWeapons(inventoryItems), [inventoryItems])

  const clickUnitSystem = form.optic?.clickUnitSystem ?? null

  const tableColumns = useMemo(
    () => [...TABLE_COLUMNS_BASE, ...buildAngleTableColumns(clickUnitSystem), { label: 'Mach', termKey: 'machNumber' }],
    [clickUnitSystem],
  )

  const onFormChange = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const onEnvChange = useCallback((patch) => {
    setEnv((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleSelectProfile = useCallback(
    (id) => {
      setSelectedProfileId(id)
      if (!id) return
      const row = profiles.find((p) => String(p.id) === id)
      if (!row) return
      setForm({
        profileName: String(row.profileName ?? 'Profil'),
        linkedWeaponId: row.linkedWeaponId ?? null,
        linkedOpticId: row.linkedOpticId ?? null,
        linkedAmmoId: row.linkedAmmoId ?? null,
        weapon: { ...createDefaultBallisticProfileFields().weapon, ...(row.weapon ?? {}) },
        optic: { ...createDefaultBallisticProfileFields().optic, ...(row.optic ?? {}) },
        ammo: { ...createDefaultBallisticProfileFields().ammo, ...(row.ammo ?? {}) },
        advanced: { ...createDefaultBallisticProfileFields().advanced, ...(row.advanced ?? {}) },
      })
    },
    [profiles],
  )

  const handleNewProfile = useCallback(() => {
    setSelectedProfileId('')
    setForm({ profileName: 'Yeni Profil', ...createDefaultBallisticProfileFields() })
  }, [])

  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true)
    try {
      const payload = normalizeBallisticProfile(form)
      if (selectedProfileId) {
        await updateProfile(selectedProfileId, payload)
      } else {
        const ref = await createProfile(payload)
        if (ref?.id) setSelectedProfileId(ref.id)
      }
    } finally {
      setProfileSaving(false)
    }
  }, [form, selectedProfileId, createProfile, updateProfile])

  const handleArmorySelect = useCallback(
    (weaponId) => {
      const draft = buildProfileDefaultsFromInventory(weaponId, null, null, {
        allItems: inventoryItems,
      })
      setForm((prev) => ({
        ...prev,
        ...draft,
        ammo: draft.ammo,
      }))
      setArmoryFillNotice(
        draft.linkedAmmoId
          ? ''
          : 'Bu silahın kalibresine uygun mühimmat envanterde bulunamadı. Mühimmat alanlarını elle girin.',
      )
      setArmoryOpen(false)
    },
    [inventoryItems],
  )

  const handleCalculate = useCallback(() => {
    setCalcError('')
    setCalculating(true)
    try {
      const targets = buildTargetDistances(rangeMin, rangeMax, rangeStep)
      const result = runBallisticsForProfile(form, targets, {
        ...env,
        energyUnit: 'ftlb',
      })
      setOutput(result)
      setActiveDistance(targets[0] ?? 100)
    } catch (err) {
      setOutput(null)
      setCalcError(err instanceof Error ? err.message : 'Hesaplama hatası')
    } finally {
      setCalculating(false)
    }
  }, [form, env, rangeMin, rangeMax, rangeStep])

  const handleExportPdf = useCallback(async () => {
    if (!output) return
    setPdfBusy(true)
    try {
      const reportMeta = await exportBallisticReportPdf(output, {
        profileName: String(form.profileName),
        clickUnitSystem,
      })

      if (import.meta.env.DEV) {
        console.info('[Balistik PDF] layout', reportMeta)
      }
    } finally {
      setPdfBusy(false)
    }
  }, [output, form.profileName, clickUnitSystem])

  const resultTabBtnClass = (active) =>
    [
      'relative flex-1 rounded-md px-3 py-3 font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] transition min-h-[44px] sm:px-5',
      active
        ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-[inset_0_1px_0_rgba(34,197,94,0.5)]'
        : 'border border-transparent text-app-text/40 hover:border-white/15 hover:bg-white/[0.04] hover:text-app-text/75',
    ].join(' ')

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-[1600px] flex-col gap-4">
      <HudFluffDecor className="pointer-events-none opacity-40" />

      <header className="relative z-[1] flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-500/90">
            BLST-01 · BALİSTİK TERMİNAL
          </p>
          <h1 className="mt-1 flex items-center gap-2 font-display text-xl font-bold tracking-tight text-app-text sm:text-2xl">
            <Target className="size-6 text-emerald-400" strokeWidth={1.5} aria-hidden />
            Balistik Terminal
          </h1>
          <p className="mt-1 max-w-xl font-mono-technical text-[10px] leading-relaxed text-app-text/50">
            Profil + cephanelik verisi → doğrulanmış motor. Çevre koşulları oturum bazlı; profile kaydedilmez.
          </p>
        </div>
        {profilesLoading ? (
          <span className="font-mono text-[10px] text-app-text/45">Profiller yükleniyor…</span>
        ) : null}
      </header>

      {calcError ? (
        <p className="rounded border border-red-500/40 bg-red-950/30 px-3 py-2 font-mono-technical text-xs text-red-300">
          {calcError}
        </p>
      ) : null}

      {armoryFillNotice ? (
        <p className="rounded border border-amber-500/40 bg-amber-950/25 px-3 py-2 font-mono-technical text-xs text-amber-200">
          {armoryFillNotice}
        </p>
      ) : null}

      <div className="relative z-[1] grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,22rem)_1fr] lg:h-[calc(100dvh-11rem)] lg:max-h-[calc(100dvh-11rem)] xl:grid-cols-[minmax(0,24rem)_1fr]">
        <TacticalPanel className="min-h-0 overflow-y-auto p-3 sm:p-4 lg:h-full lg:max-h-full lg:overflow-y-auto">
          <BallisticFormPanel
            form={form}
            env={env}
            onFormChange={onFormChange}
            onEnvChange={onEnvChange}
            rangeMin={rangeMin}
            rangeMax={rangeMax}
            rangeStep={rangeStep}
            onRangeMin={setRangeMin}
            onRangeMax={setRangeMax}
            onRangeStep={setRangeStep}
            profiles={profiles}
            selectedProfileId={selectedProfileId}
            onSelectProfile={handleSelectProfile}
            onNewProfile={handleNewProfile}
            onSaveProfile={handleSaveProfile}
            onArmoryFill={() => setArmoryOpen(true)}
            onCalculate={handleCalculate}
            calculating={calculating}
            profileSaving={profileSaving}
          />
        </TacticalPanel>

        <TacticalPanel className="flex min-h-0 flex-col overflow-hidden p-3 sm:gap-4 sm:p-4 lg:h-full lg:max-h-full">
          {output ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
              <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  ['Sıfırlama açısı', `${output.launchAngleDegrees.toFixed(3)}°`, 'launchAngle'],
                  ['Yoğunluk oranı', output.airDensityRatio.toFixed(4), 'airDensity'],
                  ['Ses hızı', `${output.speedOfSoundMps.toFixed(1)} m/s`, 'machNumber'],
                ].map(([label, val, key]) => (
                  <div
                    key={label}
                    className="rounded border border-emerald-500/25 bg-black/50 px-3 py-2"
                  >
                    <p className="flex items-center gap-1 font-mono-technical text-[8px] uppercase tracking-wider text-emerald-500/75">
                      {label}
                      <InfoTooltip termKey={key} />
                    </p>
                    <p className="mt-1 font-mono-technical text-sm tabular-nums text-slate-100">{val}</p>
                  </div>
                ))}
              </div>

              <BallisticQuickReferencePanel
                results={output.results}
                activeDistance={activeDistance}
                clickUnitSystem={clickUnitSystem}
                clickValueMoa={form.optic?.clickValueMoa}
                clickValueMrad={form.optic?.clickValueMrad}
              />

              <div
                className="flex shrink-0 gap-1 rounded-lg border border-white/10 bg-black/50 p-1"
                role="tablist"
                aria-label="Sonuç görünümü"
              >
                {[
                  { id: 'chart', label: 'GRAFİK' },
                  { id: 'table', label: 'TAM TABLO' },
                ].map(({ id, label }, index) => {
                  const active = resultTab === id
                  return (
                    <div key={id} className="flex min-w-0 flex-1 items-stretch">
                      {index > 0 ? (
                        <span className="mr-1 w-px shrink-0 self-stretch bg-white/15" aria-hidden />
                      ) : null}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls={`balistik-result-${id}`}
                        id={`balistik-tab-${id}`}
                        onClick={() => setResultTab(/** @type {'chart' | 'table'} */ (id))}
                        className={resultTabBtnClass(active)}
                      >
                        {label}
                        {active ? (
                          <span
                            className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.65)]"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    </div>
                  )
                })}
              </div>

              {resultTab === 'chart' ? (
                <div
                  id="balistik-result-chart"
                  role="tabpanel"
                  aria-labelledby="balistik-tab-chart"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]"
                >
                  <div className="flex flex-col gap-4 pb-1">
                    <BallisticChartPanel
                      results={output.results}
                      activeDistance={activeDistance}
                      onActiveDistanceChange={setActiveDistance}
                      rangeMin={output.results[0]?.distance ?? rangeMin}
                      rangeMax={output.results[output.results.length - 1]?.distance ?? rangeMax}
                      clickUnitSystem={clickUnitSystem}
                    />

                    <BallisticTrajectoryHud results={output.results} activeDistance={activeDistance} />
                  </div>
                </div>
              ) : (
                <div
                  id="balistik-result-table"
                  role="tabpanel"
                  aria-labelledby="balistik-tab-table"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10"
                >
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-app-bg/95 px-3 py-2 backdrop-blur-sm">
                    <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-500/80">
                      Tam sonuç tablosu
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded border border-emerald-500/40 px-2 py-1 font-mono-technical text-[9px] uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                      onClick={handleExportPdf}
                      disabled={pdfBusy}
                    >
                      <Download className="size-3.5" aria-hidden />
                      {pdfBusy ? 'PDF…' : 'PDF'}
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left font-mono-technical text-[10px] text-slate-300">
                      <thead className="sticky top-0 z-[1] border-b border-white/10 bg-app-bg/95 text-[8px] uppercase tracking-wider text-app-text/45 backdrop-blur-sm">
                        <tr>
                          {tableColumns.map(({ label, termKey }) => (
                            <th key={termKey} className="px-2 py-2 font-normal">
                              <span className="inline-flex items-center gap-0.5">
                                {label}
                                <InfoTooltip termKey={termKey} />
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {output.results.map((r) => (
                          <tr
                            key={r.distance}
                            className={`border-b border-white/5 ${
                              Math.abs(r.distance - activeDistance) < rangeStep / 2
                                ? 'bg-emerald-500/10'
                                : ''
                            }`}
                          >
                            <td className="px-2 py-1.5 tabular-nums">{r.distance}</td>
                            <td className="px-2 py-1.5 tabular-nums">{Math.abs(r.dropCm).toFixed(1)}</td>
                            <td className="px-2 py-1.5 tabular-nums">{Math.abs(r.windageCm).toFixed(1)}</td>
                            <td className="px-2 py-1.5 tabular-nums">{r.timeOfFlightSeconds.toFixed(3)}</td>
                            <td className="px-2 py-1.5 tabular-nums">{r.velocityRemaining.toFixed(0)}</td>
                            <td className="px-2 py-1.5 tabular-nums">{r.energyRemaining.toFixed(0)}</td>
                            {angleTableCellsForRow(r, clickUnitSystem).map((cell, idx) => (
                              <td key={`angle-${idx}`} className="px-2 py-1.5 tabular-nums">
                                {cell}
                              </td>
                            ))}
                            <td className="px-2 py-1.5 tabular-nums">{r.machNumber.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <Target className="mb-3 size-10 text-emerald-500/30" strokeWidth={1} aria-hidden />
              <p className="font-mono-technical text-[10px] uppercase tracking-[0.24em] text-app-text/45">
                Parametreleri girin ve Hesapla&apos;ya basın
              </p>
            </div>
          )}
        </TacticalPanel>
      </div>

      {armoryOpen ? (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/75 p-3 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Kapat"
            onClick={() => setArmoryOpen(false)}
          />
          <TacticalPanel className="relative z-[1] max-h-[70vh] w-full max-w-md overflow-hidden p-0">
            <div className="border-b border-white/10 px-4 py-2">
              <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">
                Silahtan doldur
              </p>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {weapons.length === 0 ? (
                <li className="px-2 py-6 text-center font-mono text-[10px] text-app-text/45">
                  Cephanelikte silah yok
                </li>
              ) : (
                weapons.map((w) => (
                  <li key={String(w.id)}>
                    <button
                      type="button"
                      className="w-full rounded border border-transparent px-3 py-2 text-left font-mono-technical text-xs text-slate-200 hover:border-emerald-500/30 hover:bg-emerald-500/5"
                      onClick={() => handleArmorySelect(String(w.id))}
                    >
                      {weaponDisplayName(w)}
                      <span className="mt-0.5 block text-[9px] text-app-text/45">{String(w.calibre ?? '—')}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </TacticalPanel>
        </div>
      ) : null}
    </div>
  )
}
