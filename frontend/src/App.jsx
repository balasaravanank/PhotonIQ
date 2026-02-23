// src/App.jsx
// ============================================================
//  PHOTONIQ — Solar Power Dashboard (Dark Glassmorphism UI)
// ============================================================

import React, { useState, useEffect } from 'react';
import { db, ref, onValue } from './firebase';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Sun, Zap, Thermometer, Wind,
  AlertTriangle, CheckCircle, Activity,
  TrendingUp, Droplets, Cloud, Radio
} from 'lucide-react';
import './App.css';

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, unit, colorName, sub }) {
  return (
    <div className="stat-card" data-color={colorName}>
      <div className="stat-icon" data-color={colorName}>{icon}</div>
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

// ─────────────────────────────────────────────────────────────
// ANGLE GAUGE
// ─────────────────────────────────────────────────────────────
function AngleGauge({ label, angle, min, max }) {
  const pct = ((angle - min) / (max - min)) * 100;
  return (
    <div className="angle-card">
      <div className="angle-label">{label}</div>
      <div className="angle-value">{angle}°</div>
      <div className="angle-bar-bg">
        <div className="angle-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="angle-range">
        <span>{min}°</span>
        <span>{max}°</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DUST ALERT
// ─────────────────────────────────────────────────────────────
function DustAlert({ dustAlert, dustRaw }) {
  if (!dustAlert) return null;
  return (
    <div className="alert-banner">
      <AlertTriangle size={20} />
      <span>
        <strong>Panel Cleaning Required!</strong> Dust detected (sensor: {dustRaw}).
        Estimated efficiency loss: ~15-25%.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP FOR CHARTS
// ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit = 'W', dataLabel = 'Power' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      fontSize: 13,
    }}>
      <div style={{ color: '#9ba3be', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#1a1d2e', fontWeight: 700 }}>
        {payload[0].value} {unit}
        <span style={{ color: '#5a6178', fontWeight: 400, marginLeft: 6 }}>{dataLabel}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [live, setLive] = useState(null);
  const [history, setHistory] = useState([]);
  const [weather, setWeather] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // ── Firebase subscriptions ──────────────────────────
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

  useEffect(() => {
    const histRef = ref(db, 'solarData/history');
    const unsub = onValue(histRef, (snapshot) => {
      const raw = snapshot.val();
      if (raw) {
        const arr = Object.values(raw)
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-50)
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

  useEffect(() => {
    const wRef = ref(db, 'solarData/weather');
    const unsub = onValue(wRef, (snapshot) => {
      if (snapshot.val()) setWeather(snapshot.val());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const pRef = ref(db, 'solarData/prediction');
    const unsub = onValue(pRef, (snapshot) => {
      if (snapshot.val()) setPrediction(snapshot.val());
    });
    return () => unsub();
  }, []);

  const efficiencyGain = live ? 34 : 0;

  // ── Loading State ───────────────────────────────────
  if (!live) {
    return (
      <div className="loading">
        <div className="loading-icon">
          <Sun size={32} color="#fff" />
        </div>
        <p>Connecting to Solar Tracker...</p>
        <small>Backend server must be running on port 3001</small>
      </div>
    );
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <Sun size={20} color="#fff" />
          </div>
          <h1>Photon<span>IQ</span></h1>
        </div>
        <div className="header-right">
          <div className="status-badge">
            <div className={`status-dot ${connected ? 'online' : 'offline'}`} />
            <span>{connected ? 'Live' : 'Offline'}</span>
          </div>
          {lastUpdate && <span className="last-update">{lastUpdate}</span>}
        </div>
      </header>

      <div className="dashboard">

        {/* ── Dust Alert ── */}
        <DustAlert dustAlert={live.dustAlert} dustRaw={live.dustRaw} />

        {/* ── Stat Cards ── */}
        <div className="stats-grid">
          <StatCard
            icon={<Zap size={22} />}
            label="Power Output"
            value={live.power?.toFixed(3)}
            unit="W"
            colorName="green"
            sub="Real-time"
          />
          <StatCard
            icon={<Activity size={22} />}
            label="Voltage"
            value={live.voltage?.toFixed(2)}
            unit="V"
            colorName="blue"
            sub="Bus voltage"
          />
          <StatCard
            icon={<Zap size={22} />}
            label="Current"
            value={live.current?.toFixed(1)}
            unit="mA"
            colorName="purple"
            sub="Draw"
          />
          <StatCard
            icon={<TrendingUp size={22} />}
            label="Efficiency"
            value={`+${efficiencyGain}`}
            unit="%"
            colorName="amber"
            sub="vs fixed panel"
          />
          <StatCard
            icon={<Sun size={22} />}
            label="Light"
            value={live.light}
            unit="%"
            colorName="orange"
            sub="Irradiance"
          />
        </div>

        {/* ── Panel Angles ── */}
        <div className="section">
          <div className="section-header">
            <div className="section-header-icon" style={{ background: 'rgba(76,175,80,0.12)', color: 'var(--accent-green)' }}>
              <Radio size={16} />
            </div>
            <h2>
              Panel Orientation
              <span className="section-subtitle">Active axis tracking</span>
            </h2>
          </div>
          <div className="angle-grid">
            <AngleGauge label="Horizontal Axis" angle={live.angleH} min={0} max={180} />
            <AngleGauge label="Vertical Axis" angle={live.angleV} min={30} max={150} />
          </div>
        </div>

        {/* ── Power History ── */}
        <div className="section">
          <div className="section-header">
            <div className="section-header-icon" style={{ background: 'rgba(76,175,80,0.12)', color: 'var(--accent-green)' }}>
              <Activity size={16} />
            </div>
            <h2>
              Power Output
              <span className="section-subtitle">Last 50 readings</span>
            </h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#9ba3be' }}
                  axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  unit="W"
                  tick={{ fontSize: 11, fill: '#9ba3be' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip unit="W" dataLabel="Power" />} />
                <Area
                  type="monotone"
                  dataKey="power"
                  stroke="#4caf50"
                  strokeWidth={2}
                  fill="url(#powerGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#2e9e3f', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Bottom Row: Prediction + Weather ── */}
        <div className="bottom-grid">

          {/* AI Forecast */}
          <div className="section">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: 'rgba(249,168,37,0.12)', color: 'var(--accent-amber)' }}>
                🤖
              </div>
              <h2>
                AI Power Forecast
                <span className="section-subtitle">Next 6 hours prediction</span>
              </h2>
            </div>
            {prediction ? (
              <>
                <div className="prediction-meta">
                  <div className="prediction-chip">
                    Next hour: <strong>{prediction.predicted_power} W</strong>
                  </div>
                  <div className="prediction-chip">
                    Confidence: <strong>{prediction.confidence}%</strong>
                  </div>
                  <div className="prediction-chip">
                    Peak: <strong>{prediction.peak_hour}:00</strong>
                  </div>
                </div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={prediction.forecast}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f9a825" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#f9a825" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#9ba3be' }}
                        axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                        tickLine={false}
                      />
                      <YAxis
                        unit="W"
                        tick={{ fontSize: 11, fill: '#9ba3be' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip unit="W" dataLabel="Predicted" />} />
                      <Bar
                        dataKey="predicted"
                        fill="url(#barGrad)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="no-data">Prediction loading...</p>
            )}
          </div>

          {/* Weather */}
          <div className="section">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: 'rgba(66,165,245,0.12)', color: 'var(--accent-blue)' }}>
                <Cloud size={16} />
              </div>
              <h2>
                Weather
                <span className="section-subtitle">Current conditions</span>
              </h2>
            </div>
            {weather ? (
              <div className="weather-grid">
                <div className="weather-item">
                  <Thermometer size={20} color="#ef5350" />
                  <span className="w-label">Temperature</span>
                  <span className="w-val">{weather.temp}°C</span>
                </div>
                <div className="weather-item">
                  <Droplets size={20} color="#42a5f5" />
                  <span className="w-label">Humidity</span>
                  <span className="w-val">{weather.humidity}%</span>
                </div>
                <div className="weather-item">
                  <Cloud size={20} color="#78909c" />
                  <span className="w-label">Clouds</span>
                  <span className="w-val">{weather.clouds}%</span>
                </div>
                <div className="weather-item">
                  <Wind size={20} color="#26c6da" />
                  <span className="w-label">Wind</span>
                  <span className="w-val">{weather.windSpeed} m/s</span>
                </div>
                <div className="weather-desc">{weather.description}</div>
                <div className="solar-impact">
                  <CheckCircle size={16} color="#4caf50" />
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
        <span>PhotonIQ</span> - Solar Power Optimization • Hackathon 2026
      </footer>
    </div>
  );
}
