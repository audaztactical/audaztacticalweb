import { buildCasualtyCardPayload } from './casualtyCardPayload'
import { attachMeteoDataToPayload } from './meteoDataCapture'
import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * @param {{
 *   addCard: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
 *   form: import('./casualtyCardPayload').typeof CASUALTY_DD1380_INITIAL
 * }} p
 */
export async function submitCasualtyDd1380Card({ addCard, userId, form }) {
  const bundle = buildCasualtyCardPayload(form, userId)
  const payload = /** @type {Record<string, unknown>} */ (
    sanitizeForFirestore(await attachMeteoDataToPayload(bundle))
  )
  const ref = await addCard(payload)
  const cardId = String(ref?.id ?? '')
  if (!cardId) {
    const err = new Error('Casualty card kimliği alınamadı')
    err.code = 'missing-card-id'
    throw err
  }
  return { cardId, bundle }
}
