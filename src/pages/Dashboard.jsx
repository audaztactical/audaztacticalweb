import { lazy, Suspense } from 'react'
import { isNeuralPreviewEnabled } from '../lib/neural/neuralPreview'
import DashboardClassic from './DashboardClassic'

const OperatorBrain = lazy(() => import('../components/neural/OperatorBrain'))

/**
 * Dashboard yönlendirici.
 * neuralOnly: kenardan kenara Operatör Beyni (kabuk padding/max-width yok).
 * Aksi halde klasik DashboardClassic.
 */
export default function Dashboard() {
  const neuralOnly = isNeuralPreviewEnabled()

  if (neuralOnly) {
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

  return <DashboardClassic />
}
