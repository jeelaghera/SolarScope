// NASA Open API (api.nasa.gov) - Astronomy Picture of the Day (APOD)

export interface NasaApodData {
  title: string;
  url: string;
  hdurl?: string;
  explanation: string;
  date: string;
  mediaType: string;
  apiKeyUsed: string;
}

const CACHE_KEY = 'solarscope_nasa_apod';

export async function fetchNasaApod(customKey?: string): Promise<NasaApodData | null> {
  const apiKey = customKey || import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Cache valid for today
      if (parsed.date === new Date().toISOString().slice(0, 10)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  try {
    let res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}`);
    let data: any = null;

    if (res.ok) {
      data = await res.json();
      if (data.code === 500) data = null; // upstream glitch
    }

    if (!data) {
      // Fallback to recent solar date
      const retry = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}&date=2024-03-10`);
      if (retry.ok) {
        data = await retry.json();
      }
    }

    if (!data || !data.title) throw new Error('NASA API returned empty data');

    const result: NasaApodData = {
      title: data.title,
      url: data.url,
      hdurl: data.hdurl,
      explanation: data.explanation,
      date: data.date,
      mediaType: data.media_type,
      apiKeyUsed: apiKey.substring(0, 4) + '****',
    };

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch {
      // ignore
    }

    return result;
  } catch (err) {
    console.warn('NASA APOD API fetch failed:', err);
    return null;
  }
}
