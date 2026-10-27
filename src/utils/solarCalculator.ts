import {
  CENTRAL_SUBSIDY_SLABS,
  MONTHS,
  SOLAR_DEFAULTS,
  STATE_SUBSIDY_RULES,
} from '../config/solarConfig';

export interface SubsidyResult {
  capacityKw: number;
  centralSubsidy: number;
  stateSubsidy: number;
  totalSubsidy: number;
  subsidyPerKw: number;
  isSweetSpot: boolean;
  message: string;
}

export interface SubsidyCurvePoint {
  kw: number;
  centralSubsidy: number;
  stateSubsidy: number;
  totalSubsidy: number;
  subsidyPerKw: number;
  isSweetSpot: boolean;
}

export interface SizingResult {
  roofAreaSqMeters: number;
  usableRoofAreaSqMeters: number;
  maxRoofCapacityKw: number;
  monthlyUnitsKwh: number;
  neededCapacityKw: number;
  recommendedCapacityKw: number;
  isRoofConstrained: boolean;
  sweetSpotRecommendation: string;
}

export interface MonthlyBreakdown {
  month: string;
  days: number;
  irradiationH: number; // kWh/m²/day
  ambientTemp: number; // °C
  cellTemp: number; // °C
  tempLossPercent: number; // % loss
  effectivePr: number; // ratio
  monthlyKwh: number;
  monthlySavings: number;
}

export interface GenerationResult {
  capacityKw: number;
  monthlyBreakdown: MonthlyBreakdown[];
  annualKwh: number;
  annualSavings: number;
  capacityFactor: number; // percentage
  avgDailyKwh: number;
  totalTempLossKwh: number;
}

export interface CashflowYear {
  year: number;
  generationKwh: number;
  tariffPerUnit: number;
  annualSavings: number;
  netCashflow: number;
  cumulativeCashflow: number;
  co2AvoidedKg: number;
}

export interface FinancialResult {
  grossCost: number;
  centralSubsidy: number;
  stateSubsidy: number;
  totalSubsidy: number;
  netInvestment: number;
  paybackYears: number;
  paybackMonths: number;
  lifetimeGenerationKwh: number;
  lifetimeSavings: number;
  netLifetimeProfit: number;
  roiPercent: number;
  totalCo2AvoidedTonnes: number;
  treesPlantedEquivalent: number;
  cashflow: CashflowYear[];
}

/**
 * Computes PM Surya Ghar Central subsidy and optional state top-ups.
 */
export function calculateSubsidy(
  capacityKw: number,
  stateName = 'None',
  customStateSubsidy?: number
): SubsidyResult {
  const kw = Math.max(0, capacityKw);
  let centralSubsidy = 0;

  if (kw <= 0) {
    centralSubsidy = 0;
  } else if (kw <= 1.0) {
    centralSubsidy = kw * CENTRAL_SUBSIDY_SLABS.FIRST_KW;
  } else if (kw <= 2.0) {
    centralSubsidy = 30000 + (kw - 1.0) * CENTRAL_SUBSIDY_SLABS.SECOND_KW;
  } else if (kw <= 3.0) {
    centralSubsidy = 60000 + (kw - 2.0) * CENTRAL_SUBSIDY_SLABS.THIRD_KW;
  } else {
    // Hard capped at ₹78,000 for residential systems above 3 kW
    centralSubsidy = CENTRAL_SUBSIDY_SLABS.MAX_CAP;
  }

  // Round central subsidy to nearest rupee
  centralSubsidy = Math.round(centralSubsidy);

  // State top-up
  let stateSubsidy = 0;
  if (customStateSubsidy !== undefined && customStateSubsidy >= 0) {
    stateSubsidy = customStateSubsidy;
  } else {
    const rule = STATE_SUBSIDY_RULES[stateName] || STATE_SUBSIDY_RULES['None'];
    if (rule.perKwBonus > 0 && kw > 0) {
      stateSubsidy = Math.min(rule.maxSubsidy, Math.round(kw * rule.perKwBonus));
    }
  }

  const totalSubsidy = centralSubsidy + stateSubsidy;
  const subsidyPerKw = kw > 0 ? Math.round(totalSubsidy / kw) : 0;
  const isSweetSpot = kw >= 2.8 && kw <= 3.2;

  let message = '';
  if (kw <= 0) {
    message = 'Enter a valid system capacity.';
  } else if (isSweetSpot) {
    message = 'Sweet spot: 3 kW captures the maximum ₹78,000 central subsidy with optimal subsidy per kW.';
  } else if (kw < 3.0) {
    message = `Eligible for ₹${(totalSubsidy).toLocaleString('en-IN')} total subsidy (up to ₹30,000/kW for the first 2 kW).`;
  } else {
    message = `Eligible for max central subsidy cap of ₹78,000. Subsidy per kW drops from ₹26,000 at 3 kW to ₹${subsidyPerKw.toLocaleString('en-IN')}/kW.`;
  }

  return {
    capacityKw: kw,
    centralSubsidy,
    stateSubsidy,
    totalSubsidy,
    subsidyPerKw,
    isSweetSpot,
    message,
  };
}

