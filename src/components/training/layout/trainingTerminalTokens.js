export const inputClass =
  'w-full rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

export const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-app-text outline-none focus:border-accent/60'

export const textareaClass =
  'w-full min-h-[6rem] resize-y rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

export const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

/** @param {boolean} checked */
export const errorCheckClass = (checked) =>
  `flex cursor-pointer items-start gap-2.5 rounded border px-2.5 py-2 transition ${
    checked
      ? 'border-accent/50 bg-accent/10 text-green-400'
      : 'border-white/10 text-zinc-300 hover:border-accent/25 hover:text-zinc-100'
  }`
