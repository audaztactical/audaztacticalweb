/**
 * Audaz Tactical — ESP32-S3 Dry Fire
 * SoftAP WebSocket + USB Serial telemetri (I2S + MPU6050 accel/gyro/yaw)
 *
 * Seri / WS telemetri satırı:
 *   T:ax,ay,az,lvl,gz,yaw
 * Tetik JSON:
 *   {"event":"trigger","loudness":…,"accel_x":…,"gyro_z":…,"yaw":…, …}
 */

#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <driver/i2s.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_NeoPixel.h>
#include <math.h>

// --- Ağ & Sunucu ---
static const uint16_t WS_PORT = 81;
static const char *MDNS_HOST = "audaz";
static const char *FW_VERSION = "1.3.0-S3-GYRO";

static const IPAddress AP_IP(192, 168, 4, 1);
static const IPAddress AP_GW(192, 168, 4, 1);
static const IPAddress AP_MASK(255, 255, 255, 0);

WebSocketsServer webSocket(WS_PORT);

static char gSerial[8];
static char gApSsid[32];
static char gApPass[16];

// --- Pinler ---
#define I2S_WS 5
#define I2S_SD 6
#define I2S_SCK 4
#define I2S_PORT I2S_NUM_0

#define PIN_NEOPIXEL 15
#define NUMPIXELS 7
Adafruit_NeoPixel pixels(NUMPIXELS, PIN_NEOPIXEL, NEO_GRB + NEO_KHZ800);

Adafruit_MPU6050 mpu;
bool mpuOk = false;

// --- Ses ---
float dc_offset = 0;
int32_t soundThreshold = 1500000;
static const int32_t SOUND_THRESHOLD_MIN = 50000;
static const int32_t SOUND_THRESHOLD_MAX = 5000000;

// --- MPU / yaw ---
float ax = 0, ay = 0, az = 0;
float gx = 0, gy = 0, gz = 0;  // rad/s
float yawDeg = 0;              // entegre yaw (Z)
uint32_t lastMpuMs = 0;
uint32_t lastTelemetryMs = 0;
uint32_t lastTriggerMs = 0;
int32_t lastLoudRaw = 0;
uint8_t lastLvl = 0;

static const uint32_t TELEMETRY_PERIOD_MS = 40;  // ~25 Hz
static const uint32_t TRIGGER_COOLDOWN_MS = 150;

static void buildUniqueApIdentity() {
  uint8_t mac[6] = {0};
  WiFi.macAddress(mac);

  snprintf(gSerial, sizeof(gSerial), "%02X%02X%02X", mac[3], mac[4], mac[5]);
  snprintf(gApSsid, sizeof(gApSsid), "AUDAZ-TACTICAL-%s", gSerial);

  uint16_t sum = 0;
  for (size_t i = 0; gSerial[i]; i++) {
    sum = (uint16_t)(sum + (uint8_t)gSerial[i]);
  }
  uint8_t cs = (uint8_t)((sum * 17u + 0xA5u) & 0xFFu);
  snprintf(gApPass, sizeof(gApPass), "AT%s%02X", gSerial, cs);
}

static uint8_t loudnessToLvl(int32_t raw) {
  if (raw <= 0) return 0;
  // log-ish map → 0–100 (web VU ile uyumlu)
  float n = log10f(1.0f + (float)raw) / log10f(1.0f + 5000000.0f);
  int v = (int)lroundf(n * 100.0f);
  if (v < 0) v = 0;
  if (v > 100) v = 100;
  return (uint8_t)v;
}

static void clampYaw() {
  while (yawDeg > 180.0f) yawDeg -= 360.0f;
  while (yawDeg < -180.0f) yawDeg += 360.0f;
}

