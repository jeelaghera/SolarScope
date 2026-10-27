# ☀️ SolarScope

> **Satellite Rooftop Solar Sizing & PM Surya Ghar Subsidy Intelligence Platform**

SolarScope bridges the gap between complex solar physics and homeowner feasibility. Built for the **API Blitz 2026** hackathon, it combines high-resolution satellite rooftop tracing, 20+ years of NASA POWER climatology, live weather forecasting, and official PM Surya Ghar: Muft Bijli Yojana subsidy logic into a single cohesive experience.

---

## 🌟 Key Features

1. **Satellite Rooftop Tracing & Area Engine**
   - High-resolution Esri World Imagery satellite view.
   - Interactive rooftop polygon drawing powered by `leaflet-draw`.
   - Real-time geodesic area calculation in square meters and square feet via `Turf.js`.
   - Automatic determination of maximum physical solar capacity ($kW_p$ that fits at ~10 m²/kW).

2. **PM Surya Ghar DBT Subsidy Optimization**
   - Precise central subsidy slab calculations: ₹30,000/kW up to 2 kW, +₹18,000 for the 3rd kW, capped at ₹78,000.
   - Configurable state top-ups (Gujarat, Maharashtra, Uttar Pradesh, Rajasthan).
   - **Subsidy Efficiency Curve**: Visualizes why 3 kW is the natural sweet spot where subsidy per installed kW is maximized.

3. **NASA POWER 20+ Year Climatology & Summer Heat Derating**
   - Monthly global solar insolation ($ALLSKY\_SFC\_SW\_DWN$) and ambient temperatures ($T2M$).
   - Thermal derating physics: cell temperature calculation and $-0.4\%/^\circ\text{C}$ heat loss modeling for Indian summers.

4. **Live 7-Day Weather & Solar Generation Forecast**
   - Powered by Open-Meteo shortwave solar radiation forecasts.
   - Daily weather conditions, expected energy generation (kWh), and estimated daily bill savings.

5. **25-Year Financial Cashflow & Payback Analysis**
   - Cumulative break-even timeline with 0.5% annual panel degradation and 3.0% tariff inflation.
   - Lifetime bill savings, ROI, net profit, and environmental impact (tonnes of $CO_2$ avoided & equivalent trees planted).

6. **Downloadable PDF Feasibility Assessment & Social Sharing**
   - Client-side A4 feasibility report generation using `jsPDF`.
   - Formatted system specifications, financial ledger, and 3-step PM Surya Ghar application checklist.
   - One-click formatted summary sharing to WhatsApp.

---

## 🔌 API Matrix & Integration Architecture

| Service | API Role | Configuration in `.env` |
| :--- | :--- | :--- |
| **NASA Open API (`api.nasa.gov`)** | Official NASA API key authorization & APOD solar imagery | `VITE_NASA_API_KEY` |
| **NASA POWER Climatology** | 20+ year monthly solar irradiation & ambient temperatures | Endpoint (`power.larc.nasa.gov`) |
| **Open-Meteo Weather API** | 7-day forecast & shortwave solar radiation sum | `VITE_OPEN_METEO_API_KEY` |
| **Nominatim (OpenStreetMap)** | Address-to-coordinate geocoding & Indian state auto-detection | `VITE_NOMINATIM_API_KEY` |
| **REST Countries API** | Currency localization (`₹ / INR`) & regional metadata | `VITE_REST_COUNTRIES_API_KEY` |
| **Wikipedia REST API** | Educational summaries for Net Metering, Solar in India, and PV | `VITE_WIKIPEDIA_API_KEY` |

---

## 🧮 Mathematical & Physics Engine

All calculations are encapsulated in [`src/utils/solarCalculator.ts`](file:///Users/jeelaghera/Documents/GitHub/SolarScope/src/utils/solarCalculator.ts):

- **Sizing Rule**: 
  $$kW_{needed} = \frac{\text{Monthly Consumption (kWh)}}{H_{avg} \times 30 \times PR_{base}}$$
- **Physical Roof Limit**:
  $$kW_{roof\_max} = \frac{Area_{m^2} \times 0.85}{10\text{ m}^2/\text{kW}}$$
- **Summer Thermal Derate**:
  $$T_{cell} = T_{amb} + 25^\circ\text{C} \times \left(\frac{H}{5.2}\right)$$
  $$\text{Loss}_{temp} = \max(0, (T_{cell} - 25^\circ\text{C}) \times 0.004)$$
  $$PR_{eff} = PR_{base} \times (1 - \text{Loss}_{temp})$$
- **PM Surya Ghar Central Subsidy**:
  - $P \le 2\text{ kW} \implies P \times ₹30,000$
  - $2\text{ kW} < P \le 3\text{ kW} \implies ₹60,000 + (P - 2) \times ₹18,000$
  - $P > 3\text{ kW} \implies ₹78,000\text{ (Capped)}$

---

## 🚀 Quickstart & Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/jeelaghera/SolarScope.git
cd SolarScope
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure your API keys:
```bash
cp .env.example .env
```
Edit `.env`:
```env
VITE_NASA_API_KEY=your_nasa_api_key_here
VITE_OPEN_METEO_API_KEY=your_open_meteo_key_here
VITE_NOMINATIM_API_KEY=your_nominatim_key_here
VITE_REST_COUNTRIES_API_KEY=your_rest_countries_key_here
VITE_WIKIPEDIA_API_KEY=your_wikipedia_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run Unit Tests
```bash
npm test
```
Runs 11 test suites verifying subsidy slabs, solar physics, and 25-year cashflows via Vitest.

### 5. Production Build
```bash
npm run build
```

---

## 🎙️ 2-Minute Demo Flow for Judges

1. **Search City**: Type `Ahmedabad, Gujarat` or `Jaipur, Rajasthan` in the search bar. Notice instant map fly-to and state detection.
2. **Trace Rooftop**: Click a quick preset (`35 m² (~3 kW)`) or use the polygon tool to outline a rooftop. The floating HUD displays exact $m^2$, usable area, and max kWp.
3. **Inspect PM Surya Ghar Sweet Spot**: Show the Recharts **Subsidy Efficiency Curve**. Highlight how 3 kW captures the maximum ₹78,000 subsidy at ₹26,000/kW.
4. **Summer Heat Derate**: Point out the 12-month generation graph showing how Indian summer heat (April–June) causes an ~8% temperature derating.
5. **Live 7-Day Forecast**: View the Open-Meteo generation forecast for the upcoming week with weather icons.
6. **Download Report**: Click **PDF Report** to download the feasibility assessment with the official 3-step PM Surya Ghar checklist.
