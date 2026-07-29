/* eslint-disable react-refresh/only-export-components -- HardwareProvider + useHardware aynı modülde */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  decodeBleCharacteristicValue,
  extractHardwarePackets,
  isWebBluetoothSupported,
  NORDIC_UART_RX_CHAR,
  NORDIC_UART_SERVICE,
  NORDIC_UART_TX_CHAR,
  normalizeTelemetryLevel,
  parseAndClassifyHardwareLine,
} from '../lib/hardwareTrigger'
import {
  captureShotEventAnalysis,
  createShotAnalysisState,
  resetShotAnalysis,
  setAnalysisReference,
  tickShotAnalysis,
} from '../lib/shotAnalysisEngines'
import {
  isWebSerialSupported,
  SOUND_THRESHOLD_MAX,
  SOUND_THRESHOLD_MIN,
} from '../lib/timerCalibrationSettings'

/** @typedef {'NONE' | 'USB_SERIAL' | 'BLUETOOTH'} HardwareConnectionType */
/** @typedef {import('../lib/hardwareTrigger').HardwareTrigger} HardwareTrigger */
/** @typedef {import('../lib/hardwareTrigger').HardwareTelemetry} HardwareTelemetry */

/**
 * Mutable telemetri anlık görüntüsü — React state yok, rAF okur.
 * @typedef {Object} TelemetrySnapshot
 * @property {number} ax
 * @property {number} ay
 * @property {number} az
 * @property {number} gz  gyro Z rad/s
 * @property {number} gy  gyro Y rad/s
 * @property {number} gx  gyro X rad/s
 * @property {number} yaw  entegre yaw derece
 * @property {number} pitch  entegre pitch derece
 * @property {number} roll  entegre roll/cant derece
 * @property {number} lvl 0–100 ses seviyesi
 * @property {string} mode  currentMode
 * @property {number} timestamp
 * @property {number} receivedAt  performance.now() — paket alındığı an (stale için)
 * @property {number} seq  her yazımda artar
 * @property {boolean} fresh  en az bir paket geldi mi
 */

/**
 * @typedef {Object} HardwareContextValue
 * @property {boolean} isConnected
 * @property {HardwareConnectionType} connectionType
 * @property {string} deviceName
 * @property {HardwareTrigger | null} lastTrigger
 * @property {import('react').MutableRefObject<TelemetrySnapshot>} telemetryRef
 * @property {import('react').MutableRefObject<import('../lib/shotAnalysisEngines').ShotAnalysisState>} analysisRef
 * @property {() => TelemetrySnapshot} getTelemetry
 * @property {() => import('../lib/shotAnalysisEngines').ShotAnalysisState} getAnalysis
 * @property {(ref: Partial<{ pitch: number, roll: number, yaw: number }>) => void} setAimReference
 * @property {() => void} resetAnalysis
 * @property {boolean} connecting
 * @property {string | null} error
 * @property {boolean} usbSupported
 * @property {boolean} bleSupported
 * @property {() => Promise<boolean>} connectUSB
 * @property {() => Promise<boolean>} connectBLE
 * @property {() => Promise<void>} disconnect
 * @property {(val: number) => Promise<boolean>} sendThreshold
 * @property {(val: number) => Promise<boolean>} sendSaveThreshold
 * @property {(line: string) => Promise<boolean>} sendCommand
 * @property {() => Promise<boolean>} resumeBleNotifications
 * @property {(cb: (t: HardwareTrigger) => void) => () => void} subscribeTrigger
 * @property {(cb: (t: HardwareTelemetry) => void) => () => void} subscribeTelemetry
 * @property {(partial?: Partial<HardwareTrigger>) => void} triggerManual
 */

const HardwareContext = createContext(/** @type {HardwareContextValue | null} */ (null))

const TRIGGER_DEBOUNCE_MS = 80

