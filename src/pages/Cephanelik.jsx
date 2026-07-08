import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Crosshair,
  Focus,
  LayoutGrid,
  Lock,
  Plus,
  Scan,
  Shield,
  Target,
} from 'lucide-react'
import { canikImg, muhimmatImg, optikImg, preloadArmoryHubImages } from './Armory'
import HudFluffDecor from '../components/dashboard/HudFluffDecor'
import HudTicker from '../components/ui/HudTicker'
import IlwsCategoryHubCard from '../components/armory/IlwsCategoryHubCard'
import WeaponsDeepDive from '../components/armory/WeaponsDeepDive'
import AttachmentsDeepDive from '../components/armory/AttachmentsDeepDive'
import AmmoDeepDive from '../components/armory/AmmoDeepDive'
import WeaponCreateModal from '../components/armory/WeaponCreateModal'
import AccessoryCreateModal from '../components/armory/AccessoryCreateModal'
import AmmoCreateModal from '../components/armory/AmmoCreateModal'
import IlwsInspectionTerminal from '../components/armory/IlwsInspectionTerminal'
import TacticalPanel from '../components/ui/TacticalPanel'
import { useAuth } from '../context/AuthContext'
import { useAudazData } from '../hooks/useAudazData'
import { audazCommitDeploymentBatch, runAudazFirestore } from '../lib/dataManager'
import {
  ILWS_FILTERS,
  TACTICAL_CATEGORIES,
  invNum,
  isWeaponTacticalCategoryId,
  matchesIlwsFilter,
  partitionInventoryBySector,
} from '../lib/inventoryIlws'
import { resolveAccessoryKind } from '../lib/accessoryIlws'
import { DEFAULT_CRITICAL_THRESHOLD } from '../lib/ammoIlws'
import {
  defaultMaxBarrelLifeForCategory,
  resolveWeaponTacticalCategory,
  todayIsoDate,
  weaponTypeFromCategory,
} from '../lib/weaponIlws'
import {
  ammoBallisticPatchFromForm,
  opticBallisticPatchFromForm,
  weaponBallisticPatchFromForm,
  WEAPON_BALLISTIC_FORM_EMPTY,
  OPTIC_BALLISTIC_FORM_EMPTY,
  AMMO_BALLISTIC_FORM_EMPTY,
} from '../lib/inventoryBallisticFields'

/** @typedef {import('../lib/inventoryIlws').IlwsFilterId} IlwsFilterId */
/** @typedef {null | 'weapons' | 'attachments' | 'ammo'} IlwsActiveCategory */

const inputClass =
  'w-full border-0 border-b border-white/20 bg-transparent py-2 font-mono-technical text-sm text-slate-100 outline-none ring-0 placeholder:text-app-text/45 focus:border-accent/55'
const selectClass =
  'dossier-blood-select w-full rounded border border-accent/30 bg-app-bg py-2 pl-2 pr-1 font-mono-technical text-sm text-app-text outline-none'

