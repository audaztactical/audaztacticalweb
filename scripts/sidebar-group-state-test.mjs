/**
 * sidebarGroupState varsayılan/kayıtlı tercih smoke testi.
 * npx tsx scripts/sidebar-group-state-test.mjs
 */

const SIDEBAR_NAV_GROUP_IDS = [
  'personal',
  'audaz-network',
  'operations',
  'command',
  'usage-guide',
  'system',
]

function defaultSidebarGroupState() {
  return Object.fromEntries(SIDEBAR_NAV_GROUP_IDS.map((id) => [id, false]))
}

function hasAnySavedSidebarGroupPreference(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  return SIDEBAR_NAV_GROUP_IDS.some((id) => typeof raw[id] === 'boolean')
}

function parseSidebarGroupState(raw) {
  if (!hasAnySavedSidebarGroupPreference(raw)) {
    return defaultSidebarGroupState()
  }
  const next = Object.fromEntries(SIDEBAR_NAV_GROUP_IDS.map((id) => [id, true]))
  for (const id of SIDEBAR_NAV_GROUP_IDS) {
    if (typeof raw[id] === 'boolean') next[id] = raw[id]
  }
  return next
}

function isSidebarGroupOpen(state, groupId) {
  return state?.[groupId] === true
}

let failed = false

const noPref = parseSidebarGroupState(null)
if (SIDEBAR_NAV_GROUP_IDS.some((id) => noPref[id] !== false)) failed = true

const emptyDoc = parseSidebarGroupState({})
if (SIDEBAR_NAV_GROUP_IDS.some((id) => emptyDoc[id] !== false)) failed = true

const savedPartial = parseSidebarGroupState({ operations: false })
if (savedPartial.operations !== false) failed = true
if (savedPartial.personal !== true) failed = true

const savedFull = parseSidebarGroupState({
  personal: true,
  'audaz-network': false,
  operations: true,
  command: false,
  'usage-guide': true,
  system: false,
})
if (savedFull.personal !== true || savedFull.system !== false) failed = true

if (isSidebarGroupOpen(noPref, 'personal') !== false) failed = true
if (isSidebarGroupOpen(savedFull, 'personal') !== true) failed = true

if (failed) {
  console.error('FAIL: sidebar-group-state-test')
  process.exit(1)
}

console.log('OK: varsayılan kapalı, kayıtlı tercihler korunuyor.')
