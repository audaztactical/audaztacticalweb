/**
 * Minimal yükleme izlenimi — metin yerine yapı + tarama
 */
export function MetricCardSkeleton() {
  return (
    <div className="hud-scanning glass-card flex animate-pulse flex-col p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <div className="size-9 rounded-lg bg-white/10" />
        <div className="h-4 w-24 rounded bg-white/10" />
      </div>
      <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-2">
        <div className="h-12 w-20 rounded bg-white/10" />
        <div className="h-3 w-14 rounded bg-white/5" />
      </div>
    </div>
  )
}

export function RowSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="hud-scanning flex animate-pulse items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm"
        >
          <div className="size-10 shrink-0 rounded-lg bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 max-w-[200px] flex-1 rounded bg-white/10" />
            <div className="h-2 max-w-[120px] rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MissionGridSkeleton({ n = 4 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="hud-scanning animate-pulse rounded-xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-lg bg-white/10" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 max-w-[85%] rounded bg-white/10" />
              <div className="h-2 max-w-[50%] rounded bg-white/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
