import { Loader2 } from 'lucide-react'
import CleanFade from './CleanFade'
import {
  computeGroupTrainingAssessment,
  formatGroupTrainingStatusLabelInstructor,
} from '../../../lib/groupTrainingAssessment'
import {
  ctStatusFail,
  ctStatusOk,
  ctStatusWarn,
  ctTable,
  ctTableWrap,
  ctTd,
  ctTh,
  ctTrHover,
} from './tokens'

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
 *   idleMessage?: string
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
  idleMessage = 'Canlı oturum başlatıldığında sonuçlar burada görünür.',
  totalAmmo = 0,
  minPassScore = 0,
  isTimed = false,
  targetTimeSec = null,
  hitsLabel = 'Vuruş',
}) {
  return (
    <CleanFade>
      <div className={ctTableWrap}>
        <table className={ctTable}>
          <thead>
            <tr>
              <th className={ctTh}>Operatör</th>
              <th className={ctTh}>{hitsLabel}</th>
              <th className={ctTh}>Süre</th>
              <th className={ctTh}>Durum</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${ctTd} py-10 text-center text-zinc-500`}>
                  <Loader2 className="mx-auto size-5 animate-spin text-zinc-400" aria-hidden />
                </td>
              </tr>
            ) : idle ? (
              <tr>
                <td colSpan={4} className={`${ctTd} py-10 text-center text-zinc-500`}>
                  {idleMessage}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${ctTd} py-10 text-center text-zinc-500`}>
                  Operatör girişi bekleniyor…
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
                  passed ? ctStatusOk : statusResult === 'SÜRE İHLALİ' ? ctStatusWarn : ctStatusFail

                return (
                  <tr key={row.id} className={ctTrHover}>
                    <td className={ctTd}>{row.operatorName}</td>
                    <td className={`${ctTd} tabular-nums text-zinc-100`}>
                      {row.hits}
                      {totalAmmo > 0 ? ` / ${totalAmmo}` : ''}
                    </td>
                    <td className={`${ctTd} tabular-nums text-zinc-500`}>
                      {row.time != null ? `${row.time}s` : '—'}
                      {isTimed && targetTimeSec != null && targetTimeSec > 0 ? (
                        <span className="block text-[10px] text-zinc-600">hedef {targetTimeSec}s</span>
                      ) : null}
                    </td>
                    <td className={ctTd}>
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
