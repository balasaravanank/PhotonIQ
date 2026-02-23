/*
 * test-simulator.js
 * ============================================================
 *  Simulates Arduino data — use this to test the dashboard
 *  WITHOUT physical hardware connected.
 *
 *  Run: node test-simulator.js
 *
 *  Sends realistic solar data to Firebase every 2 seconds.
 * ============================================================
 */

require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();

let angleH = 90;
let angleV = 75;
let tick = 0;

function simulate() {
  const hour = new Date().getHours();

  // Simulate sun position (power peaks at noon)
  const solarFactor = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));

  // Add realistic noise
  const noise = () => (Math.random() - 0.5) * 0.3;

  // Simulate servo tracking (slowly moves toward "sun")
  angleH = Math.min(180, Math.max(0,  angleH + (Math.random() - 0.45) * 2));
  angleV = Math.min(150, Math.max(30, angleV + (Math.random() - 0.45) * 2));

  const voltage  = parseFloat((5.5 + solarFactor * 0.8 + noise()).toFixed(2));
  const current  = parseFloat((800 + solarFactor * 900 + noise() * 100).toFixed(1));
  const power    = parseFloat(((voltage * current) / 1000 + noise()).toFixed(3));
  const light    = Math.round(solarFactor * 90 + Math.random() * 10);

  // Simulate occasional dust alert
  const dustAlert = tick % 30 === 0; // Dust alert every 60 seconds
  const dustRaw   = dustAlert ? 150 : 700 + Math.round(Math.random() * 100);

  const data = {
    voltage:   Math.max(0, voltage),
    current:   Math.max(0, current),
    power:     Math.max(0, power),
    angleH:    Math.round(angleH),
    angleV:    Math.round(angleV),
    light:     Math.max(0, light),
    dustAlert,
    dustRaw,
    timestamp: Date.now()
  };

  // Push to Firebase
  db.ref('solarData/live').set(data);
  db.ref('solarData/history').push(data);

  console.log(`⚡ [SIM] Power: ${data.power}W | V: ${data.voltage}V | I: ${data.current}mA | Dust: ${dustAlert}`);
  tick++;
}

console.log('🤖 Simulator started — sending fake solar data to Firebase every 2s');
console.log('   Open the dashboard at http://localhost:3000 to see it live!\n');

// Run immediately then every 2 seconds
simulate();
setInterval(simulate, 2000);
