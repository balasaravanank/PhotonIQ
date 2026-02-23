/*
 * ============================================================
 *  SOLAR POWER OPTIMIZATION SYSTEM
 *  Arduino / ESP32 Main Code
 * ============================================================
 *  CONNECTION: Arduino → PC via USB cable ONLY
 *  No WiFi, no ESP32, no extra modules needed!
 *  Data flows: Arduino → USB Serial → Node.js → Firebase → React
 *
 *  WIRING GUIDE:
 *  ┌─────────────────────────────────────────────┐
 *  │  LDR Sensors (with 10kΩ voltage divider)    │
 *  │   Top-Left  LDR  → A0                       │
 *  │   Top-Right LDR  → A1                       │
 *  │   Bot-Left  LDR  → A2                       │
 *  │   Bot-Right LDR  → A3                       │
 *  │                                             │
 *  │  Servo Motors                               │
 *  │   Horizontal Servo → Pin 9                  │
 *  │   Vertical   Servo → Pin 10                 │
 *  │                                             │
 *  │  Dust/Dirt LDR Sensor                       │
 *  │   Signal → A5 (or change DUST_PIN below)    │
 *  │                                             │
 *  │  Arduino → PC via USB cable (that's it!)    │
 *  └─────────────────────────────────────────────┘
 *
 *  LIBRARIES NEEDED (install via Arduino Library Manager):
 *   - Servo            (built-in)
 *
 *  NOTE: INA219 has been removed per user request. 
 *  Power/Voltage/Current will be mathematically simulated 
 *  based on the light intensity reading!
 * ============================================================
 */

#include <Servo.h>

// ── Pin Definitions ──────────────────────────────────────────
#define LDR_TOP_LEFT   A0
#define LDR_TOP_RIGHT  A1
#define LDR_BOT_LEFT   A2
#define LDR_BOT_RIGHT  A3
#define DUST_PIN       A5   // Separate LDR on panel surface

#define SERVO_H_PIN    9    // Horizontal axis servo
#define SERVO_V_PIN    10   // Vertical axis servo

// ── Tracking Settings ─────────────────────────────────────────
#define TOLERANCE      30   // Dead-band: ignore error smaller than this
#define SERVO_STEP     1    // Degrees to move per adjustment
#define SERVO_H_MIN    0
#define SERVO_H_MAX    180
#define SERVO_V_MIN    60   // Conservative — panel stays safely upright
#define SERVO_V_MAX    120

// ── Timing ───────────────────────────────────────────────────
#define TRACK_INTERVAL    500    // ms between tracking checks
#define REPORT_INTERVAL   2000   // ms between serial data reports
#define DUST_THRESHOLD    200    // LDR value below this = dirty panel

// ── Objects ───────────────────────────────────────────────────
Servo servoH;
Servo servoV;

// ── State ─────────────────────────────────────────────────────
int angleH = 90;   // Current horizontal angle
int angleV = 90;   // Current vertical angle

unsigned long lastTrackTime  = 0;
unsigned long lastReportTime = 0;

// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  while (!Serial) delay(10);

  // Attach servos
  servoH.attach(SERVO_H_PIN);
  servoV.attach(SERVO_V_PIN);

  // Start at center
  servoH.write(angleH);
  servoV.write(angleV);

  delay(1000);
  Serial.println("{\"status\":\"Solar Tracker Ready. INA219 simulated mode.\"}");
}

// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Track the sun
  if (now - lastTrackTime >= TRACK_INTERVAL) {
    lastTrackTime = now;
    trackSun();
  }

  // 2. Report data over serial
  if (now - lastReportTime >= REPORT_INTERVAL) {
    lastReportTime = now;
    reportData();
  }
}

// ─────────────────────────────────────────────────────────────
// SOLAR TRACKING LOGIC
// ─────────────────────────────────────────────────────────────
void trackSun() {
  int tl = analogRead(LDR_TOP_LEFT);
  int tr = analogRead(LDR_TOP_RIGHT);
  int bl = analogRead(LDR_BOT_LEFT);
  int br = analogRead(LDR_BOT_RIGHT);

  // Average top vs bottom → vertical error
  int top = (tl + tr) / 2;
  int bot = (bl + br) / 2;
  int vertError = top - bot;

  // Average left vs right → horizontal error
  int left  = (tl + bl) / 2;
  int right = (tr + br) / 2;
  int horizError = left - right;

  // Adjust vertical servo
  if (abs(vertError) > TOLERANCE) {
    if (vertError > 0) angleV = constrain(angleV + SERVO_STEP, SERVO_V_MIN, SERVO_V_MAX);
    else               angleV = constrain(angleV - SERVO_STEP, SERVO_V_MIN, SERVO_V_MAX);
    servoV.write(angleV);
  }

  // Adjust horizontal servo
  if (abs(horizError) > TOLERANCE) {
    if (horizError > 0) angleH = constrain(angleH + SERVO_STEP, SERVO_H_MIN, SERVO_H_MAX);
    else                angleH = constrain(angleH - SERVO_STEP, SERVO_H_MIN, SERVO_H_MAX);
    servoH.write(angleH);
  }
}

// ─────────────────────────────────────────────────────────────
// REPORT DATA AS JSON OVER SERIAL
// ─────────────────────────────────────────────────────────────
void reportData() {
  // Read LDRs for light intensity (average of 4)
  int ldrAvg = (analogRead(LDR_TOP_LEFT) + analogRead(LDR_TOP_RIGHT) +
                analogRead(LDR_BOT_LEFT) + analogRead(LDR_BOT_RIGHT)) / 4;
  int lightPct = map(ldrAvg, 0, 1023, 0, 100);

  // ── SIMULATE INA219 DATA ──
  // Based on light percentage, we simulate realistic Voltage, Current, and Power
  float busVoltage = 0.0;
  float current_mA = 0.0;
  
  if (lightPct > 10) {
    // Simulate a 6V panel that outputs up to 1500mA
    busVoltage = 4.0 + (lightPct / 100.0) * 2.0; // Between 4.0V and 6.0V
    current_mA = (lightPct / 100.0) * 1500.0 + random(-20, 20); // Scale up to 1500mA with noise
  }
  
  // Power = V * I
  float power_W = (busVoltage * current_mA) / 1000.0;

  // Read dust sensor
  int dustVal = analogRead(DUST_PIN);
  bool dustAlert = (dustVal < DUST_THRESHOLD);

  // Clamp negatives (sensor noise)
  if (current_mA < 0) current_mA = 0;
  if (power_W    < 0) power_W    = 0;
  if (busVoltage < 0) busVoltage = 0;

  // Send JSON over Serial
  Serial.print("{");
  Serial.print("\"voltage\":");    Serial.print(busVoltage, 2);
  Serial.print(",\"current\":");   Serial.print(current_mA, 2);
  Serial.print(",\"power\":");     Serial.print(power_W, 3);
  Serial.print(",\"angleH\":");    Serial.print(angleH);
  Serial.print(",\"angleV\":");    Serial.print(angleV);
  Serial.print(",\"light\":");     Serial.print(lightPct);
  Serial.print(",\"dustAlert\":"); Serial.print(dustAlert ? "true" : "false");
  Serial.print(",\"dustRaw\":");   Serial.print(dustVal);
  Serial.println("}");
}
