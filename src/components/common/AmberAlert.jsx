export default function AmberAlert({ children, label = '[ UYARI ]' }) {
  return (
    <div className="rounded-lg border border-amber-500/45 bg-amber-950/35 px-3 py-2.5 font-mono-technical text-xs leading-relaxed text-amber-200/95 shadow-[inset_0_1px_0_rgba(251,191,36,0.08)]">
      <span className="text-amber-400/90">{label}</span> {children}
    </div>
  )
}
