/**
 * Donanım tetik + telemetri parse — USB / BLE ortak.
 */

/**
 * @typedef {Object} HardwareTrigger
 * @property {number} loudness 0–100
 * @property {number} accel_x
 * @property {number} accel_y
 * @property {number} accel_z
 * @property {number} timestamp
 * @property {number} [flinch]
 */

/**
 * @typedef {Object} HardwareTelemetry
 * @property {'telemetry'} event
 * @property {number} ax
 * @property {number} ay
 * @property {number} az
 * @property {number} [gz] gyro Z (rad/s)
 * @property {number} [yaw] entegre yaw açısı (derece)
 * @property {number} [lvl] 0–100 ses/amplitüd
 * @property {boolean} [levelOnly] yalnızca lvl güncelle
 * @property {number} timestamp
 * @property {number} [seq]
 */

/**
 * @typedef {Object} HardwareParseResult
 * @property {HardwareTelemetry | null} telemetry
 * @property {HardwareTrigger | null} trigger
 */

/**
 * Ham mikrofon / loudness → 0–100 VU ölçeği.
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeTelemetryLevel(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  const abs = Math.abs(n)
  if (abs <= 100) return Math.min(100, Math.max(0, Math.round(abs)))
  const mapped = (Math.log10(1 + abs) / Math.log10(1 + 5_000_000)) * 100
  return Math.min(100, Math.max(0, Math.round(mapped)))
}

/**
 * Dengeli `{ … }` JSON nesnesinin bitiş indeksini bul.
 * @param {string} text
 * @param {number} [from]
 * @returns {number} son `}` indeksi veya -1
 */
export function findBalancedJsonEnd(text, from = 0) {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = from; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * Tamamlanmış `T:ax,ay,az[,lvl[,gz[,yaw]]]` satırı mı?
 * @param {string} text
 */
export function isCompleteTelemetryTLine(text) {
  const s = text.trim()
  if (!s || (s[0] !== 'T' && s[0] !== 't') || s[1] !== ':') return false
  // ax,ay,az zorunlu; lvl / gz / yaw opsiyonel
  return /^[Tt]:\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?){2,5}\s*$/.test(s)
}

/**
 * Hızlı satır parse: `T:ax,ay,az[,lvl[,gz[,yaw]]]` | `L:lvl` | JSON telemetry.
 * @param {unknown} raw
 * @returns {HardwareTelemetry | null}
 */
export function parseHardwareTelemetryPayload(raw) {
  if (raw == null) return null

  if (typeof raw === 'string') {
    const text = raw.trim()
    if (!text) return null

    const c0 = text.charCodeAt(0)
    const c1 = text.charCodeAt(1)

    // L:55 / A:55 — yalnızca ses seviyesi
    if ((c0 === 76 || c0 === 108 || c0 === 65 || c0 === 97) && c1 === 58) {
      return {
        event: /** @type {'telemetry'} */ ('telemetry'),
        ax: 0,
        ay: 0,
        az: 0,
        lvl: normalizeTelemetryLevel(text.slice(2).trim()),
        levelOnly: true,
        timestamp: performance.now(),
      }
    }

    // T:ax,ay,az[,lvl[,gz[,yaw]]]
    if ((c0 === 84 || c0 === 116) && c1 === 58) {
      const body = text.slice(2).trim()
      const parts = body.split(',')
      if (parts.length < 3) return null
      const ax = Number(parts[0].trim())
      const ay = Number(parts[1].trim())
      const az = Number(parts[2].trim())
      if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(az)) return null
      /** @type {HardwareTelemetry} */
      const packet = {
        event: /** @type {'telemetry'} */ ('telemetry'),
        ax,
        ay,
        az,
        timestamp: performance.now(),
      }
      if (parts.length >= 4 && parts[3].trim() !== '') {
        packet.lvl = normalizeTelemetryLevel(parts[3].trim())
      }
      if (parts.length >= 5 && parts[4].trim() !== '') {
        const gz = Number(parts[4].trim())
        if (Number.isFinite(gz)) packet.gz = gz
      }
      if (parts.length >= 6 && parts[5].trim() !== '') {
        const yaw = Number(parts[5].trim())
        if (Number.isFinite(yaw)) packet.yaw = yaw
      }
      return packet
    }

    if (text.charCodeAt(0) !== 123) return null
    try {
      return parseHardwareTelemetryPayload(JSON.parse(text))
    } catch {
      return null
    }
  }

  if (typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const event = String(o.event || '').toLowerCase()
  if (event !== 'telemetry') return null

  const ax = Number(o.ax ?? o.accel_x ?? o.x)
  const ay = Number(o.ay ?? o.accel_y ?? o.y)
  const az = Number(o.az ?? o.accel_z ?? o.z)
  const gz = Number(o.gz ?? o.gyro_z ?? o.gyroZ)
  const yaw = Number(o.yaw ?? o.yaw_deg ?? o.yawDeg)
  const ts = Number(o.timestamp ?? o.ts ?? o.t)
  const hasLvl =
    o.lvl != null || o.loudness != null || o.amp != null || o.mic != null || o.level != null

  /** @type {HardwareTelemetry} */
  const packet = {
    event: /** @type {'telemetry'} */ ('telemetry'),
    ax: Number.isFinite(ax) ? ax : 0,
    ay: Number.isFinite(ay) ? ay : 0,
    az: Number.isFinite(az) ? az : 0,
    timestamp: Number.isFinite(ts) ? ts : performance.now(),
  }
  if (Number.isFinite(gz)) packet.gz = gz
  if (Number.isFinite(yaw)) packet.yaw = yaw
  if (hasLvl) {
    packet.lvl = normalizeTelemetryLevel(o.lvl ?? o.loudness ?? o.amp ?? o.mic ?? o.level)
  }
  return packet
}

