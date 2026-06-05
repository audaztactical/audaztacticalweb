import MatrixWireVisualizer from './MatrixWireVisualizer'
import IlwsInventoryCard from './IlwsInventoryCard'
import TacticalPanel from '../ui/TacticalPanel'

/**
 * @param {{
 *   title: string
 *   subtitle: string
 *   modelVariant: 'pistol' | 'reddot' | 'cartridge'
 *   imageSrc: string
 *   imageAlt?: string
 *   modelLabel: string
 *   analysisLines: string[]
 *   rows: Record<string, unknown>[]
 *   cardVariant: 'weapon' | 'optic' | 'ammo'
 *   onOpen: (row: Record<string, unknown>) => void
 *   onBumpQty: (id: string, delta: number, e: import('react').MouseEvent) => void
 *   onBumpCondition?: (id: string, delta: number, e: import('react').MouseEvent) => void
 *   onBumpAttachmentHistory?: (id: string, delta: number, e: import('react').MouseEvent) => void
 *   emptyHint: string
 * }} props
 */
export default function IlwsSectorPanel({
  title,
  subtitle,
  modelVariant,
  imageSrc,
  imageAlt,
  modelLabel,
  analysisLines,
  rows,
  cardVariant,
  onOpen,
  onBumpQty,
  onBumpCondition,
  onBumpAttachmentHistory,
  emptyHint,
}) {
  return (
    <TacticalPanel className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/35 p-0">
      <div className="shrink-0 border-b border-white/10 bg-[#080808] px-3 py-2">
        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#ffb400]/85">{title}</p>
        <p className="mt-0.5 font-mono-technical text-[7px] uppercase tracking-wider text-slate-600">{subtitle}</p>
      </div>
      <MatrixWireVisualizer
        variant={modelVariant}
        imageSrc={imageSrc}
        imageAlt={imageAlt}
        label={modelLabel}
        analysisLines={analysisLines}
      />
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 op-detay-col-scroll max-h-[28rem]">
        {rows.length === 0 ? (
          <p className="py-6 text-center font-mono-technical text-[9px] uppercase tracking-widest text-slate-600">{emptyHint}</p>
        ) : (
          rows.map((row) => (
            <IlwsInventoryCard
              key={row.id}
              row={row}
              variant={cardVariant}
              onOpen={onOpen}
              onBumpQty={onBumpQty}
              onBumpCondition={onBumpCondition}
              onBumpAttachmentHistory={onBumpAttachmentHistory}
            />
          ))
        )}
      </div>
    </TacticalPanel>
  )
}
