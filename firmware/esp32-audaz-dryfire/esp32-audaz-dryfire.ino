/**
 * Audaz Tactical — ESP32-S3 Dry Fire
 * BLE Nordic UART + USB Serial telemetri (I2S + MPU6050 accel/gyro yaw/pitch/roll)
 *
 * Seri / BLE telemetri satırı:
 *   T:ax,ay,az,lvl,gz,yaw,pitch,roll
 * Tetik JSON:
 *   {"event":"trigger",…,"yaw":…,"pitch":…,"roll":…, …}
 *
 * Nişan (POA): yaw + pitch. Roll = cant (yatıklık) — isabet konumunu kaydırmaz.
 *
 * IMU pipeline (1.5.3+): ImuState + Complementary Filter (pitch/roll) + Aim Calibration Engine.
 * Hold Analysis Engine (v1): referansa göre pitch/roll stabilite (firmware-internal; T:/JSON’a yazılmaz).
 * Muzzle Trace Engine (v1): son ~2 sn namlu izi (firmware-internal; T:/JSON’a yazılmaz).
 * Shot Event Engine (v1): tetik öncesi/sonrası pencere (firmware-internal; T:/JSON’a yazılmaz).
 * Komutlar: AIM_CALIBRATE_START / AIM_CALIBRATE_DONE (+ eski AIM_RESET).
 *
 * BLE (Web Bluetooth uyumlu Nordic UART):
 *   Service  6e400001-b5a3-f393-e0a9-e50e24dcca9e
 *   RX (web→device write) 6e400002-…
 *   TX (device→web notify) 6e400003-…
 */

#include <ArduinoJson.h>
#include <Wire.h>
#include <driver/i2s.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_NeoPixel.h>
#include <math.h>
#include <esp_mac.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- Kimlik & sürüm ---
static const char *FW_VERSION = "1.6.6-S3-LOWLAT";

// Nordic UART (NUS) — Web HardwareContext ile aynı UUID'ler
static const char *NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char *NUS_RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";  // web → device
static const char *NUS_TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";  // device → web

static char gSerial[8];
static char gBleName[24];

static BLEServer *gBleServer = nullptr;
static BLECharacteristic *gBleTx = nullptr;
static BLECharacteristic *gBleRx = nullptr;
static volatile bool gBleConnected = false;
static String gBleRxLine;

// --- Pinler ---
#define I2S_WS 15
#define I2S_SD 4
#define I2S_SCK 14
#define I2S_PORT I2S_NUM_0

#define PIN_NEOPIXEL 48
#define NUMPIXELS 7
Adafruit_NeoPixel pixels(NUMPIXELS, PIN_NEOPIXEL, NEO_GRB + NEO_KHZ800);

// =============================================================================
// LED State Machine (NeoPixel) — millis() animasyon; delay() yok
// Doğrudan pixels.fill() YASAK — yalnızca setLedState / render*
// =============================================================================

enum LedState : uint8_t {
  LED_BOOT = 0,
  LED_SELF_TEST,
  LED_WAIT_CONNECTION,
  LED_CONNECTING,
  LED_CALIBRATING,
  LED_READY,
  LED_SHOT,
  LED_BLE_DISCONNECTED,
  LED_ERROR,
};

static const uint32_t LED_BREATHE_PERIOD_MS = 1600;
static const uint32_t LED_PULSE_PERIOD_MS = 700;
static const uint32_t LED_BLINK_PERIOD_MS = 500;
static const uint32_t LED_ROTATE_STEP_MS = 120;
static const uint32_t LED_SHOT_FLASH_MS = 120;
static const uint32_t LED_ERROR_SWAP_MS = 400;

static LedState gLedState = LED_BOOT;
static LedState gLedReturnState = LED_READY;  // SHOT sonrası dönüş
static uint32_t gLedEnterMs = 0;

static void setLedState(LedState next);
static void updateLedAnimation();

static uint32_t ledColor(uint8_t r, uint8_t g, uint8_t b) {
  return pixels.Color(r, g, b);
}

static void ledClearAll() {
  for (uint16_t i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, 0);
  }
}

static void ledFillRgb(uint8_t r, uint8_t g, uint8_t b) {
  const uint32_t c = ledColor(r, g, b);
  for (uint16_t i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, c);
  }
}

/** 0…255 üçgen nefes (periodMs). */
static uint8_t ledBreatheLevel(uint32_t periodMs) {
  if (periodMs < 2) periodMs = 2;
  const uint32_t t = (millis() - gLedEnterMs) % periodMs;
  const uint32_t half = periodMs / 2;
  uint32_t level;
  if (t < half) {
    level = (t * 255u) / half;
  } else {
    level = ((periodMs - t) * 255u) / half;
  }
  return (uint8_t)level;
}

static void renderBoot() {
  const uint8_t v = ledBreatheLevel(LED_BREATHE_PERIOD_MS);
  ledFillRgb(v, v, v);  // beyaz breathing
}

static void renderSelfTest() {
  // Mor dönen halka — tek piksel
  ledClearAll();
  const uint32_t step = ((millis() - gLedEnterMs) / LED_ROTATE_STEP_MS) % NUMPIXELS;
  pixels.setPixelColor((uint16_t)step, ledColor(160, 0, 220));
}

static void renderWaiting() {
  // İki kırmızı LED saat yönünde
  ledClearAll();
  const uint32_t step = ((millis() - gLedEnterMs) / LED_ROTATE_STEP_MS) % NUMPIXELS;
  const uint16_t a = (uint16_t)step;
  const uint16_t b = (uint16_t)((step + 1u) % NUMPIXELS);
  pixels.setPixelColor(a, ledColor(220, 0, 0));
  pixels.setPixelColor(b, ledColor(220, 0, 0));
}

static void renderConnecting() {
  const uint8_t v = ledBreatheLevel(LED_BREATHE_PERIOD_MS);
  ledFillRgb(0, 0, v);  // mavi breathing
}

static void renderCalibration() {
  // Sarı pulse
  const uint8_t v = ledBreatheLevel(LED_PULSE_PERIOD_MS);
  ledFillRgb(v, (uint8_t)(v * 180u / 255u), 0);
}

static void renderReady() {
  ledFillRgb(0, 220, 0);  // yeşil sabit
}

static void renderBleDisconnected() {
  // Turuncu blink
  const uint32_t phase = ((millis() - gLedEnterMs) / (LED_BLINK_PERIOD_MS / 2)) % 2u;
  if (phase == 0) {
    ledFillRgb(255, 100, 0);
  } else {
    ledClearAll();
  }
}

static void renderError() {
  // Kırmızı / mavi dönüşümlü
  const uint32_t phase = ((millis() - gLedEnterMs) / LED_ERROR_SWAP_MS) % 2u;
  if (phase == 0) {
    ledFillRgb(255, 0, 0);
  } else {
    ledFillRgb(0, 0, 255);
  }
}

