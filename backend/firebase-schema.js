// ============================================================
//  FIREBASE REALTIME DATABASE SCHEMA
//  Database URL: https://your-project-id-default-rtdb.firebaseio.com
// ============================================================

// solarData/live  (updated every 2 seconds from Arduino)
{
  "voltage":    5.82,        // Bus voltage in Volts
  "current":    1450.5,      // Current in milliAmps
  "power":      8.421,       // Power in Watts
  "angleH":     112,         // Horizontal servo angle (0-180°)
  "angleV":     78,          // Vertical servo angle (30-150°)
  "light":      73,          // Light intensity % (0-100)
  "dustAlert":  false,       // true = panel is dirty
  "dustRaw":    680,         // Raw LDR value for dust sensor
  "timestamp":  1708612345000  // Unix timestamp ms
}

// solarData/history  (every reading is pushed here)
{
  "-NxABC123": {             // Firebase auto-generated key
    "voltage":   5.82,
    "current":   1450.5,
    "power":     8.421,
    "angleH":    112,
    "angleV":    78,
    "light":     73,
    "dustAlert": false,
    "dustRaw":   680,
    "timestamp": 1708612345000
  }
  // ... more entries
}

// solarData/weather  (updated every 10 minutes)
{
  "temp":        32.4,       // Temperature in Celsius
  "humidity":    65,         // Humidity %
  "clouds":      20,         // Cloud cover %
  "description": "few clouds",
  "windSpeed":   3.2,        // m/s
  "timestamp":   1708612345000
}

// solarData/prediction  (updated every 30 minutes)
{
  "predicted_power": 10.2,   // Next-hour prediction in Watts
  "confidence":      85,     // Confidence %
  "peak_hour":       12,     // Best hour of the day
  "forecast": [
    { "hour": 13, "label": "13:00", "predicted": 11.5 },
    { "hour": 14, "label": "14:00", "predicted": 12.1 },
    { "hour": 15, "label": "15:00", "predicted": 10.8 },
    { "hour": 16, "label": "16:00", "predicted": 8.2 },
    { "hour": 17, "label": "17:00", "predicted": 5.1 },
    { "hour": 18, "label": "18:00", "predicted": 1.3 }
  ],
  "timestamp": 1708612345000
}