/**
 * Generates points for the Subsidy Efficiency Curve (1 kW to maxKw).
 */
export function calculateSubsidyCurve(
  maxKw = 8,
  stateName = 'None'
): SubsidyCurvePoint[] {
  const points: SubsidyCurvePoint[] = [];
  const steps = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8].filter(k => k <= maxKw);

  for (const kw of steps) {
    const sub = calculateSubsidy(kw, stateName);
    points.push({
      kw,
      centralSubsidy: sub.centralSubsidy,
      stateSubsidy: sub.stateSubsidy,
      totalSubsidy: sub.totalSubsidy,
      subsidyPerKw: sub.subsidyPerKw,
      isSweetSpot: kw === 3,
    });
  }
  return points;
}

/**
 * Sizes the solar PV system based on roof area and monthly units consumed.
 */
export function calculateSizing(
  roofAreaSqMeters: number,
  monthlyUnitsKwh: number,
  avgDailyIrradiation = 5.2, // India average kWh/m²/day
  basePr = SOLAR_DEFAULTS.basePerformanceRatio
): SizingResult {
  const usableRoofArea = Math.max(0, roofAreaSqMeters * SOLAR_DEFAULTS.usableRoofFactor);
  
  // 10 m² per kWp shadow-free roof
  const maxRoofCapacityKw = Math.max(0, Math.floor((usableRoofArea / SOLAR_DEFAULTS.sqMetersPerKw) * 10) / 10);

  // kWh = kWp * H * 30 * PR => kWp needed = kWh / (H * 30 * PR)
  const safeDailyH = Math.max(1, avgDailyIrradiation);
  const neededCapacityExact = monthlyUnitsKwh > 0 
    ? monthlyUnitsKwh / (safeDailyH * 30 * basePr)
    : 3.0; // fallback default
  
  // Round to 1 decimal place (e.g. 3.2 kW)
  const neededCapacityKw = Math.max(0.5, Math.round(neededCapacityExact * 10) / 10);

  // Recommended is capped by roof, or needed if roof area is not set
  let recommendedCapacityKw = neededCapacityKw;
  let isRoofConstrained = false;

  if (roofAreaSqMeters > 0) {
    if (neededCapacityKw > maxRoofCapacityKw) {
      recommendedCapacityKw = maxRoofCapacityKw;
      isRoofConstrained = true;
    } else {
      recommendedCapacityKw = neededCapacityKw;
    }
  }

  // Sweet spot advice
  let sweetSpotRecommendation = '';
  if (recommendedCapacityKw >= 2.5 && recommendedCapacityKw <= 3.5) {
    sweetSpotRecommendation = 'Your optimal sizing is near the 3 kW PM Surya Ghar sweet spot (₹78,000 maximum subsidy).';
  } else if (recommendedCapacityKw > 3.0) {
    sweetSpotRecommendation = `Your consumption justifies ${recommendedCapacityKw} kW. Note that the central subsidy caps at ₹78,000 (at 3 kW).`;
  } else {
    sweetSpotRecommendation = `A ${recommendedCapacityKw} kW system will offset ~100% of your bill with full ₹30,000/kW subsidy.`;
  }

  return {
    roofAreaSqMeters,
    usableRoofAreaSqMeters: Math.round(usableRoofArea * 10) / 10,
    maxRoofCapacityKw,
    monthlyUnitsKwh,
    neededCapacityKw,
    recommendedCapacityKw: Math.max(0.5, Math.round(recommendedCapacityKw * 10) / 10),
    isRoofConstrained,
    sweetSpotRecommendation,
  };
}

