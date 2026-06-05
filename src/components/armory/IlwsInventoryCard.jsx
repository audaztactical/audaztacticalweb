import {
  categoryRibbonLabel,
  getAttachmentHistoryCount,
  getAmmoMunitionType,
  getBallisticType,
  getConditionPercent,
  getMaintenanceLogPreview,
  getOpticStatusLabel,
  getTacticalCategory,
  getTechnicalDescription,
  invNum,
  invStr,
  isWeaponCategory,
  stokKodu,
} from '../../lib/inventoryIlws'

const btnMini =
  'rounded border border-white/15 px-1.5 py-0.5 font-mono text-[11px] text-slate-400 hover:border-[#ffb400]/40 hover:text-[#ffb400]'

/**
 * @param {{
 *   row: Record<string, unknown>
 *   variant?: 'weapon' | 'optic' | 'ammo' | 'base'
 *   onOpen: (row: Record<string, unknown>) => void
 *   onBumpQty: (id: string, delta: number, e: import('react').MouseEvent) => void
 *   onBumpCondition?: (id: string, delta: number, e: import('react').MouseEvent) => void
 *   onBumpAttachmentHistory?: (id: string, delta: number, e: import('react').MouseEvent) => void
 * }} props
 */
export default function IlwsInventoryCard({
  row,
  variant = 'base',
  onOpen,
  onBumpQty,
  onBumpCondition,
  onBumpAttachmentHistory,
}) {
  const id = String(row.id)
  const cat = getTacticalCategory(row)
  const qty = invNum(row.quantity)
  const critAmmo = cat === 'MHM' && qty < 100
  const weapon = variant === 'weapon' || isWeaponCategory(row)
  const optic = variant === 'optic'
  const ammo = variant === 'ammo'
  const cond = getConditionPercent(row)
  const maintPreview = getMaintenanceLogPreview(row, 2)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(row)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(row)
        }
      }}
      className="ilws-card-brackets relative flex cursor-pointer flex-col gap-2 rounded-lg border border-white/10 bg-black/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[#00FF41]/25 hover:bg-black/50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
          STOK_KODU: {stokKodu(id)}
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {critAmmo || (ammo && qty < 100) ? (
            <span className="animate-pulse rounded border border-red-500/60 bg-red-950/40 px-1.5 py-0.5 font-mono-technical text-[7px] font-bold uppercase tracking-wide text-red-400 shadow-[0_0_12px_rgba(255,0,0,0.35)]">
              [ ⚠️ CEP_KRİTİK ]
            </span>
          ) : null}
          {weapon ? (
            <span className="rounded border border-[#00FF41]/35 bg-[#00FF41]/8 px-1.5 py-0.5 font-mono-technical text-[7px] font-bold uppercase tracking-wide text-[#00FF41]/90">
              [ %{cond}_YİV_SET ]
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 px-1">
        <p className="font-mono-technical text-[7px] uppercase tracking-wider text-slate-600">ÖĞE_ADI</p>
        <h2 className="font-display text-base font-bold leading-tight tracking-wide text-white">{invStr(row.name) || '—'}</h2>
        <p className="mt-1 font-mono-technical text-[7px] uppercase tracking-wider text-slate-600">TEKNİK_TANIM</p>
        <p className="line-clamp-2 font-mono-technical text-[10px] leading-snug text-slate-500">{getTechnicalDescription(row)}</p>
      </div>

      {weapon ? (
        <div
          className="space-y-2 border-t border-white/[0.06] pt-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono-technical text-[8px] uppercase text-slate-600">
            <span>
              KONDİSYON: <span className="text-[#00FF41]/90">{cond}%</span>
            </span>
            {onBumpCondition ? (
              <div className="flex gap-1">
                <button type="button" className={btnMini} onClick={(e) => onBumpCondition(id, -5, e)} aria-label="Kondisyon azalt">
                  [ − ]
                </button>
                <button type="button" className={btnMini} onClick={(e) => onBumpCondition(id, 5, e)} aria-label="Kondisyon artır">
                  [ + ]
                </button>
              </div>
            ) : null}
          </div>
          <div>
            <p className="mb-1 font-mono-technical text-[7px] font-bold uppercase tracking-wider text-slate-600">SİLAH_BAKIM_GÜNLÜĞÜ</p>
            <ul className="space-y-1 font-mono text-[9px] leading-snug text-[#00FF41]/80">
              {maintPreview.map((log, i) => (
                <li key={`${log.date}-${i}`} className="break-words">
                  [{log.date}] {log.text} · DURUM: {log.status}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {optic ? (
        <div
          className="space-y-2 border-t border-white/[0.06] pt-2 font-mono-technical text-[8px] uppercase tracking-wide"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <p className="text-[#7ab4ff]/90">{getOpticStatusLabel(row)}</p>
          {onBumpAttachmentHistory ? (
            <div className="flex items-center justify-between text-slate-600">
              <span>EKLENTİ_KAYIT: {getAttachmentHistoryCount(row)}</span>
              <div className="flex gap-1">
                <button type="button" className={btnMini} onClick={(e) => onBumpAttachmentHistory(id, -1, e)}>
                  [ − ]
                </button>
                <button type="button" className={btnMini} onClick={(e) => onBumpAttachmentHistory(id, 1, e)}>
                  [ + ]
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {ammo ? (
        <div className="space-y-1 border-t border-white/[0.06] pt-2 font-mono-technical text-[8px] uppercase tracking-wide text-slate-600">
          <p>
            BALİSTİK_TİP: <span className="text-slate-300">{getBallisticType(row)}</span>
          </p>
          <p>
            MHM_TÜRÜ: <span className="text-slate-300">{getAmmoMunitionType(row)}</span>
          </p>
        </div>
      ) : null}

      <div
        className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-2 font-mono-technical text-[8px] uppercase tracking-wide text-slate-600"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <span>
          ADET: <span className="tabular-nums text-slate-300">{qty.toLocaleString('tr-TR')}</span>
        </span>
        <span>
          KATEGORİ: <span className="text-slate-300">{categoryRibbonLabel(cat)}</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={(e) => onBumpQty(id, -1, e)} className={btnMini} aria-label="Adet azalt">
            [ − ]
          </button>
          <button type="button" onClick={(e) => onBumpQty(id, 1, e)} className={btnMini} aria-label="Adet artır">
            [ + ]
          </button>
        </div>
      </div>
    </article>
  )
}
