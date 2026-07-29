# Audaz Dry Fire — BLE Nordic UART + USB Serial

Saha / masaüstü: **Web Bluetooth** veya **Web Serial (USB)**. SoftAP / WebSocket yok.

## Kimlik

| Alan | Örnek |
|------|--------|
| SERIAL | BT MAC son 6 hex → `A1B2C3` |
| BLE NAME | `AUDAZ-A1B2C3` (web `namePrefix: AUDAZ`) |
| USB | Serial **115200** |
| FW | `1.6.6-S3-LOWLAT` |

## BLE (Nordic UART)

Web `HardwareContext` ile aynı UUID’ler:

| Rol | UUID |
|-----|------|
| Service | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| RX (web→cihaz write) | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` |
| TX (cihaz→web notify) | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |

## Kurulum

1. Arduino IDE: kart **ESP32S3 Dev Module** (veya cihazınıza uygun S3).
2. Kütüphaneler: **ArduinoJson**, **Adafruit MPU6050**, **Adafruit NeoPixel** (BLE çekirdek pakette).
3. Yükle → Serial Monitor **115200**: BLE NAME / SERIAL yazdırılır.
4. Audaz web → Ayarlar → **Bluetooth ile bağlan** veya **USB ile bağlan**.

## Protokol (değişmez)

Telemetri (~25 Hz), USB + BLE:

```
T:ax,ay,az,lvl,gz,yaw,pitch,roll
```

Tetik:

```json
{"event":"trigger","loudness":…,"accel_x":…,"yaw":…,"pitch":…,"roll":…,"timestamp":…}
```

Komutlar: `THRESHOLD:<0-100|raw>`, `SAVE_THRESHOLD:…`, `YAW_RESET` / `AIM_RESET`, `AIM_CALIBRATE_START`, `AIM_CALIBRATE_DONE`, `ping`

## Korunan motorlar

- IMU Pipeline (`ImuState`)
- Complementary Filter (pitch/roll)
- Aim Calibration Engine
- Hold Analysis Engine v1 (firmware-internal; T:/JSON’a yazılmaz)
- Muzzle Trace Engine v1 (firmware-internal; T:/JSON’a yazılmaz)
- Shot Event Engine v1 (pre 250 ms + post 100 ms; firmware-internal)
- I2S akustik tetik
