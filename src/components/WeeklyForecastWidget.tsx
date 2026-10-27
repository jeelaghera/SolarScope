import React from 'react';
import { Sun, Zap } from 'lucide-react';
import type { WeeklyForecastResult } from '../services/openMeteoService';

interface WeeklyForecastWidgetProps {
  forecast: WeeklyForecastResult | null;
  loading: boolean;
  systemKw: number;
}

export const WeeklyForecastWidget: React.FC<WeeklyForecastWidgetProps> = ({
  forecast,
  loading,
  systemKw,
}) => {
  if (loading) {
    return (
      <div className="forecast-widget card-glass">
        <div className="loading-state">
          <div className="spinner-amber" />
          <p>Fetching 7-day solar radiation forecast from Open-Meteo...</p>
        </div>
      </div>
    );
  }

  if (!forecast || !forecast.daily.length) {
    return null;
  }

  return (
    <div className="forecast-widget card-glass">
      <div className="forecast-header">
        <div className="flex items-center gap-2">
          <div className="icon-badge-amber">
            <Sun size={20} className="text-amber" />
          </div>
          <div>
            <h3 className="forecast-title">Live 7-Day Solar Generation Forecast</h3>
            <p className="forecast-sub">
              Open-Meteo Global Irradiance Model for {systemKw} kWp System
            </p>
          </div>
        </div>

        <div className="weekly-total-badge">
          <span className="total-label">Expected This Week:</span>
          <span className="total-val text-amber">{forecast.totalWeeklyKwh} kWh</span>
          <span className="total-savings">(~₹{forecast.totalWeeklySavingsInr.toLocaleString('en-IN')})</span>
        </div>
      </div>

      {/* 7-Day Horizontal Cards */}
      <div className="forecast-grid">
        {forecast.daily.map((day, idx) => (
          <div key={day.date} className={`day-card ${idx === 0 ? 'today-card' : ''}`}>
            <div className="day-header">
              <span className="day-name">{idx === 0 ? 'Today' : day.dayName}</span>
              <span className="day-date">{day.date.slice(5)}</span>
            </div>

            <div className="day-weather-icon" title={day.weatherDescription}>
              <span className="text-2xl">{day.weatherIcon}</span>
            </div>

            <div className="day-temp-range">
              <span className="temp-max">{day.tempMax}°</span>
              <span className="temp-sep">/</span>
              <span className="temp-min">{day.tempMin}°C</span>
            </div>

            <div className="day-radiation">
              <span className="rad-val">{day.radiationKwhM2}</span>
              <span className="rad-unit">kWh/m²</span>
            </div>

            <div className="day-gen-pill">
              <Zap size={12} className="text-amber" />
              <span>{day.expectedGenerationKwh} kWh</span>
            </div>

            <div className="day-savings-tag">
              +₹{day.expectedSavingsInr}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
