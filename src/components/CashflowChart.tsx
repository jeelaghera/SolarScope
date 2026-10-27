import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FinancialResult } from '../utils/solarCalculator';

interface CashflowChartProps {
  financials: FinancialResult;
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ financials }) => {
  const chartData = financials.cashflow.map((c) => ({
    year: `Yr ${c.year}`,
    yearNum: c.year,
    annualSavings: c.annualSavings,
    cumulativeCashflow: c.cumulativeCashflow,
    co2Kg: c.co2AvoidedKg,
    tariff: c.tariffPerUnit,
  }));

  const paybackFloor = Math.floor(financials.paybackYears);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">25-Year Cumulative Cashflow & Payback</h3>
          <p className="chart-subtitle">
            Includes 0.5% Annual Panel Degradation & 3.0% Annual Tariff Escalation
          </p>
        </div>
        <div className="badge-stat-green">
          💰 Payback in ~{financials.paybackYears} Years ({financials.paybackMonths} Mos)
        </div>
      </div>

      <div className="chart-container" style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis dataKey="year" stroke="#94a3b8" />
            <YAxis
              stroke="#10b981"
              tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
              label={{ value: 'Net Cashflow (₹)', angle: -90, position: 'insideLeft', fill: '#10b981', dy: 40 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="chart-tooltip">
                    <div className="tooltip-title">Year {d.yearNum} Projection</div>
                    <div className="tooltip-row">
                      <span className="text-emerald">Net Cumulative Cashflow:</span>
                      <span className="font-bold">
                        {d.cumulativeCashflow >= 0 ? '+' : ''}₹{d.cumulativeCashflow.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="tooltip-row">
                      <span className="text-sky">Yearly Bill Savings:</span>
                      <span>₹{d.annualSavings.toLocaleString('en-IN')} (at ₹{d.tariff}/unit)</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="text-emerald">CO₂ Avoided:</span>
                      <span>{d.co2Kg} kg</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend verticalAlign="top" height={36} />

            {/* Break-even zero line */}
            <ReferenceLine
              y={0}
              stroke="#f43f5e"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{ value: 'Break-even (₹0)', position: 'insideTopLeft', fill: '#f43f5e', fontSize: 11 }}
            />

            <Area
              type="monotone"
              dataKey="cumulativeCashflow"
              name="Cumulative Cashflow (₹)"
              fill="url(#cashflowGrad)"
              stroke="#10b981"
              strokeWidth={3}
            />

            <Line
              type="monotone"
              dataKey="annualSavings"
              name="Annual Savings (₹)"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
            />

            {/* Payback marker */}
            {paybackFloor >= 1 && paybackFloor <= 25 && (
              <ReferenceLine
                x={`Yr ${paybackFloor}`}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: `Payback: ~${financials.paybackYears} yrs`, position: 'top', fill: '#f59e0b', fontSize: 11 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-insight-box">
        <span className="insight-icon">📈</span>
        <span className="insight-text">
          <strong>Lifetime Value:</strong> After recovering your net upfront cost of ₹{financials.netInvestment.toLocaleString('en-IN')} in ~{financials.paybackYears} years, the system delivers free power for the remaining 21+ years, yielding a net profit of ₹{financials.netLifetimeProfit.toLocaleString('en-IN')} ({financials.roiPercent}% ROI).
        </span>
      </div>
    </div>
  );
};
