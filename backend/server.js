/*
 * ============================================================
 *  SOLAR OPTIMIZER - Node.js Backend Server
 * ============================================================
 *  CONNECTION: Arduino → PC via USB cable ONLY (no WiFi needed!)
 *
 *  WHAT THIS DOES:
 *   1. Reads JSON from Arduino over USB Serial (COM port)
 *   2. Pushes live data to Firebase Realtime Database
 *   3. Exposes REST API for the React frontend
 *   4. Runs power prediction every 30 minutes
 *   5. Fetches weather data from OpenWeather API
 *
 *  SETUP:
 *   1. Plug Arduino into PC via USB cable
 *   2. Find your port: Windows=COM3, Linux=/dev/ttyUSB0, Mac=/dev/cu.usbmodem...
 *   3. Copy .env.example → .env and set SERIAL_PORT
 *   4. npm install
 *   5. node server.js
 * ============================================================
 */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const admin      = require('firebase-admin');
const axios      = require('axios');
const cron       = require('node-cron');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Firebase Init ─────────────────────────────────────────────
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();

// ── In-memory cache of latest reading ─────────────────────────
let latestReading = {
  voltage: 0, current: 0, power: 0,
  angleH: 90, angleV: 90,
  light: 0, dustAlert: false, dustRaw: 0,
  timestamp: Date.now()
};

let weatherCache = {};
let predictionCache = { predicted_power: 0, confidence: 0, forecast: [] };

// ─────────────────────────────────────────────────────────────
// USB SERIAL — Read from Arduino via USB cable (no WiFi/ESP32 needed)
// ─────────────────────────────────────────────────────────────
function initSerial() {
  // HOW TO FIND PORT: Windows=Device Manager>Ports, Linux=ls /dev/tty*, Mac=ls /dev/cu.*
  const SERIAL_PORT = process.env.SERIAL_PORT || 'COM3';
  const BAUD_RATE   = parseInt(process.env.BAUD_RATE) || 9600;

  console.log(`USB Serial: Arduino on ${SERIAL_PORT} at ${BAUD_RATE} baud`);
  console.log('  IMPORTANT: Close Arduino Serial Monitor first!');

  const port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.on('open', () => console.log('Arduino USB connected! Receiving JSON data...'));
  port.on('error', (err) => {
    console.error('Serial error:', err.message);
    console.error('Check: Is Arduino plugged in? Correct COM port in .env? Serial Monitor closed?');
  });

  parser.on('data', (line) => {
    line = line.trim();
    if (!line.startsWith('{')) return; // Ignore non-JSON lines

    try {
      const data = JSON.parse(line);

      // Skip error messages from Arduino
      if (data.error || data.status) {
        console.log('Arduino:', data.error || data.status);
        return;
      }

      // Add timestamp
      data.timestamp = Date.now();

      // Update in-memory cache
      latestReading = data;

      // Push to Firebase
      db.ref('solarData/live').set(data);

      // Store in history (every reading)
      db.ref('solarData/history').push(data);

      console.log(`⚡ Power: ${data.power}W | Angle: ${data.angleH}°/${data.angleV}° | Dust: ${data.dustAlert}`);

    } catch (e) {
      // Ignore malformed lines
    }
  });
}

// ─────────────────────────────────────────────────────────────
// WEATHER API
// ─────────────────────────────────────────────────────────────
async function fetchWeather() {
  try {
    const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: process.env.WEATHER_CITY || 'Chennai,IN',
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    weatherCache = {
      temp: data.main.temp,
      humidity: data.main.humidity,
      clouds: data.clouds.all,         // 0-100%
      description: data.weather[0].description,
      windSpeed: data.wind.speed,
      timestamp: Date.now()
    };

    db.ref('solarData/weather').set(weatherCache);
    console.log(`🌤 Weather updated: ${weatherCache.temp}°C, ${weatherCache.clouds}% clouds`);

  } catch (e) {
    console.error('Weather fetch failed:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// SIMPLE ML PREDICTION (Rule-based + formula)
// (Replace with Python ML model call if available)
// ─────────────────────────────────────────────────────────────
function runPrediction() {
  const hour = new Date().getHours();

  // Solar irradiance curve (simplified bell curve peaking at noon)
  const hourlyFactor = [
    0, 0, 0, 0, 0, 0.05,     // 0-5 AM
    0.1, 0.2, 0.35, 0.55, 0.75, 0.9,   // 6-11 AM
    1.0, 0.95, 0.85, 0.7, 0.5, 0.3,    // 12-5 PM
    0.1, 0.05, 0, 0, 0, 0              // 6-11 PM
  ];

  const cloudFactor  = 1 - ((weatherCache.clouds || 0) / 100) * 0.7;
  const basePower    = latestReading.power || 0;
  const lightPct     = (latestReading.light || 0) / 100;

  // Generate 6-hour forecast
  const forecast = [];
  for (let i = 1; i <= 6; i++) {
    const futureHour = (hour + i) % 24;
    const predicted  = basePower * hourlyFactor[futureHour] * cloudFactor * 1.1; // 10% boost from tracking
    forecast.push({
      hour: futureHour,
      label: `${futureHour}:00`,
      predicted: Math.max(0, parseFloat(predicted.toFixed(3)))
    });
  }

  // Next hour prediction
  const nextHour = (hour + 1) % 24;
  const nextPower = basePower * hourlyFactor[nextHour] * cloudFactor;

  predictionCache = {
    predicted_power: Math.max(0, parseFloat(nextPower.toFixed(3))),
    confidence: Math.round(cloudFactor * 90),
    peak_hour: 12,
    forecast,
    timestamp: Date.now()
  };

  db.ref('solarData/prediction').set(predictionCache);
  console.log(`🤖 Prediction updated: Next hour → ${predictionCache.predicted_power}W`);
}

// ─────────────────────────────────────────────────────────────
// REST API ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/live — latest sensor reading
app.get('/api/live', (req, res) => {
  res.json({ success: true, data: latestReading });
});

// GET /api/weather — latest weather
app.get('/api/weather', (req, res) => {
  res.json({ success: true, data: weatherCache });
});

// GET /api/prediction — ML forecast
app.get('/api/prediction', (req, res) => {
  res.json({ success: true, data: predictionCache });
});

// GET /api/history?limit=50 — historical readings
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const snapshot = await db.ref('solarData/history')
      .orderByChild('timestamp')
      .limitToLast(limit)
      .once('value');

    const raw = snapshot.val() || {};
    const history = Object.values(raw).sort((a, b) => a.timestamp - b.timestamp);

    res.json({ success: true, data: history });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/dashboard — all data in one call
app.get('/api/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      live: latestReading,
      weather: weatherCache,
      prediction: predictionCache
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─────────────────────────────────────────────────────────────
// SCHEDULED TASKS
// ─────────────────────────────────────────────────────────────

// Fetch weather every 10 minutes
cron.schedule('*/10 * * * *', fetchWeather);

// Run prediction every 30 minutes
cron.schedule('*/30 * * * *', runPrediction);

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Solar Optimizer Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET /api/live        → Live sensor data`);
  console.log(`   GET /api/weather     → Weather data`);
  console.log(`   GET /api/prediction  → AI forecast`);
  console.log(`   GET /api/history     → Historical data`);
  console.log(`   GET /api/dashboard   → All data combined\n`);

  // Initial fetch
  fetchWeather();
  runPrediction();

  // Init serial (comment out if testing without Arduino)
  initSerial();
});
