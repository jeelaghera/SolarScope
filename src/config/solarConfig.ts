// SolarScope Configuration & PM Surya Ghar Subsidy Definitions

export interface StateSubsidyRule {
  stateName: string;
  maxSubsidy: number;
  perKwBonus: number; // additional state subsidy per kW up to cap
  description: string;
}

export const STATE_SUBSIDY_RULES: Record<string, StateSubsidyRule> = {
  Gujarat: {
    stateName: 'Gujarat',
    maxSubsidy: 20000,
    perKwBonus: 10000, // up to 2 kW
    description: 'Gujarat state solar scheme top-up (up to ₹20,000)',
  },
  Maharashtra: {
    stateName: 'Maharashtra',
    maxSubsidy: 15000,
    perKwBonus: 5000,
    description: 'Maharashtra state rooftop promotional rebate',
  },
  UttarPradesh: {
    stateName: 'Uttar Pradesh',
    maxSubsidy: 30000,
    perKwBonus: 15000,
    description: 'UPNEDA state rooftop solar subsidy top-up',
  },
  Rajasthan: {
    stateName: 'Rajasthan',
    maxSubsidy: 15000,
    perKwBonus: 5000,
    description: 'Rajasthan Renewable Energy Corporation top-up',
  },
  None: {
    stateName: 'Other / Central Only',
    maxSubsidy: 0,
    perKwBonus: 0,
    description: 'Central PM Surya Ghar DBT subsidy only',
  },
};

export const SOLAR_DEFAULTS = {
  // Benchmark installation cost in INR per kW
  costPerKw: 60000,
  
  // Baseline electricity tariff (INR / kWh)
  electricityTariff: 7.0,

  // Performance Ratio (standard 75% - 80%)
  basePerformanceRatio: 0.78,

  // Required shadow-free roof area per kW (in square meters)
  sqMetersPerKw: 10.0,

  // Default roof usable factor (accounts for parapets, walkways, shadow)
  usableRoofFactor: 0.85,

  // Temperature loss coefficient (% output lost per °C of cell temp above 25°C)
  temperatureLossCoefficient: 0.004, // 0.4% per °C

  // Cell nominal operating temperature offset above ambient
  cellTempOffset: 25.0, // °C

  // Annual solar panel generation degradation (0.5% per year)
  annualDegradationRate: 0.005,

  // Annual electricity tariff escalation (3.0% per year)
  tariffEscalationRate: 0.03,

  // Grid carbon emission factor (kg CO2 per kWh)
  gridEmissionFactor: 0.75, // 0.75 kg CO2 / kWh
};

// PM Surya Ghar Central Slabs
export const CENTRAL_SUBSIDY_SLABS = {
  FIRST_KW: 30000, // ₹30,000 for 1st kW
  SECOND_KW: 30000, // ₹30,000 for 2nd kW (total ₹60,000 for 2 kW)
  THIRD_KW: 18000, // ₹18,000 for 3rd kW (total ₹78,000 for 3 kW)
  MAX_CAP: 78000, // ₹78,000 cap beyond 3 kW
  SWEET_SPOT_KW: 3.0,
};

// Month names and days
export const MONTHS = [
  { name: 'Jan', days: 31, defaultH: 4.8, defaultTemp: 18.0 },
  { name: 'Feb', days: 28, defaultH: 5.5, defaultTemp: 21.0 },
  { name: 'Mar', days: 31, defaultH: 6.2, defaultTemp: 26.5 },
  { name: 'Apr', days: 30, defaultH: 6.6, defaultTemp: 31.0 },
  { name: 'May', days: 31, defaultH: 6.8, defaultTemp: 34.0 },
  { name: 'Jun', days: 30, defaultH: 5.6, defaultTemp: 32.5 },
  { name: 'Jul', days: 31, defaultH: 4.3, defaultTemp: 29.5 },
  { name: 'Aug', days: 31, defaultH: 4.2, defaultTemp: 28.5 },
  { name: 'Sep', days: 30, defaultH: 5.0, defaultTemp: 28.5 },
  { name: 'Oct', days: 31, defaultH: 5.4, defaultTemp: 27.0 },
  { name: 'Nov', days: 30, defaultH: 4.9, defaultTemp: 23.0 },
  { name: 'Dec', days: 31, defaultH: 4.5, defaultTemp: 19.0 },
];
