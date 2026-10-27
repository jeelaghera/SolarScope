import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GenerationResult } from '../utils/solarCalculator';

interface MonthlyGenerationChartProps {
  generation: GenerationResult;
}

export const MonthlyGenerationChart: React.FC<MonthlyGenerationChartProps> = ({ generation }) => {
  const chartData = generation.monthlyBreakdown.map((m) => ({
    month: m.month,
    generationKwh: m.monthlyKwh,
    irradiationH: m.irradiationH,
    cellTemp: m.cellTemp,
    ambientTemp: m.ambientTemp,
    tempLossPercent: m.tempLossPercent,
    savings: m.monthlySavings,
  }));

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">12-Month Generation & Summer Heat Derate</h3>
          <p className="chart-subtitle">
            Powered by 20+ Year NASA POWER Climatology (ALLSKY_SFC_SW_DWN & T2M)
          </p>
        </div>
        <div className="badge-stat">
          ⚡ Annual: {generation.annualKwh.toLocaleString('en-IN')} kWh
        </div>
      </div>

      <div className="chart-container" style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: 15, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            
            {/* Left Y Axis: Monthly Generation (kWh) */}
            <YAxis
              yAxisId="left"
              stroke="#38bdf8"
              tick={{ fill: '#38bdf8', fontSize: 11 }}
              tickFormatter={(v) => `${v} kWh`}
              width={65}
            />

            {/* Right Y Axis: Cell Temperature (°C) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#f87171"
              domain={[20, 65]}
              ticks={[20, 35, 50, 65]}
              tick={{ fill: '#f87171', fontSize: 11 }}
              tickFormatter={(v) => `${v}°C`}
              width={50}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="chart-tooltip">
                    <div className="tooltip-title">{d.month} Solar Yield</div>
                    <div className="tooltip-row">
                      <span className="text-sky">Generation:</span>
                      <span className="font-bold">{d.generationKwh} kWh</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="text-amber">Sunlight (H):</span>
                      <span>{d.irradiationH} kWh/m²/day</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="text-red">Cell Temperature:</span>
                      <span>{d.cellTemp}°C (Air: {d.ambientTemp}°C)</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="text-orange">Thermal Loss:</span>
                      <span className="font-semibold text-rose">-{d.tempLossPercent}% output</span>
                    </div>
                    <div className="tooltip-row border-t border-slate-700 pt-1 mt-1">
                      <span>Est. Bill Savings:</span>
                      <span className="font-bold text-emerald">₹{d.savings.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend verticalAlign="top" height={36} />

            <Bar
              yAxisId="left"
              dataKey="generationKwh"
              name="Monthly Energy (kWh)"
              fill="#38bdf8"
              radius={[4, 4, 0, 0]}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cellTemp"
              name="Est. Cell Temp (°C)"
              stroke="#f87171"
              strokeWidth={2}
              dot={{ fill: '#f87171', r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-insight-box">
        <span className="insight-icon">☀️</span>
        <span className="insight-text">
          <strong>Temperature Derating Detail:</strong> Panels operate less efficiently at high cell temperatures (-0.4%/°C above 25°C). In peak Indian summers (April-June), cell temperatures reach ~50°C, causing an ~8-10% heat loss that SolarScope accounts for.
        </span>
      </div>
    </div>
  );
};
