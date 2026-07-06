import { useCallback, useEffect, useState } from 'react'
import BallisticInfoCollapsible from './BallisticInfoCollapsible'
import {
  ammoBallisticFormFromRow,
  ammoBallisticPatchFromForm,
  hasAmmoBallisticData,
  hasOpticBallisticData,
  hasWeaponBallisticData,
  opticBallisticFormFromRow,
  opticBallisticPatchFromForm,
  weaponBallisticFormFromRow,
  weaponBallisticPatchFromForm,
} from '../../lib/inventoryBallisticFields'

/**
 * @param {{
 *   kind: 'weapon' | 'optic' | 'ammo'
 *   row: Record<string, unknown>
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 * }} props
 */
export default function InventoryBallisticEditPanel({ kind, row, updateItem }) {
  const [form, setForm] = useState(() => formFromRow(kind, row))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(formFromRow(kind, row))
  }, [row, kind])

  const autoExpand = hasData(kind, row)

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault()
      if (!row?.id) return
      setSaving(true)
      try {
        const patch = patchFromForm(kind, form)
        await updateItem(String(row.id), patch)
      } finally {
        setSaving(false)
      }
    },
    [form, kind, row, updateItem],
  )

  return (
    <form onSubmit={handleSave} className="space-y-2 border-b border-white/10 pb-3">
      <BallisticInfoCollapsible
        kind={kind}
        values={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        autoExpand={autoExpand}
      />
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded border border-emerald-500/35 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
      >
        {saving ? '…' : 'BALİSTİK BİLGİLERİ KAYDET'}
      </button>
    </form>
  )
}

/**
 * @param {'weapon' | 'optic' | 'ammo'} kind
 * @param {Record<string, unknown>} row
 */
function formFromRow(kind, row) {
  if (kind === 'weapon') return weaponBallisticFormFromRow(row)
  if (kind === 'optic') return opticBallisticFormFromRow(row)
  return ammoBallisticFormFromRow(row)
}

/**
 * @param {'weapon' | 'optic' | 'ammo'} kind
 * @param {Record<string, unknown>} form
 */
function patchFromForm(kind, form) {
  if (kind === 'weapon') return weaponBallisticPatchFromForm(form)
  if (kind === 'optic') return opticBallisticPatchFromForm(form)
  return ammoBallisticPatchFromForm(form)
}

/**
 * @param {'weapon' | 'optic' | 'ammo'} kind
 * @param {Record<string, unknown>} row
 */
function hasData(kind, row) {
  if (kind === 'weapon') return hasWeaponBallisticData(row)
  if (kind === 'optic') return hasOpticBallisticData(row)
  return hasAmmoBallisticData(row)
}