/**
 * Calculates monthly solar energy generation with temperature derating.
 */
export function calculateMonthlyGeneration(
  capacityKw: number,
  monthlyH?: number[], // 12 months NASA POWER irradiation (kWh/m²/day)
  monthlyTemps?: number[], // 12 months NASA POWER air temp (°C)
  basePr = SOLAR_DEFAULTS.basePerformanceRatio,
  tariff = SOLAR_DEFAULTS.electricityTariff
): GenerationResult {
  const kw = Math.max(0, capacityKw);
  let totalAnnualKwh = 0;
  let totalAnnualSavings = 0;
  let totalIdealKwhWithoutTempLoss = 0;

  const monthlyBreakdown: MonthlyBreakdown[] = MONTHS.map((m, idx) => {
    const H = (monthlyH && monthlyH[idx] !== undefined && monthlyH[idx] > 0)
      ? monthlyH[idx]
      : m.defaultH;
    
    const ambientTemp = (monthlyTemps && monthlyTemps[idx] !== undefined)
      ? monthlyTemps[idx]
      : m.defaultTemp;

    // Thermal model: Cell heating proportional to sunlight intensity
    // T_cell = T_amb + 25°C * (H / 5.0)
    const heatingDelta = SOLAR_DEFAULTS.cellTempOffset * (H / 5.2);
    const cellTemp = Math.round((ambientTemp + heatingDelta) * 10) / 10;

    // Thermal loss: 0.4% per °C above 25°C standard test condition
    const tempAboveSTC = Math.max(0, cellTemp - 25.0);
    const tempLossFraction = tempAboveSTC * SOLAR_DEFAULTS.temperatureLossCoefficient;
    const tempLossPercent = Math.round(tempLossFraction * 1000) / 10; // e.g. 7.4%

    // Effective PR with heat derating
    const effectivePr = Math.max(0.60, basePr * (1 - tempLossFraction));

    // Monthly kWh = kWp * H * days * PR_eff
    const monthlyKwh = Math.round(kw * H * m.days * effectivePr);
    const idealMonthlyKwh = Math.round(kw * H * m.days * basePr);
    const monthlySavings = Math.round(monthlyKwh * tariff);

    totalAnnualKwh += monthlyKwh;
    totalAnnualSavings += monthlySavings;
    totalIdealKwhWithoutTempLoss += idealMonthlyKwh;

    return {
      month: m.name,
      days: m.days,
      irradiationH: Math.round(H * 100) / 100,
      ambientTemp: Math.round(ambientTemp * 10) / 10,
      cellTemp,
      tempLossPercent,
      effectivePr: Math.round(effectivePr * 1000) / 1000,
      monthlyKwh,
      monthlySavings,
    };
  });

  const totalTempLossKwh = Math.max(0, totalIdealKwhWithoutTempLoss - totalAnnualKwh);
  const capacityFactor = kw > 0 
    ? Math.round((totalAnnualKwh / (kw * 8760)) * 1000) / 10
    : 0;
  const avgDailyKwh = Math.round((totalAnnualKwh / 365) * 10) / 10;

  return {
    capacityKw: kw,
    monthlyBreakdown,
    annualKwh: totalAnnualKwh,
    annualSavings: totalAnnualSavings,
    capacityFactor,
    avgDailyKwh,
    totalTempLossKwh,
  };
}

