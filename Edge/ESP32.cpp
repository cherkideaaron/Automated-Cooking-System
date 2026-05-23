#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include "time.h"
#include "DHT.h"

// ==========================================
// 1. CREDENTIALS & CONFIG
// ==========================================
const char* WIFI_SSID     = "Abado";
const char* WIFI_PASSWORD = "ymahA281";
const char* SUPABASE_HOST = "kpgagzfmymrmsdwgolwi.supabase.co";
const String SUPABASE_KEY = "sb_publishable_C7fy-20AW2q3eZF0T3VWHQ_-19qqkCh";

WiFiClientSecure secureClient;

// Timers
unsigned long lastPollTime     = 0;
const long POLL_INTERVAL       = 2000;
unsigned long lastTempUpdateTime = 0;
const long TEMP_UPDATE_INTERVAL  = 3000;
unsigned long lastTestPollTime = 0;
const long TEST_POLL_INTERVAL  = 1000;  // poll test_command every 1 second

// NTP Settings
const char* ntpServer = "pool.ntp.org";

// ==========================================
// 2. HARDWARE PINS
// ==========================================

// --- Servo Cup Pins (cups 1-7) ---
#define SERVO_CUP1_PIN 25
#define SERVO_CUP2_PIN 26
#define SERVO_CUP3_PIN 13
#define SERVO_CUP4_PIN 12
#define SERVO_CUP5_PIN 4
#define SERVO_CUP6_PIN 2
#define SERVO_CUP7_PIN 15

// --- Status LEDs ---
#define STOVE_ON_LED   18
#define STOVE_OFF_LED  33
#define IDLE_LED       27

// --- Motor Driver (L298N) for Stirrer ---
// Connect your L298N ENA → MOTOR_EN, IN1 → MOTOR_IN1, IN2 → MOTOR_IN2
#define MOTOR_EN  32
#define MOTOR_IN1 35
#define MOTOR_IN2 34

// DHT11 Config
#define DHTPIN 15
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

Servo servoCup1;
Servo servoCup2;
Servo servoCup3;
Servo servoCup4;
Servo servoCup5;
Servo servoCup6;
Servo servoCup7;

// Forward-declare motor controller functions (implemented in motor_controller.cpp)
void motorSetup();
void runStirrer(int speed, unsigned long durationMs);

// Forward-declare internal motor helpers used by test mode (non-blocking)
void motorCW(int speed);   // defined in motor_controller.cpp
void motorStop();          // defined in motor_controller.cpp

// ==========================================
// 3. STATE TRACKING
// ==========================================
String lastSessionId = "";
int lastProcessedStep = -1;

// ==========================================
// 4. HELPER FUNCTIONS
// ==========================================

String getISOTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "2026-01-01T00:00:00Z"; 
  }
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

float readTemperature() {
  float t = dht.readTemperature();
  if (isnan(t)) {
    Serial.println("[ERROR] DHT Sensor: Could not read data! Check wiring.");
    return 0.0;
  }
  return t;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Status LEDs
  pinMode(STOVE_ON_LED, OUTPUT);
  pinMode(STOVE_OFF_LED, OUTPUT);
  pinMode(IDLE_LED, OUTPUT);

  // Stirrer motor driver
  motorSetup();

  // DHT11 temperature sensor
  dht.begin();

  // Attach all 7 cup servos and park them at 0°
  servoCup1.attach(SERVO_CUP1_PIN); servoCup1.write(0);
  servoCup2.attach(SERVO_CUP2_PIN); servoCup2.write(0);
  servoCup3.attach(SERVO_CUP3_PIN); servoCup3.write(0);
  servoCup4.attach(SERVO_CUP4_PIN); servoCup4.write(0);
  servoCup5.attach(SERVO_CUP5_PIN); servoCup5.write(0);
  servoCup6.attach(SERVO_CUP6_PIN); servoCup6.write(0);
  servoCup7.attach(SERVO_CUP7_PIN); servoCup7.write(0);

  Serial.println("\n========================================");
  Serial.println("--- HARDWARE SIMULATION STARTING ---");
  Serial.println("========================================");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WIFI] Connected! Ready to poll and update.");

  configTime(0, 0, ntpServer);
  secureClient.setInsecure();
}

