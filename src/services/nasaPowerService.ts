// NASA POWER Climatology Service (20+ Year Solar & Temperature Data)

export interface NasaPowerClimatology {
  latitude: number;
  longitude: number;
  monthlyIrradiationH: number[]; // 12 elements (Jan-Dec) in kWh/m²/day
  monthlyTemperatures: number[]; // 12 elements (Jan-Dec) in °C
  annualAvgH: number;
  annualAvgTemp: number;
  source: 'nasa_power' | 'fallback_regional';
}

const CACHE_PREFIX = 'solarscope_nasa_';
const MONTH_KEYS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Fallback Indian national solar averages if network request fails
const DEFAULT_FALLBACK_H = [4.8, 5.5, 6.2, 6.6, 6.8, 5.6, 4.3, 4.2, 5.0, 5.4, 4.9, 4.5];
const DEFAULT_FALLBACK_T = [18.0, 21.0, 26.5, 31.0, 34.0, 32.5, 29.5, 28.5, 28.5, 27.0, 23.0, 19.0];

/**
 * Fetches 20+ year climatology from NASA POWER API.
 * Free, public, no API key required.
 */
export async function fetchNasaClimatology(lat: number, lon: number): Promise<NasaPowerClimatology> {
  const latRounded = Math.round(lat * 100) / 100;
  const lonRounded = Math.round(lon * 100) / 100;
  const cacheKey = `${CACHE_PREFIX}${latRounded}_${lonRounded}`;

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore storage issues
  }

  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN,T2M&community=RE&longitude=${lonRounded}&latitude=${latRounded}&format=JSON`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NASA POWER request failed with HTTP ${res.status}`);
    const data = await res.json();

    const param = data?.properties?.parameter;
    const allSky = param?.ALLSKY_SFC_SW_DWN;
    const t2m = param?.T2M;

    if (!allSky || !t2m) {
      throw new Error('Missing parameter data in NASA POWER response');
    }

    const monthlyIrradiationH = MONTH_KEYS.map((k, i) => {
      const val = allSky[k];
      return typeof val === 'number' && val > 0 ? Math.round(val * 100) / 100 : DEFAULT_FALLBACK_H[i];
    });

    const monthlyTemperatures = MONTH_KEYS.map((k, i) => {
      const val = t2m[k];
      return typeof val === 'number' ? Math.round(val * 10) / 10 : DEFAULT_FALLBACK_T[i];
    });

    const annualAvgH = typeof allSky.ANN === 'number'
      ? Math.round(allSky.ANN * 100) / 100
      : Math.round((monthlyIrradiationH.reduce((a, b) => a + b, 0) / 12) * 100) / 100;

    const annualAvgTemp = typeof t2m.ANN === 'number'
      ? Math.round(t2m.ANN * 10) / 10
      : Math.round((monthlyTemperatures.reduce((a, b) => a + b, 0) / 12) * 10) / 10;

    const result: NasaPowerClimatology = {
      latitude: latRounded,
      longitude: lonRounded,
      monthlyIrradiationH,
      monthlyTemperatures,
      annualAvgH,
      annualAvgTemp,
      source: 'nasa_power',
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // Storage full
    }

    return result;
  } catch (error) {
    console.warn('NASA POWER API fetch error, using robust regional fallback:', error);
    return {
      latitude: latRounded,
      longitude: lonRounded,
      monthlyIrradiationH: DEFAULT_FALLBACK_H,
      monthlyTemperatures: DEFAULT_FALLBACK_T,
      annualAvgH: 5.3,
      annualAvgTemp: 26.0,
      source: 'fallback_regional',
    };
  }
}
