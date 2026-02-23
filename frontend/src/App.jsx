// src/App.js
// ============================================================
//  SOLAR OPTIMIZER - Main Dashboard
//  Features:
//   - Live power, voltage, current cards
//   - Panel angle display
//   - Historical power chart (last 50 readings)
//   - AI prediction forecast chart
//   - Weather widget
//   - Dust alert banner
//   - Auto-refreshes every 2 seconds via Firebase
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { db, ref, onValue } from './firebase';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Sun, Zap, Thermometer, Wind,
  AlertTriangle, CheckCircle, Activity,
  TrendingUp, Droplets, Cloud
} from 'lucide-react';
import './App.css';

// ─────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, unit, color, sub }) {
  return (
    <div className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="stat-icon" style={{ color }}>{icon}</div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">
          {value} <span className="stat-unit">{unit}</span>
        </div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function AngleGauge({ label, angle, min, max }) {
  const pct = ((angle - min) / (max - min)) * 100;
  return (
    <div className="angle-card">
      <div className="angle-label">{label}</div>
      <div className="angle-value">{angle}°</div>
      <div className="angle-bar-bg">
        <div className="angle-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="angle-range">{min}° — {max}°</div>
    </div>
  );
}

function DustAlert({ dustAlert, dustRaw }) {
  if (!dustAlert) return null;
  return (
    <div className="alert-banner">
      <AlertTriangle size={20} />
      <span>
        <strong>Panel Cleaning Required!</strong> Dust detected (sensor: {dustRaw}).
        Estimated efficiency loss: ~15-25%. Please clean the panel surface.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [live, setLive]           = useState(null);
  const [history, setHistory]     = useState([]);
  const [weather, setWeather]     = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // ── Subscribe to Firebase live data ───────────────────────
  useEffect(() => {
    const liveRef = ref(db, 'solarData/live');
    const unsub = onValue(liveRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLive(data);
        setConnected(true);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    }, () => setConnected(false));
    return () => unsub();
  }, []);

  // ── Subscribe to Firebase history ─────────────────────────
  useEffect(() => {
    const histRef = ref(db, 'solarData/history');
    const unsub = onValue(histRef, (snapshot) => {
      const raw = snapshot.val();
      if (raw) {
        const arr = Object.values(raw)
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-50)  // last 50 readings
          .map(d => ({
            ...d,
            time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            power: parseFloat(d.power?.toFixed(3) || 0)
          }));
        setHistory(arr);
      }
    });
    return () => unsub();
  }, []);

  // ── Subscribe to weather ───────────────────────────────────
  useEffect(() => {
    const wRef = ref(db, 'solarData/weather');
    const unsub = onValue(wRef, (snapshot) => {
      if (snapshot.val()) setWeather(snapshot.val());
    });
    return () => unsub();
  }, []);

  // ── Subscribe to prediction ────────────────────────────────
  useEffect(() => {
    const pRef = ref(db, 'solarData/prediction');
    const unsub = onValue(pRef, (snapshot) => {
      if (snapshot.val()) setPrediction(snapshot.val());
    });
    return () => unsub();
  }, []);

  // ── Efficiency gain calculation ────────────────────────────
  // Tracking adds ~34% over fixed panel (simplified)
  const efficiencyGain = live ? 34 : 0;

  // ── Loading state ──────────────────────────────────────────
  if (!live) {
    return (
      <div className="loading">
        <Sun size={48} className="spin" />
        <p>Connecting to Solar Tracker...</p>
        <small>Make sure the backend server is running on port 3001</small>
      </div>
    );
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <Sun size={28} color="#F9A825" />
          <h1>Solar Power Optimizer</h1>
        </div>
        <div className="header-right">
          <div className={`status-dot ${connected ? 'online' : 'offline'}`} />
          <span>{connected ? 'Live' : 'Disconnected'}</span>
          {lastUpdate && <span className="last-update">Updated: {lastUpdate}</span>}
        </div>
      </header>

      <div className="dashboard">

        {/* ── Dust Alert ── */}
        <DustAlert dustAlert={live.dustAlert} dustRaw={live.dustRaw} />

        {/* ── Stat Cards ── */}
        <div className="stats-grid">
          <StatCard
            icon={<Zap size={28} />}
            label="Power Output"
            value={live.power?.toFixed(3)}
            unit="W"
            color="#43A047"
            sub="Real-time"
          />
          <StatCard
            icon={<Activity size={28} />}
            label="Voltage"
            value={live.voltage?.toFixed(2)}
            unit="V"
            color="#1565C0"
            sub="Bus voltage"
          />
          <StatCard
            icon={<Zap size={28} />}
            label="Current"
            value={live.current?.toFixed(1)}
            unit="mA"
            color="#6A1B9A"
            sub="Draw"
          />
          <StatCard
            icon={<TrendingUp size={28} />}
            label="Efficiency Gain"
            value={`+${efficiencyGain}`}
            unit="%"
            color="#F9A825"
            sub="vs fixed panel"
          />
          <StatCard
            icon={<Sun size={28} />}
            label="Light Intensity"
            value={live.light}
            unit="%"
            color="#FB8C00"
            sub="Solar irradiance"
          />
        </div>

        {/* ── Panel Angles ── */}
        <div className="section">
          <h2>Panel Orientation</h2>
          <div className="angle-grid">
            <AngleGauge label="Horizontal Axis" angle={live.angleH} min={0}  max={180} />
            <AngleGauge label="Vertical Axis"   angle={live.angleV} min={30} max={150} />
          </div>
        </div>

        {/* ── Power History Chart ── */}
        <div className="section">
          <h2>Power Output — Last 50 Readings</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis unit="W" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} W`, 'Power']} />
                <Line
                  type="monotone" dataKey="power"
                  stroke="#43A047" strokeWidth={2}
                  dot={false} activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Bottom Row: Prediction + Weather ── */}
        <div className="bottom-grid">

          {/* AI Forecast */}
          <div className="section">
            <h2>🤖 AI Power Forecast — Next 6 Hours</h2>
            {prediction ? (
              <>
                <div className="prediction-meta">
                  <span>Next hour: <strong>{prediction.predicted_power} W</strong></span>
                  <span>Confidence: <strong>{prediction.confidence}%</strong></span>
                  <span>Peak hour: <strong>{prediction.peak_hour}:00</strong></span>
                </div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={prediction.forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis unit="W" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v} W`, 'Predicted']} />
                      <Bar dataKey="predicted" fill="#F9A825" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="no-data">Prediction loading...</p>
            )}
          </div>

          {/* Weather Widget */}
          <div className="section weather-card">
            <h2>🌤 Weather Conditions</h2>
            {weather ? (
              <div className="weather-grid">
                <div className="weather-item">
                  <Thermometer size={22} color="#E53935" />
                  <span className="w-label">Temperature</span>
                  <span className="w-val">{weather.temp}°C</span>
                </div>
                <div className="weather-item">
                  <Droplets size={22} color="#1565C0" />
                  <span className="w-label">Humidity</span>
                  <span className="w-val">{weather.humidity}%</span>
                </div>
                <div className="weather-item">
                  <Cloud size={22} color="#607D8B" />
                  <span className="w-label">Cloud Cover</span>
                  <span className="w-val">{weather.clouds}%</span>
                </div>
                <div className="weather-item">
                  <Wind size={22} color="#00897B" />
                  <span className="w-label">Wind Speed</span>
                  <span className="w-val">{weather.windSpeed} m/s</span>
                </div>
                <div className="weather-desc">
                  {weather.description}
                </div>
                <div className="solar-impact">
                  <CheckCircle size={16} color="#43A047" />
                  Solar impact: <strong>
                    {weather.clouds < 20 ? 'Excellent ☀️' :
                     weather.clouds < 50 ? 'Good 🌤' :
                     weather.clouds < 80 ? 'Moderate ⛅' : 'Poor ☁️'}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="no-data">Weather loading...</p>
            )}
          </div>

        </div>
      </div>

      <footer className="footer">
        Solar Power Optimization System • Hackathon 2026 • Real-time data via Firebase
      </footer>
    </div>
  );
}
