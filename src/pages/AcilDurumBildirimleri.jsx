import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Loader2, Radio, ShieldAlert } from 'lucide-react'
import HudFluffDecor from '../components/dashboard/HudFluffDecor'
import { useAuth } from '../context/AuthContext'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import {
  formatManualAlertBroadcastTime,
  migrateNewsFeedManualAlertsToArchive,
  purgeNonAdminBroadcastArchive,
  subscribeEmergencyAlertArchive,
} from '../lib/firestoreManualAlertBroadcasts'

/** @typedef {import('../lib/firestoreManualAlertBroadcasts').ManualAlertBroadcastRecord} EmergencyAlertRecord */

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}

/**
 * @param {{ item: EmergencyAlertRecord; index: number }} props
 */
function EmergencyAlertCard({ item, index }) {
  return (
    <motion.article
      custom={index}
      variants={cardVariants}
      className="relative overflow-hidden rounded-sm border border-red-500/35 bg-[#0a0b0d] p-4 shadow-[0_0_24px_-8px_rgba(239,68,68,0.25)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
      <header className="mb-3 flex items-start justify-between gap-3 border-b border-red-500/20 pb-2">
        <p className="flex min-w-0 items-center gap-1.5 font-mono-technical text-[9px] uppercase tracking-wider text-red-400/80">
          <ShieldAlert className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{item.source}</span>
        </p>
        <time className="shrink-0 font-mono-technical text-[9px] tabular-nums text-red-300/70">
          {formatManualAlertBroadcastTime(item.publishedAt, item.publishedAtMs)}
        </time>
      </header>
      <h2 className="font-display text-base font-bold uppercase tracking-wide text-red-200">
        {item.title}
      </h2>
      <p className="mt-3 whitespace-pre-wrap font-mono-technical text-sm leading-relaxed text-app-text/85">
        {item.message}
      </p>
    </motion.article>
  )
}

const MIGRATION_FLAG = 'audaz_emergency_archive_migrated_v2'

export default function AcilDurumBildirimleri() {
  const { showAdminPanel } = useAuth()
  const [items, setItems] = useState(/** @type {EmergencyAlertRecord[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      if (showAdminPanel) {
        try {
          await purgeNonAdminBroadcastArchive()
          if (typeof window !== 'undefined' && !localStorage.getItem(MIGRATION_FLAG)) {
            const result = await migrateNewsFeedManualAlertsToArchive()
            if (result.removed > 0 || result.migrated > 0) {
              localStorage.setItem(MIGRATION_FLAG, '1')
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.warn('[AcilDurum] arşiv bakımı', err)
        }
      }

      if (cancelled) return

      setLoading(true)
      setError(null)
    }

    void boot()

    const unsub = subscribeEmergencyAlertArchive(
      (rows) => {
        if (!cancelled) {
          setItems(rows)
          setLoading(false)
        }
      },
      (err) => {
        if (!cancelled) {
          emitFirebaseError(err)
          setError('Acil durum arşivi yüklenemedi.')
          setLoading(false)
        }
      },
    )

    return () => {
      cancelled = true
      unsub()
    }
  }, [showAdminPanel])

  return (
    <div className="relative mx-auto min-h-[calc(100vh-6rem)] max-w-[1080px] px-3 py-5 pt-12 sm:px-4 sm:pt-14 md:px-6">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(239,68,68,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.1) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <HudFluffDecor />
      </div>

      <div className="relative z-[2] space-y-6">
        <header className="flex flex-col gap-4 border-b border-red-500/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.35em] text-red-400">
              <span className="text-app-text/35">[ </span>
              ERKEN UYARI ARŞİVİ
              <span className="text-app-text/35"> ]</span>
            </p>
            <h1 className="font-display flex items-center gap-3 text-2xl font-bold tracking-[0.12em] text-app-text sm:text-3xl">
              <AlertTriangle className="size-7 shrink-0 text-red-400" strokeWidth={1.5} aria-hidden />
              ACİL DURUM BİLDİRİMLERİ
            </h1>
            <p className="max-w-2xl font-mono-technical text-[10px] leading-relaxed text-app-text/55">
              Komuta merkezinden yayınlanan zorunlu ikazların kalıcı arşivi. Yazılı haber akışından
              ayrı tutulur.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded border border-red-500/30 bg-red-950/25 px-3 py-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-red-400" />
            </span>
            <p className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-red-300">
              İKAZ KANALI AKTİF
            </p>
          </div>
        </header>

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-24 font-mono-technical text-[10px] uppercase text-app-text/55">
            <Loader2 className="size-4 animate-spin text-red-400" aria-hidden />
            Arşiv senkronize ediliyor…
          </p>
        ) : error ? (
          <p className="rounded border border-red-500/35 bg-red-950/20 px-4 py-8 text-center font-mono-technical text-[10px] uppercase text-red-300">
            {error}
          </p>
        ) : items.length === 0 ? (
          <div className="rounded border border-red-500/20 bg-black/40 px-6 py-16 text-center">
            <Radio className="mx-auto size-8 text-red-500/40" aria-hidden />
            <p className="mt-4 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/50">
              HENÜZ ACİL DURUM BİLDİRİMİ YOK
            </p>
            <p className="mt-2 font-mono-technical text-[9px] text-app-text/40">
              Admin manuel ikaz yayınladığında kayıtlar burada görünür.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            initial="hidden"
            animate="visible"
          >
            {items.map((item, index) => (
              <EmergencyAlertCard key={item.id} item={item} index={index} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
