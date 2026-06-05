import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function readAdminEmailFromEnvLocal() {
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) return 'senin_email@adresin.com'
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*VITE_ADMIN_EMAIL\s*=\s*(.+)$/)
    if (m) {
      let v = m[1].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      return v || 'senin_email@adresin.com'
    }
  }
  return 'senin_email@adresin.com'
}

const tplPath = path.join(root, 'firestore.rules')
const outPath = path.join(root, 'firestore.deploy.rules')

let tpl = fs.readFileSync(tplPath, 'utf8')
const emailLower = readAdminEmailFromEnvLocal().trim().toLowerCase()
tpl = tpl.replace(/%%ADMIN_EMAIL_LOWER%%/g, emailLower)
fs.writeFileSync(outPath, tpl, 'utf8')
console.log('[inject-firestore-admin] firestore.deploy.rules güncellendi (admin e-posta eşlemesi).')
