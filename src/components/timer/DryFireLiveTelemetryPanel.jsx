import { useTranslation } from 'react-i18next'
import { useHardware } from '../../context/HardwareContext'
import AcousticVuMeter from './AcousticVuMeter'
import MpuCalibrationTarget from './MpuCalibrationTarget'
import DryFireShotAnalysisHud from './DryFireShotAnalysisHud'

/**
 * Dry Fire sensör paneli — VU + MPU (+ isteğe bağlı stack analiz).
 * @param {{
 *   soundThreshold: number
 *   offsetX?: number
 *   offsetY?: number
 *   offsetYaw?: number
 *   offsetPitch?: number
 *   offsetRoll?: number
 *   gForceRange?: string
 *   showAnalysis?: boolean
 *   className?: string
 * }} props
 */
export default function DryFireLiveTelemetryPanel({
  soundThreshold,
  offsetX = 0,
  offsetY = 0,
  offsetYaw = 0,
  offsetPitch = 0,
  offsetRoll = 0,
  gForceRange = '±8G',
  showAnalysis = true,
  className = '',
}) {
  const { t } = useTranslation('timer')
  const { isConnected } = useHardware()

  return (
    <aside
      className={[
        'relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-5',
        className,
      ].join(' ')}
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

      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 sm:mb-4 sm:gap-3">
        <p className="min-w-0 font-mono text-[9px] font-bold uppercase leading-snug tracking-[0.2em] text-[#facc15]/85 sm:text-[10px] sm:tracking-[0.24em]">
          {t('dryFire.telemetry.kicker')}
        </p>
        <span className="shrink-0 rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-app-text/55">
          {isConnected ? t('calibration.serial.statusConnected') : t('calibration.serial.statusWaiting')}
        </span>
      </div>

      <div className="rounded-lg border border-[#facc15]/35 bg-[rgba(250,204,21,0.08)] px-4 py-3">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#facc15]/80">
          {t('calibration.sound.vuLabel')}
        </p>
        <div className="mt-3 w-full min-h-[120px]">
          <AcousticVuMeter threshold={soundThreshold} orientation="horizontal" className="w-full" />
        </div>
      </div>

      <div className="mt-4 min-w-0 w-full max-w-full [&_.aspect-square]:mx-auto [&_.aspect-square]:max-w-[min(100%,14rem)]">
        <MpuCalibrationTarget
          preview
          offsetX={offsetX}
          offsetY={offsetY}
          offsetYaw={offsetYaw}
          offsetPitch={offsetPitch}
          offsetRoll={offsetRoll}
          gForceRange={gForceRange}
        />
      </div>

      {showAnalysis ? (
        <DryFireShotAnalysisHud
          layout="stack"
          referencePitch={offsetPitch}
          referenceRoll={offsetRoll}
          referenceYaw={offsetYaw}
        />
      ) : null}
    </aside>
  )
}
