import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import { buildIfakInventoryPayload } from '../../lib/ifakInventoryPayload'
import { computeIfakExpiryStatus } from '../../lib/ifakExpiration'
import { IFAK_INITIAL_ITEM_FORM, IFAK_ITEM_CATEGORIES } from '../../lib/tcccHealthConstants'

const inputClass =
  'w-full rounded border border-accent/30 bg-black/40 px-2.5 py-2 font-mono-technical text-sm text-slate-100 outline-none ring-0 placeholder:text-app-text/45 focus:border-accent/55 [color-scheme:dark]'

const labelClass =
  'mb-1.5 block font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/30 bg-black/40 py-2 pl-2 pr-8 font-mono-technical text-sm uppercase text-slate-100 outline-none focus:border-accent/55'

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
  OK: 'border-accent/25 text-accent',
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

  const modal =
    modalOpen && typeof document !== 'undefined' ? (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4">
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Kapat"
          onClick={() => !saving && setModalOpen(false)}
        />
        <TacticalPanel className="relative z-[1] w-full max-w-lg border-accent/20 bg-app-bg/98 p-0 shadow-2xl backdrop-blur-md">
          <div className="border-b border-white/10 bg-app-bg px-3 py-2 sm:px-4">
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/90">
              {editingId ? 'KALEM_GÜNCELLE' : '+ YENİ_IFAK_KALEMİ'}
            </p>
            <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">
              IFAK · KATEGORİ · STOK · SKT
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-3 py-4 sm:px-4">
            <label className="block w-full">
              <span className={labelClass}>KALEM_ADI</span>
              <input
                className={inputClass}
                placeholder="Turnike, gazlı bez…"
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                required
              />
            </label>

            <label className="block w-full">
              <span className={labelClass}>KATEGORİ</span>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={selectClass}
              >
                {IFAK_ITEM_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid w-full gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className={labelClass}>MİKTAR</span>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                />
              </label>
              <label className="block min-w-0">
                <span className={labelClass}>SON_KULLANMA (SKT)</span>
                <input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => setForm((f) => ({ ...f, expirationDate: e.target.value }))}
                  required
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded border border-white/15 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/70 hover:bg-white/5 disabled:opacity-50"
              >
                İPTAL
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded border border-accent/45 bg-accent/12 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent disabled:opacity-50"
              >
                {saving ? '…' : 'KAYDET'}
              </button>
            </div>
          </form>
        </TacticalPanel>
      </div>
    ) : null

  return (
    <section aria-label="IFAK envanter">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
          <span className="font-mono-technical text-xs font-bold tracking-[0.28em] text-accent">
            IFAK & Malzeme Takibi
          </span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/18 disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
          KALEM EKLE
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <span className="size-8 animate-spin rounded-full border-2 border-accent/70 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-accent/25 bg-black/40">
          <Package className="size-14 text-accent/25" aria-hidden />
          <p className="mt-3 font-mono-technical text-[10px] uppercase text-app-text/45">ENVANTER BOŞ</p>
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
                    className="rounded-md p-1.5 text-app-text/55 hover:text-accent"
                    aria-label="Düzenle"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => deleteItem(row.id)}
                    className="rounded-md p-1.5 text-app-text/55 hover:text-red-400"
                    aria-label="Sil"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
                {st === 'CRITICAL_EXPIRED' ? (
                  <AlertTriangle className="mb-2 size-4 text-amber-400" aria-hidden />
                ) : null}
                <p className="truncate pr-12 font-mono-technical text-[9px] uppercase text-app-text/55">
                  {toStr(row.category)}
                </p>
                <p className="truncate pr-10 font-display text-sm font-bold text-app-text">
                  {toStr(row.itemName || row.name)}
                </p>
                <div className="mt-3 flex items-end justify-between gap-4 font-mono-technical tabular-nums">
                  <span className="text-2xl text-accent">{toNum(row.quantity)}</span>
                  <div className="text-right">
                    <p className="text-[9px] uppercase text-app-text/45">SKT</p>
                    <p className="text-sm">{toStr(row.expirationDate).replace(/-/g, '.')}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase">{st}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal ? createPortal(modal, document.body) : null}
    </section>
  )
}
