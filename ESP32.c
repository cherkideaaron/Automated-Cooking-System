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
  Serial.printf("Reading: %.1f C. Updating Supabase device_state...\n", currentTemp);

  if (!secureClient.connect(SUPABASE_HOST, 443)) {
    Serial.println("Temp Update: Connection to Supabase failed.");
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
  Serial.println("device_state table updated.");
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
      
      if (currentStep >= totalSteps - 1) {
          Serial.println("SESSION COMPLETE!");
          Serial.println("GREEN LED OFF | RED LED ON");
          digitalWrite(STOVE_ON_LED, LOW);
          digitalWrite(STOVE_OFF_LED, HIGH);
      }
      Serial.println("-------------------------------------------");
    } else {
      Serial.printf("Waiting for Step %d to advance.\n", currentStep + 1);
    }
  } else {
    Serial.println("No active sessions (status = active) found.");

    if (digitalRead(STOVE_ON_LED) == HIGH) {
      Serial.println("Turning Green LED OFF and Red LED ON.");
      digitalWrite(STOVE_ON_LED, LOW);
      digitalWrite(STOVE_OFF_LED, HIGH);
      lastSessionId = "";
      lastProcessedStep = -1;
    }
  }
  secureClient.stop();
}