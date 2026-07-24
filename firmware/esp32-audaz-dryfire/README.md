# Audaz Dry Fire — Unique SoftAP + WebSocket

Arazi kullanımı: harici Wi-Fi **gerekmez**. Her cihaz kendi Access Point’ini açar.

## Kimlik

| Alan | Örnek |
|------|--------|
| SERIAL | MAC son 6 hex → `A1B2C3` |
| SSID | `AUDAZ-TACTICAL-A1B2C3` |
| PASSWORD | `ATA1B2C3` + 2 hex checksum → örn. `ATA1B2C3F4` |
| AP IP | `192.168.4.1` |
| mDNS | `audaz.local` |
| WebSocket | `ws://192.168.4.1:81/` veya `ws://audaz.local:81/` |

Checksum (firmware + web sihirbazı aynı): seri karakterlerinin toplamı × 17 + 0xA5 → düşük bayt.

## Kurulum

1. Arduino IDE: ESP32 kartı, **WebSockets**, **ArduinoJson**.
2. Yükle → Serial Monitor **115200**: SSID / PASSWORD / SERIAL yazdırılır (etiket için kopyala).
3. Telefon/PC’yi cihazın Wi-Fi’sine bağla.
4. Audaz web → Kuru Tetik → sihirbaz: seri gir veya **192.168.4.1** / **audaz.local** tek tık.

## JSON / Serial

Sürekli telemetri (USB Serial + WS, ~25 Hz):

```
T:ax,ay,az,lvl,gz,yaw
```

```json
{"event":"telemetry","ax":0.1,"ay":-0.2,"az":9.8,"lvl":12,"gz":0.01,"yaw":15.2}
{"event":"trigger","loudness":1500000,"accel_x":0.1,"accel_y":-0.2,"accel_z":9.8,"gyro_z":0.05,"yaw":15.2,"timestamp":12345}
{"event":"hello","serial":"A1B2C3","ssid":"AUDAZ-TACTICAL-A1B2C3","apIp":"192.168.4.1","mdns":"audaz.local","wsPort":81,"caps":"gyro,yaw"}
```

Komutlar: `THRESHOLD:<0-100|raw>`, `YAW_RESET`, `ping`