/**
 * Computes 25-year financial cashflow, payback timeline, and environmental impact.
 */
export function calculateFinancials(
  capacityKw: number,
  annualKwh: number,
  costPerKw = SOLAR_DEFAULTS.costPerKw,
  stateName = 'None',
  initialTariff = SOLAR_DEFAULTS.electricityTariff,
  annualDegradation = SOLAR_DEFAULTS.annualDegradationRate,
  tariffEscalation = SOLAR_DEFAULTS.tariffEscalationRate
): FinancialResult {
  const kw = Math.max(0, capacityKw);
  const grossCost = Math.round(kw * costPerKw);
  const subsidyInfo = calculateSubsidy(kw, stateName);
  const netInvestment = Math.max(0, grossCost - subsidyInfo.totalSubsidy);

  const cashflow: CashflowYear[] = [];
  let cumulativeCashflow = -netInvestment;
  let paybackYears = 0;
  let paybackMonths = 0;
  let foundPayback = false;
  let lifetimeGenerationKwh = 0;
  let lifetimeSavings = 0;

  for (let year = 1; year <= 25; year++) {
    // Panel degradation: generation decreases slightly each year
    const degradationMultiplier = Math.pow(1 - annualDegradation, year - 1);
    const generationKwh = Math.round(annualKwh * degradationMultiplier);
    lifetimeGenerationKwh += generationKwh;

    // Tariff escalation: electricity rates increase each year
    const tariffMultiplier = Math.pow(1 + tariffEscalation, year - 1);
    const tariffPerUnit = Math.round(initialTariff * tariffMultiplier * 100) / 100;

    const annualSavings = Math.round(generationKwh * tariffPerUnit);
    lifetimeSavings += annualSavings;

    const prevCumulative = cumulativeCashflow;
    cumulativeCashflow += annualSavings;

    // Check when break-even is reached
    if (!foundPayback && cumulativeCashflow >= 0) {
      foundPayback = true;
      const deficit = -prevCumulative;
      const fraction = annualSavings > 0 ? deficit / annualSavings : 0;
      paybackYears = year - 1 + fraction;
      paybackMonths = Math.round(fraction * 12);
    }

    const co2AvoidedKg = Math.round(generationKwh * SOLAR_DEFAULTS.gridEmissionFactor);

    cashflow.push({
      year,
      generationKwh,
      tariffPerUnit,
      annualSavings,
      netCashflow: annualSavings,
      cumulativeCashflow: Math.round(cumulativeCashflow),
      co2AvoidedKg,
    });
  }

  // If payback not reached within 25 years
  if (!foundPayback) {
    paybackYears = 25;
    paybackMonths = 0;
  } else {
    paybackYears = Math.round(paybackYears * 10) / 10;
  }

  const netLifetimeProfit = Math.round(lifetimeSavings - netInvestment);
  const roiPercent = netInvestment > 0 
    ? Math.round((netLifetimeProfit / netInvestment) * 100)
    : 0;

  const totalCo2AvoidedTonnes = Math.round((lifetimeGenerationKwh * SOLAR_DEFAULTS.gridEmissionFactor) / 1000 * 10) / 10;
  // Approximately 40-50 mature trees per ton of CO2 absorbed over 25 years
  const treesPlantedEquivalent = Math.round(totalCo2AvoidedTonnes * 45);

  return {
    grossCost,
    centralSubsidy: subsidyInfo.centralSubsidy,
    stateSubsidy: subsidyInfo.stateSubsidy,
    totalSubsidy: subsidyInfo.totalSubsidy,
    netInvestment,
    paybackYears,
    paybackMonths,
    lifetimeGenerationKwh,
    lifetimeSavings,
    netLifetimeProfit,
    roiPercent,
    totalCo2AvoidedTonnes,
    treesPlantedEquivalent,
    cashflow,
  };
}
