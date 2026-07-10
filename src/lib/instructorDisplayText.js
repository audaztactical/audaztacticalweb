import i18n from '../i18n'
import {
  formatAtisDrillLabel,
  formatCqbTacticalErrorGroupTitle,
  formatCqbTacticalErrorLabel,
  formatObservedEvalCriterionLabel,
  formatObservedEvalObservationNoteLabel,
  formatObservedEvalPhaseSubtitle,
  formatObservedEvalPhaseTitle,
  formatTcccCasualtyStatusCodeDisplay,
  formatTcccCasualtyStatusDisplay,
  formatTcccCriticalFailLabel,
  formatTcccMarchActionChipLabel,
  formatTcccObservedEvalValidationError,
  formatTrainingCategoryTitle,
  formatTrainingSectorLabel,
  formatVbssObservedEvalValidationError,
} from './trainingDisplayText'

const NS = 'instructor'

/** Instructor CQB infraction key → training tactical-error id (when shared) */
const CQB_INFRACTION_TO_TRAINING = {
  breachingGecikmesi: 'breaching_delay',
  koldaAcikVerme: 'stack_exposure',
  sesDisipliniIhlali: 'noise_discipline_compromised',
  yetersizDilimleme: 'poor_threshold_pieing',
  olumHunisindeCakilma: 'fatal_funnel_hang',
  derineFazlaKacma: 'over_penetration',
  korlemesineGiris: 'blind_entry',
  yavasKirma: 'slow_breach',
  gevsekKoseKontrolu: 'poor_corner_check',
  sektorBoslugu: 'leaving_sectors_uncovered',
  operatorCakismasi: 'colliding_with_teammate',
  namluIhlali: 'muzzle_flagging',
  tunelVizyonu: 'tunnel_vision',
  zayifIletisim: 'poor_comm_discipline',
}

/** Instructor CQB phase id → training error group id */
const CQB_PHASE_TO_TRAINING_GROUP = {
  pre_breach: 'pre_entry',
  entry_phase: 'entry_phase',
  room_geometry: 'room_geometry',
  weapon_comm: 'weapon_comm',
}

/** @returns {'tr-TR' | 'en-US'} */
export function instructorLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 */
export function instructorT(key, params = {}) {
  return i18n.t(key, { ns: NS, ...params })
}

/** English preset drill name → ATIS drill id (training.json) */
const PRESET_DRILL_NAME_TO_ID = {
  'draw & first shot': 'l1-draw-first',
  'double tap': 'l1-double-tap',
  'ready position': 'l1-ready',
  'reload drills': 'l2-reload',
  'rifle to pistol transition': 'l2-rifle-pistol',
  'malfunction clearance': 'l2-malfunction',
  'mozambique drill': 'l3-mozambique',
  'multi target transition': 'l3-multi-target',
  'multi-target transition': 'l3-multi-target',
}

/**
 * Display drill name — reuse training ATIS labels when preset matches.
 * @param {string | null | undefined} rawName
 * @param {string | null | undefined} [drillId]
 */
export function formatInstructorDrillName(rawName, drillId) {
  const id = String(drillId ?? '').trim()
  if (id && !id.startsWith('preset:')) {
    const fromId = formatAtisDrillLabel(id)
    if (fromId && fromId !== id) return fromId
  }

  const name = String(rawName ?? '').trim()
  if (!name) return instructorT('common.emDash')

  const mapped = PRESET_DRILL_NAME_TO_ID[name.toLowerCase()]
  if (mapped) {
    const label = formatAtisDrillLabel(mapped)
    if (label && label !== mapped) return label
  }

  // preset:level:slug → try slug match
  if (id.startsWith('preset:')) {
    const slug = id.split(':').pop() || ''
    for (const [en, atisId] of Object.entries(PRESET_DRILL_NAME_TO_ID)) {
      const enSlug = en.replace(/[^a-z0-9]+/g, '-')
      if (slug === enSlug || slug.includes(enSlug)) {
        const label = formatAtisDrillLabel(atisId)
        if (label && label !== atisId) return label
      }
    }
  }

  return name
}

/**
 * @param {string} discipline
 */
export function labelInstructorDiscipline(discipline) {
  const id = String(discipline ?? '').toLowerCase()
  const key = `disciplines.${id}`
  const translated = instructorT(key)
  return translated === key ? id.toUpperCase() : translated
}