/**
 * Tek giriş noktası — state değişimi yalnızca buradan.
 * SHOT girerken önceki state saklanır; flash bitince geri dönülür.
 */
static void setLedState(LedState next) {
  if (next == LED_SHOT && gLedState != LED_SHOT) {
    gLedReturnState =
      (gLedState == LED_BOOT || gLedState == LED_SELF_TEST || gLedState == LED_ERROR)
        ? LED_READY
        : gLedState;
  }
  if (next == gLedState) return;
  gLedState = next;
  gLedEnterMs = millis();
}

static void renderShot() {
  ledFillRgb(255, 0, 0);  // kırmızı flash
}

static void updateLedAnimation() {
  // SHOT süresi dolunca önceki state'e dön (delay yok)
  if (gLedState == LED_SHOT && (millis() - gLedEnterMs) >= LED_SHOT_FLASH_MS) {
    setLedState(gLedReturnState);
  }

  switch (gLedState) {
    case LED_BOOT:
      renderBoot();
      break;
    case LED_SELF_TEST:
      renderSelfTest();
      break;
    case LED_WAIT_CONNECTION:
      renderWaiting();
      break;
    case LED_CONNECTING:
      renderConnecting();
      break;
    case LED_CALIBRATING:
      renderCalibration();
      break;
    case LED_READY:
      renderReady();
      break;
    case LED_SHOT:
      renderShot();
      break;
    case LED_BLE_DISCONNECTED:
      renderBleDisconnected();
      break;
    case LED_ERROR:
      renderError();
      break;
    default:
      renderError();
      break;
  }
  pixels.show();
}

/** setup içi: delay yerine millis bekle + LED animasyonu */
static void ledWaitMs(uint32_t ms) {
  const uint32_t t0 = millis();
  while ((millis() - t0) < ms) {
    updateLedAnimation();
  }
}

Adafruit_MPU6050 mpu;
bool mpuOk = false;

// --- Ses (INMP441 / I2S) ---
float dc_offset = 0;
/** Tetik eşiği (DC çıkarılmış |örnek|). Web THRESHOLD:0–100 buraya maplenir. */
int32_t soundThreshold = 800000;
static const int32_t SOUND_THRESHOLD_MIN = 50000;
static const int32_t SOUND_THRESHOLD_MAX = 5000000;
/**
 * Noise gate: bunun altı sessizlik (VU/tetik).
 * Eski 3.5M gate kuru tetik sinyalini de öldürüyordu.
 */
static const int32_t MIC_NOISE_GATE = 120000;
/** loudnessToLvl log ölçeği üst sınırı (ham genlik) */
static const float MIC_LVL_REF = 5000000.0f;
/** Serial MIC peak debug aralığı (ms); 0 = kapalı (printf gecikme yaratır) */
#define MIC_DEBUG_PERIOD_MS 0
/** loop başına en fazla I2S örneği — kuyruk boşalt, tepki süresini kısalt */
static const int MIC_READ_BURST = 48;

// =============================================================================
// IMU (MPU6050) — Orientation Engine
//
// Pitch / Roll : Gyro + Accelerometer (Complementary Filter)
// Yaw          : Gyroscope only (open-loop integration)
//
// gz→yaw, gx→pitch, gy→roll(cant). DUZELTME (saha testi 27.07.2026): fiziksel MPU montaji
// kod varsayimindan 90 derece farkli oldugu icin gx/gy (ve ax/ay) takas edildi.
// Haberleşme alanları değişmez.
// TODO: IMU Calibration (gyro bias) — ayrı modül; Aim Cal bias yazmaz
// TODO: AI Analysis (web’e hold metrikleri)
// =============================================================================

/** Ham sensör (SI): accel m/s², gyro rad/s */
struct ImuRaw {
  float ax;
  float ay;
  float az;
  float gx;
  float gy;
  float gz;
};

/** Yönelim (derece) */
struct ImuOrientation {
  float yaw;    // Z — yatay nişan (gyro only)
  float pitch;  // Y — dikey nişan (complementary)
  float roll;   // X — cant (complementary; POA değil)
};

/** Gyro bias (rad/s) — şimdilik 0; kalibrasyon dolduracak */
struct ImuBias {
  float gyroBiasX;
  float gyroBiasY;
  float gyroBiasZ;
};

/** Referans yönelim (derece) — Aim Calibration doldurur */
struct ImuCalibration {
  float referenceYaw;
  float referencePitch;
  float referenceRoll;
};

/** Hold stability — Aim Calibration sonunda yazılır (Aim Cal Engine; dokunulmaz) */
struct ImuHold {
  float holdRms;
  float quality;  // 0…100
};

struct ImuState {
  ImuRaw raw;
  ImuOrientation orientation;
  ImuBias bias;
  ImuCalibration calibration;
  ImuHold hold;
  uint32_t lastSampleMs;
  // --- Hold Analysis Engine (v1) — canlı 2 sn pencere; telemetriye henüz yazılmaz ---
  float holdPitchRms;
  float holdRollRms;
  float holdCombinedRms;
  float holdStdDev;
  float holdQuality;  // 0…100
  // --- Muzzle Trace Engine (v1) — canlı 2 sn iz; telemetriye henüz yazılmaz ---
  float traceRadius;   // distanceFromCenter RMS (°)
  float tracePeak;     // max |delta| (° )
  float traceAverage;  // mean distanceFromCenter (°)
};

static ImuState gImu = {};

uint32_t lastTelemetryMs = 0;
uint32_t lastTriggerMs = 0;
int32_t lastLoudRaw = 0;
uint8_t lastLvl = 0;

static const uint32_t TELEMETRY_PERIOD_MS = 40;  // ~25 Hz
static const uint32_t TRIGGER_COOLDOWN_MS = 150;
/** Gyro entegrasyon deadzone (rad/s) ≈ 1.1 °/s */
static const float IMU_GYRO_DEADZONE_RAD_S = 0.02f;
/** Complementary filter: gyro ağırlığı (1−α = accel) */
static constexpr float IMU_COMPLEMENTARY_ALPHA = 0.98f;

static void clampAngle180(float &deg);
static void handleCommandLine(const String &msgIn);

// =============================================================================
// Transport — USB Serial + BLE Nordic UART (SoftAP/WS yok)
// =============================================================================

/** BLE TX notify — MTU’ya göre parçala (Web extractHardwarePackets birleştirir). */
static void bleNotifyBytes(const uint8_t *data, size_t len) {
  if (!gBleConnected || gBleTx == nullptr || data == nullptr || len == 0) return;

  // ATT payload ≈ MTU−3; varsayılan 20, pazarlık sonrası daha büyük olabilir
  uint16_t mtu = 23;
  if (gBleServer != nullptr) {
    uint16_t peer = gBleServer->getPeerMTU(gBleServer->getConnId());
    if (peer >= 23) mtu = peer;
  }
  size_t maxPayload = (mtu > 3) ? (size_t)(mtu - 3) : 20;
  if (maxPayload < 20) maxPayload = 20;
  if (maxPayload > 180) maxPayload = 180;

  size_t off = 0;
  while (off < len) {
    size_t n = len - off;
    if (n > maxPayload) n = maxPayload;
    gBleTx->setValue(const_cast<uint8_t *>(data + off), n);
    gBleTx->notify();
    off += n;
  }
}

