/**
 * @param {{
 *   nav: import('react').ReactNode
 *   children: import('react').ReactNode
 * }} props
 */
export default function GuideShell({ nav, children }) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <aside className="shrink-0 lg:sticky lg:top-4 lg:w-56 xl:w-64">
        <p className="mb-2 px-1 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-amber-500/70">
          [ İÇİNDEKİLER ]
        </p>
        {nav}
      </aside>
      <div className="min-w-0 flex-1 space-y-10">{children}</div>
    </div>
  )
}
