import { Link } from 'react-router-dom'
import { Construction, ShieldAlert } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import { useAuth } from '../context/AuthContext'

export default function SiteMaintenance() {
  const { userData } = useAuth()

  return (
    <PageShell title="Site Bakımda" subtitle="OPERASYONEL DURAKLATMA">
      <div className="mx-auto max-w-xl space-y-5">
        <section className="relative overflow-hidden rounded-xl border border-amber-500/35 bg-app-bg p-6 shadow-[0_0_32px_-12px_rgba(245,158,11,0.25)]">
          <div className="flex items-start gap-3">
            <Construction className="mt-0.5 size-7 shrink-0 text-amber-400" strokeWidth={1.75} aria-hidden />
            <div>
              <h2 className="font-mono-technical text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
                Sistem bakım modu
              </h2>
              <p className="mt-2 font-mono-technical text-[11px] leading-relaxed text-app-text/80">
                Hesabınız geçici olarak kilitlendi. Operasyonel komuta merkezi planlı bakım /
                erişim kısıtlaması nedeniyle şu an kullanılamıyor.
              </p>
              {userData?.callsign ? (
                <p className="mt-2 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/55">
                  Operatör: {userData.callsign}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 border-t border-amber-500/20 pt-4">
            <Link
              to="/premium-gecis"
              className="inline-flex items-center gap-2 rounded border border-accent/55 bg-accent/12 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/20"
            >
              <ShieldAlert className="size-3.5" aria-hidden />
              Premium geçiş
            </Link>
            <Link
              to="/ayarlar"
              className="inline-flex items-center justify-center rounded border border-accent/20 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-app-text/70 transition hover:border-accent/40"
            >
              Ayarlar
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
