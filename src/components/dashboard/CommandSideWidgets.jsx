import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { formatDashboardPrecipitationRows } from '../../lib/dashboardWeatherDisplay'
import { formatWeatherSource } from '../../lib/weatherService'

/**
 * @param {{ label: string, value: string, detail?: string, icon?: import('react').ReactNode, loading?: boolean, loadingText: string }} props
 */
function MetDataRow({ label, value, detail, icon, loading, loadingText }) {
  return (
    <div className="cmd-met-row">
      <span className="cmd-met-row__label">{label}</span>
      <div className="cmd-met-row__value-wrap min-w-0">
        {loading ? (
          <span className="cmd-met-row__loading">{loadingText}</span>
        ) : (
          <>
            <div className="cmd-met-row__main min-w-0">
              {icon ? <span className="cmd-met-row__icon">{icon}</span> : null}
              <span className="cmd-met-row__value break-words">{value}</span>
            </div>
            {detail ? <span className="cmd-met-row__detail break-words">{detail}</span> : null}
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
  const { t, i18n } = useTranslation('dashboard')
  const { provinceId, setProvinceId, districtName, setDistrictName, gpsCoords, geoStatus, geoActive, refreshFromGps } =
    useDefaultLocationSelection()
  const { location, data, loading, error } = useLocationWeather(provinceId, districtName, gpsCoords)

  const [expanded, setExpanded] = useState(/** @type {Record<string, boolean>} */ ({}))

  const hasLiveWindSeries = Boolean(data?.windSeries?.length)
  const windSeries = hasLiveWindSeries ? data.windSeries : _legacySignal ?? []
  const windSeriesIsEstimated = !hasLiveWindSeries && windSeries.length > 0

  const widgets = useMemo(
    () => [
      { id: 'weather', label: t('widgets.weather.label'), desc: t('widgets.weather.desc'), icon: CloudRain, glow: 'cmd-widget--sky' },
      { id: 'signal', label: t('widgets.wind.label'), desc: t('widgets.wind.desc'), icon: Radio, glow: 'cmd-widget--green', chart: true },
      { id: 'geo', label: t('widgets.geo.label'), desc: t('widgets.geo.desc'), icon: Map, glow: 'cmd-widget--slate', geo: true },
      { id: 'globe', label: t('widgets.atmosphere.label'), desc: t('widgets.atmosphere.desc'), icon: Globe2, glow: 'cmd-widget--sky', intel: true },
    ],
    [t, i18n.language],
  )

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const precipRows = useMemo(() => formatDashboardPrecipitationRows(data), [data, i18n.language])

  const seaText = useMemo(() => {
    if (!location.coastal) return t('widgets.notCoastal')
    if (!data?.marine) return loading ? '…' : t('widgets.noData')
    const { waveHeightM, seaTempC } = data.marine
    const parts = []
    if (waveHeightM != null) parts.push(t('widgets.wave', { height: waveHeightM }))
    if (seaTempC != null) parts.push(t('widgets.waterTemp', { temp: seaTempC }))
    return parts.length ? parts.join(' · ') : t('widgets.noData')
  }, [location.coastal, data, loading, t, i18n.language])

  const displayError =
    error === 'Veri alınamadı' || error?.includes('fetch') ? t('widgets.fetchError') : error

  return (
    <div className="cmd-widget-column space-y-3" aria-label={t('widgets.panelAria')}>
      <LocationSelector
        provinceId={provinceId}
        districtName={districtName}
        onProvinceChange={setProvinceId}
        onDistrictChange={setDistrictName}
        geoStatus={geoStatus}
        geoActive={geoActive}
        gpsCoords={gpsCoords}
        onRefreshGps={refreshFromGps}
      />

      {displayError ? (
        <p className="cmd-met-error break-words" role="status">
          {displayError}
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
                  <Icon className="size-4 text-app-text/90" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="cmd-widget__label flex flex-wrap items-center gap-1.5">
                    <span className="break-words">{w.label}</span>
                    {w.id === 'signal' && windSeriesIsEstimated ? (
                      <span className="rounded border border-amber-500/45 bg-amber-950/40 px-1.5 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-amber-400/95">
                        {t('widgets.wind.estimated')}
                      </span>
                    ) : null}
                  </p>
                  <p className="cmd-widget__desc break-words">{w.desc}</p>
                </div>
                <ChevronDown
                  className={['cmd-widget__chevron size-4 shrink-0 text-app-text/55', isOpen ? 'cmd-widget__chevron--open' : ''].join(' ')}
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
                      label={t('widgets.weatherRow')}
                      loading={loading}
                      loadingText={t('widgets.loading')}
                      value={data ? `${data.temperatureC}°C · ${data.description}` : '—'}
                      detail={
                        data?.apparentTemperatureC != null
                          ? t('widgets.feelsLike', { temp: data.apparentTemperatureC })
                          : undefined
                      }
                    />
                    <MetDataRow
                      label={t('widgets.probability')}
                      loading={loading}
                      loadingText={t('widgets.loading')}
                      value={precipRows.probability}
                      detail={precipRows.detail}
                    />
                    <MetDataRow
                      label={t('widgets.amount')}
                      loading={loading}
                      loadingText={t('widgets.loading')}
                      value={precipRows.amount}
                    />
                    <MetDataRow
                      label={t('widgets.wind')}
                      loading={loading}
                      loadingText={t('widgets.loading')}
                      value={data ? `${data.windSpeedKmh} km/h` : '—'}
                      detail={
                        data
                          ? t('widgets.windDirection', { dir: data.windDirection, deg: Math.round(data.windDeg) })
                          : undefined
                      }
                    />
                    <MetDataRow
                      label={t('widgets.sea')}
                      loading={loading}
                      loadingText={t('widgets.loading')}
                      value={seaText}
                    />
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
                          stroke="var(--accent-color)"
                          strokeWidth={2}
                          dot={false}
                          style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,65,0.45))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="cmd-met-chart-caption break-words">
                      {windSeriesIsEstimated ? t('widgets.wind.chartEstimated') : t('widgets.wind.chartLive')}
                    </p>
                  </div>
                ) : null}

                {w.geo ? (
                  <div className="cmd-met-block mt-1">
                    <MetDataRow
                      label={t('widgets.region')}
                      loading={false}
                      loadingText={t('widgets.loading')}
                      value={location.label}
                    />
                    <MetDataRow
                      label={t('widgets.coordinates')}
                      loading={false}
                      loadingText={t('widgets.loading')}
                      value={`${location.lat.toFixed(4)}°N · ${location.lon.toFixed(4)}°E`}
                    />
                    <MetDataRow
                      label={t('widgets.coastal')}
                      loading={false}
                      loadingText={t('widgets.loading')}
                      value={location.coastal ? t('widgets.coastalYes') : t('widgets.coastalNo')}
                    />
                  </div>
                ) : null}

                {w.intel ? (
                  <div className="cmd-met-block mt-1">
                    <MetDataRow
                      label={t('widgets.humidity')}
                      loading={loading}
                      loadingText={t('widgets.loading')}
                      value={data?.humidity != null ? `%${data.humidity}` : '—'}
                    />
                    <MetDataRow
                      label={t('widgets.pressure')}
                      loading={loading}
                      loadingText={t('widgets.loading')}
                      value={data?.pressureHpa != null ? `${data.pressureHpa} hPa` : '—'}
                    />
                    <MetDataRow
                      label={t('widgets.source')}
                      loading={loading}
                      loadingText={t('widgets.loading')}
                      value={formatWeatherSource()}
                    />
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
