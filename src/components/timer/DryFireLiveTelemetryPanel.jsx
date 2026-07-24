import { useTranslation } from 'react-i18next'
import { useHardware } from '../../context/HardwareContext'
import AcousticVuMeter from './AcousticVuMeter'
import MpuCalibrationTarget from './MpuCalibrationTarget'

/**
 * Dry Fire yan paneli — kalibrasyon önizleme (VU + yaw nişangah).
 * @param {{
 *   soundThreshold: number
 *   offsetX?: number
 *   offsetY?: number
 *   offsetYaw?: number
 *   gForceRange?: string
 * }} props
 */
export default function DryFireLiveTelemetryPanel({
  soundThreshold,
  offsetX = 0,
  offsetY = 0,
  offsetYaw = 0,
  gForceRange = '±8G',
}) {
  const { t } = useTranslation('timer')
  const { isConnected } = useHardware()

  return (
    <aside
      className="relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-5"
      aria-label={t('dryFire.telemetry.kicker')}
    >
      <span
        className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-slate-600/70"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-slate-600/70"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-slate-600/70"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-slate-600/70"
        aria-hidden
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
          {t('dryFire.telemetry.kicker')}
        </p>
        <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-app-text/55">
          {isConnected ? t('calibration.serial.statusConnected') : t('calibration.serial.statusWaiting')}
        </span>
      </div>

      <div className="rounded-lg border border-[#facc15]/35 bg-[rgba(250,204,21,0.08)] px-4 py-3">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#facc15]/80">
          {t('calibration.sound.vuLabel')}
        </p>
        <div className="mt-3">
          <AcousticVuMeter threshold={soundThreshold} orientation="horizontal" className="w-full" />
        </div>
      </div>

      <div className="mt-4 min-w-0 w-full max-w-full [&_.aspect-square]:mx-auto [&_.aspect-square]:max-w-[min(100%,14rem)]">
        <MpuCalibrationTarget
          preview
          offsetX={offsetX}
          offsetY={offsetY}
          offsetYaw={offsetYaw}
          gForceRange={gForceRange}
        />
      </div>
    </aside>
  )
}
