/**
 * Firestore veri ayrımı — kişisel istatistikler vs eğitmen değerlendirmeleri.
 * Kişisel ve eğitmen verileri asla aynı sorguda birleştirilmemelidir.
 */

/** Bireysel antrenman / kişisel istatistik (personal_stats kavramsal alanı) */
export const PERSONAL_DATA_DOMAINS = {
  /** range_logs/{uid}/entries — kişisel atış ve drill kayıtları */
  RANGE_LOGS: 'range_logs',
  /** vbss_logs/{uid}/entries — VBSS deniz operasyon kayıtları */
  VBSS_LOGS: 'vbss_logs',
  /** tccc_logs/{uid}/entries — TCCC taktik sağlık kayıtları */
  TCCC_LOGS: 'tccc_logs',
  /** trainings — kişisel eğitim planları */
  TRAINING_PLANS: 'trainings',
}

/** Eğitmenin girdiği operatör değerlendirme notları (instructor_evaluations kavramsal alanı) */
export const INSTRUCTOR_EVALUATION_COLLECTIONS = {
  VBSS: 'vbss_evaluations',
  TCCC: 'tccc_evaluations',
  GROUP_ACTIVITY: 'group_activity_logs',
}

/** Canlı grup oturumları — bireysel loglardan izole */
export const GROUP_TRAINING_COLLECTIONS = {
  SESSIONS: 'group_trainings',
  RESULTS: 'training_results',
}
