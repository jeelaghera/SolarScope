import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  Info,
  MapPin,
  Search,
  Share2,
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
import type { SupportedLanguage } from './services/i18n';
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

export function App() {
  // Locale State
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const t = TRANSLATIONS[lang];

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

  // API Data States
  const [climatology, setClimatology] = useState<NasaPowerClimatology | null>(null);
  const [forecast, setForecast] = useState<WeeklyForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [wikiCards, setWikiCards] = useState<WikiArticleSummary[]>([]);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [_nasaApod, setNasaApod] = useState<NasaApodData | null>(null);

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

      // 2. Open-Meteo 7-day Live Forecast API
      setForecastLoading(true);
      try {
        const fcData = await fetchWeeklyForecast(lat, lon, systemCapacityKw, tariff);
        if (isMounted) setForecast(fcData);
      } catch (e) {
        console.warn('Open-Meteo error:', e);
      } finally {
        if (isMounted) setForecastLoading(false);
      }

      // 3. Wikipedia Summary API
      try {
        const cards = await fetchSolarEducationCards();
        if (isMounted) setWikiCards(cards);
      } catch (e) {
        console.warn('Wiki error:', e);
      }

      // 4. REST Countries API
      try {
        const cInfo = await fetchCountryDetails('india');
        if (isMounted) setCountryInfo(cInfo);
      } catch (e) {
        console.warn('REST Countries error:', e);
      }

      // 5. Official api.nasa.gov APOD API (Using NASA Open API Key)
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

  // Sync bill and units
  const handleBillChange = (val: number) => {
    setMonthlyBill(val);
    const computedUnits = Math.round(val / Math.max(1, tariff));
    setMonthlyUnits(computedUnits);
  };

  const handleUnitsChange = (val: number) => {
    setMonthlyUnits(val);
    setMonthlyBill(Math.round(val * tariff));
  };

  // When roof area is drawn on map
  const handleRoofAreaChange = (areaSqMeters: number) => {
    setRoofAreaM2(areaSqMeters);
    if (areaSqMeters > 0) {
      const maxKw = Math.max(0.5, Math.floor(((areaSqMeters * 0.85) / 10.0) * 10) / 10);
      const target = Math.min(maxKw, sizing.neededCapacityKw);
      setSystemCapacityKw(Math.max(1.0, Math.min(target, 10.0)));
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
            {/* Language Selector */}
            <div className="lang-selector">
              <button
                onClick={() => setLang('en')}
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLang('gu')}
                className={`lang-btn ${lang === 'gu' ? 'active' : ''}`}
              >
                ગુજરાતી
              </button>
            </div>

            {/* Quick PDF export in navbar */}
            <button onClick={handleDownloadPdf} className="btn-header-action">
              <Download size={15} />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main">
        {/* Address Search Banner */}
        <section className="search-banner">
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
        </section>

        {/* Two-Column Interactive Workspace: Map + Sizing Form */}
        <section className="workspace-grid">
          {/* Left: Satellite Rooftop Drawing Canvas */}
          <RoofMap
            lat={lat}
            lon={lon}
            onRoofAreaChange={handleRoofAreaChange}
            lang={lang}
            locationName={locationName}
          />

          {/* Right: Sizing & Financial Controls */}
          <div className="input-panel card-glass">
            <div className="panel-header">
              <h2 className="panel-title">System Sizing & Subsidy Inputs</h2>
              <p className="panel-subtitle">
                Fine-tune your monthly bill and capacity to see live DBT subsidy benefits
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
              <span className="label-hint">
                ~{monthlyUnits} units/month (approx. {curr}{(monthlyUnits * tariff).toFixed(0)} at {curr}{tariff}/kWh)
              </span>
            </div>

            {/* System Capacity Selector */}
            <div className="form-group">
              <div className="flex justify-between items-center">
                <label className="form-label">
                  <span>Selected System Capacity</span>
                  <span className="text-amber font-bold">{systemCapacityKw} kWp</span>
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
                  className={`size-pill-btn ${systemCapacityKw === 3.0 ? 'active' : ''}`}
                  style={{ borderColor: systemCapacityKw === 3.0 ? '#f59e0b' : 'rgba(245,158,11,0.4)' }}
                >
                  <span className="size-val text-amber">3 kW ⭐</span>
                  <span className="size-sub text-emerald">Max {curr}78k</span>
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

            {/* Editable Assumptions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div className="form-group">
                <label className="form-label text-xs">Tariff ({curr}/unit)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tariff}
                  onChange={(e) => setTariff(Number(e.target.value))}
                  className="form-input text-xs py-1"
                />
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
              </div>
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
              Needs ~{(systemCapacityKw * 10).toFixed(0)} m² shadow-free roof
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
              Total Subsidy: -{curr}{financials.totalSubsidy.toLocaleString('en-IN')}
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
              Break-even in {financials.paybackMonths} months
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
              ROI: {financials.roiPercent}% | Net Profit: {curr}{(financials.netLifetimeProfit / 100000).toFixed(2)}L
            </div>
          </div>
        </section>

        {/* 7-Day Live Forecast Widget (Powered by Open-Meteo) */}
        <section>
          <WeeklyForecastWidget
            forecast={forecast}
            loading={forecastLoading}
            systemKw={systemCapacityKw}
          />
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

        {/* 25-Year Cashflow & Payback Line Chart */}
        <section>
          <CashflowChart financials={financials} />
        </section>

        {/* Wikipedia Knowledge Cards & Policy Accordion */}
        {wikiCards.length > 0 && (
          <section className="card-glass">
            <div className="panel-header mb-3">
              <div className="flex items-center gap-2">
                <Info size={18} className="text-sky" />
                <h3 className="panel-title">{t.educationalTitle}</h3>
              </div>
              <p className="panel-subtitle">
                Contextual solar energy policies and technical terminology from Wikipedia
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
            </div>
          </section>
        )}

        {/* Next Steps Checklist & Actions */}
        <section className="action-banner">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{t.nextStepsTitle}</h3>
            <p className="text-sm text-slate-300 max-w-xl">
              Apply online at <strong>pmsuryaghar.gov.in</strong> to claim your {curr}{financials.totalSubsidy.toLocaleString('en-IN')} direct benefit transfer subsidy.
            </p>
          </div>

          <div className="action-btns">
            <button onClick={handleDownloadPdf} className="btn-primary-action">
              <Download size={18} />
              <span>{t.downloadPdf}</span>
            </button>
            <button onClick={handleShareWhatsApp} className="btn-whatsapp-action">
              <Share2 size={18} />
              <span>{t.shareWhatsApp}</span>
            </button>
          </div>
        </section>
      </main>

    </div>
  );
}

export default App;
