/** Sidebar nav grupları — NAV_GROUPS id'leri + sistem footer bölümü */
export const SIDEBAR_NAV_GROUP_IDS = /** @type {const} */ ([
  'personal',
  'audaz-network',
  'operations',
  'command',
  'usage-guide',
  'system',
])

/** @typedef {typeof SIDEBAR_NAV_GROUP_IDS[number]} SidebarNavGroupId */
/** @typedef {Partial<Record<SidebarNavGroupId, boolean>>} SidebarGroupStateMap */

/**
 * @returns {Record<SidebarNavGroupId, boolean>}
 */
export function defaultSidebarGroupState() {
  return Object.fromEntries(SIDEBAR_NAV_GROUP_IDS.map((id) => [id, true]))
}

/**
 * @param {unknown} raw
 * @returns {Record<SidebarNavGroupId, boolean>}
 */
export function parseSidebarGroupState(raw) {
  const defaults = defaultSidebarGroupState()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults
  }

  /** @type {Record<string, unknown>} */
  const source = raw
  const next = { ...defaults }

  for (const id of SIDEBAR_NAV_GROUP_IDS) {
    if (typeof source[id] === 'boolean') {
      next[id] = source[id]
    }
  }

  return next
}

/**
 * @param {SidebarGroupStateMap | null | undefined} state
 * @param {SidebarNavGroupId} groupId
 */
export function isSidebarGroupOpen(state, groupId) {
  if (!state || state[groupId] === undefined) return true
  return state[groupId] !== false
}

/**
 * @param {SidebarGroupStateMap | null | undefined} state
 * @param {SidebarNavGroupId} groupId
 */
export function toggleSidebarGroupState(state, groupId) {
  const base = parseSidebarGroupState(state)
  return {
    ...base,
    [groupId]: !isSidebarGroupOpen(base, groupId),
  }
}
