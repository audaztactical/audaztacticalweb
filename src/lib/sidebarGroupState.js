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
 * İlk kullanım / tercih yok — tüm gruplar kapalı.
 * @returns {Record<SidebarNavGroupId, boolean>}
 */
export function defaultSidebarGroupState() {
  return Object.fromEntries(SIDEBAR_NAV_GROUP_IDS.map((id) => [id, false]))
}

/**
 * @param {unknown} raw
 */
function hasAnySavedSidebarGroupPreference(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  /** @type {Record<string, unknown>} */
  const source = raw
  return SIDEBAR_NAV_GROUP_IDS.some((id) => typeof source[id] === 'boolean')
}

/**
 * Firestore users/{uid}.sidebarGroupState okuma.
 * - Alan yok / boş → varsayılan kapalı
 * - Kayıtlı tercih var → yalnızca explicit boolean'lar uygulanır (mevcut kullanıcılar korunur)
 * @param {unknown} raw
 * @returns {Record<SidebarNavGroupId, boolean>}
 */
export function parseSidebarGroupState(raw) {
  if (!hasAnySavedSidebarGroupPreference(raw)) {
    return defaultSidebarGroupState()
  }

  /** @type {Record<string, unknown>} */
  const source = raw
  /** Kayıtlı tercih varken belirtilmemiş anahtarlar eski davranışla açık kalır (partial map uyumu). */
  const next = Object.fromEntries(SIDEBAR_NAV_GROUP_IDS.map((id) => [id, true]))

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
  return state?.[groupId] === true
}

/**
 * @param {SidebarGroupStateMap | null | undefined} state
 * @param {SidebarNavGroupId} groupId
 * Akordeon: bir grup açılınca diğerleri kapanır.
 */
export function toggleSidebarGroupState(state, groupId) {
  const base = hasAnySavedSidebarGroupPreference(state)
    ? parseSidebarGroupState(state)
    : defaultSidebarGroupState()
  const currentlyOpen = isSidebarGroupOpen(base, groupId)
  if (currentlyOpen) {
    return { ...base, [groupId]: false }
  }
  return Object.fromEntries(SIDEBAR_NAV_GROUP_IDS.map((id) => [id, id === groupId]))
}
