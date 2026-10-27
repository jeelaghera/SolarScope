import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  ExternalLink,
  Home,
  Info,
  MapPin,
  Search,
  Share2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import { CashflowChart } from './components/CashflowChart';
import { MonthlyGenerationChart } from './components/MonthlyGenerationChart';
import { RoofMap } from './components/RoofMap';
import { SubsidyCurveChart } from './components/SubsidyCurveChart';
import { WeeklyForecastWidget } from './components/WeeklyForecastWidget';
import { SOLAR_DEFAULTS, STATE_SUBSIDY_RULES } from './config/solarConfig';
import { TRANSLATIONS } from './services/i18n';
import type { NasaApodData } from './services/nasaApodService';
import { fetchNasaApod } from './services/nasaApodService';
import type { NasaPowerClimatology } from './services/nasaPowerService';
import { fetchNasaClimatology } from './services/nasaPowerService';
import type { GeocodeResult } from './services/nominatimService';
import { detectIndianState, searchAddress } from './services/nominatimService';
import type { WeeklyForecastResult } from './services/openMeteoService';
import { fetchWeeklyForecast } from './services/openMeteoService';
import type { CountryInfo } from './services/restCountriesService';
import { fetchCountryDetails } from './services/restCountriesService';
import type { WikiArticleSummary } from './services/wikipediaService';
import { fetchSolarEducationCards } from './services/wikipediaService';
import { generatePdfReport } from './utils/pdfGenerator';
import type {
  FinancialResult,
  GenerationResult,
  SizingResult,
} from './utils/solarCalculator';
import {
  calculateFinancials,
  calculateMonthlyGeneration,
  calculateSizing,
} from './utils/solarCalculator';

const QUICK_CITIES = [
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, state: 'Gujarat', label: 'Ahmedabad, Gujarat, India' },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873, state: 'Rajasthan', label: 'Jaipur, Rajasthan, India' },
  { name: 'Pune', lat: 18.5204, lon: 73.8567, state: 'Maharashtra', label: 'Pune, Maharashtra, India' },
  { name: 'Lucknow', lat: 26.8467, lon: 80.9462, state: 'UttarPradesh', label: 'Lucknow, Uttar Pradesh, India' },
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090, state: 'None', label: 'New Delhi, Delhi, India' },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, state: 'None', label: 'Bengaluru, Karnataka, India' },
];

