import { Loader2, Radio } from 'lucide-react'
import CleanFade from './CleanFade'
import {
  computeGroupTrainingAssessment,
  formatGroupTrainingStatusLabelInstructor,
} from '../../../lib/groupTrainingAssessment'
import {
  icEmptyCell,
  icEmptyDesc,
  icEmptyTitle,
  icLiveDot,
  icLiveStrip,
  icStatusFail,
  icStatusOk,
  icStatusWarn,
  icTable,
  icTableWrap,
  icTd,
  icTh,
  icTrHover,
} from '../layout/instructorCommandTokens'

/**
 * @param {{
 *   title: string
 *   description: string
 *   icon?: import('lucide-react').LucideIcon
 * }} props
 */
function EmptyStateMessage({ title, description, icon: Icon = Radio }) {
  return (
    <div className={icEmptyCell}>
      <Icon className="mx-auto size-5 text-accent/50" strokeWidth={1.5} aria-hidden />
      <p className={`${icEmptyTitle} mt-3`}>{title}</p>
      <p className={icEmptyDesc}>{description}</p>
    </div>
  )
}

/**
 * @param {{
 *   rows: {
 *     id: string
 *     operatorName: string
 *     hits: number
 *     time?: number | null
 *     isPassed?: boolean
 *     statusResult?: string
 *   }[]
 *   loading?: boolean
 *   idle?: boolean
 *   live?: boolean
 *   idleMessage?: string
 *   idleHint?: string
 *   totalAmmo?: number
 *   minPassScore?: number
 *   isTimed?: boolean
 *   targetTimeSec?: number | null
 *   hitsLabel?: string
 * }} props
 */
export default function LiveOperatorsTable({
  rows,
  loading = false,
  idle = false,
  live = false,
  idleMessage = 'Canlı oturum başlatıldığında sonuçlar burada görünür.',
  idleHint = 'Drill seçin ve oturumu başlatın',
  totalAmmo = 0,
  minPassScore = 0,
  isTimed = false,
  targetTimeSec = null,
  hitsLabel = 'Vuruş',
}) {
  const isLive = live || (!idle && !loading)

  return (
    <CleanFade>
      {isLive ? (
        <div className={icLiveStrip} role="status" aria-live="polite">
          <span className={icLiveDot} aria-hidden />
          Canlı oturum · operatör sonuçları akıyor
        </div>
      ) : null}

      <div className={icTableWrap}>
        <table className={icTable}>
          <thead>
            <tr>
              <th className={icTh}>Operatör</th>
              <th className={icTh}>{hitsLabel}</th>
              <th className={icTh}>Süre</th>
              <th className={icTh}>Durum</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${icTd} p-0`}>
                  <div className={icEmptyCell}>
                    <Loader2 className="mx-auto size-5 animate-spin text-accent" aria-hidden />
                    <p className={`${icEmptyTitle} mt-3`}>Sonuçlar senkronize ediliyor</p>
                    <p className={icEmptyDesc}>Canlı feed bağlanıyor…</p>
                  </div>
                </td>
              </tr>
            ) : idle ? (
              <tr>
                <td colSpan={4} className={`${icTd} p-0`}>
                  <EmptyStateMessage title={idleMessage} description={idleHint} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${icTd} p-0`}>
                  <EmptyStateMessage
                    title="Operatör girişi bekleniyor"
                    description="Grup üyeleri antrenman modülünden sonuç aktarabilir"
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const assessment = computeGroupTrainingAssessment({
                  totalAmmo,
                  minPassScore,
                  hits: row.hits,
                  isTimed,
                  targetTimeSec,
                  time: row.time,
                })
                const statusResult = row.statusResult ?? assessment.statusResult
                const passed = assessment.isPassed
                const label = formatGroupTrainingStatusLabelInstructor(statusResult, passed)
                const statusClass =
                  passed ? icStatusOk : statusResult === 'SÜRE İHLALİ' ? icStatusWarn : icStatusFail

                return (
                  <tr key={row.id} className={icTrHover}>
                    <td className={`${icTd} font-mono-technical text-[11px] uppercase text-app-text`}>
                      {row.operatorName}
                    </td>
                    <td className={`${icTd} tabular-nums font-mono-technical text-[11px] text-app-text`}>
                      {row.hits}
                      {totalAmmo > 0 ? ` / ${totalAmmo}` : ''}
                    </td>
                    <td className={`${icTd} tabular-nums font-mono-technical text-[11px] text-app-text/55`}>
                      {row.time != null ? `${row.time}s` : '—'}
                      {isTimed && targetTimeSec != null && targetTimeSec > 0 ? (
                        <span className="block text-[9px] uppercase text-app-text/40">
                          hedef {targetTimeSec}s
                        </span>
                      ) : null}
                    </td>
                    <td className={icTd}>
                      <span className={statusClass}>{label}</span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </CleanFade>
  )
}