/** @returns {TelemetrySnapshot} */
function createEmptyTelemetry() {
  return {
    ax: 0,
    ay: 0,
    az: 0,
    gz: 0,
    gy: 0,
    gx: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    lvl: 0,
    mode: '',
    timestamp: 0,
    receivedAt: 0,
    seq: 0,
    fresh: false,
  }
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
function clampSoundThreshold(raw) {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return SOUND_THRESHOLD_MIN
  return Math.min(SOUND_THRESHOLD_MAX, Math.max(SOUND_THRESHOLD_MIN, n))
}

/**
 * Global USB Serial + Web Bluetooth (Nordic UART) donanım bağlamı.
 * @param {{ children: import('react').ReactNode }} props
 */
export function HardwareProvider({ children }) {
  const [connectionType, setConnectionType] = useState(
    /** @type {HardwareConnectionType} */ ('NONE'),
  )
  const [deviceName, setDeviceName] = useState('')
  const [lastTrigger, setLastTrigger] = useState(/** @type {HardwareTrigger | null} */ (null))
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const telemetryRef = useRef(createEmptyTelemetry())
  const analysisRef = useRef(createShotAnalysisState())

  const portRef = useRef(
    /** @type {null | {
     *   readable?: ReadableStream<Uint8Array> | null
     *   writable?: WritableStream<Uint8Array> | null
     *   close: () => Promise<void>
     * }} */ (null),
  )
  const readerRef = useRef(/** @type {null | ReadableStreamDefaultReader<Uint8Array>} */ (null))
  const writerRef = useRef(/** @type {null | WritableStreamDefaultWriter<Uint8Array>} */ (null))
  const serialBufferRef = useRef('')
  const readLoopActiveRef = useRef(false)

  const bleDeviceRef = useRef(/** @type {BluetoothDevice | null} */ (null))
  /** TX = device → browser (notify) */
  const bleCharRef = useRef(/** @type {BluetoothRemoteGATTCharacteristic | null} */ (null))
  /** RX = browser → device (write) */
  const bleRxCharRef = useRef(/** @type {BluetoothRemoteGATTCharacteristic | null} */ (null))
  const bleHandlerRef = useRef(/** @type {((ev: Event) => void) | null} */ (null))
  /** GATT disconnect listener — aynı cihazda birikir diye saklanır */
  const bleDisconnectHandlerRef = useRef(/** @type {((ev: Event) => void) | null} */ (null))
  const bleBufferRef = useRef('')
  const textEncoderRef = useRef(new TextEncoder())
  /** Bağlantı oturumu — eski async zincir / StrictMode cleanup çakışmasını ezer */
  const bleSessionRef = useRef(0)

  const triggerListenersRef = useRef(/** @type {Set<(t: HardwareTrigger) => void>} */ (new Set()))
  const telemetryListenersRef = useRef(
    /** @type {Set<(t: HardwareTelemetry) => void>} */ (new Set()),
  )
  const lastTriggerAtRef = useRef(0)
  /**
   * Kasıtlı kopma (kullanıcı disconnect / reconnect hazırlığı / unmount).
   * true iken gattserverdisconnected → link-lost uyarısı YOK.
   */
  const isIntentionalDisconnectRef = useRef(false)
  const intentionalClearTimerRef = useRef(0)

  const clearTelemetry = useCallback(() => {
    const snap = telemetryRef.current
    snap.ax = 0
    snap.ay = 0
    snap.az = 0
    snap.gz = 0
    snap.gy = 0
    snap.gx = 0
    snap.yaw = 0
    snap.pitch = 0
    snap.roll = 0
    snap.lvl = 0
    snap.mode = ''
    snap.timestamp = 0
    snap.receivedAt = 0
    snap.seq += 1
    snap.fresh = false
    resetShotAnalysis(analysisRef.current)
  }, [])

  const emitTrigger = useCallback((/** @type {HardwareTrigger} */ trigger) => {
    const now = performance.now()
    if (now - lastTriggerAtRef.current < TRIGGER_DEBOUNCE_MS) return
    lastTriggerAtRef.current = now
    // Tetik loudness'ı VU'ya da yansıt (peak)
    if (Number.isFinite(trigger.loudness)) {
      const snap = telemetryRef.current
      snap.lvl = normalizeTelemetryLevel(trigger.loudness)
      snap.receivedAt = performance.now()
      snap.seq += 1
      snap.fresh = true
    }
    const telem = telemetryRef.current
    captureShotEventAnalysis(
      analysisRef.current,
      {
        pitch: trigger.pitch ?? telem.pitch,
        roll: trigger.roll ?? telem.roll,
        yaw: trigger.yaw ?? telem.yaw,
        timestamp: trigger.timestamp || performance.now(),
      },
      performance.now(),
    )
    setLastTrigger(trigger)
    triggerListenersRef.current.forEach((cb) => {
      try {
        cb(trigger)
      } catch {
        /* listener */
      }
    })
  }, [])

  /** State yok — sadece mutable ref + sync listener (opsiyonel). */
  const emitTelemetry = useCallback((/** @type {HardwareTelemetry} */ packet) => {
    const snap = telemetryRef.current
    if (packet.levelOnly) {
      if (packet.lvl != null) snap.lvl = packet.lvl
    } else {
      snap.ax = packet.ax
      snap.ay = packet.ay
      snap.az = packet.az
      if (packet.gz != null && Number.isFinite(packet.gz)) snap.gz = packet.gz
      if (packet.gy != null && Number.isFinite(packet.gy)) snap.gy = packet.gy
      if (packet.gx != null && Number.isFinite(packet.gx)) snap.gx = packet.gx
      if (packet.yaw != null && Number.isFinite(packet.yaw)) snap.yaw = packet.yaw
      if (packet.pitch != null && Number.isFinite(packet.pitch)) snap.pitch = packet.pitch
      if (packet.roll != null && Number.isFinite(packet.roll)) snap.roll = packet.roll
      if (packet.lvl != null) snap.lvl = packet.lvl
      if (packet.mode != null) snap.mode = String(packet.mode)
    }
    snap.timestamp = packet.timestamp
    snap.receivedAt = performance.now()
    snap.seq += 1
    snap.fresh = true

    if (!packet.levelOnly) {
      tickShotAnalysis(
        analysisRef.current,
        {
          pitch: snap.pitch,
          roll: snap.roll,
          yaw: snap.yaw,
          timestamp: snap.receivedAt,
        },
        snap.receivedAt,
      )
    }

    if (telemetryListenersRef.current.size === 0) return
    telemetryListenersRef.current.forEach((cb) => {
      try {
        cb(packet)
      } catch {
        /* listener */
      }
    })
  }, [])

  /**
   * Tek satır / paket — T: telemetri veya JSON trigger.
   * lastTrigger + subscribeTrigger (Timer) / telemetryRef (Kalibrasyon VU/MPU).
   * @param {string} line
   */
  const parseAndEmitData = useCallback(
    (line) => {
      const { telemetry, trigger } = parseAndClassifyHardwareLine(line)
      if (telemetry) emitTelemetry(telemetry)
      if (trigger) emitTrigger(trigger)
    },
    [emitTelemetry, emitTrigger],
  )

  /**
   * USB / BLE stream chunk → tampon + güvenli parse.
   * @param {string} chunk
   * @param {{ current: string } | { buffer: { current: string } }} bagOrRef
   */
  const ingestTextChunk = useCallback(
    (chunk, bagOrRef) => {
      const bufferRef =
        bagOrRef && 'buffer' in bagOrRef && bagOrRef.buffer
          ? bagOrRef.buffer
          : /** @type {{ current: string }} */ (bagOrRef)
      const packets = extractHardwarePackets(chunk, bufferRef)
      for (let i = 0; i < packets.length; i++) {
        parseAndEmitData(packets[i])
      }
    },
    [parseAndEmitData],
  )

  const stopSerialReadLoop = useCallback(async () => {
    readLoopActiveRef.current = false
    try {
      await readerRef.current?.cancel()
    } catch {
      /* ignore */
    }
    readerRef.current = null
    try {
      writerRef.current?.releaseLock()
    } catch {
      /* ignore */
    }
    writerRef.current = null
    try {
      const port = portRef.current
      if (port?.close) await port.close()
    } catch {
      /* ignore */
    }
    portRef.current = null
    serialBufferRef.current = ''
  }, [])

  const markIntentionalDisconnect = useCallback((holdMs = 1200) => {
    isIntentionalDisconnectRef.current = true
    if (intentionalClearTimerRef.current) {
      window.clearTimeout(intentionalClearTimerRef.current)
      intentionalClearTimerRef.current = 0
    }
    intentionalClearTimerRef.current = window.setTimeout(() => {
      intentionalClearTimerRef.current = 0
      isIntentionalDisconnectRef.current = false
    }, holdMs)
  }, [])

  const stopBle = useCallback(async () => {
    const char = bleCharRef.current
    const handler = bleHandlerRef.current
    if (char && handler) {
      try {
        await char.stopNotifications()
      } catch {
        /* ignore */
      }
      try {
        char.removeEventListener('characteristicvaluechanged', handler)
      } catch {
        /* ignore */
      }
    }
    bleHandlerRef.current = null
    bleCharRef.current = null
    bleRxCharRef.current = null

    const device = bleDeviceRef.current
    const onDisc = bleDisconnectHandlerRef.current
    if (device && onDisc) {
      try {
        device.removeEventListener('gattserverdisconnected', onDisc)
      } catch {
        /* ignore */
      }
    }
    bleDisconnectHandlerRef.current = null

    try {
      if (device?.gatt?.connected) {
        device.gatt.disconnect()
      }
    } catch {
      /* ignore */
    }
    bleDeviceRef.current = null
    bleBufferRef.current = ''
  }, [])

  /**
   * Ham satır yaz — USB Serial writable veya BLE Nordic UART RX.
   * @param {string} line
   * @returns {Promise<boolean>}
   */
  const sendCommand = useCallback(async (line) => {
    const text = String(line ?? '')
    if (!text) return false
    const payload = text.endsWith('\n') ? text : `${text}\n`
    const bytes = textEncoderRef.current.encode(payload)

    let ok = false
    const writer = writerRef.current
    if (writer) {
      try {
        await writer.write(bytes)
        ok = true
      } catch {
        return false
      }
    } else {
      const rx = bleRxCharRef.current
      if (rx) {
        try {
          const props = rx.properties
          if (props.writeWithoutResponse) {
            await rx.writeValueWithoutResponse(bytes)
          } else {
            await rx.writeValue(bytes)
          }
          ok = true
        } catch {
          return false
        }
      }
    }

    if (ok) {
      const cmd = text.trim().toUpperCase()
      if (
        cmd === 'AIM_RESET' ||
        cmd === 'YAW_RESET' ||
        cmd === 'RESET_YAW' ||
        cmd === 'PITCH_RESET' ||
        cmd === 'RESET_AIM'
      ) {
        resetShotAnalysis(analysisRef.current)
      }
    }
    return ok
  }, [])

  /**
   * BLE notify'ı yeniden aç — kalibrasyon/sessizlik sonrası akış toparlama.
   * Bağlantıyı kesmez; yalnızca TX characteristic notifications.
   * @returns {Promise<boolean>}
   */
  const resumeBleNotifications = useCallback(async () => {
    const char = bleCharRef.current
    const handler = bleHandlerRef.current
    if (!char || !handler) return false
    try {
      try {
        char.removeEventListener('characteristicvaluechanged', handler)
      } catch {
        /* ignore */
      }
      char.addEventListener('characteristicvaluechanged', handler)
      await char.startNotifications()
      return true
    } catch (error) {
      console.error('BLE Adım Hatası:', error)
      return false
    }
  }, [])

  /**
   * Akustik eşik → `THRESHOLD:<val>\n`
   * @param {number} val
   * @returns {Promise<boolean>}
   */
  const sendThreshold = useCallback(
    async (val) => {
      const n = clampSoundThreshold(val)
      return sendCommand(`THRESHOLD:${n}`)
    },
    [sendCommand],
  )

  /**
   * Kalıcı eşik → `SAVE_THRESHOLD:<val>\n`
   * @param {number} val
   * @returns {Promise<boolean>}
   */
  const sendSaveThreshold = useCallback(
    async (val) => {
      const n = clampSoundThreshold(val)
      return sendCommand(`SAVE_THRESHOLD:${n}`)
    },
    [sendCommand],
  )

  const markLinkLost = useCallback(() => {
    if (isIntentionalDisconnectRef.current) return
    clearTelemetry()
    setConnectionType('NONE')
    setDeviceName('')
    setError('link-lost')
  }, [clearTelemetry])

  const disconnect = useCallback(async () => {
    markIntentionalDisconnect(1500)
    try {
      await stopSerialReadLoop()
      await stopBle()
      clearTelemetry()
      setConnectionType('NONE')
      setDeviceName('')
      setError(null)
    } catch (error) {
      console.error('BLE Adım Hatası:', error)
    }
  }, [clearTelemetry, markIntentionalDisconnect, stopBle, stopSerialReadLoop])

  /** Yeniden bağlanmadan önce sessiz temizlik — link-lost basmaz */
  const prepareReconnect = useCallback(async () => {
    markIntentionalDisconnect(2500)
    await stopSerialReadLoop()
    await stopBle()
    clearTelemetry()
    setConnectionType('NONE')
    setDeviceName('')
  }, [clearTelemetry, markIntentionalDisconnect, stopBle, stopSerialReadLoop])

  const connectUSB = useCallback(async () => {
    setError(null)
    if (!isWebSerialSupported()) {
      setError('usb-unsupported')
      return false
    }
    setConnecting(true)
    try {
      await prepareReconnect()
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 115200 })
      portRef.current = port

      const writable = port.writable
      if (writable) {
        writerRef.current = writable.getWriter()
      }

      setConnectionType('USB_SERIAL')
      setDeviceName('AUDAZ-DRYFIRE-S3 (USB)')

      const readable = port.readable
      if (!readable) throw new Error('no-readable')
      const reader = readable.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      readLoopActiveRef.current = true

      ;(async () => {
        try {
          while (readLoopActiveRef.current) {
            const { value, done } = await reader.read()
            if (done) break
            if (!value) continue
            ingestTextChunk(decoder.decode(value, { stream: true }), serialBufferRef)
          }
        } catch {
          /* closed */
        } finally {
          try {
            reader.releaseLock()
          } catch {
            /* ignore */
          }
          try {
            writerRef.current?.releaseLock()
          } catch {
            /* ignore */
          }
          writerRef.current = null
          if (portRef.current === port) {
            portRef.current = null
            if (isIntentionalDisconnectRef.current) {
              clearTelemetry()
              setConnectionType('NONE')
              setDeviceName('')
            } else {
              markLinkLost()
            }
          }
        }
      })()

      return true
    } catch (err) {
      const name =
        err && typeof err === 'object' && 'name' in err
          ? String(/** @type {{ name?: string }} */ (err).name)
          : ''
      setError(name === 'NotFoundError' ? 'cancelled' : 'usb-failed')
      setConnectionType('NONE')
      setDeviceName('')
      clearTelemetry()
      return false
    } finally {
      setConnecting(false)
    }
  }, [clearTelemetry, ingestTextChunk, markLinkLost, prepareReconnect])

  const connectBLE = useCallback(async () => {
    setError(null)
    if (!isWebBluetoothSupported()) {
      setError('ble-unsupported')
      return false
    }
    setConnecting(true)
    const session = ++bleSessionRef.current

    /** El sıkışması bitene kadar disconnect handler state silmesin / link-lost basmasın */
    let handshakeComplete = false

    try {
      // Tam disconnect() değil — StrictMode / reconnect sırasında yanlış link-lost engeli
      await prepareReconnect()

      let device
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: [
            { namePrefix: 'AUDAZ' },
            { namePrefix: 'Audaz' },
            { namePrefix: 'ESP' },
            { services: [NORDIC_UART_SERVICE] },
          ],
          optionalServices: [NORDIC_UART_SERVICE],
        })
      } catch (error) {
        console.error('BLE Adım Hatası:', error)
        throw error
      }

      if (session !== bleSessionRef.current) {
        markIntentionalDisconnect(800)
        try {
          device.gatt?.disconnect()
        } catch {
          /* ignore */
        }
        return false
      }

      bleDeviceRef.current = device

      const onGattDisconnected = () => {
        if (!handshakeComplete) {
          console.warn('BLE: GATT kopması (el sıkışması)')
          return
        }
        if (bleDeviceRef.current !== device) return
        bleCharRef.current = null
        bleRxCharRef.current = null
        bleHandlerRef.current = null
        bleDeviceRef.current = null
        bleBufferRef.current = ''
        bleDisconnectHandlerRef.current = null
        if (isIntentionalDisconnectRef.current) {
          clearTelemetry()
          setConnectionType('NONE')
          setDeviceName('')
          return
        }
        console.error('BLE Adım Hatası:', new Error('gattserverdisconnected (beklenmedik kopma)'))
        markLinkLost()
      }
      bleDisconnectHandlerRef.current = onGattDisconnected
      device.addEventListener('gattserverdisconnected', onGattDisconnected)

      // El sıkışması bitene kadar kasıtlı say — erken disconnect → link-lost olmasın
      isIntentionalDisconnectRef.current = true
      if (intentionalClearTimerRef.current) {
        window.clearTimeout(intentionalClearTimerRef.current)
        intentionalClearTimerRef.current = 0
      }

      let server
      try {
        server = await device.gatt?.connect()
      } catch (error) {
        console.error('BLE Adım Hatası:', error)
        throw error
      }
      if (!server) throw new Error('no-gatt')

      if (session !== bleSessionRef.current) {
        markIntentionalDisconnect(800)
        await stopBle()
        return false
      }

      let service
      try {
        service = await server.getPrimaryService(NORDIC_UART_SERVICE)
      } catch (error) {
        console.error('BLE Adım Hatası:', error)
        throw error
      }

      let tx
      let rx
      try {
        tx = await service.getCharacteristic(NORDIC_UART_TX_CHAR)
        rx = await service.getCharacteristic(NORDIC_UART_RX_CHAR)
      } catch (error) {
        console.error('BLE Adım Hatası:', error)
        throw error
      }

      if (session !== bleSessionRef.current) {
        markIntentionalDisconnect(800)
        await stopBle()
        return false
      }

      const decoder = new TextDecoder()
      const streamBag = bleBufferRef

      /**
       * Nordic UART TX notify — JSON trigger + T: telemetri.
       * UUID: 6E400003-B5A3-F393-E0A9-E50E24DCCA9E
       * @param {Event} ev
       */
      const onCharacteristicValueChanged = (ev) => {
        const target = /** @type {BluetoothRemoteGATTCharacteristic} */ (ev.target)
        const text = decodeBleCharacteristicValue(target.value, decoder)
        if (!text) return
        ingestTextChunk(text, streamBag)
      }

      bleHandlerRef.current = onCharacteristicValueChanged
      tx.addEventListener('characteristicvaluechanged', onCharacteristicValueChanged)

      try {
        await tx.startNotifications()
      } catch (error) {
        console.error('BLE Adım Hatası:', error)
        throw error
      }

      bleCharRef.current = tx
      bleRxCharRef.current = rx
      bleDeviceRef.current = device

      if (session !== bleSessionRef.current) {
        markIntentionalDisconnect(800)
        await stopBle()
        return false
      }

      handshakeComplete = true
      const label = device.name?.trim() || 'AUDAZ-DRYFIRE-S3'
      setConnectionType('BLUETOOTH')
      setDeviceName(`${label} (BLE)`)
      isIntentionalDisconnectRef.current = false
      return true
    } catch (err) {
      console.error('BLE Adım Hatası:', err)
      const name =
        err && typeof err === 'object' && 'name' in err
          ? String(/** @type {{ name?: string }} */ (err).name)
          : ''
      markIntentionalDisconnect(1500)
      setError(name === 'NotFoundError' ? 'cancelled' : 'ble-failed')
      await stopBle()
      setConnectionType('NONE')
      setDeviceName('')
      clearTelemetry()
      return false
    } finally {
      setConnecting(false)
    }
  }, [
    clearTelemetry,
    ingestTextChunk,
    markIntentionalDisconnect,
    markLinkLost,
    prepareReconnect,
    stopBle,
  ])

  const subscribeTrigger = useCallback((/** @type {(t: HardwareTrigger) => void} */ cb) => {
    triggerListenersRef.current.add(cb)
    return () => {
      triggerListenersRef.current.delete(cb)
    }
  }, [])

  const subscribeTelemetry = useCallback((/** @type {(t: HardwareTelemetry) => void} */ cb) => {
    telemetryListenersRef.current.add(cb)
    return () => {
      telemetryListenersRef.current.delete(cb)
    }
  }, [])

  const getTelemetry = useCallback(() => telemetryRef.current, [])

  const getAnalysis = useCallback(() => analysisRef.current, [])

  const setAimReference = useCallback((/** @type {Partial<{ pitch: number, roll: number, yaw: number }>} */ ref) => {
    setAnalysisReference(analysisRef.current, ref)
  }, [])

  const resetAnalysis = useCallback(() => {
    resetShotAnalysis(analysisRef.current)
  }, [])

  const triggerManual = useCallback(
    (/** @type {Partial<HardwareTrigger>} [partial] */ partial = {}) => {
      emitTrigger({
        loudness: partial.loudness ?? 60,
        accel_x: partial.accel_x ?? 0,
        accel_y: partial.accel_y ?? 0,
        accel_z: partial.accel_z ?? 1,
        timestamp: partial.timestamp ?? Date.now(),
        flinch: partial.flinch ?? partial.loudness ?? 50,
      })
    },
    [emitTrigger],
  )

  // Unmount-only: stopBle deps değişince cleanup ÇALIŞMASIN (Strict Mode / HMR kopmaları)
  const stopBleRef = useRef(stopBle)
  const stopSerialRef = useRef(stopSerialReadLoop)
  stopBleRef.current = stopBle
  stopSerialRef.current = stopSerialReadLoop

  useEffect(() => {
    return () => {
      bleSessionRef.current += 1
      isIntentionalDisconnectRef.current = true
      if (intentionalClearTimerRef.current) {
        window.clearTimeout(intentionalClearTimerRef.current)
        intentionalClearTimerRef.current = 0
      }
      void stopSerialRef.current()
      void stopBleRef.current()
    }
  }, [])
  const value = useMemo(
    () => ({
      isConnected: connectionType !== 'NONE',
      connectionType,
      deviceName,
      lastTrigger,
      telemetryRef,
      analysisRef,
      getTelemetry,
      getAnalysis,
      setAimReference,
      resetAnalysis,
      connecting,
      error,
      usbSupported: isWebSerialSupported(),
      bleSupported: isWebBluetoothSupported(),
      connectUSB,
      connectBLE,
      disconnect,
      sendCommand,
      resumeBleNotifications,
      sendThreshold,
      sendSaveThreshold,
      subscribeTrigger,
      subscribeTelemetry,
      triggerManual,
    }),
    [
      connectionType,
      deviceName,
      lastTrigger,
      getTelemetry,
      getAnalysis,
      setAimReference,
      resetAnalysis,
      connecting,
      error,
      connectUSB,
      connectBLE,
      disconnect,
      sendCommand,
      resumeBleNotifications,
      sendThreshold,
      sendSaveThreshold,
      subscribeTrigger,
      subscribeTelemetry,
      triggerManual,
    ],
  )

  return <HardwareContext.Provider value={value}>{children}</HardwareContext.Provider>
}

/**
 * @returns {HardwareContextValue}
 */
export function useHardware() {
  const ctx = useContext(HardwareContext)
  if (!ctx) {
    throw new Error('useHardware must be used within HardwareProvider')
  }
  return ctx
}
