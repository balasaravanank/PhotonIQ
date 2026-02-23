# PhotonIQ — Smart Solar Power Optimization System

> An IoT-powered solar tracking system that maximizes energy output using real-time light sensing, servo-driven panel alignment, and a live analytics dashboard.

---

## System Architecture

```
Arduino (LDR Sensors + Servo) → USB Serial → Node.js Backend → Firebase → React Dashboard
```

---

## Project Structure

```
PhotonIQ/
├── arduino/
│   └── solar_tracker/
│       └── solar_tracker.ino       # Arduino firmware (LDR + Servo control)
├── backend/
│   ├── server.js                   # Express server (serial reader + API)
│   ├── test-simulator.js           # Simulated data for demo without hardware
│   ├── firebase-service-account.json
│   ├── firebase-rules.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx                 # React dashboard (Recharts + Firebase)
    │   └── App.css                 # UI styles
    ├── index.html
    └── vite.config.js
```

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Hardware    | Arduino Uno, LDR Sensors, Servo Motor            |
| Backend     | Node.js, Express, SerialPort, Firebase Admin SDK  |
| Frontend    | React 18, Vite, Recharts, Lucide Icons            |
| Database    | Firebase Realtime Database                        |
| API         | OpenWeatherMap (weather integration)              |

---

## Hardware Wiring

```
LDR Sensors (with 10kΩ voltage dividers)
  Left  LDR  →  A0
  Right LDR  →  A1
  Dust  LDR  →  A5  (optional — panel cleanliness detection)

Servo Motor
  Signal     →  Pin 9
  VCC        →  5V
  GND        →  GND

Arduino     →  PC via USB cable
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Arduino IDE](https://www.arduino.cc/en/software)
- Firebase project with Realtime Database enabled
- OpenWeatherMap API key (free tier)

### 1. Upload Arduino Firmware
```bash
# Open arduino/solar_tracker/solar_tracker.ino in Arduino IDE
# Select Board → Arduino Uno, Port → your COM port
# Upload → verify JSON output in Serial Monitor (9600 baud)
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env       # configure SERIAL_PORT and API keys
npm start                  # runs on http://localhost:3001
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm start                  # runs on http://localhost:3000
```

### 4. Demo Without Hardware
```bash
cd backend
node test-simulator.js     # sends simulated sensor data to Firebase
```

---

## 📡 API Endpoints

| Endpoint              | Description                  |
|-----------------------|------------------------------|
| `GET /api/live`       | Latest sensor reading        |
| `GET /api/weather`    | Current weather data         |
| `GET /api/prediction` | AI power forecast            |
| `GET /api/history`    | Historical readings          |
| `GET /api/dashboard`  | All data combined            |
| `GET /api/health`     | Server health check          |

---

## 🧠 How It Works

1. **Light Sensing** — Two LDRs detect light intensity on left and right sides of the panel
2. **Auto-Tracking** — Servo motor rotates the panel toward the stronger light source
3. **Data Pipeline** — Arduino sends JSON via USB → Node.js reads serial → pushes to Firebase
4. **Live Dashboard** — React frontend subscribes to Firebase for real-time chart updates
5. **Dust Detection** — Optional LDR on the panel surface alerts when cleaning is needed

---

