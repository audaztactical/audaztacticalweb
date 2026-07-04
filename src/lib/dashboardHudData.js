import { humanizeDashboardLogMessage } from './dashboardDisplayText'

/** @param {unknown} row */
export function rowMillis(row) {
  const u = row.updatedAt ?? row.createdAt ?? row.recordedAt ?? row.performedAt ?? row.dueAt
  if (u && typeof u.toMillis === 'function') return u.toMillis()
  return 0
}

function pad(n) {
  return String(n).padStart(2, '0')
}

export function utcHms(ms) {
  const d = new Date(ms)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/** @param {unknown} v */
function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/**
 * Görev/antrenman/envanter/sağlık kayıtlarından sıralı “sistem günlüğü”.
 * @param {object} p
 */
export function buildSystemLogEntries(p) {
  const { missions = [], trainings = [], inventory = [], health = [], sessionOpenMs } = p
  /** @type {{ ms: number, code: string, msg: string }[]} */
  const raw = []

  for (const row of missions) {
    const ms = rowMillis(row)
    if (ms <= 0) continue
    const title = str(row.title).slice(0, 42) || '—'
    raw.push({
      ms,
      code: 'OPS',
      msg: `Görev · ${title}`,
    })
  }

  for (const row of trainings) {
    const ms = rowMillis(row)
    if (ms <= 0) continue
    const title = str(row.title).slice(0, 40) || '—'
    raw.push({
      ms,
      code: 'EĞT',
      msg: `Tatbikat · ${title}`,
    })
  }

  for (const row of inventory) {
    const ms = rowMillis(row)
    if (ms <= 0) continue
    const auditCode = str(row.auditLogCode).trim()
    const auditMsg = str(row.auditLogMsg).trim()
    if (auditCode && auditMsg) {
      raw.push({
        ms,
        code: auditCode === 'CEP_GNC' ? 'CEP' : auditCode.slice(0, 12),
        msg: humanizeDashboardLogMessage(auditMsg).slice(0, 72),
      })
      continue
    }
    const name = str(row.name).slice(0, 38) || '—'
    const cat = str(row.category).slice(0, 16)
    raw.push({
      ms,
      code: 'CEP',
      msg: cat ? `${cat} · ${name}` : name,
    })
  }

  const INC = 'incident'
  for (const row of health) {
    const ms = rowMillis(row)
    if (ms <= 0) continue
    const k = str(row.kind)
    if (k === INC || str(row.injuryZone)) {
      const z = str(row.injuryZone) || 'Bilinmiyor'
      raw.push({ ms, code: 'SHT', msg: `Saha kaydı · Bölge ${z}` })
    } else {
      const name = str(row.name).slice(0, 36) || 'IFAK'
      raw.push({ ms, code: 'SHT', msg: `Tıbbi kayıt · ${name}` })
    }
  }

  raw.sort((a, b) => b.ms - a.ms)

  if (sessionOpenMs && sessionOpenMs > 0) {
    raw.unshift({
      ms: sessionOpenMs,
      code: 'GÜV',
      msg: 'Kanal açık · Oturum aktif',
    })
  }

  return raw.slice(0, 64).map((entry) => ({
    ...entry,
    msg: humanizeDashboardLogMessage(entry.msg),
  }))
}

/** UTC gün başlangıcı için kısa gün adı (Pzt, Sal, …) */
function trWeekdayShortUtc(ms) {
  const d = new Date(ms)
  const w = d.getUTCDay()
  const labels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
  return labels[w] ?? '?'
}

/** Son 7 gün (eskiden yeniye): Türkçe gün etiketi + olay sayısı. */
export function buildWeekActivitySeries(missions, trainings, inventory, health) {
  /** @type {number[]} */
  const midnights = []
  const now = new Date()
  const t0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  for (let i = 6; i >= 0; i--) {
    midnights.push(t0 - i * 86400000)
  }

  /** @type {{ day: string, gun: string, events: number, ts: number }[]} */
  const series = midnights.map((start) => {
    const md = String(new Date(start).getUTCDate()).padStart(2, '0')
    const mm = String(new Date(start).getUTCMonth() + 1).padStart(2, '0')
    return {
      day: `${md}.${mm}`,
      gun: trWeekdayShortUtc(start),
      events: 0,
      ts: start,
    }
  })

  /** @param {unknown} row */
  function bump(row) {
    const ms = rowMillis(row)
    if (ms <= 0) return
    for (let i = 0; i < midnights.length; i++) {
      const lo = midnights[i]
      const hi = lo + 86400000
      if (ms >= lo && ms < hi) {
        series[i].events++
        break
      }
    }
  }

  missions.forEach(bump)
  trainings.forEach(bump)
  inventory.forEach(bump)
  health.forEach(bump)

  return series
}
