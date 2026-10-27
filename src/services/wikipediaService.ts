// Wikipedia Knowledge & Education Service

export interface WikiArticleSummary {
  title: string;
  displayTitle: string;
  extract: string;
  thumbnailUrl?: string;
  pageUrl: string;
}

const WIKI_TOPICS = [
  { key: 'Net_metering', label: 'Net Metering' },
  { key: 'Solar_power_in_India', label: 'Solar in India' },
  { key: 'Photovoltaic_system', label: 'PV Systems' },
];

const CACHE_PREFIX = 'solarscope_wiki_';

export async function fetchWikiArticle(topicKey: string): Promise<WikiArticleSummary | null> {
  const cacheKey = `${CACHE_PREFIX}${topicKey}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Ignore cache error
  }

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topicKey)}`;

  try {
    const apiKey = import.meta.env.VITE_WIKIPEDIA_API_KEY || '';
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Api-User-Agent': 'SolarScope-Platform/1.0',
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Wiki API ${res.status}`);
    const data = await res.json();

    const result: WikiArticleSummary = {
      title: topicKey,
      displayTitle: data.title || topicKey.replace(/_/g, ' '),
      extract: data.extract || 'Educational solar summary from Wikipedia.',
      thumbnailUrl: data.thumbnail?.source,
      pageUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${topicKey}`,
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // Storage full
    }

    return result;
  } catch (error) {
    console.warn(`Failed fetching Wikipedia for ${topicKey}:`, error);
    return null;
  }
}

export async function fetchSolarEducationCards(): Promise<WikiArticleSummary[]> {
  const promises = WIKI_TOPICS.map(t => fetchWikiArticle(t.key));
  const results = await Promise.all(promises);
  return results.filter((r): r is WikiArticleSummary => r !== null);
}
