/**
 * OTOMATİK ÜRETİLDİ — elle düzenleme.
 * Kaynak: src/lib/neural/ — güncellemek için: npm run sync:neural
 * Üretim: scripts/sync-neural-engine.mjs
 */

const { ACTIVITY_RULES, DAILY_CAP, DECAY_TAU_DAYS, FLOOR_RATIO, GRACE_DAYS, LEVEL_THRESHOLDS, MAX_XP, NEURAL_SOURCES, NEURAL_STATE_VERSION, REGION_IDS, RETURN_BONUS, RETURN_BONUS_PEAK_RATIO, STREAK_BASE, STREAK_CAP, STREAK_MIN_FOR_BONUS, STREAK_PER, TIMEZONE } = require('./neuralConfig')

/**
 * @typedef {import('./neuralConfig.js').NeuralRegionId} NeuralRegionId
 * @typedef {{ id: string; source: string; type: string; ts: number; score: number|null; legacy?: boolean }} NeuralEvent
 * @typedef {{ source: string; reason: string; kind?: string; operationCategory?: string; mode?: string; fieldNames?: string[] }} IgnoredMeta
 */

const DAY_MS = 86_400_000

/** Europe/Istanbul takvim günü anahtarı YYYY-MM-DD */
function istanbulDayKey(ms) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date(ms))
}

/**
 * Doküman alan adları (değer yok) — debug / ignored.
 * @param {Record<string, unknown>} doc
 */
function docFieldNames(doc) {
  return Object.keys(doc)
    .filter((k) => k !== 'id')
    .sort()
}

/**
 * overallScore (VBSS/TCCC observed): 0–10 ölçeği → 0–100.
 * accuracy / successPercent: 0–100 (nadiren 0–1).
 * @param {unknown} raw
 * @param {string|undefined} scoreField
 * @returns {number|null}
 */
function normalizeScoreTo100(raw, scoreField) {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null

  if (scoreField === 'overallScore') {
    return Math.max(0, Math.min(100, n * 10))
  }
  if (n >= 0 && n <= 1) {
    return n * 100
  }
  return Math.max(0, Math.min(100, n))
}

/**
 * VBSS range_logs: successPercent (0–100) tercih; yoksa overallScore (0–10).
 * @param {Record<string, unknown>} doc
 */
function vbssDrillScore(doc) {
  if (doc.successPercent != null && doc.successPercent !== '') {
    return normalizeScoreTo100(doc.successPercent, 'successPercent')
  }
  if (doc.overallScore != null && doc.overallScore !== '') {
    return normalizeScoreTo100(doc.overallScore, 'overallScore')
  }
  return null
}

/**
 * @param {number} baseXp
 * @param {number|null} score100
 */
function scoreAdjustedGain(baseXp, score100) {
  if (score100 == null) return baseXp
  return baseXp * (0.55 + (score100 / 100) * 0.6)
}

/**
 * @param {Record<string, unknown>} doc
 */
function docMillis(doc) {
  const candidates = [doc.timestamp, doc.createdAt, doc.updatedAt, doc.performedAt, doc.publishDate]
  for (const c of candidates) {
    if (c == null) continue
    if (typeof c === 'number' && Number.isFinite(c)) return c
    if (typeof c === 'string') {
      const p = Date.parse(c)
      if (Number.isFinite(p)) return p
    }
    if (typeof c === 'object' && c !== null && typeof /** @type {{ toMillis?: () => number }} */ (c).toMillis === 'function') {
      return /** @type {{ toMillis: () => number }} */ (c).toMillis()
    }
    if (typeof c === 'object' && c !== null && typeof /** @type {{ toDate?: () => Date }} */ (c).toDate === 'function') {
      return /** @type {{ toDate: () => Date }} */ (c).toDate().getTime()
    }
  }
  return null
}

/**
 * Taktik timer seansı tamamlandı mı?
 * Standart: summary + shotTimesMs; kuru tetik: timingSummary + atış/hit.
 * @param {Record<string, unknown>} data
 */
function isTacticalSessionComplete(data) {
  if (!data || typeof data !== 'object') return false
  const mode = String(data.mode ?? '').toLowerCase()
  const shots = Array.isArray(data.shotTimesMs) ? data.shotTimesMs : []
  const hits = Array.isArray(data.hits) ? data.hits : []
  const hasShots = shots.length > 0 || hits.length > 0
  if (!hasShots) return false
  if (mode === 'dry-fire') {
    return data.timingSummary != null && typeof data.timingSummary === 'object'
  }
  if (mode === 'standard-shot') {
    return data.summary != null && typeof data.summary === 'object'
  }
  return (
    (data.summary != null && typeof data.summary === 'object') ||
    (data.timingSummary != null && typeof data.timingSummary === 'object')
  )
}