export function App() {
  const t = TRANSLATIONS.en;

  // Geolocation & Address State (Default: Ahmedabad, Gujarat - solar hub)
  const [lat, setLat] = useState<number>(23.0225);
  const [lon, setLon] = useState<number>(72.5714);
  const [locationName, setLocationName] = useState<string>('Ahmedabad, Gujarat, India');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Roof & Sizing Inputs
  const [roofAreaM2, setRoofAreaM2] = useState<number>(35); // default ~35 m²
  const [monthlyUnits, setMonthlyUnits] = useState<number>(380); // default ~380 units
  const [monthlyBill, setMonthlyBill] = useState<number>(2660); // 380 units * ₹7 = ₹2660
  const [inputMode, setInputMode] = useState<'units' | 'bill'>('bill');
  const [systemCapacityKw, setSystemCapacityKw] = useState<number>(3.0);
  const [stateKey, setStateKey] = useState<string>('Gujarat');
  const [tariff, setTariff] = useState<number>(SOLAR_DEFAULTS.electricityTariff);
  const [costPerKw, setCostPerKw] = useState<number>(SOLAR_DEFAULTS.costPerKw);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // API Data States
  const [climatology, setClimatology] = useState<NasaPowerClimatology | null>(null);
  const [forecast, setForecast] = useState<WeeklyForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [wikiCards, setWikiCards] = useState<WikiArticleSummary[]>([]);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [nasaApod, setNasaApod] = useState<NasaApodData | null>(null);

  // Computed Solar Intelligence Results
  const [sizing, setSizing] = useState<SizingResult>(() =>
    calculateSizing(roofAreaM2, monthlyUnits, 5.2)
  );
  const [generation, setGeneration] = useState<GenerationResult>(() =>
    calculateMonthlyGeneration(systemCapacityKw)
  );
  const [financials, setFinancials] = useState<FinancialResult>(() =>
    calculateFinancials(systemCapacityKw, generation.annualKwh, costPerKw, stateKey, tariff)
  );

  // Initial Data Fetch: NASA POWER, Open-Meteo, Wikipedia, REST Countries, NASA APOD (api.nasa.gov)
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 1. NASA POWER Climatology API
      try {
        const nasaData = await fetchNasaClimatology(lat, lon);
        if (isMounted) setClimatology(nasaData);
      } catch (e) {
        console.warn('NASA POWER error:', e);
      }

      // 2. Wikipedia Summary API
      try {
        const cards = await fetchSolarEducationCards();
        if (isMounted) setWikiCards(cards);
      } catch (e) {
        console.warn('Wiki error:', e);
      }

      // 3. REST Countries API
      try {
        const cInfo = await fetchCountryDetails('india');
        if (isMounted) setCountryInfo(cInfo);
      } catch (e) {
        console.warn('REST Countries error:', e);
      }

      // 4. Official api.nasa.gov APOD API (Using NASA Open API Key)
      try {
        const apod = await fetchNasaApod();
        if (isMounted) setNasaApod(apod);
      } catch (e) {
        console.warn('NASA APOD error:', e);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [lat, lon]);

  // Reactive 7-day weather & solar forecast whenever lat, lon, capacity, or tariff updates
  useEffect(() => {
    let isMounted = true;

    async function updateForecast() {
      setForecastLoading(true);
      try {
        const fcData = await fetchWeeklyForecast(lat, lon, systemCapacityKw, tariff);
        if (isMounted) setForecast(fcData);
      } catch (e) {
        console.warn('Open-Meteo forecast update error:', e);
      } finally {
        if (isMounted) setForecastLoading(false);
      }
    }

    updateForecast();

    return () => {
      isMounted = false;
    };
  }, [lat, lon, systemCapacityKw, tariff]);

  // Recalculate Solar Intelligence when inputs change
  useEffect(() => {
    const avgH = climatology?.annualAvgH ?? 5.2;
    const computedSizing = calculateSizing(roofAreaM2, monthlyUnits, avgH);
    setSizing(computedSizing);

    const computedGen = calculateMonthlyGeneration(
      systemCapacityKw,
      climatology?.monthlyIrradiationH,
      climatology?.monthlyTemperatures,
      SOLAR_DEFAULTS.basePerformanceRatio,
      tariff
    );
    setGeneration(computedGen);

    const computedFin = calculateFinancials(
      systemCapacityKw,
      computedGen.annualKwh,
      costPerKw,
      stateKey,
      tariff
    );
    setFinancials(computedFin);
  }, [systemCapacityKw, roofAreaM2, monthlyUnits, stateKey, tariff, costPerKw, climatology]);

  // Sync bill, units, and auto-recommend system capacity
  const handleBillChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setMonthlyBill(safeVal);
    const computedUnits = Math.round(safeVal / Math.max(1, tariff));
    setMonthlyUnits(computedUnits);

    const avgH = climatology?.annualAvgH ?? 5.2;
    const computedSizing = calculateSizing(roofAreaM2, computedUnits, avgH);
    setSystemCapacityKw(Math.max(1.0, Math.min(computedSizing.recommendedCapacityKw, 10.0)));
  };

  const handleUnitsChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setMonthlyUnits(safeVal);
    setMonthlyBill(Math.round(safeVal * tariff));

    const avgH = climatology?.annualAvgH ?? 5.2;
    const computedSizing = calculateSizing(roofAreaM2, safeVal, avgH);
    setSystemCapacityKw(Math.max(1.0, Math.min(computedSizing.recommendedCapacityKw, 10.0)));
  };

  const handleTariffChange = (val: number) => {
    const safeTariff = Math.max(1, val);
    setTariff(safeTariff);
    if (inputMode === 'bill') {
      const computedUnits = Math.round(monthlyBill / safeTariff);
      setMonthlyUnits(computedUnits);
      const avgH = climatology?.annualAvgH ?? 5.2;
      const computedSizing = calculateSizing(roofAreaM2, computedUnits, avgH);
      setSystemCapacityKw(Math.max(1.0, Math.min(computedSizing.recommendedCapacityKw, 10.0)));
    } else {
      setMonthlyBill(Math.round(monthlyUnits * safeTariff));
    }
  };

  // When roof area is drawn on map
  const handleRoofAreaChange = (areaSqMeters: number) => {
    setRoofAreaM2(areaSqMeters);
    const avgH = climatology?.annualAvgH ?? 5.2;
    const computedSizing = calculateSizing(areaSqMeters, monthlyUnits, avgH);
    if (areaSqMeters > 0) {
      setSystemCapacityKw(Math.max(1.0, Math.min(computedSizing.recommendedCapacityKw, 10.0)));
    } else {
      // Revert to unconstrained units sizing when polygon cleared
      setSystemCapacityKw(Math.max(1.0, Math.min(computedSizing.neededCapacityKw, 10.0)));
    }
  };

  // Address search handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchAddress(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectLocation = (loc: GeocodeResult) => {
    setLat(loc.lat);
    setLon(loc.lon);
    setLocationName(loc.displayName);
    setSearchResults([]);
    setSearchQuery('');

    // Auto-detect Indian state to prefill state subsidy
    const detected = detectIndianState(loc.state);
    if (detected !== 'None') {
      setStateKey(detected);
    }
  };

  // Trigger celebration confetti when clicking 3 kW sweet spot
  const handleSweetSpotClick = () => {
    setSystemCapacityKw(3.0);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#10b981', '#38bdf8'],
    });
  };

  // PDF Export
  const handleDownloadPdf = () => {
    generatePdfReport({
      address: locationName,
      state: STATE_SUBSIDY_RULES[stateKey]?.stateName || stateKey,
      monthlyBill,
      monthlyUnits,
      sizing,
      generation,
      financials,
      tariff,
      costPerKw,
    });
  };

  // WhatsApp Shareable Text
  const handleShareWhatsApp = () => {
    const currSymbol = countryInfo?.currencySymbol || '₹';
    const text = `☀️ *My Rooftop Solar Assessment (SolarScope)*
📍 Location: ${locationName.split(',')[0]}
⚡ Recommended System: ${systemCapacityKw} kWp
💰 PM Surya Ghar Subsidy: ${currSymbol}${financials.totalSubsidy.toLocaleString('en-IN')}
💵 Net Cost: ${currSymbol}${financials.netInvestment.toLocaleString('en-IN')}
⏱️ Payback Period: ~${financials.paybackYears} Years
📈 25-Year Savings: ${currSymbol}${financials.lifetimeSavings.toLocaleString('en-IN')}
🌱 CO₂ Avoided: ${financials.totalCo2AvoidedTonnes} Tonnes

Check your rooftop solar potential with SolarScope!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const curr = countryInfo?.currencySymbol || '₹';

  return (
    <div className="solarscope-app">
      {/* App Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section">
            <div className="brand-logo-icon">
              <Sun size={24} />
            </div>
            <div>
              <span className="brand-title">{t.appTitle}</span>
            </div>
          </div>

          <div className="header-actions">
            <div className="current-pin-pill">
              <MapPin size={13} className="text-amber" />
              <span>{locationName.split(',')[0]}</span>
            </div>
            {/* Quick PDF export in navbar */}
            <button onClick={handleDownloadPdf} className="btn-header-action" title="Download instant feasibility report">
              <Download size={15} />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main">
        {/* Hero & Address Search Banner */}
        <section className="search-banner">
          <div className="hero-text-block">
            <h1 className="hero-heading">Satellite Rooftop Solar & PM Surya Ghar Sizing Engine</h1>
            <p className="hero-subtext">
              Trace your roof on satellite maps, calculate central & state DBT subsidies, predict summer heat derating with 20+ years of NASA climatology, and download an official feasibility report.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="search-form">
            <div className="search-input-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="search-input"
              />
            </div>
            <button type="submit" disabled={isSearching} className="btn-search">
              {isSearching ? <span className="spinner-sm" /> : <MapPin size={16} />}
              <span>{t.searchButton}</span>
            </button>

            {/* Suggestions dropdown */}
            {searchResults.length > 0 && (
              <div className="search-suggestions">
                {searchResults.map((item) => (
                  <div
                    key={item.placeId}
                    onClick={() => handleSelectLocation(item)}
                    className="suggestion-item"
                  >
                    <MapPin size={14} className="text-amber" />
                    <span>{item.displayName}</span>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* Quick city selector chips */}
          <div className="quick-city-pills">
            <span className="quick-city-label">Popular Solar Hubs:</span>
            {QUICK_CITIES.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setLat(c.lat);
                  setLon(c.lon);
                  setLocationName(c.label);
                  if (c.state !== 'None') setStateKey(c.state);
                }}
                className={`btn-chip ${locationName.includes(c.name) ? 'active' : ''}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </section>

        {/* Two-Column Interactive Workspace: Map + Sizing Form */}
        <section className="workspace-grid">
          {/* Left: Satellite Rooftop Drawing Canvas */}
          <RoofMap
            lat={lat}
            lon={lon}
            onRoofAreaChange={handleRoofAreaChange}
            locationName={locationName}
          />

          {/* Right: Sizing & Financial Controls */}
          <div className="input-panel card-glass">
            <div className="panel-header">
              <div className="flex items-center justify-between">
                <h2 className="panel-title">System Sizing & Subsidy Inputs</h2>
                <span className="step-tag">Step 1</span>
              </div>
              <p className="panel-subtitle">
                Enter your monthly bill to auto-calculate your recommended system & subsidies
              </p>
            </div>

            {/* Monthly Consumption Input */}
            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label">{t.monthlyConsumption}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode('bill')}
                    className={`btn-chip ${inputMode === 'bill' ? 'active' : ''}`}
                  >
                    Bill ({curr})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('units')}
                    className={`btn-chip ${inputMode === 'units' ? 'active' : ''}`}
                  >
                    Units (kWh)
                  </button>
                </div>
              </div>

              {inputMode === 'bill' ? (
                <div className="form-input-wrap">
                  <span className="form-prefix">{curr}</span>
                  <input
                    type="number"
                    min="500"
                    max="50000"
                    step="100"
                    value={monthlyBill}
                    onChange={(e) => handleBillChange(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              ) : (
                <div className="form-input-wrap">
                  <span className="form-prefix">⚡</span>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    step="10"
                    value={monthlyUnits}
                    onChange={(e) => handleUnitsChange(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              )}

              {/* Quick bill preset pills */}
              {inputMode === 'bill' && (
                <div className="quick-bill-pills">
                  <span className="quick-bill-label">Quick Bills:</span>
                  {[1500, 2500, 4000, 6000].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleBillChange(b)}
                      className={`btn-chip ${monthlyBill === b ? 'active-amber' : ''}`}
                    >
                      {curr}{b.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              )}

              <span className="label-hint">
                ~{monthlyUnits} units/month (approx. {curr}{(monthlyUnits * tariff).toFixed(0)} at {curr}{tariff}/kWh)
              </span>
            </div>

            {/* System Capacity Selector */}
            <div className="form-group">
              <div className="flex justify-between items-center">
                <label className="form-label">
                  <span>Selected System Capacity</span>
                  <span className="text-amber font-bold text-base">{systemCapacityKw} kWp</span>
                </label>
              </div>

              {/* Quick Size Chips including Sweet Spot */}
              <div className="size-selector-grid">
                <button
                  type="button"
                  onClick={() => setSystemCapacityKw(1.0)}
                  className={`size-pill-btn ${systemCapacityKw === 1.0 ? 'active' : ''}`}
                >
                  <span className="size-val">1 kW</span>
                  <span className="size-sub">{curr}30k Sub</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSystemCapacityKw(2.0)}
                  className={`size-pill-btn ${systemCapacityKw === 2.0 ? 'active' : ''}`}
                >
                  <span className="size-val">2 kW</span>
                  <span className="size-sub">{curr}60k Sub</span>
                </button>
                <button
                  type="button"
                  onClick={handleSweetSpotClick}
                  className={`size-pill-btn sweetspot-highlight ${systemCapacityKw === 3.0 ? 'active' : ''}`}
                >
                  <span className="size-val text-amber">3 kW ⭐</span>
                  <span className="size-sub text-emerald font-semibold">Max {curr}78k</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSystemCapacityKw(5.0)}
                  className={`size-pill-btn ${systemCapacityKw === 5.0 ? 'active' : ''}`}
                >
                  <span className="size-val">5 kW</span>
                  <span className="size-sub">{curr}78k Cap</span>
                </button>
              </div>

              {/* Sweet spot callout */}
              {systemCapacityKw === 3.0 && (
                <div className="sweetspot-callout">
                  <Sparkles size={14} className="text-amber flex-shrink-0" />
                  <span><strong>3 kW Sweet Spot:</strong> Captures 100% of maximum PM Surya Ghar central DBT subsidy ({curr}78,000)!</span>
                </div>
              )}

              {/* Capacity Slider */}
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={systemCapacityKw}
                onChange={(e) => setSystemCapacityKw(Number(e.target.value))}
                className="range-slider mt-2"
              />
            </div>

            {/* State Subsidy Top-up */}
            <div className="form-group">
              <label className="form-label">{t.stateSubsidy}</label>
              <select
                value={stateKey}
                onChange={(e) => setStateKey(e.target.value)}
                className="form-select"
              >
                {Object.entries(STATE_SUBSIDY_RULES).map(([key, rule]) => (
                  <option key={key} value={key}>
                    {rule.stateName} {rule.maxSubsidy > 0 ? `(+${curr}${rule.maxSubsidy.toLocaleString('en-IN')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Advanced Parameters Accordion (Keeps UI uncluttered) */}
            <div className="advanced-accordion">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="btn-toggle-advanced"
              >
                <div className="flex items-center gap-1.5">
                  <Sliders size={13} className="text-amber" />
                  <span>Customize Tariff & Equipment Cost</span>
                </div>
                {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showAdvanced && (
                <div className="advanced-drawer-content">
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="form-group">
                      <label className="form-label text-xs">Tariff ({curr}/unit)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={tariff}
                        onChange={(e) => handleTariffChange(Number(e.target.value))}
                        className="form-input text-xs py-1"
                      />
                      <span className="label-hint">Default: {curr}7.0/kWh</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label text-xs">Cost/kW ({curr})</label>
                      <input
                        type="number"
                        step="5000"
                        value={costPerKw}
                        onChange={(e) => setCostPerKw(Number(e.target.value))}
                        className="form-input text-xs py-1"
                      />
                      <span className="label-hint">Default: {curr}60,000/kW</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recommendation Alert Box */}
            <div className="chart-insight-box">
              <Sparkles size={16} className="text-amber flex-shrink-0 mt-0.5" />
              <span>{sizing.sweetSpotRecommendation}</span>
            </div>
          </div>
        </section>

        {/* Metric Ribbon Summary (4 Key High-Level Stats) */}
        <section className="metric-ribbon">
          {/* Card 1: System Sizing */}
          <div className="metric-card accent-amber">
            <div className="metric-header">
              <span className="metric-title">{t.recommendedSystem}</span>
              <Sun size={18} className="text-amber" />
            </div>
            <div className="metric-value">{systemCapacityKw} kWp</div>
            <div className="metric-sub">
              Needs ~{(systemCapacityKw * 10).toFixed(0)} m² ({Math.round(systemCapacityKw * 10 * 10.76)} sq.ft) roof
            </div>
          </div>

          {/* Card 2: Net Investment Outlay */}
          <div className="metric-card accent-emerald">
            <div className="metric-header">
              <span className="metric-title">{t.netCost}</span>
              <Award size={18} className="text-emerald" />
            </div>
            <div className="metric-value text-emerald">
              {curr}{financials.netInvestment.toLocaleString('en-IN')}
            </div>
            <div className="metric-sub">
              Gross: {curr}{financials.grossCost.toLocaleString('en-IN')} | Subsidy: -{curr}{financials.totalSubsidy.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Card 3: Payback Period */}
          <div className="metric-card accent-sky">
            <div className="metric-header">
              <span className="metric-title">{t.paybackPeriod}</span>
              <Zap size={18} className="text-sky" />
            </div>
            <div className="metric-value">~{financials.paybackYears} Years</div>
            <div className="metric-sub">
              100% investment recovered in ~{financials.paybackMonths} months
            </div>
          </div>

          {/* Card 4: 25-Year Lifetime Savings */}
          <div className="metric-card accent-emerald">
            <div className="metric-header">
              <span className="metric-title">{t.twentyFiveYearSavings}</span>
              <CheckCircle2 size={18} className="text-emerald" />
            </div>
            <div className="metric-value text-emerald">
              {curr}{(financials.lifetimeSavings / 100000).toFixed(2)} Lakhs
            </div>
            <div className="metric-sub">
              Net Profit: {curr}{(financials.netLifetimeProfit / 100000).toFixed(2)}L ({financials.roiPercent}% ROI)
            </div>
          </div>
        </section>

        {/* 2x2 Data Intelligence Visualizations */}
        <section className="charts-grid">
          {/* Chart 1: PM Surya Ghar Subsidy Efficiency Curve */}
          <SubsidyCurveChart
            currentKw={systemCapacityKw}
            stateName={stateKey}
          />

          {/* Chart 2: 12-Month Generation & Temperature Derating */}
          <MonthlyGenerationChart generation={generation} />
        </section>

        {/* 7-Day Live Generation Forecast Widget (Powered by Open-Meteo) */}
        <section>
          <WeeklyForecastWidget
            forecast={forecast}
            loading={forecastLoading}
            systemKw={systemCapacityKw}
          />
        </section>

        {/* 25-Year Cashflow & Payback Line Chart */}
        <section>
          <CashflowChart financials={financials} />
        </section>

        {/* Wikipedia Knowledge Cards & Policy Summary */}
        {wikiCards.length > 0 && (
          <section className="card-glass">
            <div className="panel-header mb-3">
              <div className="flex items-center gap-2">
                <Info size={18} className="text-sky" />
                <h3 className="panel-title">{t.educationalTitle}</h3>
              </div>
              <p className="panel-subtitle">
                Contextual solar energy policies, net metering regulations, and photovoltaic basics from Wikipedia
              </p>
            </div>

            <div className="edu-grid">
              {wikiCards.map((card) => (
                <div key={card.title} className="edu-card">
                  <div>
                    <h4 className="edu-card-title">{card.displayTitle}</h4>
                    <p className="edu-card-extract">
                      {card.extract.length > 170 ? card.extract.substring(0, 170) + '...' : card.extract}
                    </p>
                  </div>
                  <a
                    href={card.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="edu-card-link"
                  >
                    <span>Read on Wikipedia</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}

              {nasaApod && (
                <div className="edu-card">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="edu-card-title">NASA Solar Observation</h4>
                      <span className="text-xs text-amber font-semibold">api.nasa.gov</span>
                    </div>
                    <p className="edu-card-extract">
                      {nasaApod.title}: {nasaApod.explanation.length > 130 ? nasaApod.explanation.substring(0, 130) + '...' : nasaApod.explanation}
                    </p>
                  </div>
                  <a
                    href={nasaApod.hdurl || nasaApod.url}
                    target="_blank"
                    rel="noreferrer"
                    className="edu-card-link"
                  >
                    <span>View NASA APOD</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* PM Surya Ghar DBT Application Checklist */}
        <section className="card-glass checklist-section">
          <div className="panel-header mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald" />
                <h3 className="panel-title">PM Surya Ghar: Muft Bijli Yojana Application Checklist</h3>
              </div>
              <span className="badge-step">Pre-application</span>
            </div>
            <p className="panel-subtitle">
              Verify these 4 prerequisites before initiating your DBT subsidy claim on the National Portal
            </p>
          </div>

          <div className="checklist-grid">
            <div className="checklist-card">
              <div className="checklist-icon-box">
                <Zap size={20} className="text-amber" />
              </div>
              <div className="checklist-content">
                <div className="checklist-step-tag">Step 01</div>
                <h4 className="checklist-card-title">DISCOM Consumer ID</h4>
                <p className="checklist-card-desc">
                  Active electricity connection in the applicant's name with recent paid electricity bill.
                </p>
              </div>
            </div>

            <div className="checklist-card">
              <div className="checklist-icon-box">
                <CreditCard size={20} className="text-emerald" />
              </div>
              <div className="checklist-content">
                <div className="checklist-step-tag">Step 02</div>
                <h4 className="checklist-card-title">Aadhaar-Linked Bank Account</h4>
                <p className="checklist-card-desc">
                  Bank account with Aadhaar seeding and NPCI mapping for direct government subsidy deposit.
                </p>
              </div>
            </div>

            <div className="checklist-card">
              <div className="checklist-icon-box">
                <Home size={20} className="text-sky" />
              </div>
              <div className="checklist-content">
                <div className="checklist-step-tag">Step 03</div>
                <h4 className="checklist-card-title">Shadow-Free Rooftop</h4>
                <p className="checklist-card-desc">
                  Minimum ~10 m² (107 sq.ft) per kWp of unshaded roof space for module mounting structures.
                </p>
              </div>
            </div>

            <div className="checklist-card">
              <div className="checklist-icon-box">
                <ShieldCheck size={20} className="text-emerald" />
              </div>
              <div className="checklist-content">
                <div className="checklist-step-tag">Step 04</div>
                <h4 className="checklist-card-title">Empaneled Vendor & Net Meter</h4>
                <p className="checklist-card-desc">
                  DISCOM-approved vendor installation followed by bi-directional net-meter commissioning.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Next Steps Checklist & Actions */}
        <section className="action-banner">
          <div>
            <div className="badge-ready">Ready to Go Solar?</div>
            <h3 className="action-heading">Claim Up to {curr}{financials.totalSubsidy.toLocaleString('en-IN')} in Direct DBT Subsidy</h3>
            <p className="action-subtext">
              Apply online at <strong>pmsuryaghar.gov.in</strong> or download your official rooftop solar feasibility report to share with local vendors.
            </p>
          </div>

          <div className="action-btns">
            <a
              href="https://pmsuryaghar.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="btn-portal-action"
            >
              <ExternalLink size={18} />
              <span>Apply on pmsuryaghar.gov.in</span>
            </a>
            <button onClick={handleDownloadPdf} className="btn-primary-action">
              <Download size={18} />
              <span>Download Official Report (PDF)</span>
            </button>
            <button onClick={handleShareWhatsApp} className="btn-whatsapp-action">
              <Share2 size={18} />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </section>
      </main>

    </div>
  );
}

export default App;
