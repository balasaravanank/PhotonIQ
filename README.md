# Solar Power Optimization System
### Complete Build Guide — Arduino via USB Cable

---

## How Data Flows (USB Only — No WiFi Needed!)

```
Arduino (sensors) --> USB Cable --> Node.js Server --> Firebase --> React Dashboard
```

That is the entire connection. Just one USB cable from Arduino to your PC.

---

## Project Structure

```
solar-optimizer/
├── arduino/
│   └── solar_tracker.ino        <- Upload to Arduino
├── backend/
│   ├── server.js                <- Node.js server (reads USB serial)
│   ├── package.json
│   ├── .env.example             <- Copy to .env and set SERIAL_PORT
│   ├── firebase-service-account.json  <- Download from Firebase (step 3)
│   ├── firebase-rules.json      <- Paste into Firebase console
│   ├── firebase-schema.js       <- Reference for data structure
│   └── test-simulator.js        <- Test dashboard without Arduino
└── frontend/
    ├── package.json
    └── src/
        ├── App.js               <- React dashboard
        ├── App.css              <- Styles
        ├── index.js             <- Entry point
        └── firebase.js          <- Fill in Firebase config here
```

---

## Hardware Wiring

```
LDR SENSORS (each needs a 10kOhm resistor to GND — voltage divider)
  Top-Left  LDR Signal  -->  Arduino A0
  Top-Right LDR Signal  -->  Arduino A1
  Bot-Left  LDR Signal  -->  Arduino A2
  Bot-Right LDR Signal  -->  Arduino A3

SERVO MOTORS
  Horizontal Servo  Signal  -->  Arduino Pin 9
  Vertical   Servo  Signal  -->  Arduino Pin 10
  Both servos: VCC --> 5V, GND --> GND

INA219 POWER SENSOR (I2C)
  SDA  -->  Arduino A4
  SCL  -->  Arduino A5
  VCC  -->  3.3V or 5V
  GND  -->  GND
  Connect solar panel (+) to INA219 Vin+
  Connect load (-) from INA219 Vin-

DUST SENSOR (LDR on panel surface with 10kOhm to GND)
  Signal  -->  Arduino A5

COMPUTER CONNECTION
  Arduino USB port  -->  PC USB port  (that is it!)
```

---

## Step-by-Step Setup

### STEP 1 — Install Arduino Library
- Open Arduino IDE
- Go to Tools → Manage Libraries
- Search "Adafruit INA219" → Install

### STEP 2 — Upload Arduino Code
1. Open `arduino/solar_tracker.ino`
2. Tools → Board → Arduino Uno
3. Tools → Port → select your Arduino port
4. Click Upload
5. Open Serial Monitor (set to 9600 baud)
6. You should see JSON like: `{"voltage":5.82,"current":1450,"power":8.42,...}`
7. CLOSE Serial Monitor after confirming it works (Node.js needs the port!)

### STEP 3 — Set Up Firebase
1. Go to https://console.firebase.google.com
2. Click "Add Project" → name it `solar-optimizer` → Create
3. Left menu → "Realtime Database" → Create Database → Start in test mode
4. Copy your database URL: `https://solar-optimizer-xxxx-default-rtdb.firebaseio.com`
5. Project Settings (gear icon) → Service Accounts → "Generate New Private Key"
6. Save the downloaded JSON file as `backend/firebase-service-account.json`
7. Realtime Database → Rules tab → paste contents of `firebase-rules.json` → Publish

### STEP 4 — Get Free OpenWeather API Key
1. Go to https://openweathermap.org → Sign Up (free)
2. Go to API Keys tab → copy your key
3. Note: New keys take up to 10 minutes to activate

### STEP 5 — Configure Backend
```bash
cd backend
copy .env.example .env        (Windows)
cp .env.example .env          (Linux/Mac)
```

Edit `.env` — the most important setting is SERIAL_PORT:

| OS | How to find port | Example value |
|----|-----------------|---------------|
| Windows | Device Manager → Ports → "Arduino Uno (COMx)" | COM3 |
| Linux | Run: ls /dev/tty* | /dev/ttyUSB0 |
| Mac | Run: ls /dev/cu.* | /dev/cu.usbmodem14101 |

### STEP 6 — Start Backend
```bash
cd backend
npm install
node server.js
```

You should see:
```
Solar Optimizer Backend running on http://localhost:3001
Arduino USB connected! Receiving JSON data...
Power: 8.421W | Angle: 112/78 | Dust: false
```

If you see a serial error:
- Is the Arduino plugged in via USB?
- Is the SERIAL_PORT correct in .env?
- Is Arduino Serial Monitor closed? (it blocks the port)

### STEP 7 — Configure Frontend Firebase
Open `frontend/src/firebase.js`
1. Firebase Console → Project Settings → Your Apps → Add App (web icon)
2. Register the app → copy the firebaseConfig object
3. Paste the values into firebase.js

### STEP 8 — Start Dashboard
```bash
cd frontend
npm install
npm start
```

Browser opens at http://localhost:3000 — live dashboard!

---

## Testing Without Arduino Hardware

Run the simulator — it sends fake data to Firebase:
```bash
cd backend
node test-simulator.js
```

Then start the frontend normally. The dashboard will show simulated live data.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Serial port not found" | Check COM port in Device Manager, update .env |
| "INA219 not found" | Check SDA/SCL wiring and VCC connection |
| Serial Monitor shows garbage | Set baud rate to 9600 in Serial Monitor |
| Dashboard shows "Connecting..." | Make sure backend is running on port 3001 |
| Firebase permission denied | Re-paste firebase-rules.json in Firebase console |
| Weather not loading | Check API key, wait 10 min for free tier activation |
| Servo not moving | Check LDR connections and PWM pins 9 and 10 |
| Power reads negative | Swap INA219 Vin+ and Vin- connections |

---

## API Endpoints (backend at http://localhost:3001)

| Endpoint | Description |
|----------|-------------|
| GET /api/live | Latest sensor reading from Arduino |
| GET /api/weather | Current weather data |
| GET /api/prediction | AI power forecast |
| GET /api/history?limit=50 | Historical readings |
| GET /api/dashboard | All data combined |
| GET /api/health | Server health check |

---

## Hackathon Demo Tips

1. Live demo: Shine torch at panel → servo moves → dashboard updates in real time
2. Show efficiency gain % — explain tracking gives 30-40% more power
3. Cover dust sensor briefly → alert banner appears on dashboard
4. Show AI forecast chart and weather integration
5. Open dashboard on phone — fully responsive

---

Solar Power Optimization System | Hackathon 2026
