import i18n from '../i18n'

const PRECIP_PROB_THRESHOLD = 30

/**
 * Dashboard yağış satırları — weatherService motor katmanına dokunmadan i18n.
 * @param {{ precipitation?: { probabilityPct: number, amountMmH: number, clearSky: boolean, durationHours: number } }} data
 */
export function formatDashboardPrecipitationRows(data) {
  if (!data?.precipitation) {
    return { probability: '—', amount: '—', detail: undefined }
  }

  const p = data.precipitation
  const none = i18n.t('widgets.precip.none', { ns: 'dashboard' })
  const dry = i18n.t('widgets.precip.dry', { ns: 'dashboard' })

  if (p.probabilityPct < PRECIP_PROB_THRESHOLD) {
    return {
      probability: none,
      amount: p.clearSky ? dry : none,
      detail: i18n.t('widgets.precip.probability', { ns: 'dashboard', pct: p.probabilityPct }),
    }
  }

  if (p.amountMmH === 0) {
    return {
      probability: i18n.t('widgets.precip.probability', { ns: 'dashboard', pct: p.probabilityPct }),
      amount: p.clearSky ? dry : none,
      detail:
        p.durationHours > 0
          ? i18n.t('widgets.precip.duration', { ns: 'dashboard', hours: p.durationHours })
          : undefined,
    }
  }

  return {
    probability: i18n.t('widgets.precip.probability', { ns: 'dashboard', pct: p.probabilityPct }),
    amount: p.clearSky
      ? dry
      : i18n.t('widgets.precip.amount', { ns: 'dashboard', amount: p.amountMmH }),
    detail:
      p.durationHours > 0
        ? i18n.t('widgets.precip.duration', { ns: 'dashboard', hours: p.durationHours })
        : undefined,
  }
}
