import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import atisImg from '../../assets/atis.png'
import MatrixWireVisualizer from '../armory/MatrixWireVisualizer'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import {
  ammoDisplayLabel,
  filterAmmoRows,
  findAmmoForWeapon,
  getCaliberName,
  getCurrentStock,
} from '../../lib/ammoIlws'
import { ATIS_DRILL_CUSTOM, ATIS_DRILL_LEVELS } from '../../lib/atisDrills'
import { buildWeaponSpecsSnapshot } from '../../lib/atisLogPayload'
import { sanitizeShotCounts } from '../../lib/atisShotCounts'
import { submitAtisRecord } from '../../lib/atisSubmit'
import { invNum, invStr } from '../../lib/inventoryIlws'
import { filterWeaponRows, getAttachedAccessoryId, weaponDisplayName } from '../../lib/weaponIlws'
import AtisLogRegistry from './AtisLogRegistry'
import OperatorInstructorRecordsEmbed from './OperatorInstructorRecordsEmbed'
import IndividualTrainingSessionHeader from './IndividualTrainingSessionHeader'

const inputClass =
  'w-full rounded border border-[#00FF41]/30 bg-[#0A0A0A] px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#00FF41]/60'

const inputErrorClass =
  'w-full rounded border border-red-500/55 bg-red-950/20 px-2 py-2 font-mono-technical text-sm text-red-200 outline-none focus:border-red-400'

const selectClass =
  'dossier-blood-select w-full rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-white outline-none focus:border-[#00FF41]/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500'

const textareaClass =
  'w-full min-h-[5.5rem] resize-y rounded border border-[#00FF41]/30 bg-[#0A0A0A] px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#00FF41]/60'

/** @typedef {'form' | 'registry'} AtisViewMode */

const INITIAL_FORM = {
  weaponId: '',
  ammoId: '',
  drillKey: '',
  customDrillName: '',
  distanceM: '7',
  roundsFired: '10',
  hits: '8',
  isTimed: true,
  firstShot: '',
  split: '',
  total: '',
  operationNote: '',
}

/**
 * @param {{
 *   inventory: Record<string, unknown>[]
 *   rangeLogs: Record<string, unknown>[]
 *   onBack: () => void
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   updateInventory: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   ready: boolean
 *   logsLoading?: boolean
 *   listenError: Error | null
 * }} props
 */