/**
 * @param {Record<string, unknown>} doc
 */
function isTcccSimDoc(doc) {
  if (doc.casevacSim === true || doc.medevacSim === true) return true
  const st = String(doc.shootType ?? '').toUpperCase()
  return st === 'MEDEVAC_9LINE_RADIO_SIM' || st === 'CASEVAC_MIST_RADIO_SIM'
}

/**
 * kind/operationCategory boş eski range_logs — yalnızca alan adlarıyla sınıflandır.
 * @param {Record<string, unknown>} doc
 * @returns {'ATIS_DRILL'|'CQB_DRILL'|'FOF_DRILL'|null}
 */
function classifyLegacyRangeLog(doc) {
  const keys = new Set(Object.keys(doc))
  const has = (/** @type {string} */ k) => keys.has(k)

  // FoF terminal: senaryo / OPFOR / isabet alanları (fofLogPayload)
  const fofHits =
    (has('scenarioType') ? 1 : 0) +
    (has('opforCount') ? 1 : 0) +
    (has('hitsTaken') ? 1 : 0) +
    (has('lethalHitsDelivered') ? 1 : 0) +
    (has('engagementRounds') ? 1 : 0) +
    (has('simSystem') ? 1 : 0) +
    (has('blueOnBlue') ? 1 : 0)
  if (fofHits >= 2) return 'FOF_DRILL'

  // CQB terminal: oda / giriş / tehdit (cqbLogPayload)
  const cqbHits =
    (has('roomTopology') ? 1 : 0) +
    (has('entryMethod') ? 1 : 0) +
    (has('breachingType') ? 1 : 0) +
    (has('threatCount') ? 1 : 0) +
    (has('neutralizedCount') ? 1 : 0) +
    (has('clearanceTimeMs') || has('clearingTimeSec') ? 1 : 0)
  if (cqbHits >= 2 && (has('successPercent') || has('accuracyScore'))) return 'CQB_DRILL'
  if (cqbHits >= 3) return 'CQB_DRILL'

  // ATIŞ / eski schema RangeLogEntrySchema + atisLogPayload
  const atisRound =
    has('shotsFired') || has('roundsTotal') || has('totalRoundsFired')
  const atisHit = has('hits') || has('totalHits')
  const atisAcc = has('accuracy')
  if (atisAcc && (atisRound || atisHit)) return 'ATIS_DRILL'
  if (atisRound && atisHit && (has('distanceM') || has('distance') || has('shootType') || has('drillName'))) {
    return 'ATIS_DRILL'
  }

  return null
}

/**
 * @param {string} source
 * @param {Record<string, unknown> & { id?: string }} doc
 * @returns {{ event: NeuralEvent|null; ignored: IgnoredMeta|null }}
 */