void loop() {
  // Task 1: Session Polling (every 2s)
  if (millis() - lastPollTime >= POLL_INTERVAL) {
    lastPollTime = millis();
    readActiveSession();
  }

  // Task 2: Supabase Temperature Update (every 3s)
  if (millis() - lastTempUpdateTime >= TEMP_UPDATE_INTERVAL) {
    lastTempUpdateTime = millis();
    updateSupabaseTemperature();
  }

  // Task 3: Test/Record mode command poll (every 1s)
  if (millis() - lastTestPollTime >= TEST_POLL_INTERVAL) {
    lastTestPollTime = millis();
    pollTestCommand();
  }
}

// --- RESTORED LOGS FOR TEMP UPDATE ---
void updateSupabaseTemperature() {
  float currentTemp = readTemperature();
  if (currentTemp == 0.0) return; 

  String timestamp = getISOTimestamp();
  Serial.printf("[TEMP] Reading: %.1f C. Updating Supabase device_state...\n", currentTemp);

  if (!secureClient.connect(SUPABASE_HOST, 443)) {
    Serial.println("[ERROR] Temp Update: Connection to Supabase failed.");
    return;
  }

  StaticJsonDocument<128> doc;
  doc["temperature"] = currentTemp;
  doc["last_updated"] = timestamp;
  String jsonBody;
  serializeJson(doc, jsonBody);

  String path = "/rest/v1/device_state?id=eq.device_001";
  
  secureClient.print(String("PATCH ") + path + " HTTP/1.1\r\n" +
                     "Host: " + SUPABASE_HOST + "\r\n" +
                     "apikey: " + SUPABASE_KEY + "\r\n" +
                     "Authorization: Bearer " + SUPABASE_KEY + "\r\n" +
                     "Content-Type: application/json\r\n" +
                     "Prefer: return=minimal\r\n" +
                     "Content-Length: " + jsonBody.length() + "\r\n" +
                     "Connection: close\r\n\r\n" +
                     jsonBody);

  while (secureClient.connected()) {
    String line = secureClient.readStringUntil('\n');
    if (line == "\r") break;
  }
  Serial.println("[SUCCESS] device_state table updated.");
  secureClient.stop();
}

