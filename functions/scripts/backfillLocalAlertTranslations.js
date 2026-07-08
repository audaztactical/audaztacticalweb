/**
 * Yerel uyarı (news_feed, isAlert === true) kayıtlarındaki sahte
 * "[LOCAL ALERT] …" enTitle/enSummary alanlarını gerçek EN çeviriyle günceller.
 *
 * Varsayılan: --dry-run (yazma yok). Gerçek güncelleme: --execute
 *
 * Kullanım (functions/ dizininden):
 *   node scripts/backfillLocalAlertTranslations.js
 *   node scripts/backfillLocalAlertTranslations.js --execute
 *   node scripts/backfillLocalAlertTranslations.js --execute --delay-ms=300
 *
 * Ortam:
 *   GOOGLE_APPLICATION_CREDENTIALS — Firebase Admin + Translate ADC
 *   FIREBASE_PROJECT_ID (varsayılan: audaz-web)
 */
const { parseArgs } = require('node:util')
const { setTimeout: sleep } = require('node:timers/promises')
const admin = require('firebase-admin')
const { EN_FAIL_PREFIX, translateToEnglish } = require('../lib/translation')

const COLLECTION = 'news_feed'
const LEGACY_LOCAL_ALERT_PREFIX = '[LOCAL ALERT]'
/** Google Cloud Translation Basic v2 — yaklaşık $/milyon karakter (tahmin raporu için). */
const ESTIMATED_COST_PER_MILLION_CHARS_USD = 20

const { values: args } = parseArgs({
  options: {
    execute: { type: 'boolean', default: false },
    'delay-ms': { type: 'string', default: '250' },
  },
  allowPositionals: false,
})

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'audaz-web'
const DRY_RUN = !args.execute
const DELAY_MS = Math.max(0, Number(args['delay-ms']) || 250)

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID })
}

const db = admin.firestore()

/**
 * @param {string} value
 */
function isLegacyLocalAlertEnglish(value) {
  return String(value ?? '').trimStart().startsWith(LEGACY_LOCAL_ALERT_PREFIX)
}

/**
 * @param {FirebaseFirestore.QueryDocumentSnapshot} docSnap
 */
function isEligibleAlertDoc(docSnap) {
  const data = docSnap.data() ?? {}
  if (data.isAlert !== true) return false
  if (!isLegacyLocalAlertEnglish(data.enTitle)) return false

  const trTitle = String(data.trTitle ?? '').trim()
  if (!trTitle) return false

  return true
}

/**
 * @param {number} recordCount
 * @param {number} totalChars
 */
function printDryRunSummary(recordCount, totalChars) {
  const apiCalls = recordCount * 2
  const estimatedCostUsd = (totalChars / 1_000_000) * ESTIMATED_COST_PER_MILLION_CHARS_USD

  console.log('')
  console.log('=== DRY-RUN ÖZET ===')
  console.log(`Proje:              ${PROJECT_ID}`)
  console.log(`Koleksiyon:         ${COLLECTION}`)
  console.log(`Eşleşen kayıt:      ${recordCount}`)
  console.log(`Tahmini API çağrısı: ${apiCalls} (kayıt × 2: başlık + özet)`)
  console.log(`Tahmini karakter:   ${totalChars.toLocaleString('en-US')}`)
  console.log(
    `Tahmini maliyet:    ~$${estimatedCostUsd.toFixed(4)} USD (@ $${ESTIMATED_COST_PER_MILLION_CHARS_USD}/1M char)`,
  )
  console.log(`Kayıt arası gecikme: ${DELAY_MS}ms (--execute ile)`)
  console.log('')
  console.log('Gerçek güncelleme için:')
  console.log('  node scripts/backfillLocalAlertTranslations.js --execute')
  console.log('')
}

/**
 * @param {FirebaseFirestore.QueryDocumentSnapshot} docSnap
 */
async function translateAlertFields(docSnap) {
  const data = docSnap.data() ?? {}
  const trTitle = String(data.trTitle ?? '').trim()
  const trSummary = String(data.trSummary ?? '').trim()

  const [enTitle, enSummary] = await Promise.all([
    translateToEnglish(trTitle),
    translateToEnglish(trSummary),
  ])

  if (enTitle.startsWith(EN_FAIL_PREFIX)) {
    throw new Error(`enTitle çeviri başarısız: ${enTitle.slice(0, 120)}`)
  }
  if (trSummary && enSummary.startsWith(EN_FAIL_PREFIX)) {
    throw new Error(`enSummary çeviri başarısız: ${enSummary.slice(0, 120)}`)
  }

  return { enTitle, enSummary }
}

async function main() {
  console.log(`[backfill-local-alerts] Mod: ${DRY_RUN ? 'DRY-RUN' : 'EXECUTE'}`)
  console.log(`[backfill-local-alerts] Sorgu: ${COLLECTION} where isAlert == true`)

  const snap = await db.collection(COLLECTION).where('isAlert', '==', true).get()
  const eligible = snap.docs.filter(isEligibleAlertDoc)

  let totalChars = 0
  for (const docSnap of eligible) {
    const data = docSnap.data() ?? {}
    totalChars += String(data.trTitle ?? '').trim().length
    totalChars += String(data.trSummary ?? '').trim().length
  }

  console.log(`[backfill-local-alerts] isAlert kayıt: ${snap.size}`)
  console.log(`[backfill-local-alerts] Eski format (enTitle "${LEGACY_LOCAL_ALERT_PREFIX}…"): ${eligible.length}`)

  if (eligible.length === 0) {
    console.log('[backfill-local-alerts] Güncellenecek kayıt yok. Çıkılıyor.')
    return
  }

  if (DRY_RUN) {
    printDryRunSummary(eligible.length, totalChars)
    return
  }

  let updated = 0
  let skipped = 0
  const total = eligible.length

  for (let i = 0; i < eligible.length; i += 1) {
    const docSnap = eligible[i]
    const docId = docSnap.id

    try {
      const data = docSnap.data() ?? {}
      if (data.isAlert !== true) {
        throw new Error('isAlert !== true — güvenlik atlaması')
      }
      if (!isLegacyLocalAlertEnglish(data.enTitle)) {
        throw new Error('enTitle artık eski formatta değil — atlanıyor')
      }

      const { enTitle, enSummary } = await translateAlertFields(docSnap)

      await docSnap.ref.update({
        enTitle,
        enSummary,
      })

      updated += 1
    } catch (err) {
      skipped += 1
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[backfill-local-alerts] HATA doc=${docId}: ${message}`)
    }

    const done = i + 1
    if (done % 10 === 0 || done === total) {
      console.log(`[backfill-local-alerts] İlerleme: ${done}/${total} (güncellenen: ${updated}, atlanan: ${skipped})`)
    }

    if (i < eligible.length - 1 && DELAY_MS > 0) {
      await sleep(DELAY_MS)
    }
  }

  console.log('')
  console.log('=== EXECUTE TAMAMLANDI ===')
  console.log(`Güncellenen: ${updated}`)
  console.log(`Atlanan:     ${skipped}`)
  console.log(`Toplam:      ${total}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[backfill-local-alerts] Fatal:', err)
    process.exit(1)
  })
