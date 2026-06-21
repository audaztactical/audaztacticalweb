/** @typedef {'self_entry' | 'instructor_eval' | 'group_session'} ObservedRecordSource */
/** @typedef {'unverified' | 'instructor_verified' | 'rejected'} ObservedVerificationStatus */
/** @typedef {'peer_observed' | 'self_reported'} ObservationMethod */

export const VBSS_OBSERVED_EVAL_KIND = 'VBSS_OBSERVED_EVAL'
export const TCCC_OBSERVED_EVAL_KIND = 'TCCC_OBSERVED_EVAL'
export const OBSERVED_EVAL_TYPE = 'observed_evaluation'

export const RECORD_SOURCE_SELF_ENTRY = /** @type {ObservedRecordSource} */ ('self_entry')
export const VERIFICATION_STATUS_UNVERIFIED = /** @type {ObservedVerificationStatus} */ ('unverified')
export const OBSERVATION_METHOD_PEER = /** @type {ObservationMethod} */ ('peer_observed')

export const VBSS_OBSERVED_PDF_FORM_VERSION = 'vbss_obs_v1'
export const TCCC_OBSERVED_PDF_FORM_VERSION = 'tccc_obs_v1'
