/**
 * src/lib/neural → functions/lib/neural (CommonJS kopyası).
 * Çalıştır: node scripts/sync-neural-engine.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcDir = path.join(root, 'src', 'lib', 'neural')
const outDir = path.join(root, 'functions', 'lib', 'neural')

const HEADER = `/**
 * OTOMATİK ÜRETİLDİ — elle düzenleme.
 * Kaynak: src/lib/neural/ — güncellemek için: npm run sync:neural
 * Üretim: scripts/sync-neural-engine.mjs
 */

`

/**
 * ESM → CJS (bu dosyaların bilinen kalıpları).
 * @param {string} name
 * @param {string} esm
 */
function toCjs(name, esm) {
  let body = esm
    // strip existing file-level leading block that we replace
    .replace(/^\/\*\*[\s\S]*?\*\/\s*/, '')

  if (name === 'neuralConfig.js') {
    body = body
      .replace(/export const /g, 'const ')
      .replace(/\/\*\* @typedef[\s\S]*?\*\/\s*/g, '')
    body += `
module.exports = {
  REGION_IDS,
  REGIONS,
  GRACE_DAYS,
  DAILY_CAP,
  FLOOR_RATIO,
  RETURN_BONUS,
  DECAY_TAU_DAYS,
  LEVEL_THRESHOLDS,
  MAX_XP,
  TIMEZONE,
  RETURN_BONUS_PEAK_RATIO,
  STREAK_BASE,
  STREAK_PER,
  STREAK_CAP,
  STREAK_MIN_FOR_BONUS,
  ACTIVITY_RULES,
  NEURAL_SOURCES,
  NEURAL_STATE_VERSION,
}
`
  } else if (name === 'neuralEngine.js') {
    body = body
      .replace(
        /import \{([^}]+)\} from '\.\/neuralConfig\.js'/s,
        (_m, inner) => {
          const names = inner
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => s.replace(/^type\s+/, '').split(/\s+as\s+/).pop().trim())
          return `const { ${names.join(', ')} } = require('./neuralConfig')`
        },
      )
      .replace(/export function /g, 'function ')
      .replace(/export \{[^}]+\}/g, '')
    body += `
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
`
  } else {
    throw new Error(`Bilinmeyen dosya: ${name}`)
  }

  return HEADER + body
}

fs.mkdirSync(outDir, { recursive: true })
for (const name of ['neuralConfig.js', 'neuralEngine.js']) {
  const esm = fs.readFileSync(path.join(srcDir, name), 'utf8')
  const cjs = toCjs(name, esm)
  fs.writeFileSync(path.join(outDir, name), cjs, 'utf8')
  console.log(`[sync-neural] ${name} → functions/lib/neural/`)
}
console.log('[sync-neural] tamam')
