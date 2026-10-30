import { lazy, Suspense } from 'react'

const OperatorBrain = lazy(() => import('../components/neural/OperatorBrain'))

/**
 * Dashboard — kenardan kenara Operatör Beyni (kabuk padding/max-width yok).
 * DashboardClassic rotalarda kullanılmıyor; dosya duruyor.
 */
export default function Dashboard() {
  return (
    <div className="ob-dashboard-bleed relative z-[1] flex min-h-0 w-full flex-1 flex-col">
      <Suspense
        fallback={
          <p className="font-mono-technical p-4 text-xs text-slate-500">Operatör Beyni yükleniyor…</p>
        }
      >
        <OperatorBrain fillViewport />
      </Suspense>
    </div>
  )
}
