/**
 * 20+ günlük deneme süresi dolmuş üyeleri toplu olarak locked yapar veya premium yükseltir.
 *
 * Kullanım:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/admin_upgrade.js
 *   node scripts/admin_upgrade.js --dry-run
 *   node scripts/admin_upgrade.js --upgrade-premium --uids=uid1,uid2
 *   node scripts/admin_upgrade.js --lock-expired
 *
 * Ortam:
 *   FIREBASE_PROJECT_ID (varsayılan: audaz-web)
 *   TRIAL_DAYS (varsayılan: 20)
 */
import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'

const require = createRequire(new URL('../functions/package.json', import.meta.url))
const admin = require('firebase-admin')

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    'lock-expired': { type: 'boolean', default: false },
    'upgrade-premium': { type: 'boolean', default: false },
    uids: { type: 'string', default: '' },
    'trial-days': { type: 'string', default: '' },
  },
  allowPositionals: false,
})

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'audaz-web'
const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || args['trial-days'] || 20)
const DRY_RUN = args['dry-run'] === true
const LOCK_EXPIRED = args['lock-expired'] === true || (!args['upgrade-premium'] && !args.uids)
const UPGRADE_PREMIUM = args['upgrade-premium'] === true
const TARGET_UIDS = args.uids
  ? args.uids.split(',').map((s) => s.trim()).filter(Boolean)
  : []

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID })
}

const db = admin.firestore()

/** @param {FirebaseFirestore.Timestamp | undefined} ts */
function timestampToMs(ts) {
  if (!ts || typeof ts.toDate !== 'function') return null
  try {
    return ts.toDate().getTime()
  } catch {
    return null
  }
}

/** @param {FirebaseFirestore.QueryDocumentSnapshot} doc */
function isExpiredMember(doc) {
  const data = doc.data()
  const role = String(data.role || data.userRole || 'member').toLowerCase()
  if (role === 'instructor' || role === 'premium_member' || role === 'admin') return false
  if (String(data.accountStatus || 'active').toLowerCase() === 'locked') return false

  const enrolledMs = timestampToMs(data.enrolledAt)
  if (enrolledMs == null) return false

  const days = Math.floor((Date.now() - enrolledMs) / (1000 * 60 * 60 * 24))
  return days >= TRIAL_DAYS
}

async function lockUser(uid) {
  const payload = {
    accountStatus: 'locked',
    lockedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
  if (DRY_RUN) {
    console.log(`[dry-run] lock ${uid}`)
    return
  }
  await db.collection('users').doc(uid).set(payload, { merge: true })
  console.log(`locked ${uid}`)
}

async function upgradeUser(uid) {
  const paymentId = `pi_admin_batch_${Date.now()}_${uid.slice(0, 8)}`
  const payload = {
    role: 'premium_member',
    accountStatus: 'active',
    premiumPaymentId: paymentId,
    premiumUpgradedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
  if (DRY_RUN) {
    console.log(`[dry-run] upgrade ${uid} -> premium_member`)
    return
  }
  await db.collection('users').doc(uid).set(payload, { merge: true })
  console.log(`upgraded ${uid} -> premium_member`)
}

async function main() {
  console.log(`admin_upgrade · project=${PROJECT_ID} · trialDays=${TRIAL_DAYS} · dryRun=${DRY_RUN}`)

  if (TARGET_UIDS.length > 0) {
    for (const uid of TARGET_UIDS) {
      if (UPGRADE_PREMIUM) {
        await upgradeUser(uid)
      } else {
        await lockUser(uid)
      }
    }
    console.log(`Done · ${TARGET_UIDS.length} targeted uid(s)`)
    return
  }

  if (!LOCK_EXPIRED && !UPGRADE_PREMIUM) {
    console.error('Belirsiz mod. --lock-expired veya --upgrade-premium kullanın.')
    process.exit(1)
  }

  const snap = await db.collection('users').get()
  let matched = 0

  for (const doc of snap.docs) {
    if (!isExpiredMember(doc)) continue
    matched += 1
    if (UPGRADE_PREMIUM) {
      await upgradeUser(doc.id)
    } else {
      await lockUser(doc.id)
    }
  }

  console.log(`Done · scanned=${snap.size} · matched=${matched}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
