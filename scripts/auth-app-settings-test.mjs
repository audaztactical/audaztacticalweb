/**
 * Auth app settings parse smoke test.
 * npx tsx scripts/auth-app-settings-test.mjs
 */

/** @param {Record<string, unknown> | null | undefined} raw */
function parseAuthAppSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return { emailVerificationRequired: true }
  }
  return {
    emailVerificationRequired: raw.emailVerificationRequired !== false,
  }
}

/** @param {boolean} authSettingsReady */
/** @param {boolean} emailVerificationRequired */
/** @param {boolean} userNeedsVerify */
function enforceVerification(authSettingsReady, emailVerificationRequired, userNeedsVerify) {
  const enforceEmailVerification = !authSettingsReady || emailVerificationRequired !== false
  return enforceEmailVerification && userNeedsVerify
}

let failed = false

if (parseAuthAppSettings(null).emailVerificationRequired !== true) failed = true
if (parseAuthAppSettings({}).emailVerificationRequired !== true) failed = true
if (parseAuthAppSettings({ emailVerificationRequired: false }).emailVerificationRequired !== false) failed = true
if (parseAuthAppSettings({ emailVerificationRequired: true }).emailVerificationRequired !== true) failed = true

// settings off → bypass even if user would need verify
if (enforceVerification(true, false, true) !== false) failed = true
// settings on → enforce
if (enforceVerification(true, true, true) !== true) failed = true
// loading → safe default enforce
if (enforceVerification(false, false, true) !== true) failed = true

if (failed) {
  console.error('FAIL: auth-app-settings-test')
  process.exit(1)
}

console.log('OK: auth app settings defaults and route enforcement logic')
