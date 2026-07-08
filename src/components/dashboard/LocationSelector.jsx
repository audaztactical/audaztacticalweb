import { Loader2, LocateFixed, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TURKEY_PROVINCES } from '../../lib/turkeyLocations'

/**
 * @param {{
 *   provinceId: string,
 *   districtName: string,
 *   onProvinceChange: (id: string) => void,
 *   onDistrictChange: (name: string) => void,
 *   geoStatus?: 'idle' | 'locating' | 'ok' | 'failed' | 'unsupported',
 *   geoActive?: boolean,
 *   gpsCoords?: { lat: number, lon: number } | null,
 *   onRefreshGps?: () => void,
 * }} props
 */
export default function LocationSelector({
  provinceId,
  districtName,
  onProvinceChange,
  onDistrictChange,
  geoStatus = 'idle',
  geoActive = false,
  gpsCoords = null,
  onRefreshGps,
}) {
  const { t } = useTranslation('dashboard')
  const province = TURKEY_PROVINCES.find((p) => p.id === provinceId) ?? TURKEY_PROVINCES[0]

  const geoHint =
    geoStatus === 'locating'
      ? t('location.geoLocating')
      : geoActive
        ? t('location.geoUpdated')
        : geoStatus === 'failed'
          ? t('location.geoFailed')
          : geoStatus === 'unsupported'
            ? t('location.geoUnsupported')
            : null

  return (
    <div className="cmd-loc-selector cmd-glass-panel" aria-label={t('location.aria')}>
      <div className="cmd-loc-selector__head">
        <MapPin className="size-3.5 text-sky-400/80" strokeWidth={1.75} aria-hidden />
        <span className="cmd-loc-selector__title">{t('location.title')}</span>
        {onRefreshGps ? (
          <button
            type="button"
            onClick={onRefreshGps}
            disabled={geoStatus === 'locating'}
            className="cmd-loc-selector__gps-btn"
            title={t('location.useMyLocation')}
            aria-label={t('location.useMyLocation')}
          >
            {geoStatus === 'locating' ? (
              <Loader2 className="size-3 animate-spin text-sky-400/80" aria-hidden />
            ) : (
              <LocateFixed className="size-3 text-sky-400/80" strokeWidth={1.75} aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {geoHint ? (
        <p className="cmd-loc-selector__geo-hint break-words" role="status">
          {geoHint}
          {geoActive && gpsCoords ? (
            <span className="block tabular-nums text-app-text/45">
              {gpsCoords.lat.toFixed(4)}°N · {gpsCoords.lon.toFixed(4)}°E
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="cmd-loc-selector__fields">
        <label className="cmd-loc-selector__field">
          <span className="cmd-loc-selector__label">{t('location.province')}</span>
          <select
            className="cmd-loc-selector__select"
            value={provinceId}
            onChange={(e) => onProvinceChange(e.target.value)}
          >
            {TURKEY_PROVINCES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="cmd-loc-selector__field">
          <span className="cmd-loc-selector__label">{t('location.district')}</span>
          <select
            className="cmd-loc-selector__select"
            value={districtName}
            onChange={(e) => onDistrictChange(e.target.value)}
          >
            {province.districts.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