/**
 * @param {string} sourceKey
 */
export function labelInstructorSource(sourceKey) {
  const key = `sources.${sourceKey}`
  const translated = instructorT(key)
  return translated === key ? sourceKey : translated
}

/**
 * @param {unknown} ts
 */
export function formatInstructorDateTime(ts) {
  const locale = instructorLocale()
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof /** @type {{ toDate?: () => Date }} */ (ts).toDate === 'function') {
    return /** @type {{ toDate: () => Date }} */ (ts).toDate().toLocaleString(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }
  const ms = Date.parse(String(ts ?? ''))
  if (!ms) return instructorT('common.emDash')
  return new Date(ms).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * @param {unknown} ts
 */
export function resolveInstructorTimestampMs(ts) {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof /** @type {{ toMillis?: () => number }} */ (ts).toMillis === 'function') {
    return /** @type {{ toMillis: () => number }} */ (ts).toMillis()
  }
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof /** @type {{ toDate?: () => Date }} */ (ts).toDate === 'function') {
    return /** @type {{ toDate: () => Date }} */ (ts).toDate().getTime()
  }
  return Date.parse(String(ts ?? '')) || 0
}

/** Re-export training helpers used by instructor education panels */
export {
  formatAtisDrillLabel,
  formatObservedEvalObservationNoteLabel,
  formatObservedEvalPhaseSubtitle,
  formatObservedEvalPhaseTitle,
  formatTcccCasualtyStatusCodeDisplay,
  formatTcccCasualtyStatusDisplay,
  formatTcccCriticalFailLabel,
  formatTcccMarchActionChipLabel,
  formatTrainingCategoryTitle,
  formatTrainingSectorLabel,
}

/**
 * Sector card title — prefer training.sectors.*.title for naming parity.
 * @param {string} categoryId
 */
export function formatInstructorEducationSectorTitle(categoryId) {
  const fromTraining = formatTrainingCategoryTitle(categoryId)
  if (fromTraining) return fromTraining
  return instructorT(`education.sectors.${categoryId}.title`, {
    defaultValue: labelInstructorDiscipline(categoryId),
  })
}

/**
 * @param {string} categoryId
 */
export function formatInstructorEducationSectorSubtitle(categoryId) {
  return instructorT(`education.sectors.${categoryId}.subtitle`, { defaultValue: '' })
}

/**
 * @param {string} categoryId
 */
export function formatInstructorEducationModuleLabel(categoryId) {
  const label =
    formatTrainingSectorLabel(categoryId) ||
    formatInstructorEducationSectorTitle(categoryId) ||
    instructorT('education.hub.sectorFallback')
  return instructorT('education.hub.moduleSuffix', { label })
}

/**
 * Display-only CQB option label. Storage still uses matrix canonical labels.
 * @param {'roomTopology' | 'entryMethod' | 'breachingType' | 'doorState'} optionType
 * @param {string} value
 * @param {string} [fallback]
 */
export function formatInstructorCqbOptionLabel(optionType, value, fallback = '') {
  const id = String(value ?? '').trim()
  if (!id) return instructorT('education.cqb.selectPlaceholder')
  const key = `education.cqb.options.${optionType}.${id}`
  const translated = instructorT(key)
  if (translated !== key) return translated
  return fallback || id
}

/**
 * @param {string} phaseId
 * @param {'title' | 'subtitle'} field
 * @param {string} [fallback]
 */
export function formatInstructorCqbPhaseField(phaseId, field, fallback = '') {
  const trainingGroup = CQB_PHASE_TO_TRAINING_GROUP[phaseId]
  if (field === 'title' && trainingGroup) {
    const fromTraining = formatCqbTacticalErrorGroupTitle(trainingGroup)
    if (fromTraining) return fromTraining.toLocaleUpperCase(instructorLocale())
  }
  const key = `education.cqb.phases.${phaseId}.${field}`
  const translated = instructorT(key)
  return translated !== key ? translated : fallback
}

/**
 * Display-only infraction label. Storage keeps matrix Turkish labels.
 * @param {string} infractionKey
 * @param {string} [fallback]
 */
