import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { calculateSubsidy, calculateSubsidyCurve } from '../utils/solarCalculator';

interface SubsidyCurveChartProps {
  currentKw: number;
  stateName?: string;
}

export const SubsidyCurveChart: React.FC<SubsidyCurveChartProps> = ({ currentKw, stateName = 'None' }) => {
  const roundedKw = Math.round(currentKw * 10) / 10;
  const basePoints = calculateSubsidyCurve(10, stateName);

  // Ensure current capacity has a point in Recharts data so reference dot maps perfectly
  const existingPoint = basePoints.find((p) => Math.abs(p.kw - roundedKw) < 0.05);
  let data = basePoints;
  if (!existingPoint && roundedKw >= 1 && roundedKw <= 10) {
    const sub = calculateSubsidy(roundedKw, stateName);
    data = [...basePoints, {
      kw: roundedKw,
      centralSubsidy: sub.centralSubsidy,
      stateSubsidy: sub.stateSubsidy,
      totalSubsidy: sub.totalSubsidy,
      subsidyPerKw: sub.subsidyPerKw,
      isSweetSpot: roundedKw === 3,
    }].sort((a, b) => a.kw - b.kw);
  }

  const currentSubsidy = calculateSubsidy(roundedKw, stateName).totalSubsidy;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">PM Surya Ghar Subsidy Efficiency Curve</h3>
          <p className="chart-subtitle">
            Total DBT Subsidy vs. Subsidy Captured per Installed kW
          </p>
        </div>
        <div className="badge-sweetspot">
          🌟 Sweet Spot: 3 kW (Max ₹78,000)
        </div>
      </div>

      <div className="chart-container" style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 25, left: 15, bottom: 20 }}>
            <defs>
              <linearGradient id="subsidyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              dataKey="kw"
              stroke="#64748b"
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `${v} kW`}
              label={{ value: 'System Capacity (kWp)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
            />
            {/* Left Y Axis for Total Subsidy */}
            <YAxis
              yAxisId="left"
              stroke="#10b981"
              tick={{ fill: '#10b981', fontSize: 11 }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              width={55}
            />
            {/* Right Y Axis for Subsidy / kW */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#f59e0b"
              tick={{ fill: '#f59e0b', fontSize: 11 }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k/kW`}
              width={75}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0].payload;
                return (
                  <div className="chart-tooltip">
                    <div className="tooltip-title">{pt.kw} kW System</div>
                    <div className="tooltip-row">
                      <span className="text-emerald">Total Subsidy:</span>
                      <span className="font-bold">₹{pt.totalSubsidy.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="text-amber">Subsidy per kW:</span>
                      <span className="font-bold">₹{pt.subsidyPerKw.toLocaleString('en-IN')}/kW</span>
                    </div>
                    {pt.kw === 3 && (
                      <div className="tooltip-sweetspot">
                        🎯 Maximum central subsidy efficiency cap!
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend verticalAlign="top" height={36} />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="totalSubsidy"
              name="Total Subsidy (₹)"
              fill="url(#subsidyGradient)"
              stroke="#10b981"
              strokeWidth={3}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="subsidyPerKw"
              name="Subsidy / kW (₹)"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ fill: '#f59e0b', r: 3 }}
              activeDot={{ r: 6 }}
            />

            {/* Vertical marker for 3 kW Sweet Spot */}
            <ReferenceLine
              yAxisId="left"
              x={3}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: '3 kW Cap (₹78k)', position: 'insideTopRight', fill: '#f59e0b', fontSize: 11 }}
            />

            {/* Highlight user's chosen kW if within range */}
            {roundedKw >= 1 && roundedKw <= 10 && (
              <ReferenceDot
                yAxisId="left"
                x={roundedKw}
                y={currentSubsidy}
                r={7}
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-insight-box">
        <span className="insight-icon">💡</span>
        <span className="insight-text">
          <strong>Why 3 kW is the Sweet Spot:</strong> PM Surya Ghar offers ₹30,000/kW for the first 2 kW and ₹18,000 for the 3rd kW. Beyond 3 kW, the central subsidy stays fixed at ₹78,000, causing effective subsidy per kW to decline.
        </span>
      </div>
    </div>
  );
};