// ==========================================
// TEST / RECORD MODE — Non-blocking commands
// ==========================================
void pollTestCommand() {
  // --- Step 1: GET test_command from device_state ---
  if (!secureClient.connect(SUPABASE_HOST, 443)) return;

  String getPath = "/rest/v1/device_state?id=eq.device_001&select=test_command";
  secureClient.print(String("GET ") + getPath + " HTTP/1.1\r\n" +
                     "Host: " + SUPABASE_HOST + "\r\n" +
                     "apikey: " + SUPABASE_KEY + "\r\n" +
                     "Authorization: Bearer " + SUPABASE_KEY + "\r\n" +
                     "Connection: close\r\n\r\n");

  while (secureClient.connected()) {
    String line = secureClient.readStringUntil('\n');
    if (line == "\r") break;
  }
  String rawPayload = secureClient.readString();
  secureClient.stop();

  // --- Step 2: Parse the JSON array ---
  int arrStart = rawPayload.indexOf('[');
  if (arrStart == -1) return;
  rawPayload = rawPayload.substring(arrStart);

  StaticJsonDocument<256> arr;
  if (deserializeJson(arr, rawPayload) != DeserializationError::Ok) return;
  if (arr.size() == 0) return;

  // test_command is null → nothing to do
  if (arr[0]["test_command"].isNull()) return;

  String cmdStr = arr[0]["test_command"].as<String>();
  Serial.println("[TEST CMD] Received: " + cmdStr);

  // --- Step 3: Parse command payload ---
  StaticJsonDocument<128> cmd;
  if (deserializeJson(cmd, cmdStr) != DeserializationError::Ok) {
    Serial.println("[TEST CMD] Failed to parse command JSON.");
  } else {
    String type = cmd["type"].as<String>();

    if (type == "cup_open") {
      int cup = cmd["cup"] | 1;
      Serial.printf("[TEST CMD] cup_open  cup=%d\n", cup);
      // Non-blocking: servo opens and HOLDS until cup_close is received
      switch (cup) {
        case 1: servoCup1.write(90); break;
        case 2: servoCup2.write(90); break;
        case 3: servoCup3.write(90); break;
        case 4: servoCup4.write(90); break;
        case 5: servoCup5.write(90); break;
        case 6: servoCup6.write(90); break;
        case 7: servoCup7.write(90); break;
        default: Serial.printf("[TEST CMD] Unknown cup %d\n", cup); break;
      }
    }
    else if (type == "cup_close") {
      int cup = cmd["cup"] | 1;
      Serial.printf("[TEST CMD] cup_close cup=%d\n", cup);
      switch (cup) {
        case 1: servoCup1.write(0); break;
        case 2: servoCup2.write(0); break;
        case 3: servoCup3.write(0); break;
        case 4: servoCup4.write(0); break;
        case 5: servoCup5.write(0); break;
        case 6: servoCup6.write(0); break;
        case 7: servoCup7.write(0); break;
        default: Serial.printf("[TEST CMD] Unknown cup %d\n", cup); break;
      }
    }
    else if (type == "stir_start") {
      int speed = cmd["speed"] | 125;
      Serial.printf("[TEST CMD] stir_start speed=%d\n", speed);
      motorCW(speed);  // Non-blocking — stays on until stir_stop
    }
    else if (type == "stir_stop") {
      Serial.println("[TEST CMD] stir_stop");
      motorStop();
    }
    else {
      Serial.println("[TEST CMD] Unknown command type: " + type);
    }
  }

  // --- Step 4: Clear test_command back to null ---
  if (!secureClient.connect(SUPABASE_HOST, 443)) {
    Serial.println("[TEST CMD] Could not reconnect to clear command.");
    return;
  }

  String clearBody = "{\"test_command\":null}";
  String patchPath = "/rest/v1/device_state?id=eq.device_001";
  secureClient.print(String("PATCH ") + patchPath + " HTTP/1.1\r\n" +
                     "Host: " + SUPABASE_HOST + "\r\n" +
                     "apikey: " + SUPABASE_KEY + "\r\n" +
                     "Authorization: Bearer " + SUPABASE_KEY + "\r\n" +
                     "Content-Type: application/json\r\n" +
                     "Prefer: return=minimal\r\n" +
                     "Content-Length: " + clearBody.length() + "\r\n" +
                     "Connection: close\r\n\r\n" +
                     clearBody);

  while (secureClient.connected()) {
    String line = secureClient.readStringUntil('\n');
    if (line == "\r") break;
  }
  secureClient.stop();
  Serial.println("[TEST CMD] Cleared.");
}

