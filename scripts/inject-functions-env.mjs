import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function readAdminEmailFromEnvLocal() {
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) return ''
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*VITE_ADMIN_EMAIL\s*=\s*(.+)$/)
    if (m) {
      let v = m[1].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      return v.trim()
    }
  }
  return ''
}

const email = readAdminEmailFromEnvLocal()
const outPath = path.join(root, 'functions', '.env')

if (!email) {
  console.warn('[inject-functions-env] VITE_ADMIN_EMAIL bulunamadı — functions/.env yazılmadı.')
  process.exit(0)
}

const body = `# Otomatik üretildi — deploy:functions öncesi inject-functions-env.mjs
ADMIN_EMAIL=${email}
VITE_ADMIN_EMAIL=${email}
`

fs.writeFileSync(outPath, body, 'utf8')
console.log('[inject-functions-env] functions/.env güncellendi (ADMIN_EMAIL).')
