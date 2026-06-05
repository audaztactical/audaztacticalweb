/** @param {string} dateStr @param {string} from @param {string} to */
export function matchesIsoDateRange(dateStr, from, to) {
  const d = (dateStr || '').slice(0, 10)
  if (!d || d === '—') return !from && !to
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

/** @param {string} value @param {string} filter */
export function matchesTypeFilter(value, filter) {
  if (!filter || filter === 'ALL') return true
  return value === filter
}