export default function AtisShootingTerminal({
  inventory,
  rangeLogs,
  onBack,
  addLog,
  updateInventory,
  ready,
  logsLoading = false,
  listenError,
}) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const weapons = useMemo(() => filterWeaponRows(inventory), [inventory])
  const ammoRows = useMemo(() => filterAmmoRows(inventory), [inventory])

  const [form, setForm] = useState(INITIAL_FORM)
  const [viewMode, setViewMode] = useState(/** @type {AtisViewMode} */ ('form'))
  const [saving, setSaving] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [hitsCapped, setHitsCapped] = useState(false)
  const [stockError, setStockError] = useState(/** @type {string | null} */ (null))
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))

  const selectedWeapon = useMemo(
    () => weapons.find((w) => String(w.id) === form.weaponId) ?? null,
    [weapons, form.weaponId]
  )

  const selectedAmmo = useMemo(
    () => ammoRows.find((a) => String(a.id) === form.ammoId) ?? null,
    [ammoRows, form.ammoId]
  )

  const selectedAccessory = useMemo(() => {
    if (!selectedWeapon) return null
    const aid = getAttachedAccessoryId(selectedWeapon)
    if (!aid) return null
    return inventory.find((i) => String(i.id) === aid) ?? null
  }, [selectedWeapon, inventory])

  const weaponSpecsPreview = useMemo(() => {
    if (!selectedWeapon) return null
    return buildWeaponSpecsSnapshot(selectedWeapon, selectedAccessory)
  }, [selectedWeapon, selectedAccessory])

  const liveCounts = useMemo(
    () => sanitizeShotCounts(form.roundsFired, form.hits),
    [form.roundsFired, form.hits]
  )

  const showCustomDrill = form.drillKey === ATIS_DRILL_CUSTOM

  const ammoStock = selectedAmmo ? getCurrentStock(selectedAmmo) : 0
  const insufficientStock =
    selectedAmmo != null && liveCounts.totalRoundsFired > ammoStock

  useEffect(() => {
    if (form.ammoId) return
    if (ammoRows.length === 1) {
      setForm((f) => ({ ...f, ammoId: String(ammoRows[0].id) }))
      return
    }
    if (!selectedWeapon) return
    const match = findAmmoForWeapon(ammoRows, selectedWeapon)
    if (match) setForm((f) => ({ ...f, ammoId: String(match.id) }))
  }, [selectedWeapon, ammoRows, form.ammoId])

  const submitBlockedReason = useMemo(() => {
    if (saving) return null
    if (!uid) return 'OTURUM_GEREKLİ'
    if (weapons.length === 0) return 'CEPHANELİKTE_SİLAH_YOK'
    if (ammoRows.length === 0) return 'MÜHİMMAT_DEPOSU_BOŞ'
    if (!form.weaponId) return 'SİLAH_SEÇİMİ_GEREKLİ'
    if (!form.drillKey) return 'ATIŞ_TÜRÜ_SEÇİMİ_GEREKLİ'
    if (showCustomDrill && !form.customDrillName.trim()) return 'ÖZEL_DRILL_ADI_GEREKLİ'
    if (!form.ammoId) {
      return selectedWeapon
        ? 'MÜHİMMAT_SEÇİMİ_GEREKLİ · KALİBRE_EŞLEŞMESİ_YOK'
        : 'MÜHİMMAT_SEÇİMİ_GEREKLİ'
    }
    if (!selectedAmmo) return 'MÜHİMMAT_KAYDI_BULUNAMADI'
    if (insufficientStock) {
      return `STOK_YETERSİZ · MEVCUT ${ammoStock} · ATIM ${liveCounts.totalRoundsFired} · SAYIYI_DÜŞÜRÜN`
    }
    if (liveCounts.totalRoundsFired <= 0) return 'TOPLAM_ATIM_SAYISI_GEREKLİ'
    if (liveCounts.totalHits < 0 || liveCounts.totalHits > liveCounts.totalRoundsFired) {
      return 'İSABET_SAYISI_GEÇERSİZ'
    }
    if (form.isTimed) {
      const hasTime =
        invStr(form.split).trim() ||
        invStr(form.total).trim() ||
        invStr(form.firstShot).trim()
      if (!hasTime) return 'SÜRELİ_ATIŞTA_SÜRE_GEREKLİ'
    }
    return null
  }, [
    saving,
    uid,
    weapons.length,
    ammoRows.length,
    form.weaponId,
    form.drillKey,
    form.customDrillName,
    form.ammoId,
    showCustomDrill,
    selectedWeapon,
    selectedAmmo,
    insufficientStock,
    ammoStock,
    liveCounts.totalRoundsFired,
    liveCounts.totalHits,
    form.isTimed,
    form.split,
    form.total,
    form.firstShot,
  ])

  const canSubmit = submitBlockedReason == null

  const patch = useCallback((/** @type {Partial<typeof INITIAL_FORM>} */ next) => {
    setForm((f) => ({ ...f, ...next }))
    setSubmitOk(false)
    setStockError(null)
    setSubmitError(null)
  }, [])

  const onRoundsChange = (value) => {
    const rounds = Math.max(1, Math.floor(invNum(value)))
    let hits = Math.max(0, Math.floor(invNum(form.hits)))
    let capped = false
    if (hits > rounds) {
      hits = rounds
      capped = true
    }
    patch({ roundsFired: value, hits: String(hits) })
    setHitsCapped(capped)
  }

  const onHitsChange = (value) => {
    const rounds = Math.max(1, Math.floor(invNum(form.roundsFired)))
    let hits = Math.max(0, Math.floor(invNum(value)))
    let capped = false
    if (hits > rounds) {
      hits = rounds
      capped = true
    }
    patch({ hits: String(hits) })
    setHitsCapped(capped)
  }

  const clampRoundsToStock = () => {
    if (!selectedAmmo || ammoStock <= 0) return
    const hits = Math.min(liveCounts.totalHits, ammoStock)
    patch({
      roundsFired: String(ammoStock),
      hits: String(hits),
    })
    setHitsCapped(hits < liveCounts.totalHits)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || !uid || !selectedWeapon || !selectedAmmo) return

    const drillKey = form.drillKey
    if (!drillKey) return
    if (drillKey === ATIS_DRILL_CUSTOM && !form.customDrillName.trim()) return

    const counts = sanitizeShotCounts(form.roundsFired, form.hits)
    if (counts.totalRoundsFired > getCurrentStock(selectedAmmo)) {
      setStockError(`STOK_YETERSİZ · MEVCUT ${getCurrentStock(selectedAmmo)} · İSTENEN ${counts.totalRoundsFired}`)
      return
    }

    setSaving(true)
    setSubmitOk(false)
    setSubmitError(null)
    setStockError(null)
    try {
      await submitAtisRecord({
        addLog,
        updateInventory,
        weapon: selectedWeapon,
        accessory: selectedAccessory,
        ammo: selectedAmmo,
        rangeLogs,
        userId: uid,
        drillKey,
        customDrillName: form.customDrillName,
        distanceM: form.distanceM,
        isTimed: form.isTimed,
        timing: {
          firstShot: form.firstShot,
          split: form.split,
          total: form.total,
        },
        totalRoundsFired: counts.totalRoundsFired,
        totalHits: counts.totalHits,
        operationNote: form.operationNote,
      })
      setSubmitOk(true)
      setHitsCapped(false)
      setForm({
        ...INITIAL_FORM,
        weaponId: form.weaponId,
        ammoId: form.ammoId,
      })
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : ''
      if (code === 'INSUFFICIENT_AMMO') {
        setStockError('STOK_YETERSİZ · İKMAL_GEREKLİ')
      } else if (code === 'AMMO_SYNC_FAILED' || code === 'WEAPON_SYNC_FAILED') {
        setSubmitError(message || 'KAYIT_KISMEN_AKTARILDI · SENKRON_HATASI')
        setSubmitOk(true)
      } else {
        const hint = code === 'permission-denied' ? ' · YETKİ / KURALLAR' : code ? ` · ${code}` : ''
        setSubmitError(`KAYIT_BAŞARISIZ · YENİDEN_DENE${hint}`)
        if (import.meta.env.DEV && message) {
          console.error('[AtisShootingTerminal]', err)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const tabBtnClass = (active) =>
    `flex-1 rounded border py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition sm:flex-none sm:px-5 ${
      active
        ? 'border-[#00FF41]/60 bg-[#00FF41]/15 text-[#00FF41] shadow-[0_0_16px_rgba(0,255,65,0.25)]'
        : 'border-white/15 text-slate-500 hover:border-[#00FF41]/35 hover:text-slate-300'
    }`

  return (
    <div className="space-y-4">
      <IndividualTrainingSessionHeader />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 rounded border border-[#ffb400]/50 bg-[#ffb400]/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#ffb400] transition hover:bg-[#ffb400]/20"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          KATEGORİLERE DÖN
        </button>

        <div
          className="flex w-full gap-2 rounded border border-[#00FF41]/25 bg-black/60 p-1 sm:w-auto"
          role="tablist"
          aria-label="Atış terminal görünümü"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'form'}
            onClick={() => setViewMode('form')}
            className={tabBtnClass(viewMode === 'form')}
          >
            ATIŞ FORMU
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'registry'}
            onClick={() => setViewMode('registry')}
            className={tabBtnClass(viewMode === 'registry')}
          >
            KAYIT DEFTERİ
          </button>
        </div>
      </div>

      {viewMode === 'registry' ? (
        <AtisLogRegistry rangeLogs={rangeLogs} loading={logsLoading} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <TacticalPanel className="relative overflow-hidden border-[#00FF41]/20 bg-[#0a0a0a]/95 p-0">
          <span className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-[#00FF41]/40" />
          <span className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-[#00FF41]/40" />
          <p className="border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/90">
            ATIŞ · RNG-01 · CANLI ÖNİZLEME
          </p>
          <MatrixWireVisualizer hubMode variant="pistol" imageSrc={atisImg} imageAlt="Atış" label="" />
          <div className="border-t border-[#00FF41]/15 bg-black/50 px-4 py-3 font-mono-technical text-[9px] uppercase">
            {weaponSpecsPreview ? (
              <>
                <p className="text-[#00FF41]">{String(weaponSpecsPreview.displayName)}</p>
                <p className="mt-1 text-slate-400">
                  {[weaponSpecsPreview.brand, weaponSpecsPreview.calibre, weaponSpecsPreview.tacticalCategory]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </>
            ) : (
              <p className="text-slate-600">SİLAH_SEÇİMİ_BEKLENİYOR</p>
            )}
            {selectedAmmo ? (
              <p className="mt-2 border-t border-white/10 pt-2 text-slate-500">
                MHM: <span className="text-[#00FF41]">{getCaliberName(selectedAmmo)}</span>
                <span className="ml-2 tabular-nums text-white">{ammoStock.toLocaleString('tr-TR')} ADET</span>
              </p>
            ) : null}
            <p className="mt-2 tabular-nums text-[#ffb400]">
              İSABET %{liveCounts.accuracy.toLocaleString('tr-TR')} · {liveCounts.totalHits}/{liveCounts.totalRoundsFired}
            </p>
          </div>
        </TacticalPanel>

        <TacticalPanel className="relative border-[#00FF41]/25 bg-[#0a0a0a]/95 p-0">
          <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b border-l border-[#00FF41]/40" />
          <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b border-r border-[#00FF41]/40" />
          <p className="border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-white">
            ATIŞ KAYDI · VERİ GİRİŞİ
          </p>

          {!ready ? (
            <p className="p-6 font-mono-technical text-[10px] uppercase text-slate-500">OTURUM_GEREKLİ</p>
          ) : listenError ? (
            <p className="m-4 rounded border border-red-500/40 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] text-red-300">
              VERİ_KANALI_KESİLDİ · YENİDEN_DENE
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
              <fieldset className="space-y-2">
                <legend className={labelClass}>SİLAH SEÇİMİ</legend>
                {weapons.length === 0 ? (
                  <p className="font-mono-technical text-[10px] uppercase text-amber-400/90">
                    CEPHANELİKTE_KAYITLI_SİLAH_YOK · ÖNCE_ILWS_İLE_EKLEYİN
                  </p>
                ) : (
                  <select
                    className={selectClass}
                    value={form.weaponId}
                    onChange={(e) => patch({ weaponId: e.target.value, ammoId: '' })}
                    required
                  >
                    <option value="">— SİLAH SEÇİN —</option>
                    {weapons.map((w) => (
                      <option key={String(w.id)} value={String(w.id)}>
                        {weaponDisplayName(w)}
                        {w.brand ? ` · ${String(w.brand)}` : ''}
                        {w.calibre ? ` · ${String(w.calibre)}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </fieldset>

              <fieldset className="space-y-2">
                <legend className={labelClass}>ATIŞ TÜRÜ</legend>
                <select
                  className={selectClass}
                  value={form.drillKey}
                  onChange={(e) => patch({ drillKey: e.target.value, customDrillName: '' })}
                  required
                >
                  <option value="">— DRILL SEÇİN —</option>
                  {ATIS_DRILL_LEVELS.map((tier) => (
                    <optgroup key={tier.level} label={tier.title}>
                      {tier.drills.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value={ATIS_DRILL_CUSTOM}>[+] YENİ ATIŞ TÜRÜ EKLE</option>
                </select>
                {showCustomDrill ? (
                  <input
                    className={inputClass}
                    placeholder="Özel drill adını yazın…"
                    value={form.customDrillName}
                    onChange={(e) => patch({ customDrillName: e.target.value })}
                    required
                    autoFocus
                  />
                ) : null}
              </fieldset>

              <label className="block space-y-1">
                <span className={labelClass}>MESAFE (METRE)</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className={`${inputClass} tabular-nums`}
                  placeholder="örn. 7"
                  value={form.distanceM}
                  onChange={(e) => patch({ distanceM: e.target.value })}
                  required
                />
              </label>

              <fieldset className="space-y-3 rounded border border-[#00FF41]/20 bg-black/40 p-3">
                <legend className={`${labelClass} text-[#00FF41]/80`}>SÜRE MODU</legend>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => patch({ isTimed: true })}
                    className={`flex-1 rounded border py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition ${
                      form.isTimed
                        ? 'border-[#00FF41]/60 bg-[#00FF41]/15 text-[#00FF41] shadow-[0_0_16px_rgba(0,255,65,0.25)]'
                        : 'border-white/15 text-slate-500 hover:border-white/25'
                    }`}
                  >
                    SÜRELİ ATIŞ
                  </button>
                  <button
                    type="button"
                    onClick={() => patch({ isTimed: false, firstShot: '', split: '', total: '' })}
                    className={`flex-1 rounded border py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition ${
                      !form.isTimed
                        ? 'border-[#00FF41]/60 bg-[#00FF41]/15 text-[#00FF41] shadow-[0_0_16px_rgba(0,255,65,0.25)]'
                        : 'border-white/15 text-slate-500 hover:border-white/25'
                    }`}
                  >
                    SÜRESİZ ATIŞ
                  </button>
                </div>
                {!form.isTimed ? (
                  <p className="font-mono-technical text-[8px] uppercase text-slate-500">
                    Kayıt notu: <span className="text-[#00FF41]">Süresiz Atış</span>
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block space-y-1">
                      <span className={labelClass}>İLK ATIŞ SÜRESİ (SN)</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        inputMode="decimal"
                        className={`${inputClass} tabular-nums`}
                        placeholder="0.85"
                        value={form.firstShot}
                        onChange={(e) => patch({ firstShot: e.target.value })}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className={labelClass}>SPLIT SÜRESİ (SN)</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        inputMode="decimal"
                        className={`${inputClass} tabular-nums`}
                        placeholder="0.22"
                        value={form.split}
                        onChange={(e) => patch({ split: e.target.value })}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className={labelClass}>TOPLAM SÜRE (SN)</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        inputMode="decimal"
                        className={`${inputClass} tabular-nums`}
                        placeholder="2.40"
                        value={form.total}
                        onChange={(e) => patch({ total: e.target.value })}
                      />
                    </label>
                  </div>
                )}
              </fieldset>

              <fieldset className="space-y-2 rounded border border-[#00FF41]/25 bg-[#00FF41]/[0.03] p-3">
                <legend className={`${labelClass} text-[#00FF41]/90`}>LOJİSTİK · MÜHİMMAT</legend>
                {ammoRows.length === 0 ? (
                  <p className="font-mono-technical text-[10px] uppercase text-amber-400/90">
                    MÜHİMMAT_DEPOSU_BOŞ · ILWS_MHM_EKLEYİN
                  </p>
                ) : (
                  <select
                    className={
                      insufficientStock
                        ? 'dossier-blood-select w-full rounded border border-red-500/55 bg-red-950/20 py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-white outline-none'
                        : selectClass
                    }
                    value={form.ammoId}
                    onChange={(e) => patch({ ammoId: e.target.value })}
                    required
                  >
                    <option value="">— MÜHİMMAT SEÇİN —</option>
                    {ammoRows.map((a) => {
                      const stock = getCurrentStock(a)
                      return (
                        <option key={String(a.id)} value={String(a.id)}>
                          {ammoDisplayLabel(a)} · STOK {stock.toLocaleString('tr-TR')}
                        </option>
                      )
                    })}
                  </select>
                )}
                {insufficientStock || stockError ? (
                  <p className="flex items-center gap-1.5 font-mono-technical text-[9px] font-bold uppercase text-red-400">
                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                    {stockError ?? `STOK_YETERSİZ · MEVCUT ${ammoStock} ADET`}
                  </p>
                ) : null}
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>ATIM SAYISI</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className={`${insufficientStock ? inputErrorClass : inputClass} tabular-nums`}
                    value={form.roundsFired}
                    onChange={(e) => onRoundsChange(e.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>İSABET ADEDİ</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={hitsCapped ? inputErrorClass : inputClass}
                    value={form.hits}
                    onChange={(e) => onHitsChange(e.target.value)}
                    required
                  />
                </label>
              </div>
              {hitsCapped ? (
                <p className="flex items-center gap-1.5 font-mono-technical text-[9px] font-bold uppercase text-red-400">
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                  İSABET_ATIM_SAYISINI_AŞAMAZ · OTOMATİK_SINIRLANDI
                </p>
              ) : null}

              <label className="block space-y-1">
                <span className={labelClass}>OPERASYON NOTU</span>
                <textarea
                  className={textareaClass}
                  placeholder="Etiketler, gözlem, #KılıftanÇekiş vb."
                  value={form.operationNote}
                  onChange={(e) => patch({ operationNote: e.target.value })}
                  rows={4}
                  maxLength={2000}
                />
                <p className="font-mono-technical text-[8px] uppercase text-slate-600">
                  KAYIT_DEFTERİ_DETAYINDA_GÖRÜNÜR · İSTEĞE_BAĞLI
                </p>
              </label>

              {submitOk ? (
                <p className="rounded border border-[#00FF41]/40 bg-[#00FF41]/10 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-[#00FF41]">
                  KAYIT_AKTARILDI · STOK_GÜNCELLENDİ
                </p>
              ) : null}
              {submitError ? (
                <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-red-300">
                  {submitError}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-[#00FF41]/15 pt-3">
                {submitBlockedReason && !saving ? (
                  <p className="w-full rounded border border-amber-500/35 bg-amber-950/20 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase text-amber-300/95">
                    {submitBlockedReason}
                    {insufficientStock && ammoStock > 0 ? (
                      <button
                        type="button"
                        onClick={clampRoundsToStock}
                        className="mt-2 block w-full rounded border border-amber-400/50 py-1.5 text-[8px] text-amber-200 hover:bg-amber-500/15"
                      >
                        ATIM_SAYISINI_STOKA_SIĞDIR ({ammoStock})
                      </button>
                    ) : null}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={saving || !canSubmit}
                  className="flex-1 rounded border border-[#00FF41]/55 bg-[#00FF41]/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.2)] hover:bg-[#00FF41]/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? 'AKTARILIYOR…' : 'ATIŞ_KAYDINI_ONAYLA'}
                </button>
              </div>
            </form>
          )}
        </TacticalPanel>
        </div>
      )}

      <OperatorInstructorRecordsEmbed discipline="atis" />
    </div>
  )
}
