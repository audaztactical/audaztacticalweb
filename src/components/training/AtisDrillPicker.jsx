import { useTranslation } from 'react-i18next'
import { ATIS_DRILL_CUSTOM, ATIS_DRILL_LEVELS } from '../../lib/atisDrills'
import { formatAtisDrillLabel, formatAtisDrillLevelTitle } from '../../lib/trainingDisplayText'
import { selectClass } from './layout/trainingTerminalTokens'

/**
 * @param {{
 *   value: string
 *   onChange: (drillKey: string) => void
 *   required?: boolean
 * }} props
 */
export default function AtisDrillPicker({ value, onChange, required = false }) {
  const { t } = useTranslation('training')

  return (
    <select
      className={selectClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">{t('sectors.atis.drills.selectPlaceholder')}</option>
      {ATIS_DRILL_LEVELS.map((tier) => (
        <optgroup key={tier.level} label={formatAtisDrillLevelTitle(tier.level)}>
          {tier.drills.map((d) => (
            <option key={d.id} value={d.id}>
              {formatAtisDrillLabel(d.id)}
            </option>
          ))}
        </optgroup>
      ))}
      <option value={ATIS_DRILL_CUSTOM}>{t('sectors.atis.drills.customAdd')}</option>
    </select>
  )
}
