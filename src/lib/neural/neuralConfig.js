/**
 * Operatör Beyni — sabitler (Firebase bağımsız).
 * Cloud Functions ile paylaşılmaya uygun saf yapılandırma.
 */

/** @typedef {'frontal'|'motor'|'parietal'|'occipital'|'temporal'|'hippocampus'|'cerebellum'|'stem'} NeuralRegionId */

/** @type {readonly NeuralRegionId[]} */
export const REGION_IDS = Object.freeze([
  'frontal',
  'motor',
  'parietal',
  'occipital',
  'temporal',
  'hippocampus',
  'cerebellum',
  'stem',
])

/**
 * @type {Readonly<Record<NeuralRegionId, { id: NeuralRegionId; nameTr: string; functionTr: string }>>}
 */
export const REGIONS = Object.freeze({
  frontal: {
    id: 'frontal',
    nameTr: 'Frontal lob',
    functionTr: 'Planlama, karar, görev ve senaryo yönetimi',
  },
  motor: {
    id: 'motor',
    nameTr: 'Motor korteks',
    functionTr: 'Atış, CQB, VBSS ve motor beceri',
  },
  parietal: {
    id: 'parietal',
    nameTr: 'Parietal lob',
    functionTr: 'Uzamsal hesap, balistik ve taktik geometri',
  },
  occipital: {
    id: 'occipital',
    nameTr: 'Oksipital lob',
    functionTr: 'Görsel dikkat, video ve istihbarat okuma',
  },
  temporal: {
    id: 'temporal',
    nameTr: 'Temporal lob',
    functionTr: 'Öğrenme, doktrin, forum ve dil',
  },
  hippocampus: {
    id: 'hippocampus',
    nameTr: 'Hipokampus',
    functionTr: 'Hafıza pekiştirme ve ardışık aktif gün serisi',
  },
  cerebellum: {
    id: 'cerebellum',
    nameTr: 'Beyincik',
    functionTr: 'Zamanlama, kuru tetik ve motor ince ayar',
  },
  stem: {
    id: 'stem',
    nameTr: 'Beyin sapı',
    functionTr: 'TCCC, hayatta kalma ve acil protokoller',
  },
})

/** Bölge başına sönme öncesi bekleme (gün) */
export const GRACE_DAYS = Object.freeze({
  frontal: 21,
  motor: 30,
  parietal: 30,
  occipital: 14,
  temporal: 30,
  hippocampus: 7,
  cerebellum: 45,
  stem: 30,
})

export const DAILY_CAP = 120
export const FLOOR_RATIO = 0.4
export const RETURN_BONUS = 1.5
export const DECAY_TAU_DAYS = 40

/**
 * Seviye eşikleri (indeks = seviye − 1).
 * Lv1=0 … Lv10=950. MAX_XP üst sınırdır.
 * @type {readonly number[]}
 */
export const LEVEL_THRESHOLDS = Object.freeze([0, 40, 90, 150, 230, 330, 450, 590, 760, 950])

export const MAX_XP = 1000
export const TIMEZONE = 'Europe/Istanbul'

/** Peak altına inince geri dönüş bonusu eşiği */
export const RETURN_BONUS_PEAK_RATIO = 0.97

/** Streak hippocampus: min(STREAK_BASE + streak×STREAK_PER, STREAK_CAP) */
export const STREAK_BASE = 8
export const STREAK_PER = 2
export const STREAK_CAP = 24
export const STREAK_MIN_FOR_BONUS = 2

/**
 * @typedef {Object} ActivityRule
 * @property {number} baseXp
 * @property {Partial<Record<NeuralRegionId, number>>} weights
 * @property {string} [scoreField]
 * @property {number} [perDayTypeCap]
 * @property {boolean} [futureOnly]
 * @property {boolean} [unused]
 */

/**
 * Olay tipi → kural. Ağırlık toplamları 1.
 * @type {Readonly<Record<string, ActivityRule>>}
 */