export function formatInstructorCqbInfractionLabel(infractionKey, fallback = '') {
  const id = String(infractionKey ?? '').trim()
  const trainingId = CQB_INFRACTION_TO_TRAINING[id]
  if (trainingId) {
    const fromTraining = formatCqbTacticalErrorLabel(trainingId)
    if (fromTraining && fromTraining !== trainingId) return fromTraining
  }
  const key = `education.cqb.infractions.${id}`
  const translated = instructorT(key)
  return translated !== key ? translated : fallback || id
}

/**
 * @param {string} scenarioType stored value (canonical TR string)
 */
export function formatInstructorFofScenarioLabel(scenarioType) {
  const raw = String(scenarioType ?? '')
  const key = `education.fof.scenarios.${raw}`
  const translated = instructorT(key)
  return translated !== key ? translated : raw
}

/**
 * @param {string} hitStatusId
 * @param {'label' | 'hint'} field
 * @param {string} [fallback]
 */
export function formatInstructorFofHitStatusField(hitStatusId, field, fallback = '') {
  const key = `education.fof.hitStatus.${hitStatusId}.${field}`
  const translated = instructorT(key)
  return translated !== key ? translated : fallback
}

/**
 * @param {string} penaltyId
 * @param {'label' | 'sublabel'} field
 * @param {string} [fallback]
 */
export function formatInstructorFofPenaltyField(penaltyId, field, fallback = '') {
  const key = `education.fof.penalties.${penaltyId}.${field}`
  const translated = instructorT(key)
  return translated !== key ? translated : fallback
}

/**
 * Map engine failReason codes to localized display (does not alter scoring).
 * @param {string | null | undefined} failReason
 */
export function formatInstructorFofFailReason(failReason) {
  const raw = String(failReason ?? '')
  if (!raw) return ''
  if (raw.includes('COLLATERAL')) return instructorT('education.fof.failReasons.collateral')
  if (raw.includes('KRİTİK') || raw.includes('CRITICAL')) {
    return instructorT('education.fof.failReasons.criticalHit')
  }
  return raw
}

/**
 * @param {'green' | 'amber' | 'red'} tone
 */
export function formatInstructorFofHudToneLabel(tone) {
  if (tone === 'green') return instructorT('education.fof.toneOperational')
  if (tone === 'amber') return instructorT('education.fof.toneDevelop')
  return instructorT('education.fof.toneFail')
}

/**
 * Instructor VBSS/TCCC evaluation validation → localized message.
 * Prefers EVAL:* codes; falls back to training observed-eval formatters (legacy TR strings).
 * @param {'vbss' | 'tccc'} discipline
 * @param {string | null | undefined} err
 */
export function formatInstructorEvaluationValidationError(discipline, err) {
  if (!err) return null
  const raw = String(err)

  if (raw === 'EVAL:operatorRequired') {
    return instructorT(`education.${discipline}.validation.operatorRequired`)
  }
  if (raw === 'EVAL:targetDurationInvalid') {
    return (
      instructorT('education.vbss.validation.targetDurationInvalid') ||
      i18n.t('sectors.vbss.observedEval.validation.targetDurationInvalid', { ns: 'training' })
    )
  }
  if (raw === 'EVAL:targetInterventionInvalid') {
    return (
      instructorT('education.tccc.validation.targetInterventionInvalid') ||
      i18n.t('sectors.tccc.observedEval.validation.targetInterventionInvalid', { ns: 'training' })
    )
  }

  const scoreMatch = raw.match(/^EVAL:criterionScoreRequired:([^:]*):([^:]+):(\d+):(\d+)$/)
  if (scoreMatch) {
    const [, phaseId, criterionId, min, max] = scoreMatch
    const phase = formatObservedEvalPhaseTitle(discipline, phaseId, phaseId)
    const criterion = formatObservedEvalCriterionLabel(discipline, phaseId, criterionId, criterionId)
    return i18n.t(`sectors.${discipline}.observedEval.validation.criterionScoreRequired`, {
      ns: 'training',
      phase,
      criterion,
      min,
      max,
    })
  }

  // Legacy Turkish strings (observed-eval / older payloads)
  if (discipline === 'vbss') return formatVbssObservedEvalValidationError(raw)
  return formatTcccObservedEvalValidationError(raw)
}
