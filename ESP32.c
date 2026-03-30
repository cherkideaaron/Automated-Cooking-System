#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include "time.h"
#include "DHT.h"

// ==========================================
// 1. CREDENTIALS & CONFIG
// ==========================================
const char* WIFI_SSID     = "et3aa$";
const char* WIFI_PASSWORD = "123412341234";
const char* SUPABASE_HOST = "kpgagzfmymrmsdwgolwi.supabase.co";
const String SUPABASE_KEY = "sb_publishable_C7fy-20AW2q3eZF0T3VWHQ_-19qqkCh";

WiFiClientSecure secureClient;

// Timers
unsigned long lastPollTime = 0;
const long POLL_INTERVAL = 2000; 
unsigned long lastTempUpdateTime = 0;
const long TEMP_UPDATE_INTERVAL = 3000; 

// NTP Settings
const char* ntpServer = "pool.ntp.org";

// ==========================================
// 2. HARDWARE PINS
// ==========================================
#define SERVO_CUP1_PIN 25
#define SERVO_CUP2_PIN 26
#define STOVE_ON_LED   18
#define STOVE_OFF_LED  33
#define IDLE_LED       27  
#define STIR_LED       14  

// DHT11 Config
#define DHTPIN 15      
#define DHTTYPE DHT11   
DHT dht(DHTPIN, DHTTYPE); 

Servo servoCup1;
Servo servoCup2;

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

  pinMode(STOVE_ON_LED, OUTPUT);
  pinMode(STOVE_OFF_LED, OUTPUT);
  pinMode(IDLE_LED, OUTPUT);
  pinMode(STIR_LED, OUTPUT);

  dht.begin(); 

  servoCup1.attach(SERVO_CUP1_PIN);
  servoCup2.attach(SERVO_CUP2_PIN);
  servoCup1.write(0); 
  servoCup2.write(0);

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
  // Task 1: Session Polling
  if (millis() - lastPollTime >= POLL_INTERVAL) {
    lastPollTime = millis();
    readActiveSession();
  }

  // Task 2: Supabase Temperature Update
  if (millis() - lastTempUpdateTime >= TEMP_UPDATE_INTERVAL) {
    lastTempUpdateTime = millis();
    updateSupabaseTemperature();
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
      
      digitalWrite(IDLE_LED, LOW);
      digitalWrite(STIR_LED, LOW);
      Serial.println("[DEBUG] Action LEDs (Blue/Yellow) reset to LOW");

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
          int cup = stepObj["currentIngredient"]["cup"];
          Serial.printf("[SERVO] Rotating Cup %d to 90 deg for %d seconds...\n", cup, durationSec);
          if (cup == 1) servoCup1.write(90); else servoCup2.write(90);
          delay(durationMs);
          if (cup == 1) servoCup1.write(0); else servoCup2.write(0);
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
          Serial.printf("[LED] YELLOW LED ON (Stirring) for %d seconds...\n", durationSec);
          digitalWrite(STIR_LED, HIGH);
          delay(durationMs);
          digitalWrite(STIR_LED, LOW);
          Serial.println("[LED] YELLOW LED OFF (Stirring finished)");
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