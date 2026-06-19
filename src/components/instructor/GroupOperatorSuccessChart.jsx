import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildLiveGroupLeaderboard } from '../../lib/instructorGroupAnalytics'

/** @typedef {import('../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */

const BAR_COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#fbbf24', '#f472b6', '#94a3b8']

/**
 * @param {{
 *   group: TacticalGroup | null
 *   operators: OperatorProfile[]
 *   logs: GroupActivityLog[]
 * }} props
 */
export default function GroupOperatorSuccessChart({ group, operators, logs }) {
  const chartData = useMemo(() => {
    if (!group) return []
    const rows = buildLiveGroupLeaderboard(group, operators, logs)
    return rows.map((row, idx) => ({
      name: row.callsign.length > 10 ? `${row.callsign.slice(0, 9)}…` : row.callsign,
      fullName: row.callsign,
      overall: row.overallSuccess,
      atis: row.atisAverage,
      drills: row.totalDrills,
      color: BAR_COLORS[idx % BAR_COLORS.length],
    }))
  }, [group, operators, logs])

  if (!group) return null

  return (
    <section className="rounded-xl border border-emerald-900/35 bg-slate-950/90 p-4">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-emerald-400">
        <Users className="size-4" aria-hidden />
        Operatör Başarı Karşılaştırması · Canlı
      </p>
      {chartData.length === 0 ? (
        <p className="py-12 text-center font-mono text-[10px] uppercase text-app-text/45">KAYIT YOK</p>
      ) : (
        <div className="relative h-[240px] min-h-[240px] w-full min-w-0">
          <ResponsiveContainer
            width="100%"
            height={240}
            minWidth={0}
            debounce={50}
            initialDimension={{ width: 400, height: 240 }}
          >
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 12 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={72}
                tick={{ fill: '#94a3b8', fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #065f46',
                  fontFamily: 'monospace',
                  fontSize: 10,
                }}
                formatter={(value, _name, item) => [
                  `%${value} · ${item.payload.drills} drill`,
                  item.payload.fullName,
                ]}
              />
              <Bar dataKey="overall" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {chartData.map((entry) => (
                  <Cell key={entry.fullName} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
