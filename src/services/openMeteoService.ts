// Open-Meteo 7-Day Live Forecast Service

export interface DailyForecast {
  date: string;
  dayName: string;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  tempMax: number;
  tempMin: number;
  radiationMj: number; // MJ/m²
  radiationKwhM2: number; // kWh/m²
  expectedGenerationKwh: number;
  expectedSavingsInr: number;
}

export interface WeeklyForecastResult {
  latitude: number;
  longitude: number;
  daily: DailyForecast[];
  totalWeeklyKwh: number;
  totalWeeklySavingsInr: number;
  avgDailyKwh: number;
}

const CACHE_PREFIX = 'solarscope_forecast_';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

function getWeatherMeta(code: number): { description: string; icon: string } {
  switch (code) {
    case 0:
      return { description: 'Clear sky', icon: '☀️' };
    case 1:
      return { description: 'Mainly clear', icon: '🌤️' };
    case 2:
      return { description: 'Partly cloudy', icon: '⛅' };
    case 3:
      return { description: 'Overcast', icon: '☁️' };
    case 45:
    case 48:
      return { description: 'Foggy', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { description: 'Drizzle', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { description: 'Rain', icon: '🌧️' };
    case 80:
    case 81:
    case 82:
      return { description: 'Rain showers', icon: '🌦️' };
    case 95:
      return { description: 'Thunderstorm', icon: '⛈️' };
    default:
      return { description: 'Sunny intervals', icon: '☀️' };
  }
}

/**
 * Fetches 7-day weather & solar irradiance forecast from Open-Meteo.
 */
export async function fetchWeeklyForecast(
  lat: number,
  lon: number,
  capacityKw = 3.0,
  tariffInr = 7.0,
  prBase = 0.78
): Promise<WeeklyForecastResult> {
  const latRounded = Math.round(lat * 100) / 100;
  const lonRounded = Math.round(lon * 100) / 100;
  const cacheKey = `${CACHE_PREFIX}${latRounded}_${lonRounded}`;

  let rawData: any = null;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        rawData = parsed.data;
      }
    }
  } catch {
    // Ignore cache failure
  }

  if (!rawData) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latRounded}&longitude=${lonRounded}&daily=shortwave_radiation_sum,temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
      rawData = await res.json();

      try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: rawData }));
      } catch {
        // Cache write failed
      }
    } catch (err) {
      console.warn('Open-Meteo API fetch failed, simulating reasonable 7-day pattern:', err);
      // Fallback synthetic 7-day data
      rawData = generateFallbackForecastData();
    }
  }

  const times: string[] = rawData?.daily?.time || [];
  const radiations: number[] = rawData?.daily?.shortwave_radiation_sum || [];
  const maxTemps: number[] = rawData?.daily?.temperature_2m_max || [];
  const minTemps: number[] = rawData?.daily?.temperature_2m_min || [];
  const codes: number[] = rawData?.daily?.weathercode || [];

  let totalWeeklyKwh = 0;
  let totalWeeklySavingsInr = 0;

  const daily: DailyForecast[] = times.map((t, idx) => {
    const dateObj = new Date(t);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const radMj = radiations[idx] ?? 18.0;
    // 1 MJ/m² = 0.27778 kWh/m²
    const radKwhM2 = Math.round((radMj / 3.6) * 100) / 100;

    const tMax = maxTemps[idx] ?? 32.0;
    const tMin = minTemps[idx] ?? 24.0;

    // Thermal derating for daytime peak
    const cellTemp = tMax + 20.0 * (radKwhM2 / 5.5);
    const tempLoss = Math.max(0, (cellTemp - 25.0) * 0.004);
    const prEff = Math.max(0.65, prBase * (1 - tempLoss));

    // Daily kWh = kWp * radiation (kWh/m²) * PR_eff
    const expectedGenerationKwh = Math.round(capacityKw * radKwhM2 * prEff * 10) / 10;
    const expectedSavingsInr = Math.round(expectedGenerationKwh * tariffInr);

    totalWeeklyKwh += expectedGenerationKwh;
    totalWeeklySavingsInr += expectedSavingsInr;

    const weatherMeta = getWeatherMeta(codes[idx] ?? 0);

    return {
      date: t,
      dayName,
      weatherCode: codes[idx] ?? 0,
      weatherDescription: weatherMeta.description,
      weatherIcon: weatherMeta.icon,
      tempMax: Math.round(tMax),
      tempMin: Math.round(tMin),
      radiationMj: Math.round(radMj * 10) / 10,
      radiationKwhM2: radKwhM2,
      expectedGenerationKwh,
      expectedSavingsInr,
    };
  });

  return {
    latitude: latRounded,
    longitude: lonRounded,
    daily,
    totalWeeklyKwh: Math.round(totalWeeklyKwh * 10) / 10,
    totalWeeklySavingsInr: Math.round(totalWeeklySavingsInr),
    avgDailyKwh: Math.round((totalWeeklyKwh / Math.max(1, daily.length)) * 10) / 10,
  };
}

function generateFallbackForecastData() {
  const dates: string[] = [];
  const radiations: number[] = [];
  const maxTemps: number[] = [];
  const minTemps: number[] = [];
  const codes: number[] = [];

  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
    radiations.push(18.5 + (Math.sin(i) * 3));
    maxTemps.push(33 + (i % 2));
    minTemps.push(24);
    codes.push(i % 3 === 0 ? 1 : 0);
  }

  return {
    daily: {
      time: dates,
      shortwave_radiation_sum: radiations,
      temperature_2m_max: maxTemps,
      temperature_2m_min: minTemps,
      weathercode: codes,
    },
  };
}
