/**
 * Kuru Tetik Antrenman Senaryosu —
 * idle → güvenlik → prep (ilk kurulum yoksay) → atış/kurulum döngüsü.
 */

/**
 * Atış sonrası kısa refractory (ms) — donanım yankı / bip / kapak sesi.
 * Süre dolunca otomatik live_shot'a dönülür; kapak sesi gelirse erken temizlenir.
 * Önceden her ikinci trigger kalıcı live_rack'te yutuluyordu (simüle tetikte isabet yoktu).
 */
export const DRY_FIRE_RACK_WINDOW_MS = 320

/** Go bip / arm sonrası donanımdan gelen yanlış tetikleri yoksay (ms) */
export const DRY_FIRE_ARM_GUARD_MS = 220

/**
 * @typedef {'idle' | 'safety' | 'prep' | 'live_shot' | 'live_rack'} DryFireScenarioPhase
 */

/**
 * @typedef {'count_shot' | 'ignore_rack' | 'ignore_prep' | 'blocked'} DryFireTriggerVerdict
 */

/**
 * Gelen trigger'ın nasıl işleneceği.
 * Prep'teki ilk kapak sesi tamamen yoksayılır; canlıda yalnızca live_shot skora yazılır.
 * @param {DryFireScenarioPhase} scenario
 * @param {boolean} timerRunning  phase === 'running'
 * @returns {DryFireTriggerVerdict}
 */
export function resolveDryFireTriggerVerdict(scenario, timerRunning) {
  if (scenario === 'idle' || scenario === 'safety') return 'blocked'
  if (scenario === 'prep') return 'ignore_prep'
  if (!timerRunning) return 'blocked'
  if (scenario === 'live_rack') return 'ignore_rack'
  if (scenario === 'live_shot') return 'count_shot'
  return 'blocked'
}

/** @param {DryFireScenarioPhase} scenario */
export function isDryFireTrainingLive(scenario) {
  return scenario === 'live_shot' || scenario === 'live_rack'
}

/**
 * "Sistemi Kur" — henüz setup yoksa güvenlik modalına gir.
 * @param {DryFireScenarioPhase} scenario
 * @returns {DryFireScenarioPhase}
 */
export function beginDryFireSetup(scenario) {
  return scenario === 'idle' ? 'safety' : scenario
}

/**
 * Güvenlik onayı tamam → idle (prep, Bip & Başlat ile FS içinde açılır).
 * @returns {DryFireScenarioPhase}
 */
export function afterSafetyConfirmed() {
  return 'idle'
}

/**
 * İlk kapak kurulumu onaylandı → atış döngüsüne geç (sistem arm edilecek).
 * @returns {DryFireScenarioPhase}
 */
export function afterPrepConfirmed() {
  return 'live_shot'
}

/**
 * Atış sayıldıktan sonra kısa kurulum/yankı penceresine geç.
 * Donanım kapak sesi gelirse erken temizlenir; aksi halde RACK_WINDOW sonrası otomatik live_shot.
 * @param {DryFireScenarioPhase} scenario
 * @returns {DryFireScenarioPhase}
 */
export function afterCountedShot(scenario) {
  return scenario === 'live_shot' ? 'live_rack' : scenario
}

/**
 * Kurulum sesi yoksayıldıktan sonra tekrar atışa hazır.
 * @param {DryFireScenarioPhase} scenario
 * @returns {DryFireScenarioPhase}
 */
export function afterIgnoredRack(scenario) {
  return scenario === 'live_rack' ? 'live_shot' : scenario
}

export const DRY_FIRE_SAFETY_ITEMS = /** @type {const} */ ([
  'magazine',
  'chamber',
  'muzzle',
])
