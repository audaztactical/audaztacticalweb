import { timestampToMs } from './firestoreSnapshot'

/** Heartbeat 30 sn — çevrimiçi eşiği */
export const PRESENCE_ONLINE_THRESHOLD_MS = 90_000

/**
 * @typedef {{ lastSeenMs: number; isOnlineFlag: boolean }} OperatorPresenceSnapshot
 */

/**
 * @param {unknown} data
 * @returns {OperatorPresenceSnapshot}
 */
export function parseOperatorPresenceFromUserDoc(data) {
  if (!data || typeof data !== 'object') {
    return { lastSeenMs: 0, isOnlineFlag: false }
  }
  const d = /** @type {Record<string, unknown>} */ (data)
  return {
    lastSeenMs: timestampToMs(d.lastSeenAt),
    isOnlineFlag: d.isOnline === true,
  }
}

/**
 * @param {OperatorPresenceSnapshot | null | undefined} snapshot
 * @param {number} [nowMs]
 */
export function isOperatorOnline(snapshot, nowMs = Date.now()) {
  if (!snapshot?.lastSeenMs) return false
  return nowMs - snapshot.lastSeenMs < PRESENCE_ONLINE_THRESHOLD_MS
}

/**
 * @param {OperatorPresenceSnapshot | null | undefined} snapshot
 * @param {number} [nowMs]
 */
export function formatOperatorPresenceLabel(snapshot, nowMs = Date.now()) {
  if (isOperatorOnline(snapshot, nowMs)) return 'Çevrimiçi'
  return 'Çevrimdışı'
}
