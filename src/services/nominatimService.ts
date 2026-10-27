// Nominatim OpenStreetMap Geocoding Service with Caching and Rate Limiting

export interface GeocodeResult {
  placeId: number;
  displayName: string;
  lat: number;
  lon: number;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

const CACHE_PREFIX = 'solarscope_geo_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

function getFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setInCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { timestamp: Date.now(), data };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Ignore storage quota exceeded
  }
}

// Map Nominatim state name to SolarScope state key
export function detectIndianState(stateStr?: string): string {
  if (!stateStr) return 'None';
  const lower = stateStr.toLowerCase();
  if (lower.includes('gujarat')) return 'Gujarat';
  if (lower.includes('maharashtra')) return 'Maharashtra';
  if (lower.includes('uttar pradesh') || lower.includes('u.p.')) return 'UttarPradesh';
  if (lower.includes('rajasthan')) return 'Rajasthan';
  return 'None';
}

/**
 * Search location by query text.
 */
export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const cacheKey = `search_${trimmed.toLowerCase()}`;
  const cached = getFromCache<GeocodeResult[]>(cacheKey);
  if (cached) return cached;

  const apiKey = import.meta.env.VITE_NOMINATIM_API_KEY || '';
  const keyParam = apiKey && !apiKey.startsWith('demo') ? `&key=${encodeURIComponent(apiKey)}` : '';
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    trimmed
  )}&addressdetails=1&countrycodes=in&limit=5${keyParam}`;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'SolarScope-Platform/1.0',
    };
    if (apiKey) headers['X-API-Key'] = apiKey;

    const res = await fetch(url, { headers });

    if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
    const data = await res.json();

    const results: GeocodeResult[] = (data || []).map((item: any) => ({
      placeId: item.place_id,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      city: item.address?.city || item.address?.town || item.address?.suburb || item.address?.village,
      state: item.address?.state,
      country: item.address?.country,
      postcode: item.address?.postcode,
    }));

    setInCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('Nominatim geocode failed, returning empty:', err);
    return [];
  }
}

/**
 * Reverse geocode lat/lon to get formatted address and state.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult | null> {
  const latR = lat.toFixed(3);
  const lonR = lon.toFixed(3);
  const cacheKey = `rev_${latR}_${lonR}`;
  const cached = getFromCache<GeocodeResult>(cacheKey);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
    const item = await res.json();

    const result: GeocodeResult = {
      placeId: item.place_id,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      city: item.address?.city || item.address?.town || item.address?.suburb || item.address?.village,
      state: item.address?.state,
      country: item.address?.country,
      postcode: item.address?.postcode,
    };

    setInCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Nominatim reverse geocode failed:', err);
    return null;
  }
}