/** Ham metin → USB Serial + BLE (newline eklemez). */
static void broadcastRaw(const char *buf, size_t n) {
  if (n == 0 || buf == nullptr) return;
  Serial.write((const uint8_t *)buf, n);
  bleNotifyBytes((const uint8_t *)buf, n);
}

/** JSON / komut cevabı satırı → Serial + BLE (+ trailing \\n). */
static void broadcastJsonLine(const char *buf, size_t n) {
  if (n == 0 || buf == nullptr) return;
  Serial.write((const uint8_t *)buf, n);
  Serial.write('\n');
  if (gBleConnected && gBleTx != nullptr) {
    // BLE: payload + newline tek bildirim zinciri
    if (n + 1 <= 512) {
      uint8_t tmp[512];
      memcpy(tmp, buf, n);
      tmp[n] = '\n';
      bleNotifyBytes(tmp, n + 1);
    } else {
      bleNotifyBytes((const uint8_t *)buf, n);
      const uint8_t nl = '\n';
      bleNotifyBytes(&nl, 1);
    }
  }
}

static void sendHelloBle() {
  StaticJsonDocument<192> hello;
  hello["event"] = "hello";
  hello["device"] = "audaz-dryfire";
  hello["fw"] = FW_VERSION;
  hello["serial"] = gSerial;
  hello["transport"] = "ble+usb";
  hello["caps"] = "gyro,yaw,pitch,roll,cant,aim_calibrate";
  char buf[192];
  size_t n = serializeJson(hello, buf, sizeof(buf));
  broadcastJsonLine(buf, n);
}

class AudazBleServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) override {
    (void)pServer;
    gBleConnected = true;
    Serial.println(F("[BLE] istemci bağlandı"));
    setLedState(LED_CONNECTING);
    sendHelloBle();
    ledWaitMs(350);
    setLedState(LED_READY);
  }

  void onDisconnect(BLEServer *pServer) override {
    gBleConnected = false;
    Serial.println(F("[BLE] istemci ayrıldı — advertising"));
    setLedState(LED_BLE_DISCONNECTED);
    if (pServer != nullptr) {
      pServer->startAdvertising();
    }
    ledWaitMs(500);
    setLedState(LED_WAIT_CONNECTION);
  }
};

class AudazBleRxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
    if (pCharacteristic == nullptr) return;
    String chunk = pCharacteristic->getValue();
    if (chunk.length() == 0) return;

    for (size_t i = 0; i < chunk.length(); i++) {
      char c = chunk[i];
      if (c == '\n' || c == '\r') {
        if (gBleRxLine.length() > 0) {
          handleCommandLine(gBleRxLine);
          gBleRxLine = "";
        }
      } else if (gBleRxLine.length() < 96) {
        gBleRxLine += c;
      }
    }
  }
};

static void buildDeviceIdentity() {
  uint8_t mac[6] = {0};
  esp_read_mac(mac, ESP_MAC_BT);
  snprintf(gSerial, sizeof(gSerial), "%02X%02X%02X", mac[3], mac[4], mac[5]);
  // Web namePrefix: AUDAZ / Audaz / ESP
  snprintf(gBleName, sizeof(gBleName), "AUDAZ-%s", gSerial);
}

