import { MapPin } from 'lucide-react'
import { TURKEY_PROVINCES } from '../../lib/turkeyLocations'

/**
 * @param {{
 *   provinceId: string,
 *   districtName: string,
 *   onProvinceChange: (id: string) => void,
 *   onDistrictChange: (name: string) => void,
 * }} props
 */
export default function LocationSelector({
  provinceId,
  districtName,
  onProvinceChange,
  onDistrictChange,
}) {
  const province = TURKEY_PROVINCES.find((p) => p.id === provinceId) ?? TURKEY_PROVINCES[0]

  return (
    <div className="cmd-loc-selector cmd-glass-panel" aria-label="Konum seçici">
      <div className="cmd-loc-selector__head">
        <MapPin className="size-3.5 text-sky-400/80" strokeWidth={1.75} aria-hidden />
        <span className="cmd-loc-selector__title">Konum seçici</span>
      </div>
      <div className="cmd-loc-selector__fields">
        <label className="cmd-loc-selector__field">
          <span className="cmd-loc-selector__label">İl</span>
          <select
            className="cmd-loc-selector__select"
            value={provinceId}
            onChange={(e) => {
              const nextId = e.target.value
              onProvinceChange(nextId)
              const nextProvince = TURKEY_PROVINCES.find((p) => p.id === nextId)
              if (nextProvince) onDistrictChange(nextProvince.districts[0]?.name ?? 'Merkez')
            }}
          >
            {TURKEY_PROVINCES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="cmd-loc-selector__field">
          <span className="cmd-loc-selector__label">İlçe</span>
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