/** MPU accel + gyro oku; gz ile yaw entegre et. */
static void updateMpu() {
  if (!mpuOk) return;

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  uint32_t now = millis();
  float dt = 0.0f;
  if (lastMpuMs > 0) {
    dt = (now - lastMpuMs) * 0.001f;
    if (dt < 0.0f) dt = 0.0f;
    if (dt > 0.1f) dt = 0.1f;  // spike koruması
  }
  lastMpuMs = now;

  ax = a.acceleration.x;
  ay = a.acceleration.y;
  az = a.acceleration.z;
  gx = g.gyro.x;
  gy = g.gyro.y;
  gz = g.gyro.z;  // rad/s — yaw ekseni

  // Küçük drift gürültüsünü kes
  const float deadzone = 0.02f;  // ~1.1 °/s
  float gzUse = (fabsf(gz) < deadzone) ? 0.0f : gz;
  yawDeg += gzUse * (180.0f / (float)PI) * dt;
  clampYaw();
}

static void emitTelemetryLine() {
  // USB Serial — HardwareContext parse: T:ax,ay,az,lvl,gz,yaw
  Serial.printf(
    "T:%.3f,%.3f,%.3f,%u,%.4f,%.2f\n",
    ax, ay, az, (unsigned)lastLvl, gz, yawDeg
  );

  // SoftAP istemcileri
  if (webSocket.connectedClients() > 0) {
    StaticJsonDocument<192> doc;
    doc["event"] = "telemetry";
    doc["ax"] = ax;
    doc["ay"] = ay;
    doc["az"] = az;
    doc["lvl"] = lastLvl;
    doc["gz"] = gz;
    doc["gyro_z"] = gz;
    doc["yaw"] = yawDeg;
    doc["timestamp"] = (uint32_t)millis();
    char buf[192];
    size_t n = serializeJson(doc, buf, sizeof(buf));
    webSocket.broadcastTXT(buf, n);
  }
}

static void broadcastTrigger(int32_t loudness) {
  StaticJsonDocument<256> doc;
  doc["event"] = "trigger";
  doc["loudness"] = loudness;
  doc["accel_x"] = ax;
  doc["accel_y"] = ay;
  doc["accel_z"] = az;
  doc["gyro_z"] = gz;
  doc["gz"] = gz;
  doc["yaw"] = yawDeg;
  doc["timestamp"] = (uint32_t)millis();

  char buf[256];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  webSocket.broadcastTXT(buf, n);
  // USB Serial tetik — aynı JSON satırı
  Serial.write((const uint8_t *)buf, n);
  Serial.write('\n');
  Serial.printf("[TX] trigger lvl=%ld yaw=%.1f gz=%.3f\n", (long)loudness, yawDeg, gz);
}

static void handleCommandLine(const String &msgIn) {
  String msg = msgIn;
  msg.trim();
  if (msg.length() == 0) return;

  if (msg.equalsIgnoreCase("ping")) {
    Serial.println(F("{\"event\":\"pong\"}"));
    return;
  }

  if (msg.equalsIgnoreCase("YAW_RESET") || msg.equalsIgnoreCase("RESET_YAW")) {
    yawDeg = 0;
    Serial.println(F("{\"event\":\"yaw_reset\",\"yaw\":0}"));
    return;
  }

  // THRESHOLD:<val>  veya SAVE_THRESHOLD:<val>
  if (msg.startsWith("THRESHOLD:") || msg.startsWith("threshold:")) {
    long v = msg.substring(msg.indexOf(':') + 1).toInt();
    if (v < SOUND_THRESHOLD_MIN) v = SOUND_THRESHOLD_MIN;
    if (v > SOUND_THRESHOLD_MAX) v = SOUND_THRESHOLD_MAX;
    // Web 0–100 → ham eşik (kaba map); büyük değerler ham kabul
    if (v <= 100) {
      soundThreshold = (int32_t)lroundf(
        SOUND_THRESHOLD_MIN + (v / 100.0f) * (SOUND_THRESHOLD_MAX - SOUND_THRESHOLD_MIN)
      );
    } else {
      soundThreshold = (int32_t)v;
    }
    Serial.printf("{\"event\":\"threshold\",\"value\":%ld}\n", (long)soundThreshold);
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

static void sendHello(uint8_t num) {
  StaticJsonDocument<256> hello;
  hello["event"] = "hello";
  hello["device"] = "audaz-dryfire";
  hello["fw"] = FW_VERSION;
  hello["serial"] = gSerial;
  hello["ssid"] = gApSsid;
  hello["apIp"] = AP_IP.toString();
  hello["mdns"] = "audaz.local";
  hello["wsPort"] = WS_PORT;
  hello["caps"] = "gyro,yaw";
  char buf[256];
  size_t n = serializeJson(hello, buf, sizeof(buf));
  webSocket.sendTXT(num, buf, n);
}

static void onWsEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[WS] Bağlandı -> #%u IP: %s\n", num, ip.toString().c_str());
      sendHello(num);
      break;
    }
    case WStype_DISCONNECTED:
      Serial.printf("[WS] Ayrıldı -> #%u\n", num);
      break;
    case WStype_TEXT: {
      String msg = String((char *)payload).substring(0, length);
      handleCommandLine(msg);
      break;
    }
    default:
      break;
  }
}

