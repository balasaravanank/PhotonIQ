/*
 * ============================================================
 *  SOLAR POWER OPTIMIZATION SYSTEM
 *  2 LDR + 1 Servo — Simple & Clean
 * ============================================================
 *  WIRING:
 *   Left  LDR → A0  (with 10kΩ voltage divider)
 *   Right LDR → A1  (with 10kΩ voltage divider)
 *   Servo     → Pin 9
 *   Dust LDR  → A5  (optional)
 *   Arduino   → PC via USB
 *
 *  LOGIC: Sun/torch moves → LDR difference changes → 
 *         servo turns panel to face the light
 * ============================================================
 */

#include <Servo.h>

Servo myServo;

// ── Pins ─────────────────────────────────────────────────────
int ldrLeft  = A0;
int ldrRight = A1;
int dustPin  = A5;

// ── Servo position ───────────────────────────────────────────
int pos = 90;  // Start at center

// ── Settings you can tune ─────────────────────────────────────
int threshold = 50;       // Minimum difference to start moving
int dustThreshold = 200;  // Below this = dirty panel

// ── Timing ───────────────────────────────────────────────────
unsigned long lastReport = 0;

void setup() {
  myServo.attach(9);
  myServo.write(pos);
  Serial.begin(9600);
  delay(500);
  Serial.println("{\"status\":\"Solar Tracker Ready\"}");
}

void loop() {

  // ── 1. READ SENSORS ────────────────────────────────────────
  int leftValue  = analogRead(ldrLeft);
  int rightValue = analogRead(ldrRight);

  // ── 2. CALCULATE DIFFERENCE ────────────────────────────────
  int diff = leftValue - rightValue;

  // ── 3. MOVE PANEL TOWARD THE LIGHT ─────────────────────────
  //
  //   Light on LEFT  → leftValue is HIGHER → diff > 0  → turn LEFT  (pos--)
  //   Light on RIGHT → rightValue is HIGHER → diff < 0 → turn RIGHT (pos++)
  //   Light CENTERED → diff is small        → hold still
  //
  //   ☀️ If panel moves WRONG direction, just swap the + and -
  //

  if (diff > threshold) {
    // More light on LEFT side → turn panel LEFT
    pos = pos - 1;
  }
  else if (diff < -threshold) {
    // More light on RIGHT side → turn panel RIGHT
    pos = pos + 1;
  }

  pos = constrain(pos, 0, 180);
  myServo.write(pos);

  // ── 4. REPORT JSON TO DASHBOARD (every 2 seconds) ─────────
  if (millis() - lastReport >= 2000) {
    lastReport = millis();

    int lightPct = map((leftValue + rightValue) / 2, 0, 1023, 0, 100);

    // Simulate power based on light
    float voltage = 0.0;
    float current = 0.0;
    if (lightPct > 10) {
      voltage = 4.0 + (lightPct / 100.0) * 2.0;
      current = (lightPct / 100.0) * 1500.0 + random(-20, 20);
    }
    float power = (voltage * current) / 1000.0;
    if (power < 0) power = 0;

    int dustVal = analogRead(dustPin);
    bool dustAlert = (dustVal < dustThreshold);

    // JSON output for Node.js → Firebase → Dashboard
    Serial.print("{");
    Serial.print("\"voltage\":");    Serial.print(voltage, 2);
    Serial.print(",\"current\":");   Serial.print(current, 2);
    Serial.print(",\"power\":");     Serial.print(power, 3);
    Serial.print(",\"angleH\":");    Serial.print(pos);
    Serial.print(",\"angleV\":");    Serial.print(90);
    Serial.print(",\"light\":");     Serial.print(lightPct);
    Serial.print(",\"dustAlert\":"); Serial.print(dustAlert ? "true" : "false");
    Serial.print(",\"dustRaw\":");   Serial.print(dustVal);
    Serial.print(",\"ldrLeft\":");   Serial.print(leftValue);
    Serial.print(",\"ldrRight\":");  Serial.print(rightValue);
    Serial.print(",\"diff\":");      Serial.print(diff);
    Serial.println("}");
  }

  // ── 5. SMALL DELAY ────────────────────────────────────────
  delay(30);
}
