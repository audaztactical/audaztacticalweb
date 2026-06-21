import SuccessScorePreview from '../SuccessScorePreview'

/**
 * @param {{
 *   successPercent: number
 *   compromised?: boolean
 *   submitBlockedReason?: string | null
 *   saving?: boolean
 *   canSubmit?: boolean
 *   submitLabel: string
 *   savingLabel?: string
 *   successMessage?: string | null
 *   errorMessage?: string | null
 * }} props
 */
export default function TrainingStatusBar({
  successPercent,
  compromised = false,
  submitBlockedReason = null,
  saving = false,
  canSubmit = true,
  submitLabel,
  savingLabel = 'AKTARILIYOR…',
  successMessage = null,
  errorMessage = null,
}) {
  return (
    <>
      {successMessage ? (
        <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-accent">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 rounded border border-accent/15 bg-black/40 p-3">
        <SuccessScorePreview percent={successPercent} compromised={compromised} />
        {submitBlockedReason && !saving ? (
          <p className="w-full rounded border border-amber-500/35 bg-amber-950/20 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase text-amber-300/95">
            {submitBlockedReason}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="w-full rounded border border-accent/55 bg-accent/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? savingLabel : submitLabel}
        </button>
      </div>
    </>
  )
}
