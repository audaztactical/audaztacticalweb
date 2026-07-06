/**
 * Kilitli input DOM kanıtı — Playwright ile disabled attribute ve yazma engeli.
 * npx playwright install chromium
 * npx tsx scripts/ballistic-lock-dom-proof.mjs
 */
import { chromium } from 'playwright'
import { buildArmoryFillPayload } from '../src/lib/ballisticProfileBridge.js'
import { buildArmorySessionFromLocks } from '../src/lib/inventoryFillLocks.js'
import { getInventoryFieldControlProps } from '../src/lib/inventoryFieldControl.js'

const BORA12 = {
  id: 'bora-12',
  name: 'Bora-12',
  tacticalCategory: 'KNT',
  calibre: '7.62x51mm NATO',
  barrelLength: 20,
  twistRate: '1:10',
  sightHeightDefault: 4.5,
}

const LAPUA = {
  id: 'lapua-170',
  tacticalCategory: 'MHM',
  calibre: '7.62X51MM NATO LAPUA 170GR',
  bulletWeight: 170,
  bulletDiameter: 0.308,
  ballisticCoefficient: 0.4,
  bcModel: 'G1',
  muzzleVelocity: 2650,
}

const { locks } = buildArmoryFillPayload('bora-12', { allItems: [BORA12, LAPUA] })
const session = buildArmorySessionFromLocks(locks, 1)
const controlProps = getInventoryFieldControlProps({
  group: 'ammo',
  field: 'bulletWeight',
  label: 'Ağırlık (gr)',
  session,
  baseClass: 'w-full rounded border px-2 py-1',
})

const attrs = Object.entries(controlProps)
  .map(([k, v]) => {
    if (v === true) return k
    if (v === false || v == null) return ''
    return `${k}="${String(v).replace(/"/g, '&quot;')}"`
  })
  .filter(Boolean)
  .join(' ')

const html = `<!DOCTYPE html><html><body>
<input type="number" value="170" ${attrs} id="bw" />
<script>
  window.__PROOF__ = {
    query: document.querySelector('input[name="bulletWeight"], input[aria-label*="Ağırlık"]'),
    outerHTML: document.querySelector('#bw')?.outerHTML ?? '',
    disabled: document.querySelector('#bw')?.disabled,
    lockedAttr: document.querySelector('#bw')?.getAttribute('data-inventory-locked'),
  };
</script>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(html)

const proof = await page.evaluate(() => window.__PROOF__)
console.log('=== DevTools eşdeğeri (adım 1) ===')
console.log('document.querySelector(...):', proof.query ? '[HTMLInputElement]' : null)
console.log('element.disabled:', proof.disabled)
console.log('data-inventory-locked:', proof.lockedAttr)
console.log('\n=== input.outerHTML (adım d) ===')
console.log(proof.outerHTML)

const before = await page.inputValue('#bw')
let typeBlocked = false
try {
  await page.locator('#bw').fill('5678586856864874', { timeout: 2000 })
} catch {
  typeBlocked = true
}
const after = await page.inputValue('#bw')

console.log('\n=== Yazma engeli kanıtı ===')
console.log('Başlangıç değeri:', before)
console.log('fill() engellendi mi:', typeBlocked)
console.log('fill sonrası değer:', after)
console.log('Değer değişmedi:', after === before)

await browser.close()

const ok =
  proof.disabled === true &&
  proof.lockedAttr === 'true' &&
  proof.outerHTML.includes('disabled') &&
  proof.outerHTML.includes('data-inventory-locked="true"') &&
  proof.outerHTML.includes('name="bulletWeight"') &&
  after === before

if (!ok) {
  console.error('\nFAIL: ballistic-lock-dom-proof')
  process.exit(1)
}

console.log('\nOK: disabled attribute DOM kanıtı ve yazma engeli doğrulandı.')