/**
 * Yalnızca JSON `{"event":"trigger", ...}` — T: telemetri asla atış sayılmaz.
 * @param {unknown} raw
 * @returns {HardwareTrigger | null}
 */
export function parseHardwareTriggerPayload(raw) {
  if (raw == null) return null

  /** @type {unknown} */
  let data = raw

  if (typeof raw === 'string') {
    const text = raw.trim()
    if (!text) return null

    const c0 = text.charCodeAt(0)
    if ((c0 === 84 || c0 === 116) && text.charCodeAt(1) === 58) return null
    if ((c0 === 76 || c0 === 108 || c0 === 65 || c0 === 97) && text.charCodeAt(1) === 58) {
      return null
    }

    if (text.charCodeAt(0) !== 123) return null
    try {
      data = JSON.parse(text)
    } catch {
      return null
    }
  }

  if (typeof data !== 'object' || data == null) return null
  const o = /** @type {Record<string, unknown>} */ (data)
  const event = String(o.event || '').toLowerCase()
  if (event !== 'trigger') return null

  const loudRaw = Number(o.loudness ?? o.lvl ?? o.level ?? o.amp)
  const flinchRaw = Number(o.flinch)
  const flinch = Number.isFinite(flinchRaw)
    ? Math.min(100, Math.max(0, Math.round(flinchRaw)))
    : Number.isFinite(loudRaw)
      ? normalizeTelemetryLevel(loudRaw)
      : 50
  const loudness = Number.isFinite(loudRaw) ? normalizeTelemetryLevel(loudRaw) : flinch

  const ax = Number(o.accel_x ?? o.ax ?? o.x)
  const ay = Number(o.accel_y ?? o.ay ?? o.y)
  const az = Number(o.accel_z ?? o.az ?? o.z)
  const ts = Number(o.timestamp ?? o.ts ?? o.t)

  return {
    loudness,
    accel_x: Number.isFinite(ax) ? ax : 0,
    accel_y: Number.isFinite(ay) ? ay : 0,
    accel_z: Number.isFinite(az) ? az : 1,
    timestamp: Number.isFinite(ts) ? ts : Date.now(),
    flinch,
  }
}

/**
 * Tek satır / tek paket — telemetri veya trigger (ikisinden biri).
 * @param {string} line
 * @returns {HardwareParseResult}
 */
