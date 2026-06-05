import { Loader2 } from 'lucide-react'
import CleanFade from './CleanFade'
import {
  ctStatusFail,
  ctStatusOk,
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
 *   }[]
 *   loading?: boolean
 *   idle?: boolean
 *   idleMessage?: string
 *   totalAmmo?: number
 *   minPassScore?: number
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
                const passed = row.isPassed ?? row.hits >= minPassScore
                return (
                  <tr key={row.id} className={ctTrHover}>
                    <td className={ctTd}>{row.operatorName}</td>
                    <td className={`${ctTd} tabular-nums text-zinc-100`}>
                      {row.hits}
                      {totalAmmo > 0 ? ` / ${totalAmmo}` : ''}
                    </td>
                    <td className={`${ctTd} tabular-nums text-zinc-500`}>
                      {row.time != null ? `${row.time}s` : '—'}
                    </td>
                    <td className={ctTd}>
                      <span className={passed ? ctStatusOk : ctStatusFail}>
                        {passed ? 'Geçti' : 'Kaldı'}
                      </span>
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