function normalizeEvent(source, doc) {
  const id = String(doc.id ?? '')
  const ts = docMillis(doc)
  const kind = String(doc.kind ?? '')
  const operationCategory = String(doc.operationCategory ?? '').toLowerCase()
  const mode = String(doc.mode ?? '').toLowerCase()
  const fieldNames = docFieldNames(doc)

  /** @param {string} reason */
  const ignore = (reason) => ({
    event: null,
    ignored: {
      source,
      reason,
      kind: kind || undefined,
      operationCategory: operationCategory || undefined,
      mode: mode || undefined,
      fieldNames,
    },
  })

  if (ts == null || !Number.isFinite(ts) || ts <= 0) {
    return ignore('missing_timestamp')
  }

  /** @type {string|null} */
  let type = null
  /** @type {number|null} */
  let score = null
  let legacy = false

  if (source === NEURAL_SOURCES.RANGE_LOGS) {
    // TCCC / MEDEVAC / CASEVAC simülasyonları (simulationHistoryHelpers.isTcccSimulationLog)
    if (isTcccSimDoc(doc) || (operationCategory === 'tccc' && kind === 'TCCC_DRILL')) {
      type = 'TCCC_DRILL'
      score = normalizeScoreTo100(doc.successPercent, 'successPercent')
    } else if (operationCategory === 'atis' || kind === 'ATIS_DRILL') {
      type = 'ATIS_DRILL'
      score = normalizeScoreTo100(doc.accuracy, 'accuracy')
    } else if (operationCategory === 'cqb' || kind === 'CQB_DRILL') {
      type = 'CQB_DRILL'
      score = normalizeScoreTo100(doc.successPercent, 'successPercent')
    } else if (operationCategory === 'fof' || kind === 'FOF_DRILL') {
      type = 'FOF_DRILL'
      score = normalizeScoreTo100(doc.successPercent, 'successPercent')
    } else if (kind === 'VBSS_DRILL' || (operationCategory === 'vbss' && kind !== 'VBSS_OBSERVED_EVAL')) {
      type = 'VBSS_DRILL'
      score = vbssDrillScore(doc)
    } else if (!kind && !operationCategory) {
      const legacyType = classifyLegacyRangeLog(doc)
      if (legacyType) {
        type = legacyType
        legacy = true
        if (legacyType === 'ATIS_DRILL') {
          score = normalizeScoreTo100(doc.accuracy, 'accuracy')
        } else {
          score = normalizeScoreTo100(doc.successPercent, 'successPercent')
        }
      } else {
        return ignore('legacy_unclassified')
      }
    } else {
      return ignore('unmapped_range_log')
    }
  } else if (source === NEURAL_SOURCES.VBSS_LOGS) {
    if (kind === 'VBSS_OBSERVED_EVAL' || operationCategory === 'vbss') {
      type = 'VBSS_OBSERVED_EVAL'
      if (doc.overallScore != null) score = normalizeScoreTo100(doc.overallScore, 'overallScore')
      else score = normalizeScoreTo100(doc.successPercent, 'successPercent')
    } else {
      return ignore('unmapped_vbss_log')
    }
  } else if (source === NEURAL_SOURCES.TCCC_LOGS) {
    if (kind === 'TCCC_OBSERVED_EVAL' || operationCategory === 'tccc') {
      type = 'TCCC_OBSERVED_EVAL'
      if (doc.overallScore != null) score = normalizeScoreTo100(doc.overallScore, 'overallScore')
      else score = normalizeScoreTo100(doc.successPercent, 'successPercent')
    } else {
      return ignore('unmapped_tccc_log')
    }
  } else if (source === NEURAL_SOURCES.TACTICAL_SESSIONS) {
    if (!isTacticalSessionComplete(doc)) {
      return ignore('incomplete_session')
    }
    if (mode === 'standard-shot') type = 'TIMER_STANDARD'
    else if (mode === 'dry-fire') type = 'TIMER_DRYFIRE'
    else return ignore('unmapped_timer_mode')
  } else if (source === NEURAL_SOURCES.TRAININGS) {
    if (kind === 'TRAINING_PLAN' || kind === 'TACTICAL_SANDBOX_PLAN' || operationCategory === 'egitim' || !kind) {
      type = 'TRAINING_PLAN'
    } else {
      return ignore('unmapped_training')
    }
  } else if (source === NEURAL_SOURCES.BALLISTIC_PROFILES) {
    type = 'BALLISTIC_PROFILE'
  } else if (source === NEURAL_SOURCES.FORUM_POSTS) {
    type = 'FORUM_POST'
  } else if (source === NEURAL_SOURCES.FORUM_REPLIES) {
    type = 'FORUM_REPLY'
  } else if (source === NEURAL_SOURCES.ACTIVITY_EVENTS) {
    const t = String(doc.type ?? '')
    if (
      t === 'INTEL_READ' ||
      t === 'GUIDE_READ' ||
      t === 'BALLISTIC_CALC' ||
      t === 'AAR_ENTRY'
    ) {
      type = t
    } else return ignore('unmapped_activity_event')
  } else {
    return ignore('unknown_source')
  }

  const rule = type ? ACTIVITY_RULES[type] : null
  if (!type || !rule || rule.futureOnly || rule.unused) {
    return ignore(type ? (rule?.unused ? 'unused_type' : 'future_only_type') : 'no_type')
  }

  return {
    event: { id: id || `${source}:${ts}`, source, type, ts, score, ...(legacy ? { legacy: true } : {}) },
    ignored: null,
  }
}

/**
 * Tek bölge XP sönme formülü (saklı base → efektif).
 * @param {number} baseXp
 * @param {number} peak
 * @param {number} idleDays
 * @param {number} graceDays
 */
