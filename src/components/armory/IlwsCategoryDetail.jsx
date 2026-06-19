import IlwsInventoryCard from './IlwsInventoryCard'
import TacticalPanel from '../ui/TacticalPanel'

/**
 * @param {{
 *   title: string
 *   rows: Record<string, unknown>[]
 *   cardVariant: 'weapon' | 'optic' | 'ammo'
 *   emptyHint: string
 *   onBack: () => void
 *   onOpen: (row: Record<string, unknown>) => void
 *   onBumpQty: (id: string, delta: number, e: import('react').MouseEvent) => void
 *   onBumpCondition?: (id: string, delta: number, e: import('react').MouseEvent) => void
 *   onBumpAttachmentHistory?: (id: string, delta: number, e: import('react').MouseEvent) => void
 * }} props
 */
export default function IlwsCategoryDetail({
  title,
  rows,
  cardVariant,
  emptyHint,
  onBack,
  onOpen,
  onBumpQty,
  onBumpCondition,
  onBumpAttachmentHistory,
}) {
  return (
    <TacticalPanel className="border-white/10 bg-black/35 p-0">
      <div className="border-b border-white/10 bg-app-bg px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-2 rounded border border-accent/50 bg-accent/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_12px_-4px_rgba(255,180,0,0.4)] transition hover:bg-accent/20"
        >
          <span aria-hidden>↩️</span>
          GERİ DÖN / RETURN
        </button>
        <p className="font-display text-base font-bold uppercase tracking-[0.14em] text-app-text sm:text-lg">{title}</p>
      </div>

      <div className="max-h-[min(70vh,42rem)] space-y-3 overflow-y-auto p-3 op-detay-col-scroll sm:p-4">
        {rows.length === 0 ? (
          <p className="py-12 text-center font-mono-technical text-[10px] uppercase tracking-widest text-app-text/45">{emptyHint}</p>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-3">
            {rows.map((row) => (
              <IlwsInventoryCard
                key={row.id}
                row={row}
                variant={cardVariant}
                onOpen={onOpen}
                onBumpQty={onBumpQty}
                onBumpCondition={onBumpCondition}
                onBumpAttachmentHistory={onBumpAttachmentHistory}
              />
            ))}
          </div>
        )}
      </div>
    </TacticalPanel>
  )
}
