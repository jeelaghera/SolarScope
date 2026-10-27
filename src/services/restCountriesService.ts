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
    const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=name,currencies,flags`);
    if (!res.ok) throw new Error(`REST Countries HTTP ${res.status}`);
    const data = await res.json();
    const c = data[0];

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
  } catch (err) {
    console.warn('REST Countries fetch failed, using India defaults:', err);
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
}