function decayXp(baseXp, peak, idleDays, graceDays) {
  const floor = FLOOR_RATIO * peak
  if (idleDays <= graceDays) return baseXp
  if (baseXp <= floor) return baseXp
  const excessDays = idleDays - graceDays
  const effective = floor + (baseXp - floor) * Math.exp(-excessDays / DECAY_TAU_DAYS)
  return Math.max(floor, effective)
}

/**
 * @deprecated decayXp kullan — imza çakışmasın diye korundu
 * @param {number} baseXp
 * @param {number} peak
 * @param {number} idleDays
 * @param {number} graceDays
 */
function applyDecayXp(baseXp, peak, idleDays, graceDays) {
  return decayXp(baseXp, peak, idleDays, graceDays)
}

/**
 * LEVEL_THRESHOLDS ile seviye (1–10).
 * @param {number} xp
 */
function levelForXp(xp) {
  const clamped = Math.max(0, Math.min(MAX_XP, xp))
  let level = 1
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (clamped >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
      break
    }
  }
  return Math.min(10, level)
}

/** @deprecated levelForXp kullan */
function levelFromXp(xp) {
  return levelForXp(xp)
}

/**
 * Bir sonraki seviyeye kalan XP. Seviye 10 ise 0.
 * @param {number} xp
 */
function xpToNextLevel(xp) {
  const clamped = Math.max(0, Math.min(MAX_XP, xp))
  const level = levelForXp(clamped)
  if (level >= 10) return 0
  const nextThreshold = LEVEL_THRESHOLDS[level]
  return Math.max(0, nextThreshold - clamped)
}

/**
 * Boş saklı durum (Firestore users/{uid}/neural/state).
 * @returns {import('./neuralConfig.js').NeuralStoredState}
 */
function emptyStoredState() {
  /** @type {Record<string, { base: number; peak: number; lastActiveAt: number|null; decayFlag: boolean }>} */
  const regions = {}
  for (const id of REGION_IDS) {
    regions[id] = { base: 0, peak: 0, lastActiveAt: null, decayFlag: false }
  }
  return {
    version: NEURAL_STATE_VERSION,
    regions,
    streak: 0,
    lastActiveDay: null,
    today: { dayKey: null, perRegion: {}, perType: {} },
    lastEventTs: 0,
    eventCount: 0,
  }
}

/**
 * @param {ReturnType<typeof emptyStoredState>} stored
 * @returns {ReturnType<typeof emptyStoredState>}
 */
function cloneStored(stored) {
  return {
    version: stored.version ?? NEURAL_STATE_VERSION,
    regions: Object.fromEntries(
      REGION_IDS.map((id) => {
        const r = stored.regions?.[id] ?? { base: 0, peak: 0, lastActiveAt: null, decayFlag: false }
        return [
          id,
          {
            base: Number(r.base) || 0,
            peak: Number(r.peak) || 0,
            lastActiveAt: r.lastActiveAt == null ? null : Number(r.lastActiveAt),
            decayFlag: r.decayFlag === true,
          },
        ]
      }),
    ),
    streak: Number(stored.streak) || 0,
    lastActiveDay: stored.lastActiveDay ?? null,
    today: {
      dayKey: stored.today?.dayKey ?? null,
      perRegion: { ...(stored.today?.perRegion || {}) },
      perType: { ...(stored.today?.perType || {}) },
    },
    lastEventTs: Number(stored.lastEventTs) || 0,
    eventCount: Number(stored.eventCount) || 0,
  }
}

/**
 * Tek olayı artımlı uygula (saklı durum). Kronolojik sıra varsayılır.
 * @param {ReturnType<typeof emptyStoredState>} storedState
 * @param {NeuralEvent} event
 */
