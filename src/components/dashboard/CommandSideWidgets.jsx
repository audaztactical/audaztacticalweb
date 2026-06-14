import { useMemo, useState } from 'react'
import {
  ChevronDown,
  CloudRain,
  Globe2,
  Map,
  Radio,
} from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import LocationSelector from './LocationSelector'
import { useDefaultLocationSelection, useLocationWeather } from '../../hooks/useLocationWeather'
import { formatPrecipitationRows, formatWeatherSource } from '../../lib/weatherService'

/**
 * @param {{ label: string, value: string, detail?: string, icon?: import('react').ReactNode, loading?: boolean }} props
 */
function MetDataRow({ label, value, detail, icon, loading }) {
  return (
    <div className="cmd-met-row">
      <span className="cmd-met-row__label">{label}</span>
      <div className="cmd-met-row__value-wrap">
        {loading ? (
          <span className="cmd-met-row__loading">yükleniyor…</span>
        ) : (
          <>
            <div className="cmd-met-row__main">
              {icon ? <span className="cmd-met-row__icon">{icon}</span> : null}
              <span className="cmd-met-row__value">{value}</span>
            </div>
            {detail ? <span className="cmd-met-row__detail">{detail}</span> : null}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * @param {{ signalSeries?: { t: string, v: number }[] }} props
 */
export default function CommandSideWidgets({ signalSeries: _legacySignal }) {
  const { provinceId, setProvinceId, districtName, setDistrictName } = useDefaultLocationSelection()
  const { location, data, loading, error } = useLocationWeather(provinceId, districtName)

  const [expanded, setExpanded] = useState(/** @type {Record<string, boolean>} */ ({}))

  const windSeries = data?.windSeries?.length ? data.windSeries : _legacySignal ?? []

  const widgets = useMemo(
    () => [
      { id: 'weather', label: 'Weather Sat-Map', desc: 'Meteorolojik durum', icon: CloudRain, glow: 'cmd-widget--sky' },
      { id: 'signal', label: 'Signal Strength', desc: 'Rüzgar hız trendi', icon: Radio, glow: 'cmd-widget--green', chart: true },
      { id: 'geo', label: 'Geographic Overlay', desc: 'Koordinat ve bölge', icon: Map, glow: 'cmd-widget--slate', geo: true },
      { id: 'globe', label: 'Global Intel', desc: 'Atmosferik parametreler', icon: Globe2, glow: 'cmd-widget--sky', intel: true },
    ],
    []
  )

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const precipRows = useMemo(() => formatPrecipitationRows(data), [data])

  const seaText = useMemo(() => {
    if (!location.coastal) return 'Kıyı bölgesi değil'
    if (!data?.marine) return loading ? '…' : 'Veri yok'
    const { waveHeightM, seaTempC } = data.marine
    const parts = []
    if (waveHeightM != null) parts.push(`Dalga ${waveHeightM} m`)
    if (seaTempC != null) parts.push(`Su ${seaTempC}°C`)
    return parts.length ? parts.join(' · ') : 'Veri yok'
  }, [location.coastal, data, loading])

  return (
    <div className="cmd-widget-column space-y-3" aria-label="Operasyonel yan panel">
      <LocationSelector
        provinceId={provinceId}
        districtName={districtName}
        onProvinceChange={setProvinceId}
        onDistrictChange={setDistrictName}
      />

      {error ? (
        <p className="cmd-met-error" role="status">
          {error}
        </p>
      ) : null}

      {widgets.map((w) => {
        const Icon = w.icon
        const isOpen = expanded[w.id] !== false

        return (
          <div
            key={w.id}
            className={['cmd-widget cmd-widget--panel cmd-glass-panel', w.glow, isOpen ? 'cmd-widget--open' : ''].join(' ')}
          >
            <button
              type="button"
              className="cmd-widget__toggle"
              onClick={() => toggleExpand(w.id)}
              aria-expanded={isOpen}
            >
              <div className="cmd-widget__head">
                <span className="cmd-widget__icon" aria-hidden>
                  <Icon className="size-4 text-slate-300" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="cmd-widget__label">{w.label}</p>
                  <p className="cmd-widget__desc">{w.desc}</p>
                </div>
                <ChevronDown
                  className={['cmd-widget__chevron size-4 text-slate-500', isOpen ? 'cmd-widget__chevron--open' : ''].join(' ')}
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
            </button>

            {isOpen ? (
              <div className="cmd-widget__body">
                {w.id === 'weather' ? (
                  <div className="cmd-met-block">
                    <MetDataRow
                      label="Hava durumu"
                      loading={loading}
                      value={data ? `${data.temperatureC}°C · ${data.description}` : '—'}
                      detail={
                        data?.apparentTemperatureC != null
                          ? `Hissedilen ${data.apparentTemperatureC}°C`
                          : undefined
                      }
                    />
                    <MetDataRow
                      label="İhtimal"
                      loading={loading}
                      value={precipRows.probability}
                      detail={precipRows.detail}
                    />
                    <MetDataRow
                      label="Miktar"
                      loading={loading}
                      value={precipRows.amount}
                    />
                    <MetDataRow
                      label="Rüzgar"
                      loading={loading}
                      value={data ? `${data.windSpeedKmh} km/h` : '—'}
                      detail={data ? `Yön ${data.windDirection} (${Math.round(data.windDeg)}°)` : undefined}
                    />
                    <MetDataRow label="Deniz durumu" loading={loading} value={seaText} />
                  </div>
                ) : null}

                {w.chart ? (
                  <div className="cmd-widget__chart mt-2 h-14 w-full min-w-0">
                    <ResponsiveContainer width="100%" height={56} minWidth={0}>
                      <LineChart data={windSeries}>
                        <YAxis hide domain={[0, 'auto']} />
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="#00FF41"
                          strokeWidth={2}
                          dot={false}
                          style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,65,0.45))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="cmd-met-chart-caption">Saatlik rüzgar (km/h)</p>
                  </div>
                ) : null}

                {w.geo ? (
                  <div className="cmd-met-block mt-1">
                    <MetDataRow label="Bölge" loading={false} value={location.label} />
                    <MetDataRow
                      label="Koordinat"
                      loading={false}
                      value={`${location.lat.toFixed(4)}°N · ${location.lon.toFixed(4)}°E`}
                    />
                    <MetDataRow
                      label="Kıyı"
                      loading={false}
                      value={location.coastal ? 'Evet — deniz verisi aktif' : 'Hayır'}
                    />
                  </div>
                ) : null}

                {w.intel ? (
                  <div className="cmd-met-block mt-1">
                    <MetDataRow
                      label="Nem"
                      loading={loading}
                      value={data?.humidity != null ? `%${data.humidity}` : '—'}
                    />
                    <MetDataRow
                      label="Basınç"
                      loading={loading}
                      value={data?.pressureHpa != null ? `${data.pressureHpa} hPa` : '—'}
                    />
                    <MetDataRow label="Kaynak" loading={loading} value={formatWeatherSource()} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