/** @param {{ active: boolean, onClick: () => void, icon: import('react').ReactNode, code: string }} p */
function FilterChip({ active, onClick, icon, code }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition ${
        active
          ? 'border-accent/55 bg-accent/15 text-accent'
          : 'border-white/10 bg-black/30 text-app-text/55 hover:border-white/20 hover:text-app-text/90'
      }`}
    >
      <span className="opacity-90">{icon}</span>
      {code}
    </button>
  )
}

const FILTER_ICONS = {
  ALL: LayoutGrid,
  P_TFK: Crosshair,
  T_TAB: Shield,
  KNT: Focus,
  OPT: Scan,
  MHM: Target,
  AV_TFK: Target,
}

const WEAPON_FORM_INITIAL = {
  name: '',
  tacticalCategory: 'T_TAB',
  technicalDescription: '',
  brand: '',
  serialNo: '',
  calibre: '',
  ...WEAPON_BALLISTIC_FORM_EMPTY,
}

const ACCESSORY_FORM_INITIAL = {
  name: '',
  accessoryKind: 'OPTIK',
  technicalDescription: '',
  brand: '',
  serialNo: '',
  ...OPTIC_BALLISTIC_FORM_EMPTY,
}

const AMMO_FORM_INITIAL = {
  caliberName: '',
  calibre: '',
  initialStock: '1000',
  unitPrice: '',
  criticalThreshold: String(DEFAULT_CRITICAL_THRESHOLD),
  ...AMMO_BALLISTIC_FORM_EMPTY,
}

export default function Cephanelik() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  useEffect(() => {
    preloadArmoryHubImages()
  }, [])

  const { items, addItem, updateItem, deleteItem, loading, ready, listenError } = useAudazData('inventory')
  const { items: rangeLogs } = useAudazData('range_logs')
  const { items: auditEntries } = useAudazData('armory_audit_trail')

  const [activeCategory, setActiveCategory] = useState(/** @type {IlwsActiveCategory} */ (null))
  const [filter, setFilter] = useState(/** @type {IlwsFilterId} */ ('ALL'))
  const [inspectRow, setInspectRow] = useState(/** @type {Record<string, unknown> | null} */ (null))
  const [modalOpen, setModalOpen] = useState(false)
  const [weaponModalOpen, setWeaponModalOpen] = useState(false)
  const [accessoryModalOpen, setAccessoryModalOpen] = useState(false)
  const [ammoModalOpen, setAmmoModalOpen] = useState(false)
  const [weaponForm, setWeaponForm] = useState(WEAPON_FORM_INITIAL)
  const [accessoryForm, setAccessoryForm] = useState(ACCESSORY_FORM_INITIAL)
  const [ammoForm, setAmmoForm] = useState(AMMO_FORM_INITIAL)
  const [editingId, setEditingId] = useState(/** @type {string | null} */ (null))
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    tacticalCategory: 'MHM',
    technicalDescription: '',
    brand: '',
    serialNo: '',
    quantity: '1',
    calibre: '',
    conditionPercent: '95',
    lastMaintenanceAt: '',
    ballisticType: '',
    linkedWeaponName: '',
  })

  const inspectLiveRow = useMemo(() => {
    if (!inspectRow?.id) return null
    return items.find((r) => r.id === inspectRow.id) ?? inspectRow
  }, [items, inspectRow])

  const sectors = useMemo(() => partitionInventoryBySector(items, 'ALL'), [items])

  const categoryRows = useMemo(() => {
    if (activeCategory === 'weapons') return sectors.weapons
    if (activeCategory === 'attachments') return sectors.optics
    if (activeCategory === 'ammo') return sectors.ammo
    return []
  }, [activeCategory, sectors])

  const categoryFilteredRows = useMemo(
    () => categoryRows.filter((row) => matchesIlwsFilter(filter, row)),
    [categoryRows, filter]
  )

  const enterCategory = useCallback((/** @type {NonNullable<IlwsActiveCategory>} */ cat) => {
    setActiveCategory(cat)
    setFilter('ALL')
  }, [])

  const exitCategory = useCallback(() => {
    setActiveCategory(null)
    setFilter('ALL')
  }, [])

  const openCreateWeapon = useCallback(() => {
    setWeaponForm({ ...WEAPON_FORM_INITIAL })
    setWeaponModalOpen(true)
  }, [])

  const openCreateAccessory = useCallback(() => {
    setAccessoryForm({ ...ACCESSORY_FORM_INITIAL })
    setAccessoryModalOpen(true)
  }, [])

  const openCreateAmmo = useCallback(() => {
    setAmmoForm({ ...AMMO_FORM_INITIAL })
    setAmmoModalOpen(true)
  }, [])

  const commitDeploymentBatch = useCallback(
    async (batchOps) => {
      if (!uid) throw new Error('Oturum gerekli')
      return runAudazFirestore(() => audazCommitDeploymentBatch(uid, batchOps))
    },
    [uid]
  )

  useEffect(() => {
    if (!weaponModalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) setWeaponModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [weaponModalOpen, saving])

  useEffect(() => {
    if (!accessoryModalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) setAccessoryModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [accessoryModalOpen, saving])

  useEffect(() => {
    if (!ammoModalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) setAmmoModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ammoModalOpen, saving])

  const handleAmmoSave = async (e) => {
    e.preventDefault()
    const caliberName = ammoForm.caliberName.trim()
    if (!caliberName) return
    const calibre = ammoForm.calibre.trim() || caliberName
    const initialStock = Math.max(0, Math.floor(invNum(ammoForm.initialStock)))
    const criticalThreshold = Math.max(1, Math.floor(invNum(ammoForm.criticalThreshold) || DEFAULT_CRITICAL_THRESHOLD))
    const unitPrice = Math.max(0, Math.round(invNum(ammoForm.unitPrice) * 100) / 100)
    const created = todayIsoDate()
    setSaving(true)
    try {
      await addItem({
        name: caliberName,
        caliber_name: caliberName,
        calibre,
        tacticalCategory: 'MHM',
        category: 'Mühimmat',
        quantity: initialStock,
        current_stock: initialStock,
        critical_threshold: criticalThreshold,
        unitPrice,
        ammo_transaction_logs:
          initialStock > 0
            ? [
                {
                  date: created,
                  type: 'İKMAL',
                  amount: initialStock,
                  note: 'Başlangıç stoku',
                  balanceAfter: initialStock,
                },
              ]
            : [],
        operationalStatus: 'AKTİF',
        created_at: created,
        ...ammoBallisticPatchFromForm(ammoForm),
      })
      setAmmoModalOpen(false)
      setAmmoForm({ ...AMMO_FORM_INITIAL })
    } finally {
      setSaving(false)
    }
  }

  const handleAccessorySave = async (e) => {
    e.preventDefault()
    const name = accessoryForm.name.trim()
    if (!name) return
    const kind = resolveAccessoryKind(accessoryForm.accessoryKind)
    setSaving(true)
    try {
      await addItem({
        name,
        tacticalCategory: 'OPT',
        category: 'Optik',
        accessoryKind: kind,
        technicalDescription: accessoryForm.technicalDescription.trim(),
        brand: accessoryForm.brand.trim(),
        serialNo: accessoryForm.serialNo.trim() || null,
        quantity: 1,
        operationalStatus: 'BOŞTA',
        attachmentLink: 'YOK',
        mountedOnWeaponId: null,
        linkedWeaponName: null,
        maintenance_logs: [],
        created_at: todayIsoDate(),
        ...opticBallisticPatchFromForm(accessoryForm),
      })
      setAccessoryModalOpen(false)
      setAccessoryForm({ ...ACCESSORY_FORM_INITIAL })
    } finally {
      setSaving(false)
    }
  }

  const handleWeaponSave = async (e) => {
    e.preventDefault()
    const name = weaponForm.name.trim()
    if (!name) return
    const tc = resolveWeaponTacticalCategory(weaponForm.tacticalCategory)
    setSaving(true)
    try {
      await addItem({
        name,
        tacticalCategory: tc,
        category: 'Silah',
        weaponType: weaponTypeFromCategory(tc),
        technicalDescription: weaponForm.technicalDescription.trim(),
        brand: weaponForm.brand.trim(),
        serialNo: weaponForm.serialNo.trim() || null,
        calibre: weaponForm.calibre.trim() || null,
        quantity: 1,
        operationalStatus: 'AKTİF',
        attachmentLink: 'YOK',
        manual_rounds_fired: 0,
        total_rounds_fired: 0,
        max_barrel_life: defaultMaxBarrelLifeForCategory(tc),
        maintenance_logs: [],
        maintenance_required: false,
        attached_accessory_id: null,
        conditionPercent: 100,
        created_at: todayIsoDate(),
        ...weaponBallisticPatchFromForm(weaponForm),
      })
      setWeaponModalOpen(false)
      setWeaponForm({ ...WEAPON_FORM_INITIAL })
    } finally {
      setSaving(false)
    }
  }

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm({
      name: '',
      tacticalCategory: 'MHM',
      technicalDescription: '',
      brand: '',
      serialNo: '',
      quantity: '1',
      calibre: '',
      conditionPercent: '95',
      lastMaintenanceAt: '',
      ballisticType: '',
      linkedWeaponName: '',
    })
    setModalOpen(true)
  }, [])

  useEffect(() => {
    if (!modalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, saving])

  const legacyCategory = (tc) => {
    if (tc === 'MHM') return 'Mühimmat'
    if (tc === 'OPT') return 'Optik'
    if (isWeaponTacticalCategoryId(tc)) return 'Silah'
    return 'Ekipman'
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    const tc = form.tacticalCategory
    const qty = Math.max(0, Math.floor(invNum(form.quantity)))
    const cond = Math.min(100, Math.max(1, Math.floor(invNum(form.conditionPercent) || 95)))
    /** @type {Record<string, unknown>} */
    const payload = {
      name,
      tacticalCategory: tc,
      category: legacyCategory(tc),
      technicalDescription: form.technicalDescription.trim(),
      brand: form.brand.trim(),
      serialNo: form.serialNo.trim() || null,
      quantity: qty,
      calibre: form.calibre.trim() || null,
      operationalStatus: 'AKTİF',
      attachmentLink: 'YOK',
    }
    if (isWeaponTacticalCategoryId(tc)) {
      const wtc = resolveWeaponTacticalCategory(tc)
      payload.weaponType = weaponTypeFromCategory(wtc)
      payload.manual_rounds_fired = 0
      payload.total_rounds_fired = 0
      payload.max_barrel_life = defaultMaxBarrelLifeForCategory(wtc)
      payload.maintenance_logs = []
      payload.attached_accessory_id = null
      payload.conditionPercent = cond
      payload.lastMaintenanceAt = form.lastMaintenanceAt.trim() || null
    } else if (tc === 'OPT') {
      payload.conditionPercent = null
      payload.lastMaintenanceAt = null
      payload.operationalStatus = 'BOŞTA'
      payload.linkedWeaponName = form.linkedWeaponName.trim() || null
      payload.attachmentLink = form.linkedWeaponName.trim() ? 'MOUNTED' : 'YOK'
    } else if (tc === 'MHM') {
      payload.ballisticType = form.ballisticType.trim() || null
      payload.conditionPercent = null
      payload.lastMaintenanceAt = null
      payload.caliber_name = name
      payload.current_stock = qty
      payload.critical_threshold = DEFAULT_CRITICAL_THRESHOLD
      payload.ammo_transaction_logs =
        qty > 0
          ? [{ date: todayIsoDate(), type: 'İKMAL', amount: qty, note: 'Başlangıç stoku', balanceAfter: qty }]
          : []
    } else {
      payload.conditionPercent = null
      payload.lastMaintenanceAt = null
    }

    setSaving(true)
    try {
      if (editingId) await updateItem(editingId, payload)
      else await addItem(payload)
      setModalOpen(false)
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const handlePatch = useCallback(
    async (id, patch) => {
      await updateItem(id, patch)
    },
    [updateItem]
  )

  return (
    <div className="ilws-shell relative mx-auto w-full min-w-0 max-w-[1480px] px-3 py-5 pt-12 sm:px-4 sm:pt-14 md:px-6">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <HudFluffDecor />
      </div>

      <div className="relative z-[2] w-full min-w-0 space-y-3">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base font-bold tracking-[0.08em] text-app-text sm:text-lg md:text-xl">
              Cephanelik
            </h1>
          </div>
          <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:shrink-0 sm:items-end">
            <HudTicker className="text-left sm:text-right" />
            {activeCategory !== 'weapons' && activeCategory !== 'attachments' && activeCategory !== 'ammo' ? (
              <button
                type="button"
                onClick={openCreate}
                disabled={!ready}
                className="inline-flex w-full items-center justify-center gap-2 rounded border border-accent/45 bg-accent/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_14px_-4px_rgba(255,180,0,0.35)] hover:bg-accent/18 disabled:opacity-50 sm:w-auto"
              >
                <Plus className="size-3.5" strokeWidth={2} aria-hidden />
                <span className="truncate">+ YENİ_ENVANTER_KAYDI</span>
              </button>
            ) : null}
          </div>
        </div>

        <TacticalPanel className="border-[#004DFF]/20 bg-[#0c0c0e]/96 p-0 backdrop-blur-sm">
          {activeCategory ? (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-app-bg px-3 py-2 sm:px-4">
              <span className="mr-1 font-mono-technical text-[8px] uppercase tracking-widest text-app-text/45">FİLTRE</span>
              {ILWS_FILTERS.filter((f) => {
                if (f.id === 'ALL') return true
                if (activeCategory === 'weapons') return isWeaponTacticalCategoryId(f.id)
                if (activeCategory === 'attachments') return f.id === 'OPT'
                if (activeCategory === 'ammo') return f.id === 'MHM'
                return false
              }).map((f) => {
                const Icon = FILTER_ICONS[f.id] ?? LayoutGrid
                return (
                  <FilterChip
                    key={f.id}
                    active={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    icon={<Icon className="size-3.5" strokeWidth={1.5} />}
                    code={f.code}
                  />
                )
              })}
            </div>
          ) : null}

          <div className="p-3 sm:p-4">
            {listenError ? (
              <p className="mb-2 font-mono-technical text-[10px] text-amber-400/90">VERİ_KANALI_UYARISI · YENİDEN_DENE</p>
            ) : null}
            {!ready ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <span className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
              </div>
            ) : loading && items.length === 0 ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <span className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[32vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/12 bg-black/30 py-12">
                <Lock className="size-12 text-slate-700" strokeWidth={1} aria-hidden />
                <p className="font-mono-technical text-[10px] uppercase tracking-widest text-app-text/45">
                  CEPHANELİK_BOŞ · LOJİSTİK_DESTEK_BEKLENİYOR
                </p>
                {activeCategory !== 'weapons' && activeCategory !== 'attachments' && activeCategory !== 'ammo' ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="rounded border border-accent/40 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase text-accent"
                  >
                    + YENİ_ENVANTER_KAYDI
                  </button>
                ) : null}
              </div>
            ) : activeCategory === null ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <IlwsCategoryHubCard
                  title="SİLAHLARIM"
                  modelVariant="pistol"
                  imageSrc={canikImg}
                  imageAlt="Silah envanteri"
                  imagePriority="high"
                  onEnter={() => enterCategory('weapons')}
                />
                <IlwsCategoryHubCard
                  title="AKSESUARLARIM"
                  modelVariant="reddot"
                  imageSrc={optikImg}
                  imageAlt="Aksesuar envanteri"
                  imagePriority="high"
                  onEnter={() => enterCategory('attachments')}
                />
                <IlwsCategoryHubCard
                  title="MÜHİMMAT DEPOSU"
                  modelVariant="cartridge"
                  imageSrc={muhimmatImg}
                  imageAlt="Mühimmat envanteri"
                  imagePriority="auto"
                  onEnter={() => enterCategory('ammo')}
                />
              </div>
            ) : activeCategory === 'weapons' ? (
              <WeaponsDeepDive
                weapons={categoryFilteredRows}
                allItems={items}
                rangeLogs={rangeLogs}
                imageSrc={canikImg}
                onBack={exitCategory}
                onAddWeapon={openCreateWeapon}
                updateItem={updateItem}
                deleteItem={deleteItem}
                commitDeploymentBatch={commitDeploymentBatch}
              />
            ) : activeCategory === 'attachments' ? (
              <AttachmentsDeepDive
                accessories={categoryFilteredRows}
                weapons={sectors.weapons}
                imageSrc={optikImg}
                auditEntries={auditEntries}
                onBack={exitCategory}
                onAddAccessory={openCreateAccessory}
                updateItem={updateItem}
                deleteItem={deleteItem}
                commitDeploymentBatch={commitDeploymentBatch}
              />
            ) : (
              <AmmoDeepDive
                ammo={categoryFilteredRows}
                weapons={sectors.weapons}
                rangeLogs={rangeLogs}
                imageSrc={muhimmatImg}
                onBack={exitCategory}
                onAddAmmo={openCreateAmmo}
                updateItem={updateItem}
                deleteItem={deleteItem}
              />
            )}
          </div>
        </TacticalPanel>
      </div>

      <WeaponCreateModal
        open={weaponModalOpen}
        saving={saving}
        form={weaponForm}
        onClose={() => !saving && setWeaponModalOpen(false)}
        onChange={(patch) => setWeaponForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleWeaponSave}
      />

      <AccessoryCreateModal
        open={accessoryModalOpen}
        saving={saving}
        form={accessoryForm}
        onClose={() => !saving && setAccessoryModalOpen(false)}
        onChange={(patch) => setAccessoryForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleAccessorySave}
      />

      <AmmoCreateModal
        open={ammoModalOpen}
        saving={saving}
        form={ammoForm}
        onClose={() => !saving && setAmmoModalOpen(false)}
        onChange={(patch) => setAmmoForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleAmmoSave}
      />

      {modalOpen && activeCategory !== 'weapons' && activeCategory !== 'attachments' && activeCategory !== 'ammo' ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-y-contain bg-black/75 p-3 backdrop-blur-sm [-webkit-overflow-scrolling:touch] sm:flex sm:items-center sm:justify-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Kapat"
            onClick={() => !saving && setModalOpen(false)}
          />
          <TacticalPanel className="relative z-[1] mx-auto my-3 w-full max-w-lg border-[#004DFF]/25 bg-app-bg/98 p-0 shadow-2xl backdrop-blur-md sm:my-0">
            <div className="border-b border-white/10 bg-app-bg px-3 py-2 sm:px-4">
              <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/90">
                {editingId ? 'ENVANTER_DÜZENLE' : 'YENİ_ENVANTER_KAYDI'}
              </p>
            </div>
            <form
              onSubmit={handleSave}
              className="max-h-[calc(100dvh-5.5rem)] space-y-3 overflow-y-auto overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch] sm:max-h-none sm:overflow-visible sm:px-4 sm:py-4"
            >
              <label className="block">
                <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">ÖĞE_ADI</span>
                <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </label>
              <label className="block">
                <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">KOD_KATEGORİ</span>
                <select
                  className={`${selectClass} mt-1`}
                  value={form.tacticalCategory}
                  onChange={(e) => setForm((f) => ({ ...f, tacticalCategory: e.target.value }))}
                >
                  {TACTICAL_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">TEKNİK_TANIM</span>
                <textarea
                  className={`${inputClass} min-h-[3rem] resize-y border border-white/10 bg-black/30 px-2 py-2`}
                  value={form.technicalDescription}
                  onChange={(e) => setForm((f) => ({ ...f, technicalDescription: e.target.value }))}
                  rows={2}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">MARKA</span>
                  <input className={inputClass} value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
                </label>
                <label className="block">
                  <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">SERİ_NO</span>
                  <input className={inputClass} value={form.serialNo} onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">ADET</span>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    required
                  />
                </label>
                <label className="block">
                  <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">KALİBRE</span>
                  <input className={inputClass} value={form.calibre} onChange={(e) => setForm((f) => ({ ...f, calibre: e.target.value }))} />
                </label>
              </div>
              {isWeaponTacticalCategoryId(form.tacticalCategory) ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">KONDİSYON_%</span>
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      min={1}
                      max={100}
                      value={form.conditionPercent}
                      onChange={(e) => setForm((f) => ({ ...f, conditionPercent: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">SON_BAKIM</span>
                    <input
                      type="date"
                      className={`${inputClass} rounded border border-white/10 bg-black/25 px-2`}
                      value={form.lastMaintenanceAt}
                      onChange={(e) => setForm((f) => ({ ...f, lastMaintenanceAt: e.target.value }))}
                    />
                  </label>
                </div>
              ) : null}
              {form.tacticalCategory === 'OPT' ? (
                <label className="block">
                  <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">
                    BAĞLI_SİLAH (CANIK_YP9 vb.)
                  </span>
                  <input
                    className={inputClass}
                    value={form.linkedWeaponName}
                    onChange={(e) => setForm((f) => ({ ...f, linkedWeaponName: e.target.value }))}
                    placeholder="CANIK_YP9"
                  />
                </label>
              ) : null}
              {form.tacticalCategory === 'MHM' ? (
                <label className="block">
                  <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">BALİSTİK_TİP</span>
                  <input
                    className={inputClass}
                    value={form.ballisticType}
                    onChange={(e) => setForm((f) => ({ ...f, ballisticType: e.target.value }))}
                    placeholder="FMJ · 5.56"
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded border border-white/15 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/70 hover:bg-white/5"
                >
                  İPTAL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded border border-accent/45 bg-accent/12 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent disabled:opacity-50"
                >
                  {saving ? '…' : editingId ? 'GÜNCELLE' : 'KAYDET'}
                </button>
              </div>
            </form>
          </TacticalPanel>
        </div>
      ) : null}

      <IlwsInspectionTerminal row={inspectLiveRow} onClose={() => setInspectRow(null)} onPatch={handlePatch} />
    </div>
  )
}