static void startBleNordicUart() {
  buildDeviceIdentity();

  BLEDevice::init(gBleName);
  gBleServer = BLEDevice::createServer();
  gBleServer->setCallbacks(new AudazBleServerCallbacks());

  BLEService *pService = gBleServer->createService(NUS_SERVICE_UUID);

  gBleTx = pService->createCharacteristic(
    NUS_TX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  gBleTx->addDescriptor(new BLE2902());

  gBleRx = pService->createCharacteristic(
    NUS_RX_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  gBleRx->setCallbacks(new AudazBleRxCallbacks());

  pService->start();

  BLEAdvertising *pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(NUS_SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  pAdv->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println(F("\n======== AUDAZ BLE + USB ========"));
  Serial.printf("FW:       %s\n", FW_VERSION);
  Serial.printf("BLE NAME: %s\n", gBleName);
  Serial.printf("SERIAL:   %s\n", gSerial);
  Serial.println(F("NUS:      Nordic UART (6e400001-…)"));
  Serial.println(F("USB:      Serial 115200"));
  Serial.println(F("================================"));
}

// =============================================================================
// Aim Calibration Engine (nişancı referansı — IMU bias DEĞİL)
// AIM_CALIBRATE_START → 2 sn pitch/roll/yaw topla → refs + holdRms + quality
// gyroBiasX/Y/Z buradan ASLA yazılmaz (IMU Calibration ayrı).
// =============================================================================

static const uint32_t AIM_CAL_DURATION_MS = 2000;
/** quality=0 eşiği: birleşik pitch/roll std (°). Daha düşük std → daha yüksek quality. */
static constexpr float AIM_CAL_QUALITY_STD_REF_DEG = 5.0f;

struct AimCalSession {
  bool active;
  uint32_t startMs;
  uint32_t sampleCount;
  // Welford — pitch / roll
  float meanPitch;
  float m2Pitch;
  float meanRoll;
  float m2Roll;
  // Yaw dairesel ortalama (sin/cos)
  float sumSinYaw;
  float sumCosYaw;
};

static AimCalSession gAimCal = {};

/** Welford online: mean / M2 güncelle. */
static void welfordPush(float x, float &mean, float &m2, uint32_t n) {
  const float delta = x - mean;
  mean += delta / (float)n;
  const float delta2 = x - mean;
  m2 += delta * delta2;
}

static void startAimCalibration() {
  gAimCal.active = true;
  gAimCal.startMs = millis();
  gAimCal.sampleCount = 0;
  gAimCal.meanPitch = 0.0f;
  gAimCal.m2Pitch = 0.0f;
  gAimCal.meanRoll = 0.0f;
  gAimCal.m2Roll = 0.0f;
  gAimCal.sumSinYaw = 0.0f;
  gAimCal.sumCosYaw = 0.0f;

  StaticJsonDocument<96> doc;
  doc["event"] = "aim_calibrate_start";
  doc["durationMs"] = AIM_CAL_DURATION_MS;
  char buf[96];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  broadcastJsonLine(buf, n);
  setLedState(LED_CALIBRATING);
}

static void finishAimCalibration() {
  gAimCal.active = false;

  const uint32_t n = gAimCal.sampleCount;
  float refPitch = 0.0f;
  float refRoll = 0.0f;
  float refYaw = 0.0f;
  float holdRms = 0.0f;
  float quality = 0.0f;

  if (n > 0) {
    refPitch = gAimCal.meanPitch;
    refRoll = gAimCal.meanRoll;
    refYaw = atan2f(gAimCal.sumSinYaw, gAimCal.sumCosYaw) * (180.0f / (float)PI);
    clampAngle180(refYaw);

    // Population std (°)
    const float invN = 1.0f / (float)n;
    const float stdPitch = sqrtf(gAimCal.m2Pitch * invN);
    const float stdRoll = sqrtf(gAimCal.m2Roll * invN);

    // Hold RMS: pitch & roll sapmalarının birleşik RMS'i
    // holdRms = sqrt( 0.5 * (stdPitch² + stdRoll²) )
    holdRms = sqrtf(0.5f * (stdPitch * stdPitch + stdRoll * stdRoll));

    // Calibration quality (0…100):
    //   combinedStd = sqrt(stdPitch² + stdRoll²)
    //   quality = 100 * clamp(0, 1, 1 − combinedStd / AIM_CAL_QUALITY_STD_REF_DEG)
    // Daha küçük std → daha yüksek quality (stabil nişan).
    const float combinedStd = sqrtf(stdPitch * stdPitch + stdRoll * stdRoll);
    float q = 1.0f - (combinedStd / AIM_CAL_QUALITY_STD_REF_DEG);
    if (q < 0.0f) q = 0.0f;
    if (q > 1.0f) q = 1.0f;
    quality = q * 100.0f;
  }

  gImu.calibration.referencePitch = refPitch;
  gImu.calibration.referenceRoll = refRoll;
  gImu.calibration.referenceYaw = refYaw;
  gImu.hold.holdRms = holdRms;
  gImu.hold.quality = quality;
  // Not: gyroBiasX/Y/Z burada DEĞİŞTİRİLMEZ (IMU Calibration ayrı).

  StaticJsonDocument<256> doc;
  doc["event"] = "aim_calibrate_done";
  doc["referencePitch"] = refPitch;
  doc["referenceRoll"] = refRoll;
  doc["referenceYaw"] = refYaw;
  doc["holdRms"] = holdRms;
  doc["quality"] = quality;
  doc["samples"] = n;
  doc["durationMs"] = AIM_CAL_DURATION_MS;
  char buf[256];
  size_t len = serializeJson(doc, buf, sizeof(buf));
  broadcastJsonLine(buf, len);

  Serial.printf(
    "[AIM_CAL] done samples=%lu refP=%.2f refR=%.2f refY=%.2f rms=%.3f q=%.1f\n",
    (unsigned long)n,
    refPitch,
    refRoll,
    refYaw,
    holdRms,
    quality
  );
  setLedState(gBleConnected ? LED_READY : LED_WAIT_CONNECTION);
}

/** Aktif Aim Cal sırasında her IMU tick — pitch/roll/yaw örnekle. */
static void updateAimCalibration() {
  if (!gAimCal.active) return;

  const uint32_t now = millis();
  if ((now - gAimCal.startMs) >= AIM_CAL_DURATION_MS) {
    finishAimCalibration();
    return;
  }

  const float pitch = gImu.orientation.pitch;
  const float roll = gImu.orientation.roll;
  const float yaw = gImu.orientation.yaw;
  const float deg2rad = (float)PI / 180.0f;

  gAimCal.sampleCount += 1;
  const uint32_t n = gAimCal.sampleCount;
  welfordPush(pitch, gAimCal.meanPitch, gAimCal.m2Pitch, n);
  welfordPush(roll, gAimCal.meanRoll, gAimCal.m2Roll, n);
  gAimCal.sumSinYaw += sinf(yaw * deg2rad);
  gAimCal.sumCosYaw += cosf(yaw * deg2rad);
}

static uint8_t loudnessToLvl(int32_t raw) {
  if (raw <= 0) return 0;
  // log-ish map → 0–100 (web VU ile uyumlu)
  float n = log10f(1.0f + (float)raw) / log10f(1.0f + MIC_LVL_REF);
  int v = (int)lroundf(n * 100.0f);
  if (v < 0) v = 0;
  if (v > 100) v = 100;
  return (uint8_t)v;
}

static void clampAngle180(float &deg) {
  while (deg > 180.0f) deg -= 360.0f;
  while (deg < -180.0f) deg += 360.0f;
}

/** Ham accel/gyro oku → gImu.raw. Başarısızsa false. */
static bool readRawImu() {
  if (!mpuOk) return false;

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  gImu.raw.ax = a.acceleration.x;
  gImu.raw.ay = a.acceleration.y;
  gImu.raw.az = a.acceleration.z;
  gImu.raw.gx = g.gyro.x;  // rad/s — DUZELTME: artik pitch (fiziksel montaj 90 derece farkli)
  gImu.raw.gy = g.gyro.y;  // rad/s — DUZELTME: artik roll / cant
  gImu.raw.gz = g.gyro.z;  // rad/s — yaw (degismedi, dogru calisiyordu)
  return true;
}

/**
 * Bias çıkarılmış gyro oranları (rad/s).
 * Bias şu an 0 — IMU Calibration (ayrı modül) dolduracak; Aim Cal yazmaz.
 */
static void applyGyroBias(float &gxOut, float &gyOut, float &gzOut) {
  gxOut = gImu.raw.gx - gImu.bias.gyroBiasX;
  gyOut = gImu.raw.gy - gImu.bias.gyroBiasY;
  gzOut = gImu.raw.gz - gImu.bias.gyroBiasZ;
}

/**
 * Accelerometer'dan pitchAcc / rollAcc (°).
 * DUZELTME: Fiziksel MPU6050 montaji, kodun ilk varsaydigi yonden 90 derece farkli.
 * Saha testinde: yukari-asagi hareket ay/az'i degistiriyordu (roll formulune gidiyordu),
 * sag-sol hareket ise dogru sekilde yaw'i degistiriyordu. Bu yuzden X<->Y takas edildi.
 */
static void computeAccelAttitude(float &pitchAccDeg, float &rollAccDeg) {
  const float ax = gImu.raw.ax;
  const float ay = gImu.raw.ay;
  const float az = gImu.raw.az;
  const float rad2deg = 180.0f / (float)PI;

  pitchAccDeg = atan2f(ay, sqrtf(ax * ax + az * az)) * rad2deg;
  rollAccDeg = atan2f(-ax, az) * rad2deg;
}

/**
 * Orientation Engine
 *   Pitch / Roll : Complementary Filter (gyro + accel)
 *   Yaw          : Gyro-only integration
 */
static void updateOrientation(float dt) {
  float gxB = 0.0f, gyB = 0.0f, gzB = 0.0f;
  applyGyroBias(gxB, gyB, gzB);

  float gxUse = (fabsf(gxB) < IMU_GYRO_DEADZONE_RAD_S) ? 0.0f : gxB;
  float gyUse = (fabsf(gyB) < IMU_GYRO_DEADZONE_RAD_S) ? 0.0f : gyB;
  float gzUse = (fabsf(gzB) < IMU_GYRO_DEADZONE_RAD_S) ? 0.0f : gzB;

  const float rad2deg = 180.0f / (float)PI;
  const float alpha = IMU_COMPLEMENTARY_ALPHA;
  const float beta = 1.0f - alpha;

  float pitchAcc = 0.0f;
  float rollAcc = 0.0f;
  computeAccelAttitude(pitchAcc, rollAcc);

  // --- Yaw: gyroscope only ---
  // DUZELTME (saha testi 27.07.2026): yaw yonu ters geliyordu, isaret cevrildi.
  gImu.orientation.yaw -= gzUse * rad2deg * dt;
  clampAngle180(gImu.orientation.yaw);

  // --- Pitch / Roll: complementary filter ---
  // DUZELTME: fiziksel montaj nedeniyle gx<->gy takas edildi (bkz. computeAccelAttitude)
  // pitch = α*(pitch + gyroX*dt) + (1−α)*pitchAcc
  // roll  = α*(roll  + gyroY*dt) + (1−α)*rollAcc
  if (dt <= 0.0f) {
    // İlk örnek: accel ile tohumla (çift gyro yolu yok)
    gImu.orientation.pitch = pitchAcc;
    gImu.orientation.roll = rollAcc;
  } else {
    const float pitchGyro = gImu.orientation.pitch + gxUse * rad2deg * dt;
    const float rollGyro = gImu.orientation.roll + gyUse * rad2deg * dt;
    gImu.orientation.pitch = alpha * pitchGyro + beta * pitchAcc;
    gImu.orientation.roll = alpha * rollGyro + beta * rollAcc;
  }
  clampAngle180(gImu.orientation.pitch);
  clampAngle180(gImu.orientation.roll);
}

/**
 * Hold metrikleri Aim Cal bitince gImu.hold'a yazılır (finishAimCalibration).
 * Canlı Hold Analysis ayrı: updateHoldAnalysis().
 */
static void calculateHoldMetrics() {
  // no-op — Aim Calibration yazar (gImu.hold)
}

// =============================================================================
// Hold Analysis Engine (v1)
//
// Tetik öncesi nişan stabilitesi: referencePitch/Roll’a göre delta → ~2 sn ring buffer
// → RMS / max / avg / std → holdQuality (0…100).
// T: ve JSON’a yazılmaz (firmware-internal).
// =============================================================================

/** ~2 sn @ TELEMETRY_PERIOD_MS (40 ms) → 50 örnek */
static const uint16_t HOLD_BUFFER_CAPACITY = 50;
/**
 * holdQuality ölçeği: combinedRms ≥ bu değer (°) → quality ≈ 0.
 * quality = 100 * clamp(0, 1, 1 − combinedRms / HOLD_QUALITY_RMS_REF_DEG)
 *
 * Yaklaşık bantlar (combinedRms):
 *   ≤0.15° → ~92–100  (çok stabil)
 *   0.3–0.7° → ~65–85 (orta)
 *   ≥1.5°   → ≤25     (çok hareketli)
 */
static constexpr float HOLD_QUALITY_RMS_REF_DEG = 2.0f;

struct HoldSample {
  uint32_t timestampMs;
  float deltaPitch;
  float deltaRoll;
};

struct HoldRingBuffer {
  HoldSample samples[HOLD_BUFFER_CAPACITY];
  uint16_t head;   // bir sonraki yazım indeksi
  uint16_t count;  // dolu örnek sayısı (≤ CAPACITY)
  // Son hesap (ImuState’e kopyalanır; max/avg firmware-internal)
  float maxDev;
  float avgDev;
};

static HoldRingBuffer gHoldBuf = {};

static void resetHoldBuffer() {
  gHoldBuf.head = 0;
  gHoldBuf.count = 0;
  gHoldBuf.maxDev = 0.0f;
  gHoldBuf.avgDev = 0.0f;
  gImu.holdPitchRms = 0.0f;
  gImu.holdRollRms = 0.0f;
  gImu.holdCombinedRms = 0.0f;
  gImu.holdStdDev = 0.0f;
  gImu.holdQuality = 0.0f;
}

/**
 * Combined RMS → 0…100 skor.
 *
 * Formül:
 *   qNorm = 1 − (holdCombinedRms / HOLD_QUALITY_RMS_REF_DEG)
 *   holdQuality = 100 * clamp(0, 1, qNorm)
 *
 * Örnek (REF=2°): 0.1°→95, 0.4°→80, 1.0°→50, ≥2°→0.
 */
static float calculateHoldQuality(float combinedRms) {
  float q = 1.0f - (combinedRms / HOLD_QUALITY_RMS_REF_DEG);
  if (q < 0.0f) q = 0.0f;
  if (q > 1.0f) q = 1.0f;
  return q * 100.0f;
}

/**
 * Telemetri tick’inde çağrılır (~25 Hz).
 * deltaPitch/Roll = orientation − calibration.reference*
 * Ring’e yazar; dolu pencerede RMS / std / max / avg / quality günceller.
 */
static void updateHoldAnalysis() {
  const float deltaPitch =
    gImu.orientation.pitch - gImu.calibration.referencePitch;
  const float deltaRoll =
    gImu.orientation.roll - gImu.calibration.referenceRoll;

  // Ring push (statik dizi — malloc yok)
  HoldSample &slot = gHoldBuf.samples[gHoldBuf.head];
  slot.timestampMs = millis();
  slot.deltaPitch = deltaPitch;
  slot.deltaRoll = deltaRoll;
  gHoldBuf.head = (uint16_t)((gHoldBuf.head + 1u) % HOLD_BUFFER_CAPACITY);
  if (gHoldBuf.count < HOLD_BUFFER_CAPACITY) {
    gHoldBuf.count++;
  }

  const uint16_t n = gHoldBuf.count;
  if (n == 0) {
    gImu.holdPitchRms = 0.0f;
    gImu.holdRollRms = 0.0f;
    gImu.holdCombinedRms = 0.0f;
    gImu.holdStdDev = 0.0f;
    gImu.holdQuality = 0.0f;
    gHoldBuf.maxDev = 0.0f;
    gHoldBuf.avgDev = 0.0f;
    return;
  }

  float sumDp2 = 0.0f;
  float sumDr2 = 0.0f;
  float sumMag = 0.0f;
  float sumMag2 = 0.0f;
  float maxMag = 0.0f;

  for (uint16_t i = 0; i < n; i++) {
    const HoldSample &s = gHoldBuf.samples[i];
    const float dp = s.deltaPitch;
    const float dr = s.deltaRoll;
    sumDp2 += dp * dp;
    sumDr2 += dr * dr;
    const float mag = sqrtf(dp * dp + dr * dr);
    sumMag += mag;
    sumMag2 += mag * mag;
    if (mag > maxMag) maxMag = mag;
  }

  const float invN = 1.0f / (float)n;
  const float pitchRms = sqrtf(sumDp2 * invN);
  const float rollRms = sqrtf(sumDr2 * invN);
  // Combined RMS: pitch & roll RMS’lerinin birleşik RMS’i
  const float combinedRms = sqrtf(0.5f * (pitchRms * pitchRms + rollRms * rollRms));
  const float avgMag = sumMag * invN;
  // Population stddev of |delta| magnitude
  float varMag = (sumMag2 * invN) - (avgMag * avgMag);
  if (varMag < 0.0f) varMag = 0.0f;
  const float stdMag = sqrtf(varMag);

  gHoldBuf.maxDev = maxMag;
  gHoldBuf.avgDev = avgMag;

  gImu.holdPitchRms = pitchRms;
  gImu.holdRollRms = rollRms;
  gImu.holdCombinedRms = combinedRms;
  gImu.holdStdDev = stdMag;
  gImu.holdQuality = calculateHoldQuality(combinedRms);
}

// =============================================================================
// Muzzle Trace Engine (v1)
//
// Son ~2 sn namlu yolu: traceX/Y = pitch/roll − reference.
// Ring buffer (statik); metrikler ImuState’te; T:/JSON’a yazılmaz.
// =============================================================================

/** ~2 sn @ TELEMETRY_PERIOD_MS (40 ms) → 50 örnek */
static const uint16_t MUZZLE_TRACE_CAPACITY = 50;

struct MuzzleTraceSample {
  uint32_t timestampMs;
  float traceX;  // pitch − referencePitch (°)
  float traceY;  // roll − referenceRoll (°)
};

struct MuzzleTraceRing {
  MuzzleTraceSample samples[MUZZLE_TRACE_CAPACITY];
  uint16_t head;
  uint16_t count;
  /** Pencere içi yol uzunluğu (ardışık noktalar arası, °) — rapor / iç kullanım */
  float pathLength;
};

static MuzzleTraceRing gMuzzleTrace = {};

static void resetMuzzleTrace() {
  gMuzzleTrace.head = 0;
  gMuzzleTrace.count = 0;
  gMuzzleTrace.pathLength = 0.0f;
  gImu.traceRadius = 0.0f;
  gImu.tracePeak = 0.0f;
  gImu.traceAverage = 0.0f;
}

/**
 * Telemetri tick’inde (~25 Hz).
 * traceX/Y + distanceFromCenter; ring’e yazar; radius/peak/average günceller.
 */
static void updateMuzzleTrace() {
  const float traceX =
    gImu.orientation.pitch - gImu.calibration.referencePitch;
  const float traceY =
    gImu.orientation.roll - gImu.calibration.referenceRoll;

  MuzzleTraceSample &slot = gMuzzleTrace.samples[gMuzzleTrace.head];
  slot.timestampMs = millis();
  slot.traceX = traceX;
  slot.traceY = traceY;
  gMuzzleTrace.head =
    (uint16_t)((gMuzzleTrace.head + 1u) % MUZZLE_TRACE_CAPACITY);
  if (gMuzzleTrace.count < MUZZLE_TRACE_CAPACITY) {
    gMuzzleTrace.count++;
  }

  const uint16_t n = gMuzzleTrace.count;
  if (n == 0) {
    gImu.traceRadius = 0.0f;
    gImu.tracePeak = 0.0f;
    gImu.traceAverage = 0.0f;
    gMuzzleTrace.pathLength = 0.0f;
    return;
  }

  float sumDist = 0.0f;
  float sumDist2 = 0.0f;
  float peak = 0.0f;
  float pathLen = 0.0f;

  for (uint16_t i = 0; i < n; i++) {
    const MuzzleTraceSample &s = gMuzzleTrace.samples[i];
    // distanceFromCenter = √(traceX² + traceY²)
    const float d = sqrtf(s.traceX * s.traceX + s.traceY * s.traceY);
    sumDist += d;
    sumDist2 += d * d;
    if (d > peak) peak = d;
  }

  // Yol uzunluğu: kronolojik (en eskiden yeniye)
  if (n >= 2) {
    const uint16_t start =
      (gMuzzleTrace.count < MUZZLE_TRACE_CAPACITY)
        ? 0u
        : gMuzzleTrace.head;
    for (uint16_t k = 1; k < n; k++) {
      const uint16_t i0 =
        (uint16_t)((start + k - 1u) % MUZZLE_TRACE_CAPACITY);
      const uint16_t i1 = (uint16_t)((start + k) % MUZZLE_TRACE_CAPACITY);
      const float dx =
        gMuzzleTrace.samples[i1].traceX - gMuzzleTrace.samples[i0].traceX;
      const float dy =
        gMuzzleTrace.samples[i1].traceY - gMuzzleTrace.samples[i0].traceY;
      pathLen += sqrtf(dx * dx + dy * dy);
    }
  }

  const float invN = 1.0f / (float)n;
  gMuzzleTrace.pathLength = pathLen;
  gImu.traceAverage = sumDist * invN;
  gImu.tracePeak = peak;
  gImu.traceRadius = sqrtf(sumDist2 * invN);  // RMS radius
}

// =============================================================================
// Shot Event Engine (v1)
//
// Trigger anında: son 250 ms (pre) + trigger frame + sonraki 100 ms (post).
// Statik ring / diziler; T:/JSON/BLE’ye yazılmaz.
// =============================================================================

static const uint32_t SHOT_SAMPLE_PERIOD_MS = 10;   // 100 Hz örnekleme
static const uint32_t SHOT_PRE_WINDOW_MS = 250;
static const uint32_t SHOT_POST_WINDOW_MS = 100;
static const uint16_t SHOT_PRE_CAPACITY = 25;       // 250 / 10
static const uint16_t SHOT_POST_CAPACITY = 10;      // 100 / 10

/** Canlı pre-ring kaydı */
struct ShotPreSample {
  uint32_t timestampMs;
  float pitch;
  float roll;
  float yaw;
};

/**
 * Tamamlanmış (veya post doldurulurken) atış olayı — firmware-internal.
 * Diziler sabit boyutlu; geçerli uzunluk preCount / postCount.
 */
struct ShotEvent {
  float prePitch[SHOT_PRE_CAPACITY];
  float preRoll[SHOT_PRE_CAPACITY];
  float preYaw[SHOT_PRE_CAPACITY];
  uint16_t preCount;

  float triggerPitch;
  float triggerRoll;
  float triggerYaw;
  uint32_t triggerTimestamp;

  float postPitch[SHOT_POST_CAPACITY];
  float postRoll[SHOT_POST_CAPACITY];
  float postYaw[SHOT_POST_CAPACITY];
  uint16_t postCount;

  bool complete;  // post penceresi doldu
};

struct ShotEventEngine {
  ShotPreSample preRing[SHOT_PRE_CAPACITY];
  uint16_t preHead;
  uint16_t preCount;
  uint32_t lastSampleMs;

  bool capturingPost;
  uint32_t postStartMs;

  ShotEvent event;
};

static ShotEventEngine gShot = {};

static void resetShotEvent() {
  gShot.preHead = 0;
  gShot.preCount = 0;
  gShot.lastSampleMs = 0;
  gShot.capturingPost = false;
  gShot.postStartMs = 0;
  gShot.event.preCount = 0;
  gShot.event.postCount = 0;
  gShot.event.triggerPitch = 0.0f;
  gShot.event.triggerRoll = 0.0f;
  gShot.event.triggerYaw = 0.0f;
  gShot.event.triggerTimestamp = 0;
  gShot.event.complete = false;
}

/**
 * Trigger anında: pre-ring → ShotEvent, trigger frame, post yakalamayı başlat.
 */
static void captureShotEvent() {
  const uint16_t n = gShot.preCount;
  gShot.event.preCount = n;

  // Kronolojik kopya (en eskiden yeniye)
  const uint16_t start =
    (n < SHOT_PRE_CAPACITY) ? 0u : gShot.preHead;
  for (uint16_t k = 0; k < n; k++) {
    const uint16_t idx =
      (uint16_t)((start + k) % SHOT_PRE_CAPACITY);
    const ShotPreSample &s = gShot.preRing[idx];
    gShot.event.prePitch[k] = s.pitch;
    gShot.event.preRoll[k] = s.roll;
    gShot.event.preYaw[k] = s.yaw;
  }
  for (uint16_t k = n; k < SHOT_PRE_CAPACITY; k++) {
    gShot.event.prePitch[k] = 0.0f;
    gShot.event.preRoll[k] = 0.0f;
    gShot.event.preYaw[k] = 0.0f;
  }

  gShot.event.triggerPitch = gImu.orientation.pitch;
  gShot.event.triggerRoll = gImu.orientation.roll;
  gShot.event.triggerYaw = gImu.orientation.yaw;
  gShot.event.triggerTimestamp = millis();

  gShot.event.postCount = 0;
  gShot.event.complete = false;
  for (uint16_t i = 0; i < SHOT_POST_CAPACITY; i++) {
    gShot.event.postPitch[i] = 0.0f;
    gShot.event.postRoll[i] = 0.0f;
    gShot.event.postYaw[i] = 0.0f;
  }

  gShot.capturingPost = true;
  gShot.postStartMs = gShot.event.triggerTimestamp;
  gShot.lastSampleMs = 0;  // post örneklerini hemen alabilmek için
}

/**
 * Her IMU tick’ten çağrılır (hız sınırlı).
 * Idle: pre-ring doldurur.
 * Post: trigger sonrası 100 ms örnekler → ShotEvent.post*
 */
static void updateShotEvent() {
  const uint32_t now = millis();
  if (gShot.lastSampleMs != 0 &&
      (now - gShot.lastSampleMs) < SHOT_SAMPLE_PERIOD_MS) {
    return;
  }
  gShot.lastSampleMs = now;

  const float pitch = gImu.orientation.pitch;
  const float roll = gImu.orientation.roll;
  const float yaw = gImu.orientation.yaw;

  if (gShot.capturingPost) {
    if (gShot.event.postCount < SHOT_POST_CAPACITY) {
      const uint16_t i = gShot.event.postCount;
      gShot.event.postPitch[i] = pitch;
      gShot.event.postRoll[i] = roll;
      gShot.event.postYaw[i] = yaw;
      gShot.event.postCount++;
    }
    if ((now - gShot.postStartMs) >= SHOT_POST_WINDOW_MS ||
        gShot.event.postCount >= SHOT_POST_CAPACITY) {
      gShot.capturingPost = false;
      gShot.event.complete = true;
    }
    return;
  }

  // Pre-ring (sürekli)
  ShotPreSample &slot = gShot.preRing[gShot.preHead];
  slot.timestampMs = now;
  slot.pitch = pitch;
  slot.roll = roll;
  slot.yaw = yaw;
  gShot.preHead = (uint16_t)((gShot.preHead + 1u) % SHOT_PRE_CAPACITY);
  if (gShot.preCount < SHOT_PRE_CAPACITY) {
    gShot.preCount++;
  }
}

/** Entegre açıları sıfırla (AIM_RESET / YAW_RESET). Bias/ref korunur. */
static void resetImuOrientation() {
  gImu.orientation.yaw = 0.0f;
  gImu.orientation.pitch = 0.0f;
  gImu.orientation.roll = 0.0f;
}

/**
 * IMU pipeline giriş noktası (loop).
 * TODO: Ring Buffer — tetik öncesi 200 ms örnek saklama.
 */
static void updateMpu() {
  if (!readRawImu()) return;

  uint32_t now = millis();
  float dt = 0.0f;
  if (gImu.lastSampleMs > 0) {
    dt = (now - gImu.lastSampleMs) * 0.001f;
    if (dt < 0.0f) dt = 0.0f;
    if (dt > 0.1f) dt = 0.1f;  // spike koruması
  }
  gImu.lastSampleMs = now;

  updateOrientation(dt);
  updateAimCalibration();
  calculateHoldMetrics();
  updateShotEvent();
}

static void emitTelemetryLine() {
  // Hold Analysis + Muzzle Trace: telemetri hızında (~25 Hz); T: formatına dokunulmaz
  updateHoldAnalysis();
  updateMuzzleTrace();

  // USB + BLE — aynı T: formatı (web extractHardwarePackets)
  char line[128];
  int n = snprintf(
    line,
    sizeof(line),
    "T:%.3f,%.3f,%.3f,%u,%.4f,%.2f,%.2f,%.2f\n",
    gImu.raw.ax,
    gImu.raw.ay,
    gImu.raw.az,
    (unsigned)lastLvl,
    gImu.raw.gz,
    gImu.orientation.yaw,
    gImu.orientation.pitch,
    gImu.orientation.roll
  );
  if (n > 0) {
    broadcastRaw(line, (size_t)n);
  }
}

static void broadcastTrigger(int32_t loudness) {
  StaticJsonDocument<384> doc;
  doc["event"] = "trigger";
  doc["loudness"] = loudness;
  doc["accel_x"] = gImu.raw.ax;
  doc["accel_y"] = gImu.raw.ay;
  doc["accel_z"] = gImu.raw.az;
  doc["gyro_x"] = gImu.raw.gx;
  doc["gx"] = gImu.raw.gx;
  doc["gyro_y"] = gImu.raw.gy;
  doc["gy"] = gImu.raw.gy;
  doc["gyro_z"] = gImu.raw.gz;
  doc["gz"] = gImu.raw.gz;
  doc["yaw"] = gImu.orientation.yaw;
  doc["pitch"] = gImu.orientation.pitch;
  doc["roll"] = gImu.orientation.roll;
  doc["timestamp"] = (uint32_t)millis();

  char buf[384];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  broadcastJsonLine(buf, n);
  Serial.printf(
    "[TX] trigger lvl=%ld yaw=%.1f pitch=%.1f roll=%.1f\n",
    (long)loudness,
    gImu.orientation.yaw,
    gImu.orientation.pitch,
    gImu.orientation.roll
  );
}

static void handleCommandLine(const String &msgIn) {
  String msg = msgIn;
  msg.trim();
  if (msg.length() == 0) return;

  if (msg.equalsIgnoreCase("ping")) {
    const char *pong = "{\"event\":\"pong\"}";
    broadcastJsonLine(pong, strlen(pong));
    return;
  }

  if (
    msg.equalsIgnoreCase("YAW_RESET") ||
    msg.equalsIgnoreCase("RESET_YAW") ||
    msg.equalsIgnoreCase("PITCH_RESET") ||
    msg.equalsIgnoreCase("AIM_RESET") ||
    msg.equalsIgnoreCase("RESET_AIM")
  ) {
    resetImuOrientation();
    resetHoldBuffer();
    resetMuzzleTrace();
    resetShotEvent();
    const char *ok = "{\"event\":\"aim_reset\",\"yaw\":0,\"pitch\":0,\"roll\":0}";
    broadcastJsonLine(ok, strlen(ok));
    return;
  }

  if (msg.equalsIgnoreCase("AIM_CALIBRATE_START")) {
    startAimCalibration();
    return;
  }

  // AIM_CALIBRATE_DONE: istemci isteği — aktifse bitir; değilse son sonucu tekrar yayınla
  if (msg.equalsIgnoreCase("AIM_CALIBRATE_DONE")) {
    if (gAimCal.active) {
      finishAimCalibration();
    } else {
      StaticJsonDocument<256> doc;
      doc["event"] = "aim_calibrate_done";
      doc["referencePitch"] = gImu.calibration.referencePitch;
      doc["referenceRoll"] = gImu.calibration.referenceRoll;
      doc["referenceYaw"] = gImu.calibration.referenceYaw;
      doc["holdRms"] = gImu.hold.holdRms;
      doc["quality"] = gImu.hold.quality;
      doc["samples"] = 0;
      doc["cached"] = true;
      char buf[256];
      size_t len = serializeJson(doc, buf, sizeof(buf));
      broadcastJsonLine(buf, len);
    }
    return;
  }

  // THRESHOLD:<val>  veya SAVE_THRESHOLD:<val>
  // Web 0–100 → ham eşik. Ham değer (>100) doğrudan yazılır.
  // ÖNEMLİ: önce 0–100 kontrolü — aksi halde 42 → MIN clamp bug'ı oluşur.
  if (msg.startsWith("THRESHOLD:") || msg.startsWith("threshold:")) {
    long v = msg.substring(msg.indexOf(':') + 1).toInt();
    if (v <= 100) {
      if (v < 0) v = 0;
      soundThreshold = (int32_t)lroundf(
        SOUND_THRESHOLD_MIN + (v / 100.0f) * (SOUND_THRESHOLD_MAX - SOUND_THRESHOLD_MIN)
      );
    } else {
      if (v < SOUND_THRESHOLD_MIN) v = SOUND_THRESHOLD_MIN;
      if (v > SOUND_THRESHOLD_MAX) v = SOUND_THRESHOLD_MAX;
      soundThreshold = (int32_t)v;
    }
    char buf[64];
    size_t n = snprintf(buf, sizeof(buf), "{\"event\":\"threshold\",\"value\":%ld}", (long)soundThreshold);
    broadcastJsonLine(buf, n);
    return;
  }

  if (msg.startsWith("SAVE_THRESHOLD:") || msg.startsWith("save_threshold:")) {
    // Kalıcı flash yok — aynı THRESHOLD davranışı
    handleCommandLine(String("THRESHOLD:") + msg.substring(msg.indexOf(':') + 1));
  }
}

static void pollSerialCommands() {
  static String line;
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (line.length() > 0) {
        handleCommandLine(line);
        line = "";
      }
    } else if (line.length() < 96) {
      line += c;
    }
  }
}

void setup() {
  Serial.begin(115200);

  pixels.begin();
  pixels.setBrightness(100);
  setLedState(LED_BOOT);
  ledWaitMs(1500);

  Serial.println("=== Audaz Tactical - MPU Gyro/Yaw + BLE/USB ===");

  setLedState(LED_SELF_TEST);

  Wire.begin(9, 8);
  ledWaitMs(100);
  if (!mpu.begin(0x68) && !mpu.begin(0x69)) {
    Serial.println("HATA: MPU-6050 bulunamadı!");
    setLedState(LED_ERROR);
  } else {
    mpuOk = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("[MPU6050] Accel+Gyro hazır (yaw/pitch nişan, roll cant).");
  }

  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    // Küçük DMA → daha düşük mikrofon gecikmesi (~1024/44k ≈ 23 ms/buf idi)
    .dma_buf_count = 2,
    .dma_buf_len = 256,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);

  setLedState(LED_WAIT_CONNECTION);
  startBleNordicUart();
  resetHoldBuffer();
  resetMuzzleTrace();
  resetShotEvent();

  // Sistem hazır — eski davranış: yeşil READY (USB her zaman kullanılabilir)
  if (mpuOk) {
    setLedState(LED_READY);
  }
  updateLedAnimation();
  Serial.println("Sistem hazır — T:ax,ay,az,lvl,gz,yaw,pitch,roll akışı aktif.");
}

