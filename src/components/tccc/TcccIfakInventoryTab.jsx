import { useMemo, useState } from 'react'
import { AlertTriangle, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import Input from '../common/Input'
import { buildIfakInventoryPayload } from '../../lib/ifakInventoryPayload'
import { computeIfakExpiryStatus } from '../../lib/ifakExpiration'
import { IFAK_INITIAL_ITEM_FORM, IFAK_ITEM_CATEGORIES } from '../../lib/tcccHealthConstants'

/** @param {unknown} v */
function toStr(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** @param {unknown} v */
function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const statusStyles = {
  OK: 'border-[#00FF41]/25 text-[#00FF41]',
  WARNING: 'border-amber-500/40 text-amber-400',
  CRITICAL_EXPIRED: 'border-red-500/50 text-red-400 animate-pulse',
}

/**
 * @param {{
 *   items: Record<string, unknown>[]
 *   loading: boolean
 *   disabled?: boolean
 *   addItem: (payload: Record<string, unknown>) => Promise<unknown>
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   deleteItem: (id: string) => Promise<unknown>
 *   userId: string
 * }} props
 */
export default function TcccIfakInventoryTab({
  items,
  loading,
  disabled = false,
  addItem,
  updateItem,
  deleteItem,
  userId,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(/** @type {string | null} */ (null))
  const [form, setForm] = useState({ ...IFAK_INITIAL_ITEM_FORM })
  const [saving, setSaving] = useState(false)

  const rows = useMemo(
    () =>
      items.map((row) => {
        const exp = toStr(row.expirationDate || row.expiryDate).slice(0, 10)
        const status = computeIfakExpiryStatus(exp)
        return { ...row, expirationDate: exp, status }
      }),
    [items]
  )

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...IFAK_INITIAL_ITEM_FORM })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      itemName: toStr(row.itemName || row.name),
      category: toStr(row.category) || 'TQ',
      quantity: String(toNum(row.quantity) || 0),
      expirationDate: toStr(row.expirationDate).slice(0, 10),
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = form.itemName.trim()
    if (!name || !form.expirationDate || !userId) return
    setSaving(true)
    try {
      const payload = buildIfakInventoryPayload({
        userId,
        itemName: name,
        category: form.category,
        quantity: form.quantity,
        expirationDate: form.expirationDate,
      })
      if (editingId) await updateItem(editingId, payload)
      else await addItem(payload)
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label="IFAK envanter">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-[#00FF41]" strokeWidth={1.5} aria-hidden />
          <span className="font-mono-technical text-xs font-bold tracking-[0.28em] text-[#00FF41]">
            IFAK KİT ENVANTER YÖNETİMİ
          </span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg border border-[#00FF41]/40 bg-[#00FF41]/10 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] transition hover:bg-[#00FF41]/18 disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
          KALEM EKLE
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <span className="size-8 animate-spin rounded-full border-2 border-[#00FF41]/70 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-[#00FF41]/25 bg-black/40">
          <Package className="size-14 text-[#00FF41]/25" aria-hidden />
          <p className="mt-3 font-mono-technical text-[10px] uppercase text-slate-600">ENVANTER BOŞ</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const st = /** @type {'OK'|'WARNING'|'CRITICAL_EXPIRED'} */ (
              row.status === 'CRITICAL_EXPIRED' || row.status === 'WARNING' || row.status === 'OK'
                ? row.status
                : 'OK'
            )
            return (
              <div
                key={row.id}
                className={[
                  'relative rounded-xl border bg-black/50 p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]',
                  statusStyles[st],
                ].join(' ')}
              >
                <div className="absolute right-2 top-2 flex gap-0.5">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => openEdit(row)}
                    className="rounded-md p-1.5 text-slate-500 hover:text-[#ffb400]"
                    aria-label="Düzenle"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => deleteItem(row.id)}
                    className="rounded-md p-1.5 text-slate-500 hover:text-red-400"
                    aria-label="Sil"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
                {st === 'CRITICAL_EXPIRED' ? (
                  <AlertTriangle className="mb-2 size-4 text-amber-400" aria-hidden />
                ) : null}
                <p className="truncate pr-12 font-mono-technical text-[9px] uppercase text-slate-500">
                  {toStr(row.category)}
                </p>
                <p className="truncate pr-10 font-display text-sm font-bold text-white">
                  {toStr(row.itemName || row.name)}
                </p>
                <div className="mt-3 flex items-end justify-between gap-4 font-mono-technical tabular-nums">
                  <span className="text-2xl text-[#ffb400]">{toNum(row.quantity)}</span>
                  <div className="text-right">
                    <p className="text-[9px] uppercase text-slate-600">SKT</p>
                    <p className="text-sm">{toStr(row.expirationDate).replace(/-/g, '.')}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase">{st}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/88"
            aria-label="Kapat"
            onClick={() => !saving && setModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#00FF41]/30 bg-[#070708] p-6 shadow-[0_0_40px_rgba(0,255,65,0.12)]">
            <p className="mb-4 font-mono-technical text-xs font-bold uppercase tracking-[0.25em] text-[#00FF41]">
              {editingId ? 'KALEM GÜNCELLE' : 'YENİ IFAK KALEMİ'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                variant="gold"
                placeholder="Kalem adı"
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                required
              />
              <label className="block space-y-1">
                <span className="font-mono-technical text-[9px] uppercase text-slate-500">Kategori</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="dossier-blood-select w-full rounded-lg border border-white/15 bg-black/50 py-2 pl-2 pr-8 font-mono-technical text-xs uppercase text-slate-100 focus:border-[#00FF41]/45"
                >
                  {IFAK_ITEM_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                variant="gold"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                required
              />
              <label className="block space-y-1">
                <span className="font-mono-technical text-[9px] uppercase text-slate-500">Son kullanma (SKT)</span>
                <input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => setForm((f) => ({ ...f, expirationDate: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-[#00FF41]/25 bg-black/50 px-3 py-2 font-mono-technical text-xs text-[#00FF41] focus:border-[#00FF41]/55 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg border border-[#00FF41]/50 py-3 font-mono-technical font-bold uppercase text-[#00FF41] disabled:opacity-40"
              >
                {saving ? 'KAYDEDİLİYOR…' : 'KAYDET'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