export function parseAndClassifyHardwareLine(line) {
  const text = String(line ?? '').trim()
  if (!text) return { telemetry: null, trigger: null }

  // T: / L: → yalnızca telemetri
  const c0 = text.charCodeAt(0)
  const c1 = text.charCodeAt(1)
  if (
    ((c0 === 84 || c0 === 116) && c1 === 58) ||
    ((c0 === 76 || c0 === 108 || c0 === 65 || c0 === 97) && c1 === 58)
  ) {
    return { telemetry: parseHardwareTelemetryPayload(text), trigger: null }
  }

  // JSON
  if (text.charCodeAt(0) === 123) {
    try {
      const obj = JSON.parse(text)
      const event = String(
        obj && typeof obj === 'object' ? /** @type {Record<string, unknown>} */ (obj).event || '' : '',
      ).toLowerCase()
      if (event === 'trigger') {
        return { telemetry: null, trigger: parseHardwareTriggerPayload(obj) }
      }
      if (event === 'telemetry') {
        return { telemetry: parseHardwareTelemetryPayload(obj), trigger: null }
      }
      return { telemetry: null, trigger: null }
    } catch {
      return { telemetry: null, trigger: null }
    }
  }

  return { telemetry: null, trigger: null }
}

/**
 * BLE/USB stream tamponundan tamamlanmış paketleri ayıkla.
 * Newline, dengeli JSON ve tek-shot T: satırlarını destekler.
 * @param {string} chunk
 * @param {{ current: string }} bufferRef
 * @returns {string[]} tamamlanmış satırlar / paketler
 */
export function extractHardwarePackets(chunk, bufferRef) {
  bufferRef.current += String(chunk ?? '')
  let buf = bufferRef.current.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  /** @type {string[]} */
  const out = []

  // 1) Newline ile biten satırlar
  while (true) {
    const nl = buf.indexOf('\n')
    if (nl < 0) break
    const line = buf.slice(0, nl).trim()
    buf = buf.slice(nl + 1)
    if (line) out.push(line)
  }

  // 2) Newline'siz dengeli JSON nesneleri (BLE MTU parçaları birleşince)
  buf = buf.replace(/^\s+/, '')
  while (buf.startsWith('{')) {
    const end = findBalancedJsonEnd(buf, 0)
    if (end < 0) break
    const json = buf.slice(0, end + 1).trim()
    buf = buf.slice(end + 1).replace(/^\s+/, '')
    if (json) out.push(json)
  }

  // 3) Tek bildirimde gelen tam T: satırı (newline yok)
  const trimmed = buf.trim()
  if (isCompleteTelemetryTLine(trimmed)) {
    out.push(trimmed)
    buf = ''
  } else if (/^[LlAa]:\s*-?\d+(?:\.\d+)?\s*$/.test(trimmed)) {
    out.push(trimmed)
    buf = ''
  }

  // Tamponu şişirmeyi engelle (çöp / yarım paket)
  if (buf.length > 4096) {
    const brace = buf.lastIndexOf('{')
    const tIdx = Math.max(buf.lastIndexOf('T:'), buf.lastIndexOf('t:'))
    const keepFrom = Math.max(brace, tIdx)
    buf = keepFrom >= 0 ? buf.slice(keepFrom) : ''
  }

  bufferRef.current = buf
  return out
}

/**
 * DataView / BufferSource → UTF-8 metin (BLE characteristic).
 * @param {DataView | ArrayBuffer | Uint8Array | null | undefined} value
 * @param {TextDecoder} decoder
 * @returns {string}
 */
export function decodeBleCharacteristicValue(value, decoder) {
  if (!value) return ''
  if (value instanceof Uint8Array) {
    return decoder.decode(value, { stream: true })
  }
  if (value instanceof ArrayBuffer) {
    return decoder.decode(new Uint8Array(value), { stream: true })
  }
  if (typeof DataView !== 'undefined' && value instanceof DataView) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    return decoder.decode(bytes, { stream: true })
  }
  return ''
}

export const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
/** Device → browser (notify) */
export const NORDIC_UART_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
/** Browser → device (write) */
export const NORDIC_UART_RX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'

/**
 * @returns {boolean}
 */
export function isWebBluetoothSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}
