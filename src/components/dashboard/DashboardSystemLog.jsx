import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Info,
  ShieldAlert,
} from 'lucide-react'
import { utcHms } from '../../lib/dashboardHudData'

/** @param {string} code @param {string} msg */
function logSeverity(code, msg) {
  const c = code.toUpperCase()
  const m = msg.toUpperCase()
  if (c === 'SHT' || m.includes('OLAY') || m.includes('KRİT') || m.includes('HATA')) return 'critical'
  if (c === 'CEP' || c === 'CEP_GNC' || m.includes('UYARI') || m.includes('Δ')) return 'warning'
  if (c === 'OPS' || c === 'EĞT' || c === 'GÜV') return 'active'
  return 'neutral'
}

const SEVERITY_META = {
  critical: { label: 'KRİTİK', Icon: ShieldAlert, className: 'cmd-log-sev--critical' },
  warning: { label: 'UYARI', Icon: AlertTriangle, className: 'cmd-log-sev--warning' },
  active: { label: 'AKTİF', Icon: Activity, className: 'cmd-log-sev--active' },
  neutral: { label: 'BİLGİ', Icon: Info, className: 'cmd-log-sev--neutral' },
}

/**
 * @param {{ entries: { ms: number, code: string, msg: string }[] }} props
 */
export default function DashboardSystemLog({ entries }) {
  return (
    <section className="cmd-panel cmd-panel--log cmd-glass-panel flex min-h-[300px] flex-col overflow-hidden">
      <div className="cmd-panel__head shrink-0">
        <div>
          <h2 className="cmd-panel__title">Sistem günlüğü</h2>
          <p className="cmd-panel__subtitle">Renk kodlu operasyon akışı</p>
        </div>
      </div>
      <div className="cmd-log-scroll flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        {entries.length === 0 ? (
          <div className="cmd-empty py-8">
            <ClipboardList className="size-7 text-app-text/45" strokeWidth={1.25} aria-hidden />
            <p className="cmd-empty__text mt-2">Henüz kayıt yok.</p>
          </div>
        ) : (
          entries.slice(0, 14).map((e, i) => {
            const sev = logSeverity(e.code, e.msg)
            const meta = SEVERITY_META[sev]
            const SevIcon = meta.Icon
            return (
              <div key={`${e.ms}-${i}`} className={['cmd-log-entry-rich', meta.className].join(' ')}>
                <div className="cmd-log-entry-rich__head">
                  <span className="cmd-log-entry-rich__icon" aria-hidden>
                    <SevIcon className="size-3.5" strokeWidth={2} />
                  </span>
                  <span className="cmd-log-entry-rich__badge">{meta.label}</span>
                  <span className="cmd-log-entry-rich__code">{e.code}</span>
                  <span className="cmd-log-entry-rich__time">{utcHms(e.ms)}</span>
                </div>
                <p className="cmd-log-entry-rich__msg">{e.msg}</p>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