function applyEvent(storedState, event) {
  const state = cloneStored(storedState)
  const rule = ACTIVITY_RULES[event.type]
  const day = istanbulDayKey(event.ts)

  /** @type {Record<string, unknown>} */
  const logEntry = {
    id: event.id,
    type: event.type,
    ts: event.ts,
    day,
    score: event.score,
    gains: {},
    returnBonus: false,
    hitDailyCap: false,
    streakBonus: 0,
    streak: state.streak,
    legacy: event.legacy === true,
    cappedType: false,
  }

  if (!rule || rule.futureOnly || rule.unused) {
    logEntry.cappedType = true
    return { state, logEntry }
  }

  if (state.today.dayKey !== day) {
    state.today = { dayKey: day, perRegion: {}, perType: {} }
  }

  const typeCount = Number(state.today.perType[event.type]) || 0
  if (rule.perDayTypeCap != null && typeCount >= rule.perDayTypeCap) {
    logEntry.cappedType = true
    state.lastEventTs = Math.max(state.lastEventTs, event.ts)
    state.eventCount += 1
    return { state, logEntry }
  }
  state.today.perType[event.type] = typeCount + 1

  /**
   * @param {NeuralRegionId} region
   * @param {number} atMs
   */
  function decayRegionTo(region, atMs) {
    const s = state.regions[region]
    if (s.lastActiveAt == null) return s.base
    const idleDays = Math.max(0, (atMs - s.lastActiveAt) / DAY_MS)
    const grace = GRACE_DAYS[region]
    const next = decayXp(s.base, Math.max(s.peak, s.base), idleDays, grace)
    s.base = next
    s.decayFlag = idleDays > grace
    return next
  }

  const rawGain = scoreAdjustedGain(rule.baseXp, event.score)
  /** @type {Partial<Record<NeuralRegionId, number>>} */
  const gains = {}
  let anyReturnBonus = false
  let hitDailyCap = false

  for (const region of REGION_IDS) {
    const w = rule.weights[region]
    if (!w || w <= 0) continue

    decayRegionTo(region, event.ts)
    const s = state.regions[region]
    const grace = GRACE_DAYS[region]
    const idleDays =
      s.lastActiveAt == null ? 0 : Math.max(0, (event.ts - s.lastActiveAt) / DAY_MS)
    const decaying = idleDays > grace
    let regionGain = rawGain * w

    if (decaying && s.base < s.peak * RETURN_BONUS_PEAK_RATIO) {
      regionGain *= RETURN_BONUS
      anyReturnBonus = true
    }

    const spent = Number(state.today.perRegion[region]) || 0
    const room = Math.max(0, DAILY_CAP - spent)
    if (room <= 0) {
      hitDailyCap = true
      gains[region] = 0
      continue
    }
    if (regionGain > room) {
      regionGain = room
      hitDailyCap = true
    }

    const before = s.base
    const after = Math.min(MAX_XP, before + regionGain)
    s.base = after
    s.peak = Math.max(s.peak, after)
    s.lastActiveAt = event.ts
    s.decayFlag = false
    state.today.perRegion[region] = spent + (after - before)
    gains[region] = after - before
  }

  let streakBonusApplied = 0
  const isNewDay = state.lastActiveDay !== day
  if (isNewDay) {
    if (state.lastActiveDay) {
      const prev = previousIstanbulDay(day)
      if (state.lastActiveDay === prev) state.streak += 1
      else state.streak = 1
    } else {
      state.streak = 1
    }
    state.lastActiveDay = day

    if (state.streak >= STREAK_MIN_FOR_BONUS) {
      const bonus = Math.min(STREAK_CAP, STREAK_BASE + state.streak * STREAK_PER)
      const region = /** @type {NeuralRegionId} */ ('hippocampus')
      decayRegionTo(region, event.ts)
      const s = state.regions[region]
      const spent = Number(state.today.perRegion[region]) || 0
      const room = Math.max(0, DAILY_CAP - spent)
      const add = Math.min(bonus, room, MAX_XP - s.base)
      if (add > 0) {
        s.base += add
        s.peak = Math.max(s.peak, s.base)
        s.lastActiveAt = event.ts
        s.decayFlag = false
        state.today.perRegion[region] = spent + add
        streakBonusApplied = add
        gains[region] = (gains[region] ?? 0) + add
      }
    }
  }

  state.lastEventTs = Math.max(state.lastEventTs, event.ts)
  state.eventCount += 1

  logEntry.gains = gains
  logEntry.returnBonus = anyReturnBonus
  logEntry.hitDailyCap = hitDailyCap
  logEntry.streakBonus = streakBonusApplied
  logEntry.streak = state.streak

  return { state, logEntry }
}

/**
 * Tüm olaylardan saklı durumu sıfırdan kur.
 * @param {NeuralEvent[]} events
 */