void loop() {
  pollSerialCommands();
  updateMpu();
  updateLedAnimation();

  // I2S kuyruğunu boşalt — tek örnek okumak DMA gecikmesini biriktirir
  int32_t burstPeak = 0;
  for (int n = 0; n < MIC_READ_BURST; n++) {
    int32_t sample = 0;
    size_t bytesIn = 0;
    esp_err_t result = i2s_read(I2S_PORT, &sample, sizeof(sample), &bytesIn, 0);
    if (result != ESP_OK || bytesIn == 0) break;

    // INMP441: 24-bit veri 32-bit slotta sola hizalı
    sample >>= 8;

    dc_offset = 0.99f * dc_offset + 0.01f * (float)sample;
    int32_t clean_sample = abs(sample - (int32_t)dc_offset);
    if (clean_sample < MIC_NOISE_GATE) {
      clean_sample = 0;
    }
    if (clean_sample > burstPeak) burstPeak = clean_sample;
  }

  lastLoudRaw = burstPeak;
  lastLvl = loudnessToLvl(burstPeak);

  uint32_t now = millis();
  if (burstPeak > soundThreshold && (now - lastTriggerMs) >= TRIGGER_COOLDOWN_MS) {
    lastTriggerMs = now;
    Serial.printf(
      "[ATIŞ] şiddet=%ld yaw=%.1f pitch=%.1f roll=%.1f\n",
      (long)burstPeak,
      gImu.orientation.yaw,
      gImu.orientation.pitch,
      gImu.orientation.roll
    );

    setLedState(LED_SHOT);
    captureShotEvent();
    broadcastTrigger(burstPeak);
    // LED flash non-blocking (updateLedAnimation); 120 ms while YOK → gecikme kalkar
  }

  if (now - lastTelemetryMs >= TELEMETRY_PERIOD_MS) {
    lastTelemetryMs = now;
    emitTelemetryLine();
  }
}
