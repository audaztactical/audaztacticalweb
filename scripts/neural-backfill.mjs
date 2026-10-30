/**
 * Operatör Beyni — yerel backfill (Admin SDK).
 *
 * Varsayılan: --dry-run
 * Yazma: --write
 * Emülatör: --emulator  (FIRESTORE_EMULATOR_HOST=127.0.0.1:8080)
 * Canlıya yazmak için ayrıca: --i-understand
 *
 * Örnek: node scripts/neural-backfill.mjs --emulator --dry-run
 * Örnek: node scripts/neural-backfill.mjs --emulator --write
 */

import { createRequire } from 'module'
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'functions', 'package.json'))

const args = new Set(process.argv.slice(2))
const dryRun = !args.has('--write')
const useEmulator = args.has('--emulator')
const iUnderstand = args.has('--i-understand')
const onlyUid = (() => {
  const i = process.argv.indexOf('--uid')
  return i >= 0 ? String(process.argv[i + 1] || '') : ''
})()

if (!useEmulator && !dryRun && !iUnderstand) {
  console.error(
    'CANLI VERİTABANINA YAZILACAK. Devam için --emulator kullanın veya --write ile birlikte --i-understand verin.',
  )
  process.exit(2)
}

if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
}

spawnSync(process.execPath, [path.join(__dirname, 'sync-neural-engine.mjs')], {
  cwd: root,
  stdio: 'inherit',
})

const { initializeApp, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { runNeuralBackfillForUser } = require('../functions/lib/neuralBackfill.js')

if (!getApps().length) {
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'audaz-web' })
}

const db = getFirestore()

async function main() {
  /** @type {string[]} */
  let uids = []
  if (onlyUid) {
    uids = [onlyUid]
  } else {
    const snap = await db.collection('users').select().get()
    uids = snap.docs.map((d) => d.id)
  }

  console.log(
    `[neural-backfill] users=${uids.length} dryRun=${dryRun} emulator=${useEmulator}`,
  )

  for (const uid of uids) {
    const result = await runNeuralBackfillForUser(uid, { dryRun })
    console.log(
      JSON.stringify({
        uid: uid.slice(0, 8) + '…',
        eventCount: result.eventCount,
        totalLevel: result.totalLevel,
        bySource: result.bySource,
        dryRun: result.dryRun,
      }),
    )
  }
  console.log('[neural-backfill] bitti')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