void startUniqueSoftAp() {
  WiFi.persistent(false);
  WiFi.disconnect(true);
  delay(100);

  WiFi.mode(WIFI_AP);
  buildUniqueApIdentity();

  WiFi.softAPConfig(AP_IP, AP_GW, AP_MASK);
  bool ok = WiFi.softAP(gApSsid, gApPass, 1, 0, 4);

  Serial.println(F("\n======== AUDAZ FIELD AP ========"));
  Serial.printf("SSID:     %s\n", gApSsid);
  Serial.printf("PASSWORD: %s\n", gApPass);
  Serial.printf("SERIAL:   %s\n", gSerial);
  Serial.printf("AP IP:    %s\n", WiFi.softAPIP().toString().c_str());
  Serial.printf("WS:       ws://192.168.4.1:%u/\n", WS_PORT);
  Serial.printf("Status:   %s\n", ok ? "OK" : "FAIL");
  Serial.println(F("================================"));

  if (MDNS.begin(MDNS_HOST)) {
    MDNS.addService("ws", "tcp", WS_PORT);
    Serial.println(F("[mDNS] http://audaz.local aktif"));
  }
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println("=== Audaz Tactical - MPU Gyro/Yaw + SoftAP ===");

  pixels.begin();
  pixels.setBrightness(100);
  pixels.fill(pixels.Color(0, 0, 255));
  pixels.show();

  Wire.begin(9, 8);
  delay(100);
  if (!mpu.begin(0x68) && !mpu.begin(0x69)) {
    Serial.println("HATA: MPU-6050 bulunamadı!");
  } else {
    mpuOk = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("[MPU6050] Accel+Gyro hazır (yaw Z entegre).");
  }

  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = 1024,
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

  startUniqueSoftAp();
  webSocket.begin();
  webSocket.onEvent(onWsEvent);

  delay(500);
  pixels.fill(pixels.Color(0, 255, 0));
  pixels.show();
  Serial.println("Sistem hazır — T:ax,ay,az,lvl,gz,yaw akışı aktif.");
}

void loop() {
  webSocket.loop();
  pollSerialCommands();
  updateMpu();

  int32_t sample = 0;
  size_t bytesIn = 0;
  esp_err_t result = i2s_read(I2S_PORT, &sample, sizeof(sample), &bytesIn, 0);

  if (result == ESP_OK && bytesIn > 0) {
    dc_offset = 0.99f * dc_offset + 0.01f * (float)sample;
    int32_t clean_sample = abs(sample - (int32_t)dc_offset);
    lastLoudRaw = clean_sample;
    lastLvl = loudnessToLvl(clean_sample);

    uint32_t now = millis();
    if (clean_sample > soundThreshold && (now - lastTriggerMs) >= TRIGGER_COOLDOWN_MS) {
      lastTriggerMs = now;
      Serial.printf("[ATIŞ] şiddet=%d yaw=%.1f\n", clean_sample, yawDeg);

      pixels.fill(pixels.Color(255, 0, 0));
      pixels.show();

      broadcastTrigger(clean_sample);

      delay(120);
      pixels.fill(pixels.Color(0, 255, 0));
      pixels.show();
    }
  }

  uint32_t now = millis();
  if (now - lastTelemetryMs >= TELEMETRY_PERIOD_MS) {
    lastTelemetryMs = now;
    emitTelemetryLine();
  }
}
