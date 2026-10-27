import { describe, it, expect } from 'vitest';
import { calculateSizing, calculateMonthlyGeneration, calculateFinancials, calculateSubsidyCurve } from '../utils/solarCalculator';
import { detectIndianState } from '../services/nominatimService';
import { STATE_SUBSIDY_RULES } from '../config/solarConfig';

describe('End-to-End SolarScope System Verification', () => {
  it('verifies PM Surya Ghar sweet spot at 3 kW with maximum central subsidy', () => {
    const curve = calculateSubsidyCurve(8, 'Gujarat');
    const threeKw = curve.find((c) => c.kw === 3);
    const fourKw = curve.find((c) => c.kw === 4);

    expect(threeKw).toBeDefined();
    expect(threeKw?.centralSubsidy).toBe(78000);
    expect(threeKw?.totalSubsidy).toBe(98000); // 78k central + 20k Gujarat top-up

    // Over 3 kW, central subsidy is hard capped at 78,000
    expect(fourKw?.centralSubsidy).toBe(78000);
  });

  it('verifies rooftop shadow-free capacity constraint logic', () => {
    // 20 m² roof with 85% usable area = 17 m² usable => max 1.7 kWp
    const constrainedSizing = calculateSizing(20, 500, 5.2);
    expect(constrainedSizing.isRoofConstrained).toBe(true);
    expect(constrainedSizing.recommendedCapacityKw).toBeLessThanOrEqual(1.7);
  });

  it('verifies summer thermal derating formula accurately lowers performance in peak heat', () => {
    const gen = calculateMonthlyGeneration(3.0);
    expect(gen.monthlyBreakdown).toHaveLength(12);

    const mayMonth = gen.monthlyBreakdown.find((m) => m.month === 'May');
    const decMonth = gen.monthlyBreakdown.find((m) => m.month === 'Dec');

    expect(mayMonth).toBeDefined();
    expect(decMonth).toBeDefined();
    // Cell temperature in May (~51°C) experiences higher thermal loss than cool December (~41°C)
    expect(mayMonth!.tempLossPercent).toBeGreaterThan(decMonth!.tempLossPercent);
  });

  it('verifies 25-year cumulative cashflow and break-even payback calculation', () => {
    const gen = calculateMonthlyGeneration(3.0);
    const fin = calculateFinancials(3.0, gen.annualKwh, 60000, 'Gujarat', 7.0);

    expect(fin.grossCost).toBe(180000);
    expect(fin.centralSubsidy).toBe(78000);
    expect(fin.stateSubsidy).toBe(20000);
    expect(fin.netInvestment).toBe(82000);

    expect(fin.paybackYears).toBeGreaterThan(2.0);
    expect(fin.paybackYears).toBeLessThan(5.0);
    expect(fin.paybackMonths).toBe(Math.round(fin.paybackYears * 12));
    expect(fin.paybackMonths).toBeGreaterThan(24);
    expect(fin.lifetimeSavings).toBeGreaterThan(500000);
    expect(fin.cashflow).toHaveLength(25);
  });

  it('verifies dynamic system capacity sizing scales with monthly consumption inputs', () => {
    // ₹1,500 bill => ~214 kWh => 1.8 kWp (214 / (5.2 * 30 * 0.78) = 1.76 => 1.8)
    const smallSizing = calculateSizing(0, 214, 5.2);
    expect(smallSizing.recommendedCapacityKw).toBe(1.8);

    // ₹4,000 bill => ~571 kWh => 4.7 kWp (571 / 121.68 = 4.69 => 4.7)
    const mediumSizing = calculateSizing(0, 571, 5.2);
    expect(mediumSizing.recommendedCapacityKw).toBe(4.7);

    // ₹6,000 bill => ~857 kWh => 7.0 kWp (857 / 121.68 = 7.04 => 7.0)
    const largeSizing = calculateSizing(0, 857, 5.2);
    expect(largeSizing.recommendedCapacityKw).toBe(7.0);

    // 10 kW subsidy curve includes 10 kW cap
    const curve10 = calculateSubsidyCurve(10, 'None');
    expect(curve10.find(p => p.kw === 10)).toBeDefined();
    expect(curve10.find(p => p.kw === 10)?.centralSubsidy).toBe(78000);
  });

  it('verifies Indian state detection from address strings', () => {
    expect(detectIndianState('Ahmedabad, Gujarat, 380015, India')).toBe('Gujarat');
    expect(detectIndianState('Pune, Maharashtra, 411001, India')).toBe('Maharashtra');
    expect(detectIndianState('Jaipur, Rajasthan, 302001, India')).toBe('Rajasthan');
    expect(detectIndianState('Lucknow, Uttar Pradesh, 226001, India')).toBe('UttarPradesh');
    expect(detectIndianState('Unknown City, France')).toBe('None');
  });

  it('verifies state subsidy rules configuration completeness', () => {
    expect(STATE_SUBSIDY_RULES['Gujarat'].maxSubsidy).toBe(20000);
    expect(STATE_SUBSIDY_RULES['Maharashtra'].maxSubsidy).toBe(15000);
    expect(STATE_SUBSIDY_RULES['Rajasthan'].maxSubsidy).toBe(15000);
    expect(STATE_SUBSIDY_RULES['UttarPradesh'].maxSubsidy).toBe(30000);
  });
});