function rebuildState(events) {
  let state = emptyStoredState()
  /** @type {Array<Record<string, unknown>>} */
  const eventLog = []
  const sorted = [...events]
    .filter((e) => e && Number.isFinite(e.ts))
    .sort((a, b) => a.ts - b.ts || String(a.id).localeCompare(String(b.id)))

  for (const ev of sorted) {
    const { state: next, logEntry } = applyEvent(state, ev)
    state = next
    eventLog.push(logEntry)
  }
  return { state, eventLog }
}

/**
 * Saklı durumdan okuma-anında efektif puan / seviye / sönme.
 * @param {ReturnType<typeof emptyStoredState>} storedState
 * @param {number} nowMs
 */
function applyDecay(storedState, nowMs) {
  const stored = cloneStored(storedState)
  /** @type {Record<string, unknown>} */
  const regions = {}
  let totalLevel = 0

  for (const id of REGION_IDS) {
    const s = stored.regions[id]
    const grace = GRACE_DAYS[id]
    let effectiveXp = s.base
    let idleDays = 0
    if (s.lastActiveAt != null) {
      idleDays = Math.max(0, (nowMs - s.lastActiveAt) / DAY_MS)
      effectiveXp = decayXp(s.base, Math.max(s.peak, s.base), idleDays, grace)
    }
    const decayLoss = Math.max(0, s.base - effectiveXp)
    const daysToDecay = Math.max(0, grace - idleDays)
    const level = levelForXp(effectiveXp)
    totalLevel += level
    regions[id] = {
      xp: s.base,
      base: s.base,
      effectiveXp,
      level,
      xpToNext: xpToNextLevel(effectiveXp),
      peak: s.peak,
      lastActiveAt: s.lastActiveAt,
      idleDays,
      graceDays: grace,
      daysToDecay,
      decaying: idleDays > grace,
      decayLoss,
      decayFlag: s.decayFlag === true || idleDays > grace,
    }
  }

  return {
    regions,
    streak: stored.streak,
    lastActiveDay: stored.lastActiveDay,
    totalLevel,
    nowMs,
    stored,
    lastEventTs: stored.lastEventTs,
    eventCount: stored.eventCount,
  }
}

/**
 * @param {NeuralEvent[]} events
 * @param {number} nowMs
 */
function computeNeuralState(events, nowMs) {
  const filtered = [...events].filter((e) => e && Number.isFinite(e.ts) && e.ts <= nowMs)
  const { state, eventLog } = rebuildState(filtered)
  const view = applyDecay(state, nowMs)
  return {
    regions: view.regions,
    streak: view.streak,
    lastActiveDay: view.lastActiveDay,
    totalLevel: view.totalLevel,
    eventLog,
    nowMs,
  }
}

/**
 * @param {string} dayKey YYYY-MM-DD Istanbul
 */
function previousIstanbulDay(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number)
  const probe = Date.UTC(y, m - 1, d, 12, 0, 0) - 3 * 3600 * 1000
  for (let back = DAY_MS; back <= 2 * DAY_MS; back += 3600 * 1000) {
    const key = istanbulDayKey(probe - back)
    if (key !== dayKey) return key
  }
  return dayKey
}

/**
 * Birden fazla kaynaktan event + ignored üret.
 * @param {Array<{ source: string; docs: Array<Record<string, unknown> & { id?: string }> }>} batches
 */
function normalizeEventBatches(batches) {
  /** @type {NeuralEvent[]} */
  const events = []
  /** @type {IgnoredMeta[]} */
  const ignored = []
  /** @type {Record<string, { read: number; matched: number; ignored: number }>} */
  const stats = {}

  for (const batch of batches) {
    const st = stats[batch.source] ?? { read: 0, matched: 0, ignored: 0 }
    for (const doc of batch.docs) {
      st.read += 1
      const { event, ignored: ig } = normalizeEvent(batch.source, doc)
      if (event) {
        events.push(event)
        st.matched += 1
      } else if (ig) {
        ignored.push(ig)
        st.ignored += 1
      }
    }
    stats[batch.source] = st
  }

  return { events, ignored, stats }
}

module.exports = {
  istanbulDayKey,
  docFieldNames,
  normalizeScoreTo100,
  scoreAdjustedGain,
  classifyLegacyRangeLog,
  isTacticalSessionComplete,
  normalizeEvent,
  decayXp,
  applyDecayXp,
  levelForXp,
  levelFromXp,
  xpToNextLevel,
  emptyStoredState,
  applyEvent,
  rebuildState,
  applyDecay,
  computeNeuralState,
  normalizeEventBatches,
}
