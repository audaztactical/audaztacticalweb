/**
 * Çağrı adı / kullanıcı adından taktiksel rozet harfleri üretir.
 * Örn: "AUDAZ-2" → "A2", "ALPHA" → "AL"
 *
 * @param {{ username?: string, displayName?: string, callsign?: string }} [fields]
 */
export function deriveOperatorInitials(fields = {}) {
  const source = (fields.callsign || fields.username || fields.displayName || '').trim()
  if (!source) return 'OP'

  const parts = source.split(/[\s\-_.]+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0].replace(/[^a-zA-Z0-9]/g, '')
    const b = parts[1].replace(/[^a-zA-Z0-9]/g, '')
    if (a && b) return `${a[0]}${b[0]}`.toUpperCase()
  }

  const alnum = source.replace(/[^a-zA-Z0-9]/g, '')
  if (!alnum) return 'OP'
  if (alnum.length === 1) return alnum.toUpperCase()

  const first = alnum[0]
  const last = alnum[alnum.length - 1]
  if (first.toLowerCase() !== last.toLowerCase()) return `${first}${last}`.toUpperCase()
  return alnum.slice(0, 2).toUpperCase()
}
