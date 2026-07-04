import { ATIS_DRILL_CUSTOM, ATIS_DRILL_LEVELS } from '../../lib/atisDrills'
import { selectClass } from './layout/trainingTerminalTokens'

/**
 * @param {{
 *   value: string
 *   onChange: (drillKey: string) => void
 *   required?: boolean
 * }} props
 */
export default function AtisDrillPicker({ value, onChange, required = false }) {
  return (
    <select
      className={selectClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">— DRILL SEÇİN —</option>
      {ATIS_DRILL_LEVELS.map((tier) => (
        <optgroup key={tier.level} label={tier.title}>
          {tier.drills.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </optgroup>
      ))}
      <option value={ATIS_DRILL_CUSTOM}>[+] YENİ ATIŞ TÜRÜ EKLE</option>
    </select>
  )
}
