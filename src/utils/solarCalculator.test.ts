import { describe, expect, it } from 'vitest';
import {
  calculateFinancials,
  calculateMonthlyGeneration,
  calculateSizing,
  calculateSubsidy,
  calculateSubsidyCurve,
} from './solarCalculator';

describe('PM Surya Ghar Subsidy Engine', () => {
  it('correctly calculates central subsidy for 1 kW (₹30,000)', () => {
    const result = calculateSubsidy(1.0);
    expect(result.centralSubsidy).toBe(30000);
    expect(result.subsidyPerKw).toBe(30000);
    expect(result.totalSubsidy).toBe(30000);
  });

  it('correctly calculates central subsidy for 2 kW (₹60,000)', () => {
    const result = calculateSubsidy(2.0);
    expect(result.centralSubsidy).toBe(60000);
    expect(result.subsidyPerKw).toBe(30000);
    expect(result.totalSubsidy).toBe(60000);
  });

  it('correctly calculates central subsidy for 3 kW sweet spot (₹78,000)', () => {
    const result = calculateSubsidy(3.0);
    expect(result.centralSubsidy).toBe(78000);
    expect(result.totalSubsidy).toBe(78000);
    expect(result.subsidyPerKw).toBe(26000);
    expect(result.isSweetSpot).toBe(true);
  });

  it('correctly caps central subsidy at ₹78,000 for systems > 3 kW', () => {
    const res4 = calculateSubsidy(4.0);
    expect(res4.centralSubsidy).toBe(78000);
    expect(res4.subsidyPerKw).toBe(19500); // 78,000 / 4

    const res5 = calculateSubsidy(5.0);
    expect(res5.centralSubsidy).toBe(78000);
    expect(res5.subsidyPerKw).toBe(15600); // 78,000 / 5
  });

  it('adds state top-up for Gujarat up to ₹20,000', () => {
    const res = calculateSubsidy(2.0, 'Gujarat');
    expect(res.centralSubsidy).toBe(60000);
    expect(res.stateSubsidy).toBe(20000);
    expect(res.totalSubsidy).toBe(80000);
  });

  it('generates a subsidy efficiency curve showing the 3 kW sweet spot', () => {
    const curve = calculateSubsidyCurve(6);
    expect(curve.length).toBeGreaterThan(5);
    const point3Kw = curve.find(p => p.kw === 3);
    const point5Kw = curve.find(p => p.kw === 5);
    expect(point3Kw?.isSweetSpot).toBe(true);
    expect(point3Kw?.subsidyPerKw).toBeGreaterThan(point5Kw?.subsidyPerKw ?? 0);
  });
});

describe('Solar PV Sizing Engine', () => {
  it('correctly sizes needed capacity based on monthly electricity consumption', () => {
    // 360 kWh / month (~12 units / day)
    // with 5.2 kWh/m²/day and PR=0.78 => ~12 / (5.2 * 0.78) ~= 2.96 kW -> 3.0 kW
    const sizing = calculateSizing(100, 360, 5.2, 0.78);
    expect(sizing.neededCapacityKw).toBeCloseTo(3.0, 0.1);
  });

  it('caps system size when roof space is constrained', () => {
    // 20 m² roof with 0.85 usable factor = 17 m² usable
    // At 10 m² / kW => max 1.7 kW
    const sizing = calculateSizing(20, 500);
    expect(sizing.maxRoofCapacityKw).toBe(1.7);
    expect(sizing.isRoofConstrained).toBe(true);
    expect(sizing.recommendedCapacityKw).toBe(1.7);
  });
});

describe('Generation & Temperature Derating Engine', () => {
  it('derates performance ratio more in hot summer months than cool winter months', () => {
    const gen = calculateMonthlyGeneration(3.0);
    expect(gen.monthlyBreakdown.length).toBe(12);

    const jan = gen.monthlyBreakdown.find(m => m.month === 'Jan');
    const may = gen.monthlyBreakdown.find(m => m.month === 'May');

    expect(jan).toBeDefined();
    expect(may).toBeDefined();
    // May has higher ambient temp and irradiance => higher cell temp & temp loss
    expect(may!.cellTemp).toBeGreaterThan(jan!.cellTemp);
    expect(may!.tempLossPercent).toBeGreaterThan(jan!.tempLossPercent);
    expect(may!.effectivePr).toBeLessThan(jan!.effectivePr);
  });

  it('calculates realistic annual generation for a 3 kW system in India (~4200 - 4800 kWh)', () => {
    const gen = calculateMonthlyGeneration(3.0);
    expect(gen.annualKwh).toBeGreaterThan(3800);
    expect(gen.annualKwh).toBeLessThan(5200);
    expect(gen.capacityFactor).toBeGreaterThan(14);
    expect(gen.capacityFactor).toBeLessThan(20);
  });
});

describe('25-Year Lifecycle Financial Engine', () => {
  it('computes realistic payback period and lifetime savings for a 3 kW system', () => {
    // 3 kW gross cost = ₹1,80,000, subsidy = ₹78,000, net investment = ₹1,02,000
    // Annual generation ~ 4,300 kWh * ₹7 = ~₹30,000 savings in year 1
    // Payback should be between 2.5 and 4.0 years
    const fin = calculateFinancials(3.0, 4300, 60000, 'None', 7.0);

    expect(fin.grossCost).toBe(180000);
    expect(fin.totalSubsidy).toBe(78000);
    expect(fin.netInvestment).toBe(102000);
    expect(fin.paybackYears).toBeGreaterThan(2.0);
    expect(fin.paybackYears).toBeLessThan(4.5);
    expect(fin.lifetimeSavings).toBeGreaterThan(900000);
    expect(fin.netLifetimeProfit).toBeGreaterThan(800000);
    expect(fin.roiPercent).toBeGreaterThan(500);
    expect(fin.totalCo2AvoidedTonnes).toBeGreaterThan(50);
    expect(fin.cashflow.length).toBe(25);
  });
});
