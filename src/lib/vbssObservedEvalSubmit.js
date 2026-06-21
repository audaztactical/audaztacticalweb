import { buildVbssObservedEvalPayload } from './vbssObservedEvalPayload'
import { attachMeteoDataToPayload } from './meteoDataCapture'
import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
 *   operatorName?: string
 *   form: import('./vbssObservedEvalPayload').VbssObservedEvalFormState
 * }} p
 */
export async function submitVbssObservedEval({ addLog, userId, operatorName = '', form }) {
  const bundle = buildVbssObservedEvalPayload({ form, userId, operatorName })
  const payload = /** @type {Record<string, unknown>} */ (
    sanitizeForFirestore(await attachMeteoDataToPayload(bundle))
  )
  const ref = await addLog(payload)
  const logId = String(ref?.id ?? '')

  if (!logId) {
    const err = new Error('VBSS gözlem kaydı kimliği alınamadı')
    err.code = 'missing-log-id'
    throw err
  }

  return { logId, bundle }
}
