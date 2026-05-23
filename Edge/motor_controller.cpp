// ============================================================
//  motor_controller.cpp  –  Stirrer Motor Driver (L298N / L293D)
//
//  Rotation Pattern (per stir step):
//    1. Spin CW  at 'speed' for 3 seconds
//    2. Pause     for 1.5 seconds (motor off)
//    3. Spin CCW at 'speed' for 3 seconds
//    4. Pause     for 1.5 seconds (motor off)
//    5. Repeat until total durationMs has elapsed
//
//  Caller API:
//    runStirrer(int speed, unsigned long durationMs)
//      speed       – PWM value 0-255 (maps from stirrerSpeed 0-10
//                    on the frontend via  speed = stirrerSpeed * 25)
//      durationMs  – how long the stirrer should run in total (ms)
//
//  Pin assignment (mirrors ESP32.cpp defines – do NOT redefine here):
//    MOTOR_EN   – PWM enable pin  (analogWrite / ledcWrite)
//    MOTOR_IN1  – direction pin 1
//    MOTOR_IN2  – direction pin 2
// ============================================================

#ifndef MOTOR_CONTROLLER_STANDALONE
  // When compiled inside the main ESP32.cpp project these defines
  // must already be present.  The header guard below lets you also
  // compile this file standalone for unit-testing.
#endif

// ---- Pin definitions (shared with ESP32.cpp) ----------------
// If you compile this file standalone, uncomment the three lines:
// #define MOTOR_EN  32
// #define MOTOR_IN1 33   // <-- pick free pins on your board
// #define MOTOR_IN2 34

// ---- Timing constants ---------------------------------------
#define STIR_CW_MS   3000UL   // 3 s clockwise
#define STIR_PAUSE_MS 1500UL  // 1.5 s pause between directions
#define STIR_CCW_MS  3000UL   // 3 s counter-clockwise

// ---- Internal helpers ---------------------------------------

/** Stop the motor immediately (both direction pins LOW, enable 0). */
static void motorStop() {
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  analogWrite(MOTOR_EN, 0);
}

/** Spin CW at the given PWM speed. */
static void motorCW(int speed) {
  digitalWrite(MOTOR_IN1, HIGH);
  digitalWrite(MOTOR_IN2, LOW);
  analogWrite(MOTOR_EN, speed);
}

/** Spin CCW at the given PWM speed. */
static void motorCCW(int speed) {
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, HIGH);
  analogWrite(MOTOR_EN, speed);
}

// ---- Public API ---------------------------------------------

/**
 * @brief  Initialise the motor driver pins.
 *         Call once from setup() after the pin #defines are set.
 */
void motorSetup() {
  pinMode(MOTOR_EN,  OUTPUT);
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  motorStop();
  Serial.println("[MOTOR] Motor driver initialised.");
}

/**
 * @brief  Run the stirrer with the CW/pause/CCW cycle pattern.
 *
 * @param speed       PWM value 0-255.  Tip: map stirrerSpeed (0-10)
 *                    from Supabase via  speed = stirrerSpeed * 25.
 * @param durationMs  Total time the stirrer should run (milliseconds).
 *
 * @note   This function is BLOCKING for 'durationMs' milliseconds.
 *         The main loop's polling timers are reset by the caller
 *         in ESP32.cpp after this returns.
 */
void runStirrer(int speed, unsigned long durationMs) {
  Serial.printf("[MOTOR] Stirrer START  speed=%d  total=%lu ms\n",
                speed, durationMs);

  if (speed <= 0 || durationMs == 0) {
    Serial.println("[MOTOR] Speed or duration is 0 – skipping stir.");
    return;
  }

  unsigned long elapsed = 0;
  unsigned long cycleStart = millis();

  while (elapsed < durationMs) {
    unsigned long remaining = durationMs - elapsed;

    // --- Phase 1: CW ---
    unsigned long cwTime = min((unsigned long)STIR_CW_MS, remaining);
    Serial.printf("[MOTOR] Phase CW  for %lu ms\n", cwTime);
    motorCW(speed);
    delay(cwTime);
    elapsed += cwTime;
    if (elapsed >= durationMs) break;

    // --- Phase 2: Pause ---
    unsigned long pause1 = min((unsigned long)STIR_PAUSE_MS, durationMs - elapsed);
    Serial.printf("[MOTOR] Phase PAUSE  for %lu ms\n", pause1);
    motorStop();
    delay(pause1);
    elapsed += pause1;
    if (elapsed >= durationMs) break;

    // --- Phase 3: CCW ---
    unsigned long ccwTime = min((unsigned long)STIR_CCW_MS, durationMs - elapsed);
    Serial.printf("[MOTOR] Phase CCW for %lu ms\n", ccwTime);
    motorCCW(speed);
    delay(ccwTime);
    elapsed += ccwTime;
    if (elapsed >= durationMs) break;

    // --- Phase 4: Pause ---
    unsigned long pause2 = min((unsigned long)STIR_PAUSE_MS, durationMs - elapsed);
    Serial.printf("[MOTOR] Phase PAUSE  for %lu ms\n", pause2);
    motorStop();
    delay(pause2);
    elapsed += pause2;
  }

  motorStop();
  Serial.println("[MOTOR] Stirrer DONE.");
}