export const ACTIVITY_RULES = Object.freeze({
  ATIS_DRILL: {
    baseXp: 34,
    weights: { motor: 0.6, cerebellum: 0.15, occipital: 0.15, frontal: 0.1 },
    scoreField: 'accuracy',
  },
  CQB_DRILL: {
    baseXp: 34,
    weights: { motor: 0.6, parietal: 0.25, frontal: 0.15 },
    scoreField: 'successPercent',
  },
  FOF_DRILL: {
    baseXp: 34,
    weights: { frontal: 0.5, motor: 0.3, occipital: 0.2 },
    scoreField: 'successPercent',
  },
  TCCC_DRILL: {
    baseXp: 30,
    weights: { stem: 0.85, frontal: 0.15 },
    scoreField: 'successPercent',
  },
  /** range_logs VBSS terminal kaydı (vbssLogPayload) */
  VBSS_DRILL: {
    baseXp: 34,
    weights: { motor: 0.5, frontal: 0.3, parietal: 0.2 },
    scoreField: 'successPercent',
  },
  VBSS_OBSERVED_EVAL: {
    baseXp: 34,
    weights: { motor: 0.5, frontal: 0.3, parietal: 0.2 },
    scoreField: 'overallScore',
  },
  TCCC_OBSERVED_EVAL: {
    baseXp: 30,
    weights: { stem: 0.85, frontal: 0.15 },
    scoreField: 'overallScore',
  },
  TIMER_STANDARD: {
    baseXp: 30,
    weights: { cerebellum: 0.7, motor: 0.3 },
  },
  TIMER_DRYFIRE: {
    baseXp: 30,
    weights: { cerebellum: 0.6, motor: 0.3, occipital: 0.1 },
  },
  TRAINING_PLAN: {
    baseXp: 20,
    weights: { frontal: 0.7, temporal: 0.3 },
  },
  BALLISTIC_PROFILE: {
    baseXp: 26,
    weights: { parietal: 0.7, frontal: 0.2, temporal: 0.1 },
    perDayTypeCap: 2,
  },
  /**
   * kullanılmıyor — range_logs TCCC_DRILL kapsıyor
   * (MEDEVAC sim çift yazım: range_logs + medevac_logs; medevac_logs kaynak değil)
   */
  MEDEVAC_SIM: {
    baseXp: 25,
    weights: { stem: 0.6, frontal: 0.4 },
    scoreField: 'successPercent',
    unused: true,
  },
  FORUM_POST: {
    baseXp: 8,
    weights: { temporal: 0.9, frontal: 0.1 },
    perDayTypeCap: 3,
  },
  FORUM_REPLY: {
    baseXp: 8,
    weights: { temporal: 0.9, frontal: 0.1 },
    perDayTypeCap: 3,
  },
  /** activity_events üzerinden (INTEL_READ / GUIDE_READ / BALLISTIC_CALC) */
  INTEL_READ: {
    baseXp: 6,
    weights: { occipital: 0.7, temporal: 0.3 },
    perDayTypeCap: 5,
  },
  GUIDE_READ: {
    baseXp: 8,
    weights: { temporal: 0.8, hippocampus: 0.2 },
    perDayTypeCap: 3,
  },
  BALLISTIC_CALC: {
    baseXp: 10,
    weights: { parietal: 0.8, frontal: 0.2 },
    perDayTypeCap: 3,
  },
  AAR_ENTRY: {
    baseXp: 15,
    weights: { frontal: 0.8, hippocampus: 0.2 },
    perDayTypeCap: 3,
  },
})

/** Kaynak etiketleri (normalizeEvent / debug). medevac_logs bilerek yok. */
export const NEURAL_SOURCES = Object.freeze({
  RANGE_LOGS: 'range_logs',
  VBSS_LOGS: 'vbss_logs',
  TCCC_LOGS: 'tccc_logs',
  TACTICAL_SESSIONS: 'tacticalSessions',
  TRAININGS: 'trainings',
  BALLISTIC_PROFILES: 'ballistic_profiles',
  FORUM_POSTS: 'forum_posts',
  FORUM_REPLIES: 'forum_replies',
  ACTIVITY_EVENTS: 'activity_events',
})

/** users/{uid}/neural/state şema sürümü */
export const NEURAL_STATE_VERSION = 1
