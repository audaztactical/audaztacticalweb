/** @typedef {'INDIVIDUAL' | 'GROUP'} TrainingTypeKey */

/**
 * @typedef {{
 *   groupId: string
 *   groupName: string
 *   instructorId: string
 * }} OperatorGroupMembership
 */

/**
 * @typedef {{
 *   trainingType: TrainingTypeKey
 *   groupId: string | null
 *   instructorId: string | null
 *   groupName?: string | null
 * }} GroupTrainingFields
 */

export const TRAINING_TYPE_INDIVIDUAL = /** @type {TrainingTypeKey} */ ('INDIVIDUAL')
export const TRAINING_TYPE_GROUP = /** @type {TrainingTypeKey} */ ('GROUP')

/**
 * @param {TrainingTypeKey | string} trainingType
 * @param {OperatorGroupMembership | null | undefined} membership
 * @returns {GroupTrainingFields}
 */
export function buildGroupTrainingFields(trainingType, membership) {
  const wantsGroup = trainingType === TRAINING_TYPE_GROUP
  const hasGroup = Boolean(membership?.groupId && membership?.instructorId)

  if (wantsGroup && hasGroup) {
    return {
      trainingType: TRAINING_TYPE_GROUP,
      groupId: membership.groupId,
      instructorId: membership.instructorId,
      groupName: membership.groupName ?? null,
    }
  }

  return {
    trainingType: TRAINING_TYPE_INDIVIDUAL,
    groupId: null,
    instructorId: null,
    groupName: null,
  }
}

/**
 * @param {Record<string, unknown>} payload
 * @param {GroupTrainingFields} fields
 */
export function injectGroupTrainingFields(payload, fields) {
  return {
    ...payload,
    trainingType: fields.trainingType,
    groupId: fields.groupId,
    instructorId: fields.instructorId,
    ...(fields.groupName ? { groupName: fields.groupName } : {}),
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function isGroupTrainingLog(row) {
  return String(row?.trainingType ?? '').toUpperCase() === TRAINING_TYPE_GROUP
}