// --- FULLY RESTORED ORIGINAL LOGS FOR SESSIONS ---
void readActiveSession() {
  Serial.println("\n[POLL] Connecting to Supabase...");

  if (!secureClient.connect(SUPABASE_HOST, 443)) {
    Serial.println("[ERROR] Connection failed. Check internet or Supabase URL.");
    return;
  }

  String path = "/rest/v1/cooking_sessions?status=eq.active&select=id,current_step,steps";
  secureClient.print(String("GET ") + path + " HTTP/1.1\r\n" +
                     "Host: " + SUPABASE_HOST + "\r\n" +
                     "apikey: " + SUPABASE_KEY + "\r\n" +
                     "Authorization: Bearer " + SUPABASE_KEY + "\r\n" +
                     "Connection: close\r\n\r\n");

  while (secureClient.connected()) {
    String line = secureClient.readStringUntil('\n');
    if (line == "\r") break;
  }

  String payload = secureClient.readString();
  int jsonStart = payload.indexOf('[');
  if (jsonStart != -1) payload = payload.substring(jsonStart);

  Serial.print("[DATA] Received: ");
  Serial.println(payload);

  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, payload);

  if (!error && doc.size() > 0) {
    JsonObject session = doc[0];
    String sessionId = session["id"].as<String>();
    int currentStep = session["current_step"];
    JsonArray steps = session["steps"];
    int totalSteps = steps.size();

    if (sessionId != lastSessionId) {
      Serial.println("[SYSTEM] New Cooking Session Detected: " + sessionId);
      lastSessionId = sessionId;
      lastProcessedStep = -1; 
      digitalWrite(STOVE_OFF_LED, LOW);
      Serial.println("[DEBUG] RED LED (Stove Off) -> turned LOW");
    }

    if (currentStep != lastProcessedStep) {
      Serial.println("-------------------------------------------");
      Serial.print("[STEP CHANGE] Processing Step: "); Serial.println(currentStep);

      // Reset action LED; motor is stopped by runStirrer() itself
      digitalWrite(IDLE_LED, LOW);
      Serial.println("[DEBUG] Action LED (Blue) reset to LOW");

      if (currentStep == 0) {
        Serial.println("[HARDWARE] >>> GREEN LED ON: Stove is now ON.");
        digitalWrite(STOVE_ON_LED, HIGH);
        delay(2000);
        Serial.println("[HARDWARE] >>> Warmup complete.");
      }

      if (currentStep >= 0 && currentStep < totalSteps) {
        JsonObject stepObj = steps[currentStep];
        String action = stepObj["instruction"].as<String>();
        int durationSec = stepObj["duration"];
        unsigned long durationMs = durationSec * 1000UL;

        if (action == "add ingredient") {
          // Support cups 1-7
          int cup = stepObj["currentIngredient"]["cup"];
          Serial.printf("[SERVO] Rotating Cup %d to 90 deg for %d seconds...\n", cup, durationSec);
          switch (cup) {
            case 1: servoCup1.write(90); break;
            case 2: servoCup2.write(90); break;
            case 3: servoCup3.write(90); break;
            case 4: servoCup4.write(90); break;
            case 5: servoCup5.write(90); break;
            case 6: servoCup6.write(90); break;
            case 7: servoCup7.write(90); break;
            default: Serial.printf("[WARN] Unknown cup %d\n", cup); break;
          }
          delay(durationMs);
          switch (cup) {
            case 1: servoCup1.write(0); break;
            case 2: servoCup2.write(0); break;
            case 3: servoCup3.write(0); break;
            case 4: servoCup4.write(0); break;
            case 5: servoCup5.write(0); break;
            case 6: servoCup6.write(0); break;
            case 7: servoCup7.write(0); break;
          }
          Serial.printf("[SERVO] Cup %d has RETURNED to 0 degrees.\n", cup);
        }
        else if (action == "idle") {
          Serial.printf("[LED] BLUE LED ON (Idle) for %d seconds...\n", durationSec);
          digitalWrite(IDLE_LED, HIGH);
          delay(durationMs);
          digitalWrite(IDLE_LED, LOW);
          Serial.println("[LED] BLUE LED OFF (Idle finished)");
        }
        else if (action == "stir") {
          // stirrerSpeed from Supabase is 0-10; map to 0-255 PWM
          int stirSpeed = stepObj["stirrerSpeed"] | 5; // default 5 if missing
          int pwmSpeed  = stirSpeed * 25;              // 0-10 → 0-250
          Serial.printf("[MOTOR] Stir step: speed=%d (PWM %d) for %d seconds\n",
                        stirSpeed, pwmSpeed, durationSec);
          runStirrer(pwmSpeed, durationMs);
          Serial.println("[MOTOR] Stir step complete.");
        }

        lastProcessedStep = currentStep;
        lastPollTime = 0; 
      } 
      
      if (currentStep >= totalSteps - 1) {
          Serial.println("[HARDWARE] >>> SESSION COMPLETE!");
          Serial.println("[HARDWARE] >>> GREEN LED OFF | RED LED ON");
          digitalWrite(STOVE_ON_LED, LOW);
          digitalWrite(STOVE_OFF_LED, HIGH);
      }
      Serial.println("-------------------------------------------");
    } else {
      Serial.printf("[INFO] Waiting for Step %d to advance.\n", currentStep + 1);
    }
  } else {
    Serial.println("[INFO] No active sessions (status = active) found.");

    if (digitalRead(STOVE_ON_LED) == HIGH) {
      Serial.println("[SAFETY] Active session disappeared! Turning Green LED OFF and Red LED ON.");
      digitalWrite(STOVE_ON_LED, LOW);
      digitalWrite(STOVE_OFF_LED, HIGH);
      lastSessionId = "";
      lastProcessedStep = -1;
    }
  }
  secureClient.stop();
}