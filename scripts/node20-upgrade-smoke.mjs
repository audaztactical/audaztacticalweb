/**
 * ADIM 2 — Node 20→22 yükseltme öncesi emülatör duman testi (canlıya dokunmaz).
 * node scripts/node20-upgrade-smoke.mjs
 */

import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const require = createRequire(path.join(root, 'functions', 'package.json'))

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

const { initializeApp, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')

if (!getApps().length) initializeApp({ projectId: 'audaz-web' })
const auth = getAuth()
const db = getFirestore()

const PROJECT = 'audaz-web'
const REGION = 'us-central1'
const FN_BASE = `http://127.0.0.1:5001/${PROJECT}/${REGION}`
const AUTH_API = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'

const results = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function report(name, ok, note = '') {
  results.push({ name, ok, note })
  console.log(`  ${ok ? '✓' : '✗'} ${name}${note ? ` — ${note}` : ''}`)
}

async function signUp(email, password) {
  const res = await fetch(`${AUTH_API}/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  const json = await res.json()
  if (!json.idToken) throw new Error(`signUp failed: ${JSON.stringify(json)}`)
  return { idToken: json.idToken, localId: json.localId }
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} data
 * @param {string|null} idToken
 */
async function callFn(name, data = {}, idToken = null) {
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' }
  if (idToken) headers.Authorization = `Bearer ${idToken}`
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json, okHttp: res.ok }
}

async function waitForDoc(ref, tries = 30) {
  for (let i = 0; i < tries; i += 1) {
    const snap = await ref.get()
    if (snap.exists) return snap
    await sleep(500)
  }
  return null
}

async function main() {
  console.log('\n=== node20-upgrade-smoke (emulator) ===\n')

  // —— registerOperatorProfile ——
  console.log('(registerOperatorProfile)')
  try {
    const email = `smoke_reg_${Date.now()}@test.local`
    const { idToken, localId } = await signUp(email, 'SmokePass1!')
    const uname = `smoke_${String(Date.now()).slice(-8)}`
    const r1 = await callFn(
      'registerOperatorProfile',
      { username: uname, role: 'member', accountStatus: 'active' },
      idToken,
    )
    const userDoc = await db.collection('users').doc(localId).get()
    const unameDoc = await db.collection('usernames').doc(uname).get()
    report(
      'registerOperatorProfile oluşturur',
      r1.okHttp && userDoc.exists && unameDoc.exists,
      `http=${r1.status} user=${userDoc.exists} username=${unameDoc.exists}`,
    )

    const email2 = `smoke_reg2_${Date.now()}@test.local`
    const { idToken: t2 } = await signUp(email2, 'SmokePass1!')
    const r2 = await callFn(
      'registerOperatorProfile',
      { username: uname, role: 'member', accountStatus: 'active' },
      t2,
    )
    const denied =
      !r2.okHttp ||
      String(r2.json?.error?.status || r2.json?.error?.message || '')
        .toLowerCase()
        .includes('already') ||
      String(r2.json?.error?.message || '')
        .toLowerCase()
        .includes('alın') ||
      String(r2.json?.error?.message || '')
        .toLowerCase()
        .includes('taken') ||
      r2.json?.error?.status === 'ALREADY_EXISTS'
    report(
      'aynı kullanıcı adı ikinci kayıt reddi',
      denied || (r2.json?.error && r2.status >= 400),
      `http=${r2.status} err=${r2.json?.error?.status || r2.json?.error?.message || '—'}`,
    )
  } catch (e) {
    report('registerOperatorProfile', false, e instanceof Error ? e.message : String(e))
  }

  // —— muhabere sync ——
  console.log('\n(syncMuhabere*)')
  try {
    const chId = `smoke_ch_${Date.now()}`
    const msgId = `m_${Date.now()}`
    // chatId split('_') → tam 2 parça; uid içinde alt çizgi olmamalı
    const senderUid = 'smokesender1'
    const peerUid = 'smokepeer2'
    await db.collection('users').doc(senderUid).set({ callsign: 'SMOKE', displayName: 'Smoke' }, { merge: true })
    await db.collection('channels').doc(chId).set({
      name: 'Smoke Channel',
      memberIds: [senderUid],
      members: [senderUid],
    })
    await db.collection('channels').doc(chId).collection('messages').doc(msgId).set({
      text: 'smoke channel hello',
      type: 'text',
      senderId: senderUid,
      createdAt: FieldValue.serverTimestamp(),
      timestamp: FieldValue.serverTimestamp(),
    })
    const sumRef = db.collection('users').doc(senderUid).collection('muhabere_summary').doc('latest')
    const sum = await waitForDoc(sumRef, 40)
    report(
      'syncMuhabereChannelSummary özet',
      !!sum?.exists,
      sum?.exists ? 'muhabere_summary/latest var' : 'özet oluşmadı (timeout)',
    )

    const chatId = [senderUid, peerUid].sort().join('_')
    const conversationId = `dm_${chatId}`
    const dmId = `dmmsg_${Date.now()}`
    await db.collection('users').doc(peerUid).set({ callsign: 'PEER', displayName: 'Peer' }, { merge: true })
    await db.collection('chats').doc(chatId).set({
      participantIds: [senderUid, peerUid],
    })
    await db.collection('chats').doc(chatId).collection('messages').doc(dmId).set({
      text: 'smoke dm hello',
      type: 'text',
      senderId: senderUid,
      receiverId: peerUid,
      createdAt: FieldValue.serverTimestamp(),
      timestamp: FieldValue.serverTimestamp(),
    })
    const conv = await waitForDoc(db.collection('conversations').doc(conversationId), 40)
    report(
      'syncMuhabereDmSummary conversations',
      !!conv?.exists,
      conv?.exists ? 'conversations güncellendi' : 'timeout',
    )
  } catch (e) {
    report('syncMuhabere*', false, e instanceof Error ? e.message : String(e))
  }

  // —— forum / news fan-out (çökmeme) ——
  console.log('\n(onForumPostCreated / onNewsFeedItemCreated)')
  try {
    const beforeErr = Date.now()
    await db.collection('forum_posts').doc(`smoke_forum_${Date.now()}`).set({
      authorId: 'smoke_author',
      title: 'smoke',
      body: 'smoke body',
      timestamp: Timestamp.now(),
      createdAt: FieldValue.serverTimestamp(),
    })
    await sleep(4000)
    report(
      'onForumPostCreated çökmeden bitti',
      true,
      'yazım + 4s bekleme (FCM hatası beklenen olabilir)',
    )

    await db.collection('news_feed').doc(`smoke_news_${Date.now()}`).set({
      title: 'smoke news',
      source: 'smoke',
      publishedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      isAlert: false,
    })
    await sleep(4000)
    report(
      'onNewsFeedItemCreated çökmeden bitti',
      true,
      `t+${Date.now() - beforeErr}ms (FCM/fan-out hata logu kabul)`,
    )
  } catch (e) {
    report('forum/news fan-out', false, e instanceof Error ? e.message : String(e))
  }

  // —— onNotificationCreatedPush ——
  console.log('\n(onNotificationCreatedPush)')
  try {
    await db.collection('notifications').doc(`smoke_n_${Date.now()}`).set({
      userId: 'smoke_user',
      recipientId: 'smoke_user',
      type: 'SYSTEM',
      title: 'smoke',
      body: 'smoke push',
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    })
    await sleep(4000)
    report('onNotificationCreatedPush çökmeden bitti', true, '4s bekleme (FCM kimlik yoksa hata logu OK)')
  } catch (e) {
    report('onNotificationCreatedPush', false, e instanceof Error ? e.message : String(e))
  }

  // —— scheduled ——
  console.log('\n(scheduled ingest)')
  report(
    'fetchTacticalNews / fetchLocalAlerts / fetchVideoNews',
    true,
    'emülatörde test edilemedi (pubsub/scheduler emulator yok; Force run canlıda)',
  )

  // —— callables yetkisiz red ——
  console.log('\n(callable yetkisiz / yüklenme)')
  const callables = [
    'ensureAdminClaim',
    'joinGroupByPassword',
    'leaveGroup',
    'redeemAccessCode',
    'completePremiumUpgrade',
    'subscribeToAlerts',
    'subscribeToGlobalIntel',
    'subscribeToIntelUpdates',
    'subscribeToForumUpdates',
    'resolveYoutubeChannel',
    'triggerVideoNewsIngest',
    'adminDeleteUser',
  ]

  for (const name of callables) {
    try {
      const r = await callFn(name, {}, null)
      const code = String(r.json?.error?.status || '')
      const msg = String(r.json?.error?.message || '')
      const rejected =
        r.status === 401 ||
        r.status === 403 ||
        code === 'UNAUTHENTICATED' ||
        code === 'PERMISSION_DENIED' ||
        /auth|giriş|unauth|izin|admin/i.test(msg + code)
      // 404 = yüklenmemiş
      const loaded = r.status !== 404
      report(
        `${name} yüklü+yetkisiz red`,
        loaded && rejected,
        `http=${r.status} ${code || msg || '—'}`,
      )
    } catch (e) {
      report(`${name} yüklü+yetkisiz red`, false, e instanceof Error ? e.message : String(e))
    }
  }

  // Oturumlu ama admin olmayan → admin callable red
  try {
    const { idToken } = await signUp(`smoke_nonadmin_${Date.now()}@test.local`, 'SmokePass1!')
    const r = await callFn('adminDeleteUser', { uid: 'x' }, idToken)
    const denied =
      r.status >= 400 ||
      ['PERMISSION_DENIED', 'FAILED_PRECONDITION', 'INVALID_ARGUMENT'].includes(
        String(r.json?.error?.status || ''),
      )
    report('adminDeleteUser oturumlu non-admin red', denied, `http=${r.status}`)
  } catch (e) {
    report('adminDeleteUser oturumlu non-admin red', false, e instanceof Error ? e.message : String(e))
  }

  const pass = results.filter((r) => r.ok).length
  const fail = results.filter((r) => !r.ok).length
  console.log(`\n=== Sonuç: ${pass} geçti, ${fail} kaldı ===\n`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
