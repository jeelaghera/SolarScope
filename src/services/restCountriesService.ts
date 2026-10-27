// REST Countries API Service (Country, Currency & Localization)

export interface CountryInfo {
  name: string;
  officialName: string;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  flagEmoji: string;
  region: string;
}

const CACHE_KEY = 'solarscope_country_info';

export async function fetchCountryDetails(countryName = 'india'): Promise<CountryInfo> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  try {
    const apiKey = import.meta.env.VITE_REST_COUNTRIES_API_KEY || '';
    const headers: Record<string, string> = { Accept: 'application/json' };

    // 1. Try modern v5 authenticated REST Countries API
    if (apiKey && apiKey.startsWith('rc_')) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await fetch(`https://api.restcountries.com/countries/v5/codes.alpha_2/IN`, { headers });
      if (res.ok) {
        const json = await res.json();
        const obj = json.data?.objects?.[0];
        if (obj) {
          const curr = obj.currencies?.[0] || { code: 'INR', name: 'Indian rupee', symbol: '₹' };
          const result: CountryInfo = {
            name: obj.names?.common || 'India',
            officialName: obj.names?.official || 'Republic of India',
            currencyCode: curr.code || 'INR',
            currencySymbol: curr.symbol || '₹',
            currencyName: curr.name || 'Indian rupee',
            flagEmoji: obj.flag?.emoji || '🇮🇳',
            region: obj.region || 'Asia',
          };

          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(result));
          } catch {
            // ignore
          }
          return result;
        }
      }
    }

    // 2. Legacy / Public Mirror Fallback
    const legacyRes = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=name,currencies,flags`, {
      headers,
    });
    if (legacyRes.ok) {
      const data = await legacyRes.json();
      const c = data[0];
      if (c) {
        const currencyKey = Object.keys(c.currencies || {})[0] || 'INR';
        const currencyObj = c.currencies?.[currencyKey] || { name: 'Indian Rupee', symbol: '₹' };

        const result: CountryInfo = {
          name: c.name?.common || 'India',
          officialName: c.name?.official || 'Republic of India',
          currencyCode: currencyKey,
          currencySymbol: currencyObj.symbol || '₹',
          currencyName: currencyObj.name || 'Indian Rupee',
          flagEmoji: '🇮🇳',
          region: 'South Asia',
        };

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(result));
        } catch {
          // ignore
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('REST Countries fetch failed, using India defaults:', err);
  }

  return {
    name: 'India',
    officialName: 'Republic of India',
    currencyCode: 'INR',
    currencySymbol: '₹',
    currencyName: 'Indian Rupee',
    flagEmoji: '🇮🇳',
    region: 'South Asia',
  };
}
