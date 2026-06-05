/**
 * Live başarı oranı önizlemesi — kayıt öncesi payload ile aynı skor algoritması.
 * @param {{ percent: number; compromised?: boolean }} props
 */
export default function SuccessScorePreview({ percent, compromised = false }) {
  const tone = compromised
    ? 'border-red-500/40 bg-red-950/20 text-red-400'
    : 'border-[#00FF41]/40 bg-[#00FF41]/10 text-[#00FF41]'

  return (
    <p
      className={`w-full rounded border px-3 py-2.5 text-center font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] ${tone}`}
    >
      <span className="text-slate-500">BAŞARI ORANI · </span>
      <span className="text-sm tabular-nums tracking-normal">{percent}%</span>
      {compromised ? (
        <span className="mt-1 block text-[8px] font-bold text-red-300/90">KRİTİK İHLAL · SKOR SIFIRLANDI</span>
      ) : null}
    </p>
  )
}
