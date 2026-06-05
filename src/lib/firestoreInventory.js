import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

/**
 * Satır formatı: adet | ürün adı | seri no (opsiyonel)
 * Örnek: 2 | Glock 17 | SN-001
 */
export function parseInventoryBulkText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const items = []

  for (const line of lines) {
    const parts = line.split('|').map((s) => s.trim()).filter((s) => s.length > 0)
    if (parts.length < 2) continue

    const qtyRaw = parseInt(parts[0], 10)
    const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1
    const name = parts[1] || 'İsimsiz'
    const serial = parts[2] ?? ''

    items.push({
      name,
      quantity,
      serial,
      source: 'admin_bulk',
    })
  }

  return items
}

const BATCH_SIZE = 400

/**
 * @param {string} [ownerId] — admin toplu girişinde mevcut kullanıcı uid (kurallar + ownerId)
 */
export async function bulkAddInventoryItems(items, ownerId) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  if (items.length === 0) return 0

  let written = 0
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    for (const item of chunk) {
      const ref = doc(collection(db, 'envanter'))
      batch.set(ref, {
        name: item.name,
        quantity: item.quantity,
        serial: item.serial,
        source: item.source ?? 'admin_bulk',
        ownerId: ownerId ?? null,
        category: item.category ?? 'genel',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      written += 1
    }
    await batch.commit()
  }
  return written
